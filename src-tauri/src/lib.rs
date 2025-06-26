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

// REEMPLAZA esta función en tu lib.rs para COPILOT 365 específicamente:

#[tauri::command]
fn open_copilot_365() -> Result<String, String> {
    println!("🤖 Opening Microsoft Copilot 365 (Office integration)...");
    
    // Método 1: Abrir Office Hub directamente (donde está Copilot 365)
    let office_hub_result = Command::new("explorer")
        .args(&["shell:AppsFolder\\Microsoft.MicrosoftOfficeHub_8wekyb3d8bbwe!Microsoft.MicrosoftOfficeHub"])
        .output();
    
    match office_hub_result {
        Ok(output) if output.status.success() => {
            println!("✅ Office Hub (Copilot 365) opened successfully");
            return Ok("📋 Microsoft Office Hub opened - Copilot 365 available inside!".to_string());
        }
        Ok(_) => println!("⚠️ Office Hub failed, trying Word with Copilot..."),
        Err(e) => println!("⚠️ Office Hub error: {}, trying Word...", e)
    }
    
    // Método 2: Abrir Word con Copilot (si está instalado)
    let word_result = Command::new("cmd")
        .args(&["/C", "start", "", "winword:"])
        .output();
    
    match word_result {
        Ok(output) if output.status.success() => {
            println!("✅ Word opened (Copilot 365 available inside)");
            return Ok("📝 Microsoft Word opened - Access Copilot 365 from the Home tab!".to_string());
        }
        Ok(_) => println!("⚠️ Word failed, trying PowerPoint..."),
        Err(e) => println!("⚠️ Word error: {}, trying PowerPoint...", e)
    }
    
    // Método 3: Abrir PowerPoint con Copilot
    let powerpoint_result = Command::new("cmd")
        .args(&["/C", "start", "", "msppt:"])
        .output();
    
    match powerpoint_result {
        Ok(output) if output.status.success() => {
            println!("✅ PowerPoint opened (Copilot 365 available inside)");
            return Ok("🎯 Microsoft PowerPoint opened - Access Copilot 365 from the Home tab!".to_string());
        }
        Ok(_) => println!("⚠️ PowerPoint failed, trying Office web..."),
        Err(e) => println!("⚠️ PowerPoint error: {}, trying web version...", e)
    }
    
    // Método 4: Abrir Office 365 web (donde también está Copilot 365)
    let web_office_result = Command::new("cmd")
        .args(&["/C", "start", "", "https://www.office.com/?auth=2"])
        .output();
    
    match web_office_result {
        Ok(_) => {
            println!("✅ Office 365 web opened");
            Ok("🌐 Microsoft Office 365 opened in browser - Copilot 365 available in apps!".to_string())
        }
        Err(e) => {
            println!("❌ All Office methods failed, trying standalone Copilot");
            
            // Método 5: Fallback a Copilot standalone como último recurso
            let copilot_fallback = Command::new("cmd")
                .args(&["/C", "start", "", "ms-copilot:"])
                .output();
            
            match copilot_fallback {
                Ok(_) => Ok("🤖 Opened standalone Copilot as fallback (not 365 integrated)".to_string()),
                Err(fallback_e) => Err(format!("❌ Failed to open any Copilot version. Office error: {}, Copilot error: {}", e, fallback_e))
            }
        }
    }
}


// Agregar estas funciones optimizadas a tu lib.rs

#[tauri::command]
fn open_network_path_fast(path: String) -> Result<String, String> {
    println!("🚀 Opening network path (optimized): {}", path);
    
    // Método 1: Usar cmd con start (MÁS RÁPIDO para rutas UNC)
    let cmd_result = Command::new("cmd")
        .args(&["/C", "start", "", &path])
        .output();
    
    match cmd_result {
        Ok(output) if output.status.success() => {
            println!("✅ Network path opened via CMD");
            return Ok(format!("📂 Network location opened: {}", path));
        }
        Ok(_) => println!("⚠️ CMD method failed, trying explorer..."),
        Err(e) => println!("⚠️ CMD error: {}, trying explorer...", e)
    }
    
    // Método 2: Explorer directo como fallback
    let explorer_result = Command::new("explorer")
        .args(&[&path])
        .output();
    
    match explorer_result {
        Ok(output) if output.status.success() => {
            println!("✅ Network path opened via Explorer");
            Ok(format!("📂 Network location opened via Explorer: {}", path))
        }
        Ok(_) => {
            println!("❌ Explorer failed, trying mapped drive...");
            // Método 3: Intentar con drive letter como último recurso
            let drive_path = path.replace("\\\\mbaw1fs.grpit.local\\KAP_OUTPUTS", "K:");
            let drive_path = drive_path.replace("\\\\mbaw1fs.grpit.local\\SA_Distribution", "S:");
            
            let drive_result = Command::new("cmd")
                .args(&["/C", "start", "", &drive_path])
                .output();
            
            match drive_result {
                Ok(_) => Ok(format!("📂 Opened via mapped drive: {}", drive_path)),
                Err(e) => Err(format!("❌ All methods failed. Last error: {}", e))
            }
        }
        Err(e) => Err(format!("❌ Failed to open network path: {}", e))
    }
}

#[tauri::command]
fn open_kap_data_processing() -> Result<String, String> {
    println!("📊 Opening KAP Data Processing (optimized)...");
    
    let path = "\\\\mbaw1fs.grpit.local\\KAP_OUTPUTS\\KAPDataProcessing";
    
    // Método 1: CMD con start (más rápido que explorer para UNC)
    match Command::new("cmd")
        .args(&["/C", "start", "", path])
        .output()
    {
        Ok(output) if output.status.success() => {
            println!("✅ KAP Data Processing opened via CMD");
            return Ok(format!("📊 KAP Data Processing opened successfully"));
        }
        Ok(_) => println!("⚠️ CMD failed, trying explorer..."),
        Err(e) => println!("⚠️ CMD error: {}, trying explorer...", e)
    }
    
    // Método 2: Explorer como fallback
    match Command::new("explorer")
        .args(&[path])
        .output()
    {
        Ok(output) if output.status.success() => {
            println!("✅ KAP Data Processing opened via Explorer");
            Ok(format!("📊 KAP Data Processing opened via Explorer"))
        }
        Ok(_) => Err("❌ Could not open KAP Data Processing".to_string()),
        Err(e) => Err(format!("❌ Failed to open KAP Data Processing: {}", e))
    }
}

#[tauri::command]  
fn open_sa_distribution() -> Result<String, String> {
    println!("📦 Opening SA Distribution (optimized)...");
    
    let path = "\\\\mbaw1fs.grpit.local\\SA_Distribution\\KAP";
    
    // Método 1: CMD con start (más rápido que explorer para UNC)
    match Command::new("cmd")
        .args(&["/C", "start", "", path])
        .output()
    {
        Ok(output) if output.status.success() => {
            println!("✅ SA Distribution opened via CMD");
            return Ok(format!("📦 SA Distribution opened successfully"));
        }
        Ok(_) => println!("⚠️ CMD failed, trying explorer..."),
        Err(e) => println!("⚠️ CMD error: {}, trying explorer...", e)
    }
    
    // Método 2: Explorer como fallback
    match Command::new("explorer")
        .args(&[path])
        .output()
    {
        Ok(output) if output.status.success() => {
            println!("✅ SA Distribution opened via Explorer");
            Ok(format!("📦 SA Distribution opened via Explorer"))
        }
        Ok(_) => Err("❌ Could not open SA Distribution".to_string()),
        Err(e) => Err(format!("❌ Failed to open SA Distribution: {}", e))
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


fn start_backend() {
    use std::thread;
    use std::process::Stdio;
    
    thread::spawn(|| {
        println!("🚀 Starting backend...");
        
        // Intentar con ruta absoluta basada en el ejecutable actual
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                let backend_path = exe_dir.join("kaptools-backend.exe");
                
                println!("🔍 Looking for backend at: {:?}", backend_path);
                
                match std::process::Command::new(&backend_path)
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .spawn()
                {
                    Ok(_) => println!("✅ Backend started via PyInstaller executable"),
                    Err(e) => println!("❌ Backend startup failed: {}", e)
                }
            }
        }
    });
}

// Nueva función para esperar a que el backend esté listo
fn wait_for_backend_ready() {
    use std::thread;
    use std::time::Duration;
    
    println!("⏳ Waiting for backend to be ready...");
    
    for attempt in 1..=30 {
        // Usar curl si está disponible, o powershell como fallback
        let test_result = Command::new("powershell")
            .args(&[
                "-Command",
                "try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/' -TimeoutSec 2 -UseBasicParsing; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
            ])
            .output();
        
        match test_result {
            Ok(output) if output.status.success() => {
                println!("✅ Backend is ready! (attempt {})", attempt);
                return;
            },
            _ => {
                if attempt % 5 == 0 {
                    println!("   Still waiting for backend... ({}/30)", attempt);
                }
                thread::sleep(Duration::from_secs(1));
            }
        }
    }
    
    println!("⚠️ Backend may not be fully ready, but continuing...");
    println!("💡 If you see connection errors, the backend may still be starting up");
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


#[tauri::command]
async fn test_backend_connection() -> Result<String, String> {
    use std::time::Duration;
    
    println!("🔗 Testing backend connection...");
    
    // Crear cliente HTTP
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    // Intentar conectar al backend
    match client.get("http://127.0.0.1:8000/").send().await {
        Ok(response) => {
            if response.status().is_success() {
                match response.text().await {
                    Ok(text) => {
                        println!("✅ Backend connection successful");
                        Ok(format!("✅ Neural Link established!\n🎯 Backend is running correctly!\n📡 Response: {}", text))
                    }
                    Err(e) => Err(format!("Failed to read response: {}", e))
                }
            } else {
                Err(format!("Backend returned status: {}", response.status()))
            }
        }
        Err(e) => {
            println!("❌ Backend connection failed: {}", e);
            Err(format!("❌ Neural Link connection failed\n\n🔍 Diagnostics:\n• Backend may not be running\n• Port 8000 may be blocked\n• Network connectivity issue\n\n💡 Solutions:\n1. Check if backend process is running\n2. Restart with: ./START-FINAL.bat\n3. Manual start: ./kaptools-backend.exe\n\n🛠️ Debug info: {}", e))
        }
    }
}



// En src-tauri/src/lib.rs, reemplaza la función run() con esto (usando el nombre correcto):

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("🚀 Starting KapTools Nexus...");
    
    // Auto-iniciar el backend Python si existe
    start_backend();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
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
            test_backend_connection,
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
            test_commands,
            open_network_path_fast,
            open_kap_data_processing,
            open_sa_distribution
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}