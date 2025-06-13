#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::process::Command;
use std::thread;
use std::time::Duration;
use std::env;

fn start_backend() {
    thread::spawn(|| {
        println!("🚀 Iniciando KapTools Backend...");
        
        // Esperar más tiempo para que la aplicación principal termine de cargar
        thread::sleep(Duration::from_secs(3));
        
        let exe_path = match env::current_exe() {
            Ok(path) => path,
            Err(e) => {
                println!("❌ Error obteniendo ruta del ejecutable: {}", e);
                return;
            }
        };
        
        let exe_dir = match exe_path.parent() {
            Some(dir) => dir,
            None => {
                println!("❌ No se pudo obtener el directorio del ejecutable");
                return;
            }
        };
        
        let backend_path = exe_dir.join("kaptools-backend.exe");
        
        println!("🔍 Buscando backend en: {:?}", backend_path);
        
        if !backend_path.exists() {
            println!("❌ Backend no encontrado!");
            return;
        }
        
        println!("✅ Backend encontrado, iniciando...");
        
        // Usar cmd para iniciar el backend de forma más robusta
        let result = Command::new("cmd")
            .args(["/C", "start", "/B", backend_path.to_str().unwrap()])
            .output();
        
        match result {
            Ok(output) => {
                if output.status.success() {
                    println!("🎉 Backend comando ejecutado exitosamente");
                    
                    // Esperar un poco y verificar que el puerto esté disponible
                    thread::sleep(Duration::from_secs(5));
                    
                    // Intentar conectar al backend para verificar
                    let check_result = Command::new("cmd")
                        .args(["/C", "netstat", "-an", "|", "findstr", "8000"])
                        .output();
                    
                    match check_result {
                        Ok(check_output) => {
                            let output_str = String::from_utf8_lossy(&check_output.stdout);
                            if output_str.contains("LISTENING") {
                                println!("✅ Backend está corriendo en puerto 8000");
                            } else {
                                println!("⚠️ Backend puede no estar corriendo en puerto 8000");
                            }
                        },
                        Err(e) => println!("⚠️ No se pudo verificar el puerto: {}", e),
                    }
                } else {
                    println!("❌ Error ejecutando comando del backend");
                    println!("Stderr: {}", String::from_utf8_lossy(&output.stderr));
                }
            },
            Err(e) => {
                println!("❌ Error al iniciar backend: {}", e);
                
                // Fallback: intentar ejecutar directamente
                println!("🔄 Intentando método alternativo...");
                match Command::new(&backend_path).spawn() {
                    Ok(child) => {
                        println!("✅ Backend iniciado directamente con PID: {}", child.id());
                    },
                    Err(e2) => {
                        println!("❌ También falló el método directo: {}", e2);
                    }
                }
            }
        }
    });
}


#[tauri::command]
async fn check_workspace_space(workspace_path: String, required_mb: u64) -> Result<serde_json::Value, String> {
    println!("💾 Checking workspace space: {} MB required", required_mb);
    
    let workspace = PathBuf::from(&workspace_path);
    
    if !workspace.exists() {
        return Err("Workspace path does not exist".to_string());
    }
    
    // En sistemas Windows/Linux, obtener espacio disponible
    // Implementación básica - puede refinarse según el sistema
    let available_space = match std::fs::metadata(&workspace) {
        Ok(_) => {
            // Estimación básica - en producción usaríamos APIs específicas del sistema
            let available_gb = 50; // Placeholder
            (available_gb * 1024) as u64
        },
        Err(e) => return Err(format!("Cannot access workspace: {}", e)),
    };
    
    let has_sufficient_space = available_space >= required_mb;
    let free_space_after = if has_sufficient_space {
        available_space - required_mb
    } else {
        available_space
    };
    
    Ok(serde_json::json!({
        "has_sufficient_space": has_sufficient_space,
        "available_mb": available_space,
        "required_mb": required_mb,
        "free_space_after_mb": free_space_after,
        "workspace_path": workspace_path,
        "warning": if !has_sufficient_space {
            Some(format!("Insufficient space: need {}MB, have {}MB", required_mb, available_space))
        } else {
            None
        }
    }))
}


#[tauri::command]
async fn select_folder() -> Result<Option<String>, String> {
    use std::sync::{Arc, Mutex};
    use std::sync::mpsc;
    use std::thread;
    use std::time::Duration;
    use uuid::Uuid;
    use serde::{Deserialize, Serialize};
    
    let (tx, rx) = mpsc::channel();
    let result = Arc::new(Mutex::new(None));
    let result_clone = Arc::clone(&result);
    
    // Crear el diálogo en un hilo separado
    thread::spawn(move || {
        // Usar PowerShell para mostrar el diálogo de selección de carpeta
        let dialog_result = std::process::Command::new("powershell")
            .args(&[
                "-Command",
                "Add-Type -AssemblyName System.Windows.Forms; $folder = New-Object System.Windows.Forms.FolderBrowserDialog; $folder.Description = 'Select Workspace Folder'; $folder.ShowNewFolderButton = $true; if ($folder.ShowDialog() -eq 'OK') { Write-Output $folder.SelectedPath }"
            ])
            .output();
        
        match dialog_result {
            Ok(output) => {
                let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path_str.is_empty() && path_str != "" {
                    let mut result_guard = result_clone.lock().unwrap();
                    *result_guard = Some(path_str);
                }
            },
            Err(_) => {
                // Fallback: usar un diálogo simple
            }
        }
        
        tx.send(()).unwrap();
    });
    
    // Esperar resultado con timeout
    match rx.recv_timeout(Duration::from_secs(30)) {
        Ok(_) => {
            let result_guard = result.lock().unwrap();
            Ok(result_guard.clone())
        },
        Err(_) => Ok(None) // Timeout
    }
}

#[tauri::command]
async fn open_folder(path: String) -> Result<String, String> {
    use std::process::Command;
    
    // Verificar que la ruta existe
    if !std::path::Path::new(&path).exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    
    // Abrir la carpeta en el explorador de archivos de Windows
    match Command::new("explorer")
        .arg(&path)
        .spawn()
    {
        Ok(_) => Ok(format!("Successfully opened folder: {}", path)),
        Err(e) => Err(format!("Failed to open folder: {}", e))
    }
}



#[tauri::command]
async fn select_mdd_file() -> Result<Option<String>, String> {
    use std::sync::{Arc, Mutex};
    use std::sync::mpsc;
    use std::thread;
    use std::time::Duration;
    
    println!("🔍 Opening MDD file selector...");
    
    let (tx, rx) = mpsc::channel();
    let result = Arc::new(Mutex::new(None));
    let result_clone = Arc::clone(&result);
    
    thread::spawn(move || {
        let dialog_result = std::process::Command::new("powershell")
            .args(&[
                "-Command",
                r#"
                Add-Type -AssemblyName System.Windows.Forms
                $file = New-Object System.Windows.Forms.OpenFileDialog
                $file.Filter = 'MDD Files (*.mdd)|*.mdd|All Files (*.*)|*.*'
                $file.Title = 'Select MDD File'
                if ($file.ShowDialog() -eq 'OK') { 
                    Write-Output $file.FileName 
                }
                "#
            ])
            .output();
        
        match dialog_result {
            Ok(output) => {
                let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path_str.is_empty() && std::path::Path::new(&path_str).exists() {
                    let mut result_guard = result_clone.lock().unwrap();
                    *result_guard = Some(path_str);
                }
            },
            Err(_) => {}
        }
        
        let _ = tx.send(());
    });
    
    match rx.recv_timeout(Duration::from_secs(60)) {
        Ok(_) => {
            let result_guard = result.lock().unwrap();
            Ok(result_guard.clone())
        },
        Err(_) => Ok(None)
    }
}


#[tauri::command]
async fn read_file_as_base64(file_path: String) -> Result<String, String> {
    use std::fs;
    
    println!("📖 Reading file as base64: {}", file_path);
    
    match fs::read(&file_path) {
        Ok(content) => {
            let base64_content = base64::encode(&content);
            println!("✅ File read successfully: {} bytes", content.len());
            Ok(base64_content)
        },
        Err(e) => {
            let error_msg = format!("Failed to read file {}: {}", file_path, e);
            println!("❌ {}", error_msg);
            Err(error_msg)
        }
    }
}

fn main() {
    println!("🚀 Iniciando KapTools Nexus...");
    
    // Auto-iniciar el backend Python existente
    start_backend();
    
    // Ejecutar aplicación Tauri con commands híbridos
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // Commands para Duplicate MDD (nativos en Rust)
            check_workspace_space,
            select_folder,
            open_folder,
            read_file_as_base64,
            select_mdd_file,
        ])
        .run(tauri::generate_context!())
        .expect("Error al ejecutar Tauri");
}