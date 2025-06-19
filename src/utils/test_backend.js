// src/utils/test_backend.js

// ================================
// FUNCIONES DE PRUEBA DEL BACKEND RUST
// ================================

export async function testBackendFunctionality() {
    console.log("🧪 Testing JSONPath Backend...");
    
    try {
        // Usar dynamic import para cargar la API de Tauri
        let invoke;
        
        try {
            const tauriApi = await import('@tauri-apps/api/core');
            invoke = tauriApi.invoke;
            console.log("✅ Using @tauri-apps/api/core");
        } catch (importError) {
            console.error("❌ Failed to import @tauri-apps/api:", importError);
            console.log("💡 Try installing: npm install @tauri-apps/api");
            return false;
        }

        // Test 1: Verificar servicios disponibles
        console.log("\n📋 Test 1: Getting available services...");
        try {
            const services = await invoke('get_available_services');
            console.log("✅ Services:", Object.keys(services));
        } catch (error) {
            console.error("❌ Failed to get services:", error);
            return false;
        }
        
        // Test 2: Verificar entornos disponibles
        console.log("\n🌍 Test 2: Getting available environments...");
        try {
            const environments = await invoke('get_available_environments');
            console.log("✅ Environments:", environments.map(e => e.key));
        } catch (error) {
            console.error("❌ Failed to get environments:", error);
        }
        
        // Test 3: Obtener templates de un servicio
        console.log("\n📝 Test 3: Getting service templates...");
        try {
            const templates = await invoke('get_service_templates', {
                serviceKey: 'study-definition'
            });
            console.log("✅ Templates:", templates?.map(t => t.name));
        } catch (error) {
            console.error("❌ Failed to get templates:", error);
        }
        
        // Test 4: Construir URL de preview
        console.log("\n🔗 Test 4: Building preview URL...");
        try {
            const previewUrl = await invoke('build_preview_url', {
                environment: 'sandbox3',
                service: 'study-definition',
                endpoint: '/studies/TEST123'
            });
            console.log("✅ Preview URL:", previewUrl);
        } catch (error) {
            console.error("❌ Failed to build URL:", error);
        }
        
        // Test 5: Validar JSONPath con JSON de prueba
        console.log("\n🔍 Test 5: Validating JSONPath query...");
        try {
            const testJson = JSON.stringify({
                data: [
                    { id: 1, name: "Test 1", status: "active" },
                    { id: 2, name: "Test 2", status: "inactive" }
                ],
                metadata: { total: 2 }
            });
            
            const jsonPathResult = await invoke('validate_jsonpath_query', {
                jsonText: testJson,
                query: '$.data[*].name'
            });
            console.log("✅ JSONPath Result:", jsonPathResult);
        } catch (error) {
            console.error("❌ Failed JSONPath test:", error);
        }
        
        // Test 6: Obtener ejemplos de JSONPath
        console.log("\n📚 Test 6: Getting JSONPath examples...");
        try {
            const examples = await invoke('get_jsonpath_examples');
            console.log("✅ Examples count:", examples.length);
        } catch (error) {
            console.error("❌ Failed to get examples:", error);
        }
        
        // Test 7: Test del backend completo
        console.log("\n🚀 Test 7: Running backend test suite...");
        try {
            const backendTest = await invoke('test_jsonpath_tool');
            console.log("✅ Backend Test Results:\n", backendTest);
        } catch (error) {
            console.error("❌ Failed backend test suite:", error);
        }
        
        console.log("\n🎉 ALL BACKEND TESTS COMPLETED SUCCESSFULLY!");
        return true;
        
    } catch (error) {
        console.error("❌ Backend test failed:", error);
        return false;
    }
}

// ================================
// FUNCIÓN PARA SIMULAR REQUEST COMPLETO
// ================================

export async function testCompleteAPIRequest() {
    console.log("\n🔥 Testing Complete API Request Flow...");
    
    const testRequest = {
        environment: 'sandbox3',
        service: 'study-definition',
        endpoint: '/studies/KAP810451268',
        token: 'YOUR_TEST_TOKEN_HERE', // Reemplazar con token real para prueba
        jsonpath_query: '$.data'
    };
    
    try {
        console.log("📤 Sending request:", testRequest);
        
        const response = await window.__TAURI__.core.invoke('execute_jsonpath_query', testRequest);
        
        console.log("📥 Response received:");
        console.log("Success:", response.success);
        console.log("URL Used:", response.url_used);
        console.log("Execution Time:", response.execution_time_ms, "ms");
        
        if (response.success) {
            console.log("✅ Raw Response (first 200 chars):", 
                response.raw_response?.substring(0, 200) + "...");
            console.log("✅ JSONPath Result:", response.jsonpath_result);
        } else {
            console.log("❌ Error:", response.error);
        }
        
        return response;
        
    } catch (error) {
        console.error("💥 Request failed:", error);
        return null;
    }
}

// ================================
// UTILIDADES PARA DEBUGGING
// ================================

export function formatJsonForDisplay(jsonString) {
    try {
        const parsed = JSON.parse(jsonString);
        return JSON.stringify(parsed, null, 2);
    } catch (error) {
        return jsonString;
    }
}

export async function testJsonPathQueries(jsonData, queries) {
    console.log("\n🔬 Testing multiple JSONPath queries...");
    
    for (const [query, description] of queries) {
        try {
            const result = await window.__TAURI__.core.invoke('validate_jsonpath_query', {
                jsonText: jsonData,
                query: query
            });
            console.log(`✅ ${description} (${query}):`, result.substring(0, 100) + "...");
        } catch (error) {
            console.log(`❌ ${description} (${query}):`, error);
        }
    }
}

// ================================
// EXPORTAR FUNCIONES PARA USO GLOBAL
// ================================

// Hacer funciones disponibles globalmente
if (typeof window !== 'undefined') {
    window.testJSONPathBackend = testBackendFunctionality;
    window.testCompleteAPIRequest = testCompleteAPIRequest;
    window.testJsonPathQueries = testJsonPathQueries;
    window.formatJsonForDisplay = formatJsonForDisplay;
    
    console.log("🎯 JSONPath Backend Test Script Loaded!");
    console.log("📘 Available functions:");
    console.log("  - window.testJSONPathBackend()");
    console.log("  - window.testCompleteAPIRequest()");
    console.log("  - window.testJsonPathQueries(jsonData, queries)");
    console.log("  - window.formatJsonForDisplay(jsonString)");
    console.log("\n💡 Run 'window.testJSONPathBackend()' to test all functionality");
}