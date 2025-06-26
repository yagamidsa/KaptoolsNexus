// src-tauri/src/database.rs
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::command;
use serde_json::json;

#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseResponse {
    success: bool,
    user_count: Option<u32>,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserData {
    user: String,
    connections: u32,
    last_connection: String,
    percentage: f32,
}

// AGREGAR estas funciones básicas a src-tauri/src/database.rs

#[command]
pub async fn test_dashboard_connection(db_path: String) -> Result<String, String> {
    println!("🧪 Testing dashboard connection...");
    
    // Test básico de conexión
    let db_test = validate_database_connection(db_path.clone()).await?;
    if !db_test.success {
        return Err("Database connection failed".to_string());
    }
    
    // Test de datos del dashboard
    let dashboard_data = get_dashboard_data(db_path).await?;
    
    let test_results = json!({
        "success": true,
        "message": "Dashboard connection test passed",
        "database_connected": db_test.success,
        "user_count": db_test.user_count,
        "data_available": !dashboard_data.is_empty(),
        "timestamp": chrono::Utc::now().to_rfc3339()
    });
    
    println!("✅ Dashboard connection test completed successfully");
    Ok(test_results.to_string())
}

#[command]
pub async fn initialize_user_session(db_path: String, username: String) -> Result<String, String> {
    println!("🚀 Initializing user session for: {}", username);
    
    // Actualizar conexión del usuario
    let update_result = update_user_connection(db_path.clone(), username.clone()).await?;
    
    if update_result {
        // Obtener datos actualizados del dashboard
        let dashboard_data = get_dashboard_data(db_path).await?;
        
        let response = json!({
            "success": true,
            "message": "User session initialized successfully",
            "user": username,
            "connection_updated": update_result,
            "dashboard_data": serde_json::from_str::<serde_json::Value>(&dashboard_data).unwrap_or(json!({})),
            "timestamp": chrono::Utc::now().to_rfc3339()
        });
        
        Ok(response.to_string())
    } else {
        Err("Failed to initialize user session".to_string())
    }
}

// Mejorar la función get_dashboard_data existente para incluir porcentajes
#[command]
pub async fn get_dashboard_data_enhanced(db_path: String) -> Result<String, String> {
    println!("📊 Getting enhanced dashboard data from: {}", db_path);
    
    match sqlite::open(&db_path) {
        Ok(connection) => {
            // Obtener el máximo de conexiones para calcular porcentajes
            let max_query = "SELECT MAX(number_of_times) as max_connections FROM usage_data";
            let mut max_connections = 1i64;
            
            if let Ok(mut stmt) = connection.prepare(max_query) {
                if let Ok(sqlite::State::Row) = stmt.next() {
                    max_connections = stmt.read::<i64, _>("max_connections").unwrap_or(1);
                }
            }
            
            // Query principal con porcentajes calculados
            let query = "
                SELECT 
                    user,
                    number_of_times as connections,
                    date as last_connection,
                    last_connection as last_connection_time,
                    ROUND((CAST(number_of_times AS FLOAT) / ? * 100), 0) as percentage
                FROM usage_data 
                ORDER BY number_of_times DESC
                LIMIT 20
            ";
            
            let mut users_data = Vec::new();
            
            match connection.prepare(query) {
                Ok(mut statement) => {
                    statement.bind((1, max_connections)).unwrap();
                    
                    while let Ok(sqlite::State::Row) = statement.next() {
                        let user: String = statement.read::<String, _>("user").unwrap_or_default();
                        let connections: i64 = statement.read::<i64, _>("connections").unwrap_or(0);
                        let last_connection: String = statement.read::<String, _>("last_connection").unwrap_or_default();
                        let last_connection_time: String = statement.read::<String, _>("last_connection_time").unwrap_or_default();
                        let percentage: f64 = statement.read::<f64, _>("percentage").unwrap_or(0.0);
                        
                        users_data.push(UserData {
                            user,
                            connections: connections as u32,
                            last_connection: if !last_connection_time.is_empty() { 
                                last_connection_time 
                            } else { 
                                last_connection 
                            },
                            percentage: percentage as f32,
                        });
                    }
                }
                Err(e) => {
                    println!("❌ Error preparing enhanced dashboard query: {}", e);
                    return Err("Failed to prepare dashboard query".to_string());
                }
            }
            
            // Estadísticas adicionales
            let stats_query = "
                SELECT 
                    COUNT(*) as total_users,
                    SUM(number_of_times) as total_connections,
                    AVG(number_of_times) as avg_connections
                FROM usage_data
            ";
            
            let mut total_users = 0i64;
            let mut total_connections = 0i64;
            let mut avg_connections = 0.0f64;
            
            if let Ok(mut stmt) = connection.prepare(stats_query) {
                if let Ok(sqlite::State::Row) = stmt.next() {
                    total_users = stmt.read::<i64, _>("total_users").unwrap_or(0);
                    total_connections = stmt.read::<i64, _>("total_connections").unwrap_or(0);
                    avg_connections = stmt.read::<f64, _>("avg_connections").unwrap_or(0.0);
                }
            }
            
            let dashboard_response = json!({
                "success": true,
                "users": users_data,
                "statistics": {
                    "total_users": total_users,
                    "total_connections": total_connections,
                    "average_connections": avg_connections,
                    "max_connections": max_connections
                },
                "timestamp": chrono::Utc::now().to_rfc3339()
            });
            
            Ok(dashboard_response.to_string())
        }
        Err(e) => {
            println!("❌ Error connecting to database for enhanced dashboard: {}", e);
            Err("Failed to connect to database".to_string())
        }
    }
}


#[command]
pub async fn get_current_user() -> Result<String, String> {
    // Obtener el nombre de usuario actual del sistema
    match std::env::var("USERNAME").or_else(|_| std::env::var("USER")) {
        Ok(username) => {
            println!("👤 Current user: {}", username);
            Ok(username)
        }
        Err(e) => {
            println!("❌ Error getting current user: {}", e);
            Err("Failed to get current user".to_string())
        }
    }
}

#[command]
pub async fn validate_database_connection(db_path: String) -> Result<DatabaseResponse, String> {
    println!("Attempting to validate database connection to: {}", db_path);
    
    // Verificar si el archivo existe
    if !Path::new(&db_path).exists() {
        return Ok(DatabaseResponse {
            success: false,
            user_count: None,
            error: Some("Something is failing, contact the KapTools Nexus administrator or check your VPN connection must be active to continue...".to_string()),
        });
    }

    // Intentar conectar a la base de datos SQLite
    match sqlite::open(&db_path) {
        Ok(connection) => {
            // Intentar consultar la tabla usage_data
            match connection.prepare("SELECT COUNT(*) as user_count FROM usage_data") {
                Ok(mut statement) => {
                    match statement.next() {
                        Ok(sqlite::State::Row) => {
                            let user_count: i64 = statement.read::<i64, _>("user_count").unwrap_or(0);
                            Ok(DatabaseResponse {
                                success: true,
                                user_count: Some(user_count as u32),
                                error: None,
                            })
                        }
                        Ok(sqlite::State::Done) => {
                            // Tabla existe pero está vacía
                            Ok(DatabaseResponse {
                                success: true,
                                user_count: Some(0),
                                error: None,
                            })
                        }
                        Err(e) => {
                            println!("Error executing query: {}", e);
                            Ok(DatabaseResponse {
                                success: false,
                                user_count: None,
                                error: Some("Something is failing, contact the KapTools Nexus administrator or check your VPN connection must be active to continue...".to_string()),
                            })
                        }
                    }
                }
                Err(e) => {
                    println!("Error preparing statement: {}", e);
                    // Intentar crear la tabla si no existe
                    match create_usage_table(&connection) {
                        Ok(_) => {
                            Ok(DatabaseResponse {
                                success: true,
                                user_count: Some(0),
                                error: None,
                            })
                        }
                        Err(_) => {
                            Ok(DatabaseResponse {
                                success: false,
                                user_count: None,
                                error: Some("Something is failing, contact the KapTools Nexus administrator or check your VPN connection must be active to continue...".to_string()),
                            })
                        }
                    }
                }
            }
        }
        Err(e) => {
            println!("Error connecting to database: {}", e);
            Ok(DatabaseResponse {
                success: false,
                user_count: None,
                error: Some("Something is failing, contact the KapTools Nexus administrator or check your VPN connection must be active to continue...".to_string()),
            })
        }
    }
}

fn create_usage_table(connection: &sqlite::Connection) -> Result<(), sqlite::Error> {
    let create_table_sql = "
        CREATE TABLE IF NOT EXISTS usage_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL,
            number_of_times INTEGER DEFAULT 1,
            date TEXT NOT NULL,
            last_connection DATETIME DEFAULT CURRENT_TIMESTAMP
        )";
    
    connection.execute(create_table_sql)
}

#[command]
pub async fn get_dashboard_data(db_path: String) -> Result<String, String> {
    println!("Getting dashboard data from: {}", db_path);
    
    match sqlite::open(&db_path) {
        Ok(connection) => {
            let query = "
                SELECT 
                    user,
                    number_of_times as connections,
                    date as last_connection,
                    ROUND((CAST(number_of_times AS FLOAT) / 
                        (SELECT MAX(number_of_times) FROM usage_data) * 100), 0) as percentage
                FROM usage_data 
                ORDER BY number_of_times DESC
                LIMIT 20
            ";
            
            let mut users_data = Vec::new();
            
            match connection.prepare(query) {
                Ok(mut statement) => {
                    while let Ok(sqlite::State::Row) = statement.next() {
                        let user: String = statement.read::<String, _>("user").unwrap_or_default();
                        let connections: i64 = statement.read::<i64, _>("connections").unwrap_or(0);
                        let last_connection: String = statement.read::<String, _>("last_connection").unwrap_or_default();
                        let percentage: f64 = statement.read::<f64, _>("percentage").unwrap_or(0.0);
                        
                        users_data.push(UserData {
                            user,
                            connections: connections as u32,
                            last_connection,
                            percentage: percentage as f32,
                        });
                    }
                }
                Err(e) => {
                    println!("Error preparing dashboard query: {}", e);
                    return Err("Failed to prepare dashboard query".to_string());
                }
            }
            
            // Calcular estadísticas adicionales
            let total_connections_query = "SELECT SUM(number_of_times) as total FROM usage_data";
            let avg_connections_query = "SELECT AVG(number_of_times) as average FROM usage_data";
            
            let mut total_connections = 0i64;
            let mut avg_connections = 0.0f64;
            
            if let Ok(mut stmt) = connection.prepare(total_connections_query) {
                if let Ok(sqlite::State::Row) = stmt.next() {
                    total_connections = stmt.read::<i64, _>("total").unwrap_or(0);
                }
            }
            
            if let Ok(mut stmt) = connection.prepare(avg_connections_query) {
                if let Ok(sqlite::State::Row) = stmt.next() {
                    avg_connections = stmt.read::<f64, _>("average").unwrap_or(0.0);
                }
            }
            
            let dashboard_response = json!({
                "success": true,
                "users": users_data,
                "statistics": {
                    "total_users": users_data.len(),
                    "total_connections": total_connections,
                    "average_connections": avg_connections
                },
                "timestamp": chrono::Utc::now().to_rfc3339()
            });
            
            Ok(dashboard_response.to_string())
        }
        Err(e) => {
            println!("Error connecting to database for dashboard: {}", e);
            Err("Failed to connect to database".to_string())
        }
    }
}

#[command]
pub async fn update_user_connection(db_path: String, username: String) -> Result<bool, String> {
    println!("Updating connection for user: {}", username);
    
    match sqlite::open(&db_path) {
        Ok(connection) => {
            let current_date = chrono::Utc::now().format("%Y-%m-%d").to_string();
            let current_datetime = chrono::Utc::now().to_rfc3339();
            
            // Verificar si el usuario ya existe para hoy
            let check_query = "SELECT number_of_times FROM usage_data WHERE user = ? AND date = ?";
            
            match connection.prepare(check_query) {
                Ok(mut statement) => {
                    statement.bind((1, username.as_str())).unwrap();
                    statement.bind((2, current_date.as_str())).unwrap();
                    
                    match statement.next() {
                        Ok(sqlite::State::Row) => {
                            // Usuario existe, incrementar contador
                            let current_count: i64 = statement.read::<i64, _>("number_of_times").unwrap_or(0);
                            let new_count = current_count + 1;
                            
                            let update_query = "UPDATE usage_data SET number_of_times = ?, last_connection = ? WHERE user = ? AND date = ?";
                            match connection.prepare(update_query) {
                                Ok(mut update_stmt) => {
                                    update_stmt.bind((1, new_count)).unwrap();
                                    update_stmt.bind((2, current_datetime.as_str())).unwrap();
                                    update_stmt.bind((3, username.as_str())).unwrap();
                                    update_stmt.bind((4, current_date.as_str())).unwrap();
                                    
                                    match update_stmt.next() {
                                        Ok(_) => Ok(true),
                                        Err(e) => {
                                            println!("Error updating user connection: {}", e);
                                            Err("Failed to update user connection".to_string())
                                        }
                                    }
                                }
                                Err(e) => {
                                    println!("Error preparing update statement: {}", e);
                                    Err("Failed to prepare update statement".to_string())
                                }
                            }
                        }
                        Ok(sqlite::State::Done) => {
                            // Usuario no existe, crear nuevo registro
                            let insert_query = "INSERT INTO usage_data (user, number_of_times, date, last_connection) VALUES (?, 1, ?, ?)";
                            match connection.prepare(insert_query) {
                                Ok(mut insert_stmt) => {
                                    insert_stmt.bind((1, username.as_str())).unwrap();
                                    insert_stmt.bind((2, current_date.as_str())).unwrap();
                                    insert_stmt.bind((3, current_datetime.as_str())).unwrap();
                                    
                                    match insert_stmt.next() {
                                        Ok(_) => Ok(true),
                                        Err(e) => {
                                            println!("Error inserting new user: {}", e);
                                            Err("Failed to insert new user".to_string())
                                        }
                                    }
                                }
                                Err(e) => {
                                    println!("Error preparing insert statement: {}", e);
                                    Err("Failed to prepare insert statement".to_string())
                                }
                            }
                        }
                        Err(e) => {
                            println!("Error checking user existence: {}", e);
                            Err("Failed to check user existence".to_string())
                        }
                    }
                }
                Err(e) => {
                    println!("Error preparing check statement: {}", e);
                    Err("Failed to prepare check statement".to_string())
                }
            }
        }
        Err(e) => {
            println!("Error connecting to database for user update: {}", e);
            Err("Failed to connect to database".to_string())
        }
    }
}