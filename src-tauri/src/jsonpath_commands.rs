// src-tauri/src/jsonpath_commands.rs

use crate::jsonpath_client::KapApiClient;
use crate::jsonpath_types::*;
use serde_json::Value;
use std::sync::OnceLock;
use tokio::task;
use tauri::Manager;
use tauri::Emitter;

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
    
    println!("🔍 Testing connectivity to {}/{}", environment, service);
    
    match client.test_connectivity_fast(&environment, &service).await {
        Ok(result) => Ok(result),
        Err(e) => Ok(format!(
            "⚠️ Connectivity test failed\n❌ Error: {}\n💡 Possible issues:\n• Network connectivity\n• Invalid credentials\n• Service unavailable\n• Firewall blocking requests", 
            e
        )),
    }
}


#[tauri::command]
pub async fn validate_jsonpath_query_async(json_text: String, query: String) -> Result<String, String> {
    let json_size = json_text.len();
    
    println!("🔍 Async JSONPath validation for {} chars", json_size);
    
    // Para JSONs grandes, usar worker thread
    if json_size > 2_000_000 { // 2MB threshold
        println!("📦 Using worker thread for large JSON ({}MB)", json_size / 1_000_000);
        return validate_large_jsonpath_worker(json_text, query).await;
    }
    
    // Para JSONs medianos, procesamiento normal async
    if json_size > 500_000 { // 500KB threshold
        println!("⚡ Using async processing for medium JSON");
        return validate_medium_jsonpath_async(json_text, query).await;
    }
    
    // Para JSONs pequeños, método síncrono existente
    println!("🔥 Using sync processing for small JSON");
    validate_jsonpath_query(json_text, query)
}

// ================================
// WORKER THREAD PARA JSONs GRANDES (>2MB)
// ================================
async fn validate_large_jsonpath_worker(json_text: String, query: String) -> Result<String, String> {
    println!("🏭 Starting worker thread for large JSON processing");
    
    // Ejecutar en worker thread para no bloquear UI
    let result = task::spawn_blocking(move || {
        println!("👷 Worker thread started");
        
        let client = get_client();
        let result = client.apply_jsonpath_optimized(&json_text, &query);
        
        println!("👷 Worker thread completed");
        result
    }).await;
    
    match result {
        Ok(Ok(json_result)) => {
            println!("✅ Worker thread success");
            Ok(json_result)
        },
        Ok(Err(e)) => {
            println!("❌ JSONPath worker error: {}", e);
            Err(format!("JSONPath worker error: {}", e))
        },
        Err(e) => {
            println!("❌ Worker thread panic: {}", e);
            Err(format!("Worker thread error: {}", e))
        }
    }
}

// ================================
// ASYNC PROCESSING PARA JSONs MEDIANOS (500KB-2MB)
// ================================
async fn validate_medium_jsonpath_async(json_text: String, query: String) -> Result<String, String> {
    println!("⚡ Starting async processing for medium JSON");
    
    // Yield control para no bloquear UI
    tokio::task::yield_now().await;
    
    let client = get_client();
    let result = client.apply_jsonpath_optimized(&json_text, &query);
    
    // Otro yield después del procesamiento
    tokio::task::yield_now().await;
    
    match result {
        Ok(json_result) => {
            println!("✅ Async processing success");
            Ok(json_result)
        },
        Err(e) => {
            println!("❌ Async processing error: {}", e);
            Err(format!("JSONPath async error: {}", e))
        }
    }
}

// ================================
// COMANDO CON PROGRESS REPORTING - PASO 1B
// ================================
#[tauri::command]
pub async fn validate_jsonpath_with_progress(
    json_text: String, 
    query: String,
    window: tauri::Window
) -> Result<String, String> {
    let json_size = json_text.len();
    
    println!("📊 Starting JSONPath with progress tracking ({} chars)", json_size);
    
    // ===== PROGRESO 10%: INICIO =====
    let _ = window.emit("jsonpath_progress", serde_json::json!({
        "stage": "starting",
        "progress": 10,
        "message": format!("Starting JSON processing ({:.1}MB)", json_size as f64 / 1_000_000.0)
    }));
    
    // Small delay para que UI se actualice
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
    
    // ===== PROGRESO 30%: PARSING =====
    let _ = window.emit("jsonpath_progress", serde_json::json!({
        "stage": "parsing",
        "progress": 30,
        "message": "Parsing JSON structure..."
    }));
    
    // Yield para UI
    tokio::task::yield_now().await;
    
    // ===== PROGRESO 60%: APPLYING JSONPATH =====
    let _ = window.emit("jsonpath_progress", serde_json::json!({
        "stage": "applying",
        "progress": 60,
        "message": "Applying JSONPath query..."
    }));
    
    // Procesar según tamaño
    let result = if json_size > 2_000_000 {
        // JSONs grandes: usar worker
        let _ = window.emit("jsonpath_progress", serde_json::json!({
            "stage": "worker",
            "progress": 70,
            "message": "Using worker thread for large JSON..."
        }));
        
        validate_large_jsonpath_worker(json_text, query).await
    } else {
        // JSONs medianos: async normal
        validate_medium_jsonpath_async(json_text, query).await
    };
    
    // ===== PROGRESO 90%: FORMATTING =====
    let _ = window.emit("jsonpath_progress", serde_json::json!({
        "stage": "formatting",
        "progress": 90,
        "message": "Formatting results..."
    }));
    
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    
    // ===== PROGRESO 100%: COMPLETE =====
    let _ = window.emit("jsonpath_progress", serde_json::json!({
        "stage": "complete",
        "progress": 100,
        "message": "JSONPath applied successfully!"
    }));
    
    match result {
        Ok(json_result) => {
            println!("✅ JSONPath with progress completed successfully");
            Ok(json_result)
        },
        Err(e) => {
            let _ = window.emit("jsonpath_progress", serde_json::json!({
                "stage": "error",
                "progress": 0,
                "message": format!("Error: {}", e)
            }));
            
            println!("❌ JSONPath with progress failed: {}", e);
            Err(e)
        }
    }
}

// ================================
// COMANDO PARA DETECTAR TAMAÑO ANTES DE PROCESAR
// ================================
#[tauri::command]
pub fn get_json_processing_strategy(json_text: String) -> Result<String, String> {
    let json_size = json_text.len();
    
    let strategy = if json_size < 500_000 {
        "fast"
    } else if json_size < 2_000_000 {
        "async"
    } else if json_size < 10_000_000 {
        "worker"
    } else {
        "chunked"
    };
    
    Ok(serde_json::json!({
        "size": json_size,
        "size_mb": json_size as f64 / 1_000_000.0,
        "strategy": strategy,
        "estimated_time_ms": match strategy {
            "fast" => json_size / 10_000,      // ~100MB/s
            "async" => json_size / 5_000,      // ~50MB/s
            "worker" => json_size / 2_000,     // ~20MB/s
            "chunked" => json_size / 1_000,    // ~10MB/s
            _ => 1000
        }
    }).to_string())
}