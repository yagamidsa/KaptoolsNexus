#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
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
async fn select_folder_native() -> Result<String, String> {
    use std::process::Command;
    
    let powershell_command = r#"
Add-Type -AssemblyName System.Windows.Forms
$browser = New-Object System.Windows.Forms.FolderBrowserDialog
$browser.Description = 'Select KapTools Workspace Folder'
$browser.ShowNewFolderButton = $true
$browser.RootFolder = 'MyComputer'
if ($browser.ShowDialog() -eq 'OK') { $browser.SelectedPath } else { 'CANCELLED' }
"#;

    let output = Command::new("powershell")
        .args(&[
            "-NoProfile",
            "-NonInteractive", 
            "-Command",
            powershell_command
        ])
        .output()
        .map_err(|e| format!("Failed to execute PowerShell: {}", e))?;

    let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
    
    if result.is_empty() || result == "CANCELLED" {
        return Err("User cancelled folder selection".to_string());
    }
    
    if std::path::Path::new(&result).exists() {
        Ok(result)
    } else {
        Err(format!("Selected path does not exist: {}", result))
    }
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![greet, open_folder, select_folder_native])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}