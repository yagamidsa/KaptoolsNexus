// src-tauri/src/jsonpath_commands.rs

use crate::jsonpath_client::KapApiClient;
use crate::jsonpath_types::*;
use serde_json::Value;
use std::sync::OnceLock;

// ================================
// CLIENTE GLOBAL SINGLETON
// ================================

static API_CLIENT: OnceLock<KapApiClient> = OnceLock::new();

fn get_client() -> &'static KapApiClient {
    API_CLIENT.get_or_init(|| KapApiClient::new())
}

// ================================
// COMANDOS TAURI PARA JSONPATH
// ================================

#[tauri::command]
pub async fn execute_jsonpath_query(request: ApiRequest) -> Result<ApiResponse, String> {
    let client = get_client();
    
    println!("🔍 Executing JSONPath query: {}", request.jsonpath_query);
    println!("🎯 Target: {}/{}", request.environment, request.service);

    // Validar request
    if let Err(e) = client.validate_request(&request) {
        return Ok(ApiResponse {
            success: false,
            raw_response: None,
            jsonpath_result: None,
            error: Some(format!("Validation error: {}", e)),
            url_used: "".to_string(),
            execution_time_ms: 0,
        });
    }

    // Ejecutar request
    match client.execute_request(request).await {
        Ok(response) => Ok(response),
        Err(e) => Ok(ApiResponse {
            success: false,
            raw_response: None,
            jsonpath_result: None,
            error: Some(format!("Request failed: {}", e)),
            url_used: "".to_string(),
            execution_time_ms: 0,
        }),
    }
}

#[tauri::command]
pub fn get_available_services() -> Result<Value, String> {
    let client = get_client();
    let services = client.get_available_services();
    
    let mut result = serde_json::Map::new();
    for (key, config) in services {
        result.insert(key.clone(), serde_json::to_value(config).unwrap());
    }
    
    Ok(Value::Object(result))
}

#[tauri::command]
pub fn get_available_environments() -> Result<Vec<Environment>, String> {
    let client = get_client();
    Ok(client.get_available_environments().to_vec())
}

#[tauri::command]
pub fn get_service_templates(service_key: String) -> Result<Option<Vec<ServiceTemplate>>, String> {
    let client = get_client();
    Ok(client.get_service_templates(&service_key).cloned())
}

#[tauri::command]
pub fn build_preview_url(environment: String, service: String, endpoint: String) -> Result<String, String> {
    let client = get_client();
    
    match client.build_url(&environment, &service, &endpoint) {
        Ok(url) => Ok(url),
        Err(e) => Err(format!("Failed to build URL: {}", e)),
    }
}

#[tauri::command]
pub fn validate_jsonpath_query(json_text: String, query: String) -> Result<String, String> {
    let client = get_client();
    
    match client.apply_jsonpath(&json_text, &query) {
        Ok(result) => Ok(result),
        Err(e) => Err(format!("JSONPath validation failed: {}", e)),
    }
}

// ================================
// COMANDO PARA TESTING/DEBUG
// ================================

#[tauri::command]
pub async fn test_jsonpath_tool() -> Result<String, String> {
    println!("🧪 Testing JSONPath Tool backend...");
    
    // Test básico de funcionalidad
    let test_json = r#"
    {
        "data": [
            {"id": 1, "name": "Test Product 1", "status": "active"},
            {"id": 2, "name": "Test Product 2", "status": "inactive"}
        ],
        "metadata": {
            "total": 2,
            "page": 1
        }
    }
    "#;
    
    let client = get_client();
    
    // Test diferentes queries
    let tests = vec![
        ("$", "Root object"),
        ("$.data", "Data array"),
        ("$.data[*].name", "All names"),
        ("$.data[0]", "First item"),
        ("$.metadata.total", "Total count"),
    ];
    
    let mut results = Vec::new();
    
    for (query, description) in tests {
        match client.apply_jsonpath(test_json, query) {
            Ok(result) => {
                results.push(format!("✅ {}: {}", description, result.lines().next().unwrap_or("")));
            }
            Err(e) => {
                results.push(format!("❌ {}: Error - {}", description, e));
            }
        }
    }
    
    Ok(format!("🚀 JSONPath Tool Backend Test Results:\n{}", results.join("\n")))
}

// ================================
// UTILIDADES ADICIONALES
// ================================

#[tauri::command]
pub fn get_jsonpath_examples() -> Result<Vec<Value>, String> {
    let examples = vec![
        serde_json::json!({
            "name": "Root Object",
            "query": "$",
            "description": "Returns the entire JSON object"
        }),
        serde_json::json!({
            "name": "All Data Items",
            "query": "$.data[*]",
            "description": "Returns all items in the data array"
        }),
        serde_json::json!({
            "name": "Extract Names",
            "query": "$.data[*].name",
            "description": "Extracts the 'name' field from all data items"
        }),
        serde_json::json!({
            "name": "First Item",
            "query": "$.data[0]",
            "description": "Returns the first item in the data array"
        }),
        serde_json::json!({
            "name": "Filter by Condition",
            "query": "$.data[?(@.status=='active')]",
            "description": "Returns items where status equals 'active'"
        }),
        serde_json::json!({
            "name": "Nested Properties",
            "query": "$.metadata.total",
            "description": "Access nested properties"
        }),
        serde_json::json!({
            "name": "Array Length",
            "query": "$.data.length",
            "description": "Get the length of an array"
        }),
    ];
    
    Ok(examples)
}

#[tauri::command]
pub fn format_json(json_text: String) -> Result<String, String> {
    match serde_json::from_str::<Value>(&json_text) {
        Ok(value) => {
            match serde_json::to_string_pretty(&value) {
                Ok(formatted) => Ok(formatted),
                Err(e) => Err(format!("Failed to format JSON: {}", e)),
            }
        }
        Err(e) => Err(format!("Invalid JSON: {}", e)),
    }
}

// ================================
// COMANDO PARA VERIFICAR CONECTIVIDAD
// ================================

#[tauri::command]
pub async fn test_api_connectivity(environment: String, service: String) -> Result<String, String> {
    let client = get_client();
    
    // Construir URL de prueba
    let url = match client.build_url(&environment, &service, "/health") {
        Ok(url) => url,
        Err(_) => {
            // Fallback a root path
            match client.build_url(&environment, &service, "/") {
                Ok(url) => url,
                Err(e) => return Err(format!("Failed to build test URL: {}", e)),
            }
        }
    };
    
    println!("🔍 Testing connectivity to: {}", url);
    
    // Hacer request simple sin autenticación
    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    match http_client.head(&url).send().await {
        Ok(response) => {
            let status = response.status();
            Ok(format!("✅ Connectivity test successful\n🌐 URL: {}\n📊 Status: {}", url, status))
        }
        Err(e) => {
            Ok(format!("⚠️ Connectivity test failed\n🌐 URL: {}\n❌ Error: {}\n💡 This might be normal if the endpoint requires authentication", url, e))
        }
    }
}