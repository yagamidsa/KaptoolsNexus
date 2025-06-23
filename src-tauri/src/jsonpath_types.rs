// src-tauri/src/jsonpath_types.rs

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ================================
// ESTRUCTURAS DE REQUEST/RESPONSE
// ================================

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiRequest {
    pub environment: String,        // sandbox3, sandbox8, production
    pub service: String,           // study-definition, qfactory, etc.
    pub endpoint: String,          // /studies/KAP123456
    pub token: String,             // x-jetstream-devtoken
    pub jsonpath_query: String,    // $.data[*].name
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse {
    pub success: bool,
    pub raw_response: Option<String>,
    pub jsonpath_result: Option<String>,
    pub error: Option<String>,
    pub url_used: String,
    pub execution_time_ms: u64,
}

// ================================
// CONFIGURACIÓN DE SERVICIOS
// ================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ServiceTemplate {
    pub name: String,
    pub pattern: String,
    pub example: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ServiceConfig {
    pub name: String,
    pub base_url: String,
    pub templates: Vec<ServiceTemplate>,
}

// ================================
// CONFIGURACIÓN DE ENTORNOS
// ================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Environment {
    pub key: String,
    pub name: String,
    pub prefix: String,  // sandbox3-, sandbox8-, o vacío para prod
}

// ================================
// FUNCIONES HELPER PARA CONFIGURACIÓN
// ================================

pub fn get_environments() -> Vec<Environment> {
    vec![
        Environment {
            key: "sandbox3".to_string(),
            name: "Sandbox 3".to_string(),
            prefix: "sandbox3-".to_string(),
        },
        Environment {
            key: "sandbox8".to_string(),
            name: "Sandbox 8".to_string(),
            prefix: "sandbox8-".to_string(),
        },
        Environment {
            key: "production".to_string(),
            name: "Production".to_string(),
            prefix: "".to_string(),
        },
    ]
}

pub fn get_services() -> HashMap<String, ServiceConfig> {
    let mut services = HashMap::new();

    // Study Definition - URL CORREGIDA
    services.insert("study-definition".to_string(), ServiceConfig {
        name: "Study Definition".to_string(),
        base_url: "kap-studydef.azurewebsites.net".to_string(), // ✅ Agregado 'kap-'
        templates: vec![
            ServiceTemplate {
                name: "Study Details".to_string(),
                pattern: "/studies/{STUDY_ID}".to_string(),
                example: "/studies/KAP810451268".to_string(),
            },
            ServiceTemplate {
                name: "Custom Path".to_string(),
                pattern: "{CUSTOM_PATH}".to_string(),
                example: "/studies/list".to_string(),
            },
        ],
    });

    // Questionnaire Factory - URL CORREGIDA
    services.insert("questionnaire-factory".to_string(), ServiceConfig {
        name: "Questionnaire Factory".to_string(),
        base_url: "kap-qfactory.azurewebsites.net".to_string(), // ✅ Agregado 'kap-'
        templates: vec![
            ServiceTemplate {
                name: "Wave Details".to_string(),
                pattern: "/waves/{WAVE_ID}".to_string(),
                example: "/waves/4d3009d9-dc7d-4449-835b-91962359460c".to_string(),
            },
            ServiceTemplate {
                name: "All Questions in Wave".to_string(),
                pattern: "/waves/{WAVE_ID}/all-questions".to_string(),
                example: "/waves/4d3009d9-dc7d-4449-835b-91962359460c/all-questions".to_string(),
            },
            ServiceTemplate {
                name: "List Replacements".to_string(),
                pattern: "/waves/{WAVE_ID}/list_replacements".to_string(),
                example: "/waves/4d3009d9-dc7d-4449-835b-91962359460c/list_replacements".to_string(),
            },
            ServiceTemplate {
                name: "Custom Path".to_string(),
                pattern: "{CUSTOM_PATH}".to_string(),
                example: "/products/list".to_string(),
            },
        ],
    });

    // Azure File Manager - URL CORREGIDA
    services.insert("azure-file-manager".to_string(), ServiceConfig {
        name: "Azure File Manager".to_string(),
        base_url: "kap-azure-file-manager.azurewebsites.net/api".to_string(), // ✅ Agregado 'kap-'
        templates: vec![
            ServiceTemplate {
                name: "File List".to_string(),
                pattern: "/files/{PATH}".to_string(),
                example: "/files/uploads".to_string(),
            },
            ServiceTemplate {
                name: "Custom Path".to_string(),
                pattern: "{CUSTOM_PATH}".to_string(),
                example: "/files/download".to_string(),
            },
        ],
    });

    // User Store - URL CORREGIDA
    services.insert("user-store".to_string(), ServiceConfig {
        name: "User Store".to_string(),
        base_url: "kap-userstore.azurewebsites.net".to_string(), // ✅ Agregado 'kap-'
        templates: vec![
            ServiceTemplate {
                name: "User Info".to_string(),
                pattern: "/users/{USER_ID}".to_string(),
                example: "/users/12345".to_string(),
            },
            ServiceTemplate {
                name: "Custom Path".to_string(),
                pattern: "{CUSTOM_PATH}".to_string(),
                example: "/users/profile".to_string(),
            },
        ],
    });

    // Common Data - URL CORREGIDA
    services.insert("common-data".to_string(), ServiceConfig {
        name: "Common Data".to_string(),
        base_url: "kap-commondata.azurewebsites.net".to_string(), // ✅ Agregado 'kap-'
        templates: vec![
            ServiceTemplate {
                name: "Data Query".to_string(),
                pattern: "/data/{TYPE}".to_string(),
                example: "/data/countries".to_string(),
            },
            ServiceTemplate {
                name: "Custom Path".to_string(),
                pattern: "{CUSTOM_PATH}".to_string(),
                example: "/data/languages".to_string(),
            },
        ],
    });

    // Product Template - URL CORREGIDA
    services.insert("product-template".to_string(), ServiceConfig {
        name: "Product Template".to_string(),
        base_url: "kap-product-template.azurewebsites.net/api".to_string(), // ✅ Ya tenía 'kap-'
        templates: vec![
            ServiceTemplate {
                name: "Product Template".to_string(),
                pattern: "/producttemplate/product/{PRODUCT_NAME}?version={VERSION}&language={LANGUAGE}".to_string(),
                example: "/producttemplate/product/Linkplustv?version=15&language=en-us".to_string(),
            },
        ],
    });

    // Tesseract Schema - URL CORREGIDA
    services.insert("tesseract-schema".to_string(), ServiceConfig {
        name: "Tesseract Schema".to_string(),
        base_url: "kap-tesseract-pre-prod.azurewebsites.net".to_string(), // ✅ Agregado 'kap-'
        templates: vec![
            ServiceTemplate {
                name: "Product Outputs".to_string(),
                pattern: "/kap/product/outputs/{PRODUCT_NAME}".to_string(),
                example: "/kap/product/outputs/Linkplustv".to_string(),
            },
        ],
    });

    services
}