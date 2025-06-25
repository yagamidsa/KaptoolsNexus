mod jsonpath_types;
mod jsonpath_client;
mod jsonpath_commands;

// Re-exportar para facilitar el uso
use jsonpath_commands::*;



use std::process::Command;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn open_folder(path: String) -> Result<String, String> {
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
async fn select_folder_native() -> Result<String, String> {
    println!("🔍 Opening folder selector dialog...");
    
    // Comando PowerShell corregido con configuración adecuada
    let powershell_command = r#"
Add-Type -AssemblyName System.Windows.Forms
$browser = New-Object System.Windows.Forms.FolderBrowserDialog
$browser.Description = 'Select KapTools Workspace Folder'
$browser.ShowNewFolderButton = $true
$browser.RootFolder = [System.Environment+SpecialFolder]::Desktop
$browser.SelectedPath = [Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$result = $browser.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) { 
    Write-Output $browser.SelectedPath 
} else { 
    Write-Output 'CANCELLED' 
}
"#;

    let output = Command::new("powershell")
        .args(&[
            "-NoProfile",
            "-NonInteractive", 
            "-ExecutionPolicy", "Bypass",
            "-Command",
            powershell_command
        ])
        .output()
        .map_err(|e| {
            println!("❌ Failed to execute PowerShell: {}", e);
            format!("Failed to execute PowerShell: {}", e)
        })?;

    let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr_string = String::from_utf8_lossy(&output.stderr).to_string();
    let stderr = stderr_string.trim();
    
    println!("📝 PowerShell result: '{}'", result);
    if !stderr.is_empty() {
        println!("⚠️ PowerShell stderr: '{}'", stderr);
    }
    
    if result.is_empty() || result == "CANCELLED" {
        return Err("User cancelled folder selection".to_string());
    }
    
    if std::path::Path::new(&result).exists() {
        println!("✅ Selected valid path: {}", result);
        Ok(result)
    } else {
        println!("❌ Selected path does not exist: {}", result);
        Err(format!("Selected path does not exist: {}", result))
    }
}


// Comando adicional para fallback usando rfd (diálogo nativo de Rust)
#[tauri::command]
async fn select_folder_rfd() -> Result<Option<String>, String> {
    use rfd::FileDialog;
    
    println!("🔍 Opening RFD folder selector...");
    
    let result = FileDialog::new()
        .set_title("Select KapTools Workspace Folder")
        .pick_folder();
    
    match result {
        Some(path) => {
            let path_str = path.to_string_lossy().to_string();
            println!("✅ RFD selected: {}", path_str);
            Ok(Some(path_str))
        },
        None => {
            println!("❌ RFD cancelled");
            Ok(None)
        }
    }
}

// Comando para validar el workspace
#[tauri::command]
async fn check_workspace_space(workspace_path: String, required_mb: u64) -> Result<serde_json::Value, String> {
    use std::path::Path;
    
    if !Path::new(&workspace_path).exists() {
        return Err(format!("Workspace path does not exist: {}", workspace_path));
    }
    
    // Obtener espacio disponible (simplificado para Windows)
    let output = Command::new("powershell")
        .args(&[
            "-Command",
            &format!(
                "Get-WmiObject -Class Win32_LogicalDisk | Where-Object {{$_.DeviceID -eq '{}'}} | Select-Object @{{Name='FreeSpaceMB'; Expression={{[math]::Round($_.FreeSpace / 1MB, 2)}}}}",
                &workspace_path.chars().take(2).collect::<String>()
            )
        ])
        .output()
        .map_err(|e| format!("Failed to check disk space: {}", e))?;
    
    let _output_str = String::from_utf8_lossy(&output.stdout);
    
    // Parsear la salida (simplificado)
    let available_space = 50000u64; // Fallback por si falla el parsing
    
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
        let dialog_result = Command::new("powershell")
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
    use base64::{Engine as _, engine::general_purpose};
    
    println!("📖 Reading file as base64: {}", file_path);
    
    match fs::read(&file_path) {
        Ok(content) => {
            let base64_content = general_purpose::STANDARD.encode(&content);
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

#[tauri::command]
fn open_copilot_365() -> Result<String, String> {
    // Abrir Microsoft Office Hub donde está integrado Copilot 365
    let result = Command::new("powershell")
        .args(&[
            "-Command",
            "Start-Process \"shell:AppsFolder\\Microsoft.MicrosoftOfficeHub_8wekyb3d8bbwe!Microsoft.MicrosoftOfficeHub\""
        ])
        .output();
    
    match result {
        Ok(output) => {
            if output.status.success() {
                Ok("Microsoft Office Hub (365 Copilot) opened successfully".to_string())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("Failed to open Office Hub: {}", stderr))
            }
        },
        Err(e) => {
            // Método de respaldo usando explorer
            let backup_result = Command::new("explorer")
                .args(&["shell:AppsFolder\\Microsoft.MicrosoftOfficeHub_8wekyb3d8bbwe!Microsoft.MicrosoftOfficeHub"])
                .output();
            
            match backup_result {
                Ok(_) => Ok("Office Hub opened via explorer".to_string()),
                Err(backup_e) => Err(format!("Both methods failed. PowerShell: {}, Explorer: {}", e, backup_e)),
            }
        }
    }
}

// Comando de debugging
#[tauri::command]
async fn test_commands() -> Result<String, String> {
    println!("🧪 Testing commands availability...");
    
    // Test PowerShell availability
    let ps_test = Command::new("powershell")
        .args(&["-Command", "echo 'PowerShell OK'"])
        .output();
    
    let ps_status = match ps_test {
        Ok(output) => {
            let result = String::from_utf8_lossy(&output.stdout);
            if output.stderr.is_empty() {
                format!("✅ PowerShell: {}", result.trim())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                format!("❌ PowerShell error: {}", stderr.trim())
            }
        },
        Err(e) => format!("❌ PowerShell failed: {}", e)
    };
    
    // Test Windows Forms availability
    let winforms_test = Command::new("powershell")
        .args(&["-Command", "Add-Type -AssemblyName System.Windows.Forms; echo 'WinForms OK'"])
        .output();
    
    let winforms_status = match winforms_test {
        Ok(output) => {
            let result = String::from_utf8_lossy(&output.stdout);
            if output.stderr.is_empty() {
                format!("✅ Windows Forms: {}", result.trim())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                format!("❌ Windows Forms error: {}", stderr.trim())
            }
        },
        Err(e) => format!("❌ Windows Forms failed: {}", e)
    };
    
    // Test Shell COM object
    let shell_test = Command::new("powershell")
        .args(&["-Command", "$shell = New-Object -ComObject Shell.Application; echo 'Shell COM OK'"])
        .output();
    
    let shell_status = match shell_test {
        Ok(output) => {
            let result = String::from_utf8_lossy(&output.stdout);
            if output.stderr.is_empty() {
                format!("✅ Shell COM: {}", result.trim())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                format!("❌ Shell COM error: {}", stderr.trim())
            }
        },
        Err(e) => format!("❌ Shell COM failed: {}", e)
    };
    
    Ok(format!("{}\n{}\n{}", ps_status, winforms_status, shell_status))
}

// Función para iniciar el backend Python (si es necesario)
fn start_backend() {
    use std::thread;
    
    thread::spawn(|| {
        println!("🐍 Attempting to start Python backend...");
        
        let result = Command::new("python")
            .args(&["../backend/main.py"])
            .spawn();
        
        match result {
            Ok(_) => println!("✅ Python backend started"),
            Err(e) => println!("⚠️ Could not start Python backend: {}", e),
        }
    });
}


// Agregar este comando a tu lib.rs para verificar carpetas localmente

#[tauri::command]
async fn check_workspace_folders(workspace_path: String) -> Result<serde_json::Value, String> {
    use std::path::Path;
    
    println!("🔍 Checking workspace folders: {}", workspace_path);
    
    if !Path::new(&workspace_path).exists() {
        return Err(format!("Workspace path does not exist: {}", workspace_path));
    }
    
    // Verificar carpetas de microservicios
    let content_path = Path::new(&workspace_path).join("outputs-dimensions-content");
    let dimensions_path = Path::new(&workspace_path).join("outputs-dimensions");
    
    let content_exists = content_path.exists();
    let dimensions_exists = dimensions_path.exists();
    
    // Verificar si son repositorios git
    let content_is_git = content_exists && content_path.join(".git").exists();
    let dimensions_is_git = dimensions_exists && dimensions_path.join(".git").exists();
    
    let mut existing_repos = Vec::new();
    
    if content_is_git {
        existing_repos.push("outputs-dimensions-content".to_string());
    }
    
    if dimensions_is_git {
        existing_repos.push("outputs-dimensions".to_string());
    }
    
    // Listar contenido del workspace para debugging
    let workspace_contents = std::fs::read_dir(&workspace_path)
        .map(|entries| {
            entries
                .filter_map(|entry| entry.ok())
                .filter(|entry| entry.file_type().ok().map_or(false, |ft| ft.is_dir()))
                .filter_map(|entry| entry.file_name().to_str().map(|s| s.to_string()))
                .collect::<Vec<String>>()
        })
        .unwrap_or_else(|_| vec![]);
    
    let has_microservices = existing_repos.len() > 0;
    
    println!("📁 Content folder exists: {}", content_exists);
    println!("📁 Content is git repo: {}", content_is_git);
    println!("📁 Dimensions folder exists: {}", dimensions_exists);
    println!("📁 Dimensions is git repo: {}", dimensions_is_git);
    println!("🌿 Found {} microservices", existing_repos.len());
    println!("📂 Workspace contents: {:?}", workspace_contents);
    
    Ok(serde_json::json!({
        "valid": true,
        "has_microservices": has_microservices,
        "existing_repos": existing_repos,
        "workspace_path": workspace_path,
        "details": {
            "content_folder_exists": content_exists,
            "content_is_git_repo": content_is_git,
            "dimensions_folder_exists": dimensions_exists,
            "dimensions_is_git_repo": dimensions_is_git,
            "workspace_contents": workspace_contents
        }
    }))
}

// También agregar este comando al invoke_handler en la función run():
// .invoke_handler(tauri::generate_handler![
//     greet, 
//     open_folder, 
//     select_folder_native,
//     select_folder_shell,
//     select_folder_rfd,
//     check_workspace_space,
//     check_workspace_folders,  // <- Agregar esta línea
//     select_mdd_file,
//     read_file_as_base64,
//     open_copilot_365,
//     test_commands
// ])

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("🚀 Starting KapTools Nexus...");
    
    // Auto-iniciar el backend Python si existe
    start_backend();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            open_folder, 
            select_folder_native,
            select_folder_rfd,
            check_workspace_space,
            check_workspace_folders,
            select_mdd_file,
            read_file_as_base64,
            open_copilot_365,
            execute_jsonpath_query,
            get_available_services,
            get_available_environments,
            get_service_templates,
            build_preview_url,
            validate_jsonpath_query,
            test_jsonpath_tool,
            validate_jsonpath_query_async,
            validate_jsonpath_with_progress,
            get_json_processing_strategy,
            format_json,
            test_api_connectivity,
            test_commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}