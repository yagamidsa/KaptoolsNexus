// src-tauri/src/jsonpath_client.rs

use crate::jsonpath_types::*;
use anyhow::{Result, anyhow};
use reqwest;
use serde_json::Value;
use std::time::{Duration, Instant};
use std::collections::HashMap;

// ================================
// CLIENTE HTTP PARA APIS KAP
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
            .user_agent("KapTools-JSONPath/1.0")
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            services: get_services(),
            environments: get_environments(),
        }
    }

    // ================================
    // CONSTRUCCIÓN DE URLs
    // ================================

    pub fn build_url(&self, environment: &str, service: &str, endpoint: &str) -> Result<String> {
        let env = self.environments
            .iter()
            .find(|e| e.key == environment)
            .ok_or_else(|| anyhow!("Invalid environment: {}", environment))?;

        let service_config = self.services
            .get(service)
            .ok_or_else(|| anyhow!("Invalid service: {}", service))?;

        let url = format!("https://{}{}", env.prefix, service_config.base_url);
        let full_url = format!("{}{}", url, endpoint);

        Ok(full_url)
    }

    // ================================
    // EJECUTAR REQUEST HTTP
    // ================================

    pub async fn execute_request(&self, request: ApiRequest) -> Result<ApiResponse> {
        let start_time = Instant::now();

        // Validar y construir URL
        let url = self.build_url(&request.environment, &request.service, &request.endpoint)?;
        
        println!("🌐 Making request to: {}", url);

        // Ejecutar request HTTP
        let response = self.client
            .get(&url)
            .header("x-jetstream-devtoken", &request.token)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .send()
            .await?;

        let status = response.status();
        let response_text = response.text().await?;

        // Medir tiempo de ejecución
        let execution_time = start_time.elapsed().as_millis() as u64;

        // Verificar si la respuesta fue exitosa
        if !status.is_success() {
            return Ok(ApiResponse {
                success: false,
                raw_response: Some(response_text.clone()),
                jsonpath_result: None,
                error: Some(format!("HTTP {}: {}", status, response_text)),
                url_used: url,
                execution_time_ms: execution_time,
            });
        }

        // Aplicar JSONPath si la respuesta es válida
        let jsonpath_result = match self.apply_jsonpath(&response_text, &request.jsonpath_query) {
            Ok(result) => Some(result),
            Err(e) => {
                return Ok(ApiResponse {
                    success: false,
                    raw_response: Some(response_text),
                    jsonpath_result: None,
                    error: Some(format!("JSONPath error: {}", e)),
                    url_used: url,
                    execution_time_ms: execution_time,
                });
            }
        };

        Ok(ApiResponse {
            success: true,
            raw_response: Some(response_text),
            jsonpath_result,
            error: None,
            url_used: url,
            execution_time_ms: execution_time,
        })
    }

    // ================================
    // APLICAR JSONPATH
    // ================================

    pub fn apply_jsonpath(&self, json_text: &str, query: &str) -> Result<String> {
        // Parsear JSON
        let json_value: Value = serde_json::from_str(json_text)
            .map_err(|e| anyhow!("Invalid JSON: {}", e))?;

        // Aplicar JSONPath usando jsonpath_lib
        let result = match jsonpath_lib::select(&json_value, query) {
            Ok(values) => {
                if values.is_empty() {
                    Value::Null
                } else if values.len() == 1 {
                    values[0].clone()
                } else {
                    // Convertir Vec<&Value> a Vec<Value>
                    Value::Array(values.into_iter().cloned().collect())
                }
            }
            Err(e) => return Err(anyhow!("JSONPath query error: {}", e)),
        };

        // Formatear resultado
        Ok(serde_json::to_string_pretty(&result)?)
    }

    // ================================
    // MÉTODOS HELPER PARA EL FRONTEND
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

    // ================================
    // VALIDACIÓN DE REQUESTS
    // ================================

    pub fn validate_request(&self, request: &ApiRequest) -> Result<()> {
        // Validar environment
        if !self.environments.iter().any(|e| e.key == request.environment) {
            return Err(anyhow!("Invalid environment: {}", request.environment));
        }

        // Validar service
        if !self.services.contains_key(&request.service) {
            return Err(anyhow!("Invalid service: {}", request.service));
        }

        // Validar que no estén vacíos los campos requeridos
        if request.endpoint.trim().is_empty() {
            return Err(anyhow!("Endpoint cannot be empty"));
        }

        if request.token.trim().is_empty() {
            return Err(anyhow!("Token cannot be empty"));
        }

        if request.jsonpath_query.trim().is_empty() {
            return Err(anyhow!("JSONPath query cannot be empty"));
        }

        // Validar JSONPath syntax básica
        if !request.jsonpath_query.starts_with('$') {
            return Err(anyhow!("JSONPath query must start with '$'"));
        }

        Ok(())
    }
}

// ================================
// TESTS UNITARIOS
// ================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_url() {
        let client = KapApiClient::new();
        
        let url = client.build_url("sandbox3", "study-definition", "/studies/TEST123").unwrap();
        assert_eq!(url, "https://sandbox3-studydef.azurewebsites.net/studies/TEST123");

        let url = client.build_url("production", "study-definition", "/studies/TEST123").unwrap();
        assert_eq!(url, "https://studydef.azurewebsites.net/studies/TEST123");
    }

    #[test]
    fn test_validate_request() {
        let client = KapApiClient::new();
        
        let valid_request = ApiRequest {
            environment: "sandbox3".to_string(),
            service: "study-definition".to_string(),
            endpoint: "/studies/TEST123".to_string(),
            token: "test-token".to_string(),
            jsonpath_query: "$.data".to_string(),
        };

        assert!(client.validate_request(&valid_request).is_ok());

        let invalid_request = ApiRequest {
            environment: "invalid".to_string(),
            service: "study-definition".to_string(),
            endpoint: "/studies/TEST123".to_string(),
            token: "test-token".to_string(),
            jsonpath_query: "$.data".to_string(),
        };

        assert!(client.validate_request(&invalid_request).is_err());
    }

    #[test]
    fn test_apply_jsonpath() {
        let client = KapApiClient::new();
        
        let json = r#"{"data": [{"name": "test1"}, {"name": "test2"}]}"#;
        
        let result = client.apply_jsonpath(json, "$.data[*].name").unwrap();
        assert!(result.contains("test1"));
        assert!(result.contains("test2"));
    }
}