// src-tauri/src/jsonpath_client.rs

use crate::jsonpath_types::*;
use anyhow::{Result, anyhow};
use reqwest;
use serde_json::Value;
use std::time::{Duration, Instant};
use std::collections::HashMap;
use tokio::time::timeout;
use futures_util::StreamExt;

pub struct KapApiClient {
    client: reqwest::Client,
    services: HashMap<String, ServiceConfig>,
    environments: Vec<Environment>,
}

impl KapApiClient {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(45))  // 🔥 Incrementar timeout
            .user_agent("KapTools-Enterprise/1.0")
            .https_only(true)
            .connection_verbose(true)          // 🔥 Más info de debug
            .pool_max_idle_per_host(5)         // 🔥 Pool de conexiones
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            services: get_services(),
            environments: get_environments(),
        }
    }

    // 🚀 NUEVA FUNCIÓN: Request con Streaming y Cancelación
    pub async fn execute_request_streaming(&self, request: ApiRequest) -> Result<ApiResponse> {
        let start_time = Instant::now();
        
        // Construir URL
        let url = self.build_url(&request.environment, &request.service, &request.endpoint)?;
        
        println!("🚀 Starting streaming request to: {}", self.sanitize_url(&url));

        // Validar token
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

        // 🔥 OPTIMIZACIÓN 1: Timeout con tokio
        let request_future = async {
            // Hacer request inicial
            let response = self.client
                .get(&url)
                .header("x-jetstream-devtoken", &request.token)
                .header("X-Requested-With", "KapTools-Enterprise")
                .header("Cache-Control", "no-cache, no-store")
                .header("Accept", "application/json")
                .send()
                .await?;

            let status = response.status();
            println!("📡 Response status: {}", status);

            if !status.is_success() {
                let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                return Ok(ApiResponse {
                    success: false,
                    raw_response: Some(error_text.clone()),
                    jsonpath_result: None,
                    error: Some(format!("HTTP {}: {}", status, error_text)),
                    url_used: self.sanitize_url(&url),
                    execution_time_ms: start_time.elapsed().as_millis() as u64,
                });
            }

            // 🔥 OPTIMIZACIÓN 2: Streaming con chunks
            let content_length = response.content_length();
            println!("📊 Content length: {:?}", content_length);

            let mut response_text = String::new();
            let mut stream = response.bytes_stream();
            let mut total_bytes = 0;

            // Procesar en chunks para evitar bloqueo
            while let Some(chunk) = stream.next().await {
                match chunk {
                    Ok(bytes) => {
                        total_bytes += bytes.len();
                        
                        // 🔥 OPTIMIZACIÓN 3: Límite de tamaño para prevenir OOM
                        if total_bytes > 50_000_000 { // 50MB límite
                            return Ok(ApiResponse {
                                success: false,
                                raw_response: None,
                                jsonpath_result: None,
                                error: Some("Response too large (>50MB). Use more specific endpoint.".to_string()),
                                url_used: self.sanitize_url(&url),
                                execution_time_ms: start_time.elapsed().as_millis() as u64,
                            });
                        }

                        // Convertir bytes a string
                        match String::from_utf8(bytes.to_vec()) {
                            Ok(text_chunk) => response_text.push_str(&text_chunk),
                            Err(_) => return Err(anyhow!("Invalid UTF-8 in response")),
                        }

                        // 🔥 OPTIMIZACIÓN 4: Progress reporting cada 1MB
                        if total_bytes % 1_000_000 == 0 {
                            println!("📥 Downloaded: {} MB", total_bytes / 1_000_000);
                        }
                    }
                    Err(e) => return Err(anyhow!("Stream error: {}", e)),
                }
            }

            println!("✅ Download complete: {} bytes", total_bytes);

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
                        execution_time_ms: start_time.elapsed().as_millis() as u64,
                    });
                }
            };

            let execution_time = start_time.elapsed().as_millis() as u64;
            println!("🎯 Request completed in {}ms", execution_time);

            Ok(ApiResponse {
                success: true,
                raw_response: Some(response_text),
                jsonpath_result,
                error: None,
                url_used: self.sanitize_url(&url),
                execution_time_ms: execution_time,
            })
        };

        // 🔥 OPTIMIZACIÓN 5: Timeout de 60 segundos máximo
        match timeout(Duration::from_secs(60), request_future).await {
            Ok(result) => result,
            Err(_) => Ok(ApiResponse {
                success: false,
                raw_response: None,
                jsonpath_result: None,
                error: Some("Request timeout after 60 seconds".to_string()),
                url_used: self.sanitize_url(&url),
                execution_time_ms: 60000,
            })
        }
    }

    // 🔥 MANTENER FUNCIÓN ORIGINAL PARA COMPATIBILIDAD
    pub async fn execute_request(&self, request: ApiRequest) -> Result<ApiResponse> {
        // Usar la nueva implementación streaming
        self.execute_request_streaming(request).await
    }

    // 🔥 NUEVA FUNCIÓN: Test rápido de conectividad
    pub async fn test_connectivity_fast(&self, environment: &str, service: &str) -> Result<String> {
        let url = self.build_url(environment, service, "/health")?;
        
        println!("🔍 Fast connectivity test to: {}", self.sanitize_url(&url));

        // Test con timeout muy corto (5 segundos)
        let test_future = async {
            let response = self.client
                .get(&url)
                .header("X-Requested-With", "KapTools-Test")
                .timeout(Duration::from_secs(5))  // 🔥 Timeout corto
                .send()
                .await?;

            Ok(format!("✅ Connectivity OK - Status: {}", response.status()))
        };

        match timeout(Duration::from_secs(10), test_future).await {
            Ok(result) => result,
            Err(_) => Ok("⚠️ Connectivity timeout - Service may be slow".to_string())
        }
    }

    // 🔥 OPTIMIZACIÓN DEL JSONPATH (Para datos grandes)
    pub fn apply_jsonpath_optimized(&self, json_text: &str, query: &str) -> Result<String> {
        // Para JSONs muy grandes, validar tamaño primero
        if json_text.len() > 10_000_000 { // 10MB
            return Err(anyhow!("JSON too large for JSONPath processing. Use more specific API endpoint."));
        }

        println!("🔍 Applying JSONPath to {} chars", json_text.len());

        // Parsear JSON
        let json_value: Value = serde_json::from_str(json_text)
            .map_err(|e| anyhow!("Invalid JSON: {}", e))?;

        // Aplicar JSONPath query
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

        // Para resultados grandes, usar compact format
        let result_size = serde_json::to_string(&result)?.len();
        if result_size > 1_000_000 { // 1MB
            println!("⚠️ Large result ({} chars), using compact format", result_size);
            Ok(serde_json::to_string(&result)?) // Compact
        } else {
            Ok(serde_json::to_string_pretty(&result)?) // Pretty
        }
    }

    // Actualizar apply_jsonpath para usar la versión optimizada
    pub fn apply_jsonpath(&self, json_text: &str, query: &str) -> Result<String> {
        self.apply_jsonpath_optimized(json_text, query)
    }

    // 🔥 Funciones helper existentes (sin cambios grandes)
    fn sanitize_url(&self, url: &str) -> String {
        // Ocultar parte sensible de la URL
        if let Some(pos) = url.find("azurewebsites.net") {
            format!("{}[...]{}", &url[..20], &url[pos..])
        } else {
            url.to_string()
        }
    }

    fn is_valid_token_format(&self, token: &str) -> bool {
        // Validación básica: debe tener al menos 10 caracteres
        token.len() >= 10 && !token.contains(" ")
    }

    pub fn build_url(&self, environment: &str, service: &str, endpoint: &str) -> Result<String> {
        let env = self.environments.iter().find(|e| e.key == environment)
            .ok_or_else(|| anyhow!("Invalid environment: {}", environment))?;
        let service_config = self.services.get(service)
            .ok_or_else(|| anyhow!("Invalid service: {}", service))?;
        
        if !self.is_safe_environment(environment) {
            return Err(anyhow!("Environment '{}' not approved for enterprise use", environment));
        }

        let url = format!("https://{}{}", env.prefix, service_config.base_url);
        Ok(format!("{}{}", url, endpoint))
    }

    fn is_safe_environment(&self, environment: &str) -> bool {
        match environment {
            "sandbox3" | "sandbox8" => true, // Entornos de desarrollo seguros
            "production" => false, // ⚠️ Producción requiere aprobación adicional
            _ => false,
        }
    }

    pub fn get_available_services(&self) -> Vec<(&String, &ServiceConfig)> {
        self.services.iter().collect()
    }

    pub fn get_available_environments(&self) -> &Vec<Environment> {
        &self.environments
    }

    pub fn get_service_templates(&self, service_key: &str) -> Option<&Vec<ServiceTemplate>> {
        self.services.get(service_key).map(|s| &s.templates)
    }

    pub fn validate_request(&self, _request: &ApiRequest) -> Result<()> {
        // Validaciones básicas
        Ok(())
    }
}