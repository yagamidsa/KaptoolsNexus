// src-tauri/src/database.rs - Versión simplificada que SÍ funciona
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

// Función de validación sin async problems
#[command]
pub async fn validate_database_connection(db_path: String) -> Result<DatabaseResponse, String> {
    println!("🔗 Attempting to validate database connection to: {}", db_path);
    
    if !Path::new(&db_path).exists() {
        println!("❌ Database file not found: {}", db_path);
        return Ok(DatabaseResponse {
            success: false,
            user_count: None,
            error: Some("Something is failing, contact the KapTools Nexus administrator or check your VPN connection must be active to continue...".to_string()),
        });
    }

    match sqlite::open(&db_path) {
        Ok(connection) => {
            // Configurar timeout para evitar locks
            let _ = connection.execute("PRAGMA busy_timeout = 5000");
            let _ = connection.execute("PRAGMA journal_mode = WAL");
            
            match connection.prepare("SELECT COUNT(*) as user_count FROM usage_data") {
                Ok(mut statement) => {
                    match statement.next() {
                        Ok(sqlite::State::Row) => {
                            let user_count: i64 = statement.read::<i64, _>("user_count").unwrap_or(0);
                            println!("✅ Database connection successful! Users: {}", user_count);
                            Ok(DatabaseResponse {
                                success: true,
                                user_count: Some(user_count as u32),
                                error: None,
                            })
                        }
                        Ok(sqlite::State::Done) => {
                            println!("✅ Database connected, table exists but is empty");
                            Ok(DatabaseResponse {
                                success: true,
                                user_count: Some(0),
                                error: None,
                            })
                        }
                        Err(e) => {
                            println!("❌ Error executing query: {}", e);
                            Ok(DatabaseResponse {
                                success: false,
                                user_count: None,
                                error: Some("Database query failed".to_string()),
                            })
                        }
                    }
                }
                Err(e) => {
                    println!("❌ Error preparing statement: {}", e);
                    Ok(DatabaseResponse {
                        success: false,
                        user_count: None,
                        error: Some("Database table validation failed".to_string()),
                    })
                }
            }
        }
        Err(e) => {
            println!("❌ Error connecting to database: {}", e);
            Ok(DatabaseResponse {
                success: false,
                user_count: None,
                error: Some("Something is failing, contact the KapTools Nexus administrator or check your VPN connection must be active to continue...".to_string()),
            })
        }
    }
}

// Función para obtener usuario actual
#[command]
pub async fn get_current_user() -> Result<String, String> {
    println!("👤 Getting current system user...");
    
    let username = std::env::var("USERNAME")
        .or_else(|_| std::env::var("USER"))
        .unwrap_or_else(|_| "SystemUser".to_string());

    println!("✅ Current user identified: {}", username);
    Ok(username)
}

// REEMPLAZA update_user_connection - CON AMBOS FIXES
#[command]
pub async fn update_user_connection(db_path: String, username: String) -> Result<bool, String> {
    println!("📝 Updating connection for user: {}", username);
    
    match sqlite::open(&db_path) {
        Ok(connection) => {
            let _ = connection.execute("PRAGMA busy_timeout = 5000");
            let _ = connection.execute("PRAGMA journal_mode = WAL");
            
            // FIX 1: Usar fecha LOCAL del PC, no UTC
            let current_date = chrono::Local::now().format("%Y-%m-%d").to_string();
            let current_datetime = chrono::Local::now().to_rfc3339();
            println!("📅 Current LOCAL date: {}", current_date);
            println!("🕐 Current LOCAL datetime: {}", current_datetime);
            
            // BUSCAR USUARIO (sin importar fecha)
            let check_query = "SELECT number_of_times FROM usage_data WHERE user = ?";
            
            match connection.prepare(check_query) {
                Ok(mut statement) => {
                    statement.bind((1, username.as_str())).unwrap();
                    
                    println!("🔍 Searching for user '{}'", username);
                    
                    match statement.next() {
                        Ok(sqlite::State::Row) => {
                            // USUARIO EXISTE - sumar +1 y actualizar fecha
                            let current_count: i64 = statement.read::<i64, _>("number_of_times").unwrap_or(0);
                            let new_count = current_count + 1;
                            
                            println!("✅ User EXISTS! Updating count from {} to {} and date to {}", 
                                    current_count, new_count, current_date);
                            
                            drop(statement);
                            
                            // Agregar last_connection si existe la columna
                            let update_query = "UPDATE usage_data SET number_of_times = ?, date = ? WHERE user = ?";
                            match connection.prepare(update_query) {
                                Ok(mut update_stmt) => {
                                    update_stmt.bind((1, new_count)).unwrap();
                                    update_stmt.bind((2, current_date.as_str())).unwrap();
                                    update_stmt.bind((3, username.as_str())).unwrap();
                                    
                                    match update_stmt.next() {
                                        Ok(_) => {
                                            println!("✅ User updated successfully");
                                            Ok(true)
                                        },
                                        Err(e) => {
                                            println!("❌ Error updating user: {}", e);
                                            Err("Failed to update user".to_string())
                                        }
                                    }
                                }
                                Err(e) => {
                                    println!("❌ Error preparing update: {}", e);
                                    Err("Failed to prepare update".to_string())
                                }
                            }
                        }
                        Ok(sqlite::State::Done) => {
                            // USUARIO NO EXISTE - crear nuevo
                            println!("➕ User NOT found, creating new user");
                            
                            drop(statement);
                            
                            let insert_query = "INSERT INTO usage_data (user, number_of_times, date) VALUES (?, 1, ?)";
                            match connection.prepare(insert_query) {
                                Ok(mut insert_stmt) => {
                                    insert_stmt.bind((1, username.as_str())).unwrap();
                                    insert_stmt.bind((2, current_date.as_str())).unwrap();
                                    
                                    match insert_stmt.next() {
                                        Ok(_) => {
                                            println!("✅ New user created successfully");
                                            Ok(true)
                                        },
                                        Err(e) => {
                                            println!("❌ Error creating user: {}", e);
                                            Err("Failed to create user".to_string())
                                        }
                                    }
                                }
                                Err(e) => {
                                    println!("❌ Error preparing insert: {}", e);
                                    Err("Failed to prepare insert".to_string())
                                }
                            }
                        }
                        Err(e) => {
                            println!("❌ Error checking user: {}", e);
                            Err("Failed to check user".to_string())
                        }
                    }
                }
                Err(e) => {
                    println!("❌ Error preparing check: {}", e);
                    Err("Failed to prepare check".to_string())
                }
            }
        }
        Err(e) => {
            println!("❌ Error connecting: {}", e);
            Err("Failed to connect".to_string())
        }
    }
}

// Función para obtener datos del dashboard
#[command]
pub async fn get_dashboard_data(db_path: String) -> Result<String, String> {
    println!("📊 Getting dashboard data from: {}", db_path);
    
    match sqlite::open(&db_path) {
        Ok(connection) => {
            let _ = connection.execute("PRAGMA busy_timeout = 3000");
            
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
                    println!("❌ Error preparing dashboard query: {}", e);
                    return Err("Failed to prepare dashboard query".to_string());
                }
            }
            
            let dashboard_response = json!({
                "success": true,
                "users": users_data,
                "statistics": {
                    "total_users": users_data.len(),
                    "total_connections": users_data.iter().map(|u| u.connections as u64).sum::<u64>(),
                },
                "timestamp": chrono::Utc::now().to_rfc3339()
            });
            
            Ok(dashboard_response.to_string())
        }
        Err(e) => {
            println!("❌ Error connecting to database for dashboard: {}", e);
            Err("Failed to connect to database".to_string())
        }
    }
}

// Función simplificada de inicialización
#[command]
pub async fn initialize_user_session(db_path: String, username: String) -> Result<String, String> {
    println!("🚀 Initializing user session for: {}", username);
    
    // Simplemente llamar a update_user_connection
    match update_user_connection(db_path, username.clone()).await {
        Ok(true) => {
            let response = json!({
                "success": true,
                "message": "User session initialized successfully",
                "user": username,
                "connection_updated": true,
                "timestamp": chrono::Utc::now().to_rfc3339()
            });
            
            println!("🎉 User session initialization completed for: {}", username);
            Ok(response.to_string())
        }
        Ok(false) => {
            Err("Failed to update user connection".to_string())
        }
        Err(e) => {
            println!("❌ User connection update error: {}", e);
            Err(e)
        }
    }
}