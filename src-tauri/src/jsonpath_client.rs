// src-tauri/src/jsonpath_client.rs

use crate::jsonpath_types::*;
use anyhow::{Result, anyhow};
use reqwest;
use serde_json::Value;
use std::time::{Duration, Instant};
use std::collections::HashMap;

// ================================
// CLIENTE HTTP SEGURO PARA EMPRESA
// ================================

pub struct KapApiClient {
    client: reqwest::Client,
    services: HashMap<String, ServiceConfig>,
    environments: Vec<Environment>,
}

impl KapApiClient {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("KapTools-Enterprise/1.0") // Identificador empresarial
            .https_only(true) // Solo HTTPS
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            services: get_services(),
            environments: get_environments(),
        }
    }

    // ================================
    // CONSTRUCCIÓN DE URLs CON VALIDACIÓN
    // ================================

    pub fn build_url(&self, environment: &str, service: &str, endpoint: &str) -> Result<String> {
        let env = self.environments
            .iter()
            .find(|e| e.key == environment)
            .ok_or_else(|| anyhow!("Invalid environment: {}", environment))?;

        let service_config = self.services
            .get(service)
            .ok_or_else(|| anyhow!("Invalid service: {}", service))?;

        // Validar que el environment es seguro para la empresa
        if !self.is_safe_environment(environment) {
            return Err(anyhow!("Environment '{}' not approved for enterprise use", environment));
        }

        let url = format!("https://{}{}", env.prefix, service_config.base_url);
        let full_url = format!("{}{}", url, endpoint);

        Ok(full_url)
    }

    // ================================
    // VALIDACIÓN DE ENTORNOS SEGUROS
    // ================================

    fn is_safe_environment(&self, environment: &str) -> bool {
        match environment {
            "sandbox3" | "sandbox8" => true, // Entornos de desarrollo seguros
            "production" => false, // ⚠️ Producción requiere aprobación adicional
            _ => false,
        }
    }

    // ================================
    // SANITIZACIÓN SIMPLE DE DATOS SENSIBLES
    // ================================

    fn sanitize_for_logging(&self, data: &str) -> String {
        // Sanitización simple sin regex
        let mut sanitized = data.to_string();
        
        // Truncar respuestas muy largas
        if sanitized.len() > 500 {
            format!("{}... [TRUNCATED FOR SECURITY]", &sanitized[..500])
        } else {
            sanitized
        }
    }

    // ================================
    // EJECUTAR REQUEST CON SEGURIDAD EMPRESARIAL
    // ================================

    pub async fn execute_request(&self, request: ApiRequest) -> Result<ApiResponse> {
        let start_time = Instant::now();

        // Validar y construir URL
        let url = self.build_url(&request.environment, &request.service, &request.endpoint)?;
        
        // Log seguro (sin datos sensibles)
        println!("🔒 Secure request to: {}", self.sanitize_url(&url));

        // Validar token format (básico)
        if !self.is_valid_token_format(&request.token) {
            return Ok(ApiResponse {
                success: false,
                raw_response: None,
                jsonpath_result: None,
                error: Some("Invalid token format".to_string()),
                url_used: "[URL_REDACTED]".to_string(),
                execution_time_ms: 0,
            });
        }

        // Request con headers seguros
        let response = self.client
            .get(&url)
            .header("x-jetstream-devtoken", &request.token)
            .header("X-Requested-With", "KapTools-Enterprise") // Identificación
            .header("Cache-Control", "no-cache, no-store") // No cachear datos sensibles
            .send()
            .await?;

        let status = response.status();
        let response_text = response.text().await?;
        let execution_time = start_time.elapsed().as_millis() as u64;

        // Log seguro del resultado
        println!("📊 Status: {}, Size: {} chars", status, response_text.len());

        if !status.is_success() {
            // No logear el contenido de error completo por seguridad
            return Ok(ApiResponse {
                success: false,
                raw_response: Some(response_text.clone()),
                jsonpath_result: None,
                error: Some(format!("HTTP {}: [Response not logged for security]", status)),
                url_used: self.sanitize_url(&url),
                execution_time_ms: execution_time,
            });
        }

        // Aplicar JSONPath
        let jsonpath_result = match self.apply_jsonpath(&response_text, &request.jsonpath_query) {
            Ok(result) => Some(result),
            Err(e) => {
                return Ok(ApiResponse {
                    success: false,
                    raw_response: Some(response_text),
                    jsonpath_result: None,
                    error: Some(format!("JSONPath error: {}", e)),
                    url_used: self.sanitize_url(&url),
                    execution_time_ms: execution_time,
                });
            }
        };

        // Auditoria de acceso exitoso
        println!("✅ Successful data access: {} chars processed", response_text.len());

        Ok(ApiResponse {
            success: true,
            raw_response: Some(response_text),
            jsonpath_result,
            error: None,
            url_used: self.sanitize_url(&url),
            execution_time_ms: execution_time,
        })
    }

    // ================================
    // TEST DE CONECTIVIDAD (MÉTODO REQUERIDO)
    // ================================

    pub async fn test_connectivity(&self, environment: &str, service: &str) -> Result<String> {
        let url = self.build_url(environment, service, "/")?;
        
        println!("🔍 Testing connectivity: {}", self.sanitize_url(&url));

        match self.client
            .get(&url)
            .timeout(Duration::from_secs(10))
            .send()
            .await
        {
            Ok(response) => {
                Ok(format!(
                    "✅ Connectivity OK\n🌐 URL: {}\n📊 Status: {}",
                    self.sanitize_url(&url), response.status()
                ))
            }
            Err(e) => {
                Err(anyhow!("❌ Connectivity failed: {}", e))
            }
        }
    }

    // ================================
    // UTILIDADES DE SEGURIDAD SIMPLES
    // ================================

    fn sanitize_url(&self, url: &str) -> String {
        // Sanitización simple - mostrar solo el dominio
        if url.contains("://") {
            if let Some(domain_start) = url.find("://") {
                if let Some(path_start) = url[domain_start + 3..].find("/") {
                    let domain_end = domain_start + 3 + path_start;
                    format!("{}[PATH_REDACTED]", &url[..domain_end])
                } else {
                    url.to_string()
                }
            } else {
                "[URL_REDACTED]".to_string()
            }
        } else {
            "[URL_REDACTED]".to_string()
        }
    }

    fn is_valid_token_format(&self, token: &str) -> bool {
        // Validación básica de formato de token
        !token.is_empty() && token.len() > 10 && !token.contains(" ")
    }

    // ================================
    // APLICAR JSONPATH (SIN CAMBIOS)
    // ================================

    pub fn apply_jsonpath(&self, json_text: &str, query: &str) -> Result<String> {
        let json_value: Value = serde_json::from_str(json_text)
            .map_err(|e| anyhow!("Invalid JSON: {}", e))?;

        let result = match jsonpath_lib::select(&json_value, query) {
            Ok(values) => {
                if values.is_empty() {
                    Value::Null
                } else if values.len() == 1 {
                    values[0].clone()
                } else {
                    Value::Array(values.into_iter().cloned().collect())
                }
            }
            Err(e) => return Err(anyhow!("JSONPath query error: {}", e)),
        };

        Ok(serde_json::to_string_pretty(&result)?)
    }

    // ================================
    // MÉTODOS HELPER (SIN CAMBIOS)
    // ================================

    pub fn get_available_services(&self) -> Vec<(&String, &ServiceConfig)> {
        self.services.iter().collect()
    }

    pub fn get_available_environments(&self) -> &Vec<Environment> {
        &self.environments
    }

    pub fn get_service_templates(&self, service_key: &str) -> Option<&Vec<ServiceTemplate>> {
        self.services.get(service_key).map(|s| &s.templates)
    }

    pub fn validate_request(&self, request: &ApiRequest) -> Result<()> {
        if !self.environments.iter().any(|e| e.key == request.environment) {
            return Err(anyhow!("Invalid environment: {}", request.environment));
        }

        if !self.services.contains_key(&request.service) {
            return Err(anyhow!("Invalid service: {}", request.service));
        }

        if request.endpoint.trim().is_empty() {
            return Err(anyhow!("Endpoint cannot be empty"));
        }

        if request.token.trim().is_empty() {
            return Err(anyhow!("Token cannot be empty"));
        }

        if request.jsonpath_query.trim().is_empty() {
            return Err(anyhow!("JSONPath query cannot be empty"));
        }

        if !request.jsonpath_query.starts_with('$') {
            return Err(anyhow!("JSONPath query must start with '$'"));
        }

        Ok(())
    }
}