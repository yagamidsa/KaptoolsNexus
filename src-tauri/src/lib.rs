#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn select_folder() -> Result<Option<String>, String> {
    use std::sync::{Arc, Mutex};
    use std::sync::mpsc;
    use std::thread;
    use std::time::Duration;
    
    let (tx, rx) = mpsc::channel();
    let result = Arc::new(Mutex::new(None));
    let result_clone = Arc::clone(&result);
    
    // Crear el diálogo en un hilo separado
    thread::spawn(move || {
        
        // Simular un app handle (esto es un workaround)
        // Vamos a intentar un enfoque diferente
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        //.plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![greet, select_folder, open_folder])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}