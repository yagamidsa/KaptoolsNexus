// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, Emitter};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;
use std::env;
use std::sync::Arc;

mod duplicate_mdd;
mod mdd_processor;
mod benchmark;
use duplicate_mdd::{
    DuplicationRequest, DuplicationResult, DuplicationProgress, 
    FileValidationResult, MddFileInfo
};
use mdd_processor::MddProcessor;
use benchmark::{MddBenchmark, run_performance_benchmark};

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
async fn start_duplication_with_progress(
    request: DuplicationRequest,
    app_handle: tauri::AppHandle
) -> Result<String, String> {
    println!("🚀 Starting MDD duplication with progress tracking");
    
    // Validar inputs
    if !PathBuf::from(&request.mdd_file_path).exists() {
        return Err("MDD file not found".to_string());
    }
    
    let ddf_path = PathBuf::from(&request.mdd_file_path).with_extension("ddf");
    if !ddf_path.exists() {
        return Err("DDF file not found".to_string());
    }
    
    // Crear procesador MDD
    let mut processor = MddProcessor::new(
        request.mdd_file_path.clone(),
        ddf_path.to_string_lossy().to_string(),
        request.workspace_path.clone(),
        request.duplicate_count,
        request.options,
    );
    
    // Configurar callback de progreso para enviar eventos al frontend
    let app_handle_clone = app_handle.clone();
    let progress_callback = Arc::new(move |progress: DuplicationProgress| {
        let _ = app_handle_clone.emit("duplication-progress", &progress);
    });

    
    processor.set_progress_callback(progress_callback);
    
    // Ejecutar procesamiento en background
    let process_id = uuid::Uuid::new_v4().to_string();
    
    // Spawn async task
    let app_handle_clone2 = app_handle.clone();
    let process_id_clone = process_id.clone();
    
    tokio::spawn(async move {
        match processor.process_duplication().await {
            Ok(result) => {
                let _ = app_handle_clone2.emit("duplication-complete", &result);
                println!("✅ Duplication completed successfully");
            },
            Err(e) => {
                let error_result = DuplicationResult {
                    success: false,
                    output_file_path: String::new(),
                    original_records: 0,
                    final_records: 0,
                    processing_time_seconds: 0,
                    output_file_size_mb: 0.0,
                    error_message: Some(format!("Processing failed: {}", e)),
                };
                let _ = app_handle_clone2.emit("duplication-error", &error_result);
                println!("❌ Duplication failed: {}", e);
            }
        }
    });
    
    Ok(process_id)
}

#[tauri::command]
async fn cancel_duplication(process_id: String) -> Result<bool, String> {
    println!("🛑 Cancelling duplication process: {}", process_id);
    
    // TODO: Implementar cancelación real
    // Por ahora, simulamos que la cancelación fue exitosa
    
    Ok(true)
}

#[tauri::command]
async fn get_duplication_status(process_id: String) -> Result<serde_json::Value, String> {
    println!("📊 Getting duplication status for: {}", process_id);
    
    // TODO: Implementar tracking real de procesos
    // Por ahora, retornar status simulado
    
    Ok(serde_json::json!({
        "process_id": process_id,
        "status": "running",
        "progress_percent": 45.0,
        "current_step": "Processing records...",
        "estimated_remaining_seconds": 120
    }))
}

#[tauri::command]
async fn validate_mdd_file(file_path: String) -> Result<FileValidationResult, String> {
    println!("🔍 Validating MDD file: {}", file_path);
    
    let mdd_path = PathBuf::from(&file_path);
    
    // Validar que el archivo .mdd existe
    if !mdd_path.exists() {
        return Ok(FileValidationResult {
            is_valid: false,
            mdd_exists: false,
            ddf_exists: false,
            mdd_path: file_path.clone(),
            ddf_path: String::new(),
            error_message: Some("MDD file not found".to_string()),
            file_info: None,
        });
    }
    
    // Auto-detectar archivo .ddf correspondiente
    let ddf_path = mdd_path.with_extension("ddf");
    let ddf_exists = ddf_path.exists();
    
    if !ddf_exists {
        return Ok(FileValidationResult {
            is_valid: false,
            mdd_exists: true,
            ddf_exists: false,
            mdd_path: file_path.clone(),
            ddf_path: ddf_path.to_string_lossy().to_string(),
            error_message: Some("Corresponding DDF file not found".to_string()),
            file_info: None,
        });
    }
    
    // Obtener información de archivos
    let mdd_metadata = std::fs::metadata(&mdd_path).map_err(|e| e.to_string())?;
    let ddf_metadata = std::fs::metadata(&ddf_path).map_err(|e| e.to_string())?;
    
    let file_info = MddFileInfo {
        mdd_path: file_path.clone(),
        ddf_path: ddf_path.to_string_lossy().to_string(),
        base_name: mdd_path.file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        mdd_size: mdd_metadata.len(),
        ddf_size: ddf_metadata.len(),
        record_count: None, // TODO: Implementar lectura de records
        is_valid: true,
    };
    
    Ok(FileValidationResult {
        is_valid: true,
        mdd_exists: true,
        ddf_exists: true,
        mdd_path: file_path,
        ddf_path: ddf_path.to_string_lossy().to_string(),
        error_message: None,
        file_info: Some(file_info),
    })
}

#[tauri::command]
async fn estimate_duplication_resources(
    file_path: String,
    duplicate_count: u32
) -> Result<(u64, u64), String> {
    println!("📊 Estimating resources for {} duplications", duplicate_count);
    
    let mdd_path = PathBuf::from(&file_path);
    let ddf_path = mdd_path.with_extension("ddf");
    
    // Calcular tamaños de archivos
    let mdd_size = std::fs::metadata(&mdd_path)
        .map_err(|e| e.to_string())?
        .len();
    let ddf_size = std::fs::metadata(&ddf_path)
        .map_err(|e| e.to_string())?
        .len();
    
    // Obtener información más precisa si es posible
    let (estimated_records, base_record_size) = match MddFileInfo::estimate_file_info(
        &file_path, 
        &ddf_path.to_string_lossy()
    ) {
        Ok(file_info) => {
            let records = file_info.record_count.unwrap_or(1000);
            let record_size = if records > 0 { 
                (mdd_size / records as u64).max(100) 
            } else { 
                200 
            };
            (records, record_size)
        },
        Err(_) => {
            // Fallback a estimación básica
            let estimated_records = (mdd_size / 200).max(1) as u32;
            (estimated_records, 200u64)
        }
    };
    
    println!("📈 File analysis: {} records, ~{} bytes per record", estimated_records, base_record_size);
    
    // Cálculo más preciso del tamaño final
    let records_after_duplication = estimated_records * duplicate_count;
    let estimated_mdd_output_size = (base_record_size * records_after_duplication as u64) + 1024; // +1KB header
    let estimated_ddf_output_size = ddf_size; // DDF no cambia mucho
    let compression_overhead = (estimated_mdd_output_size + estimated_ddf_output_size) / 4; // ZIP compression ~25%
    
    let total_estimated_size = estimated_mdd_output_size + estimated_ddf_output_size + compression_overhead;
    let estimated_size_mb = total_estimated_size / 1_048_576;
    
    // Cálculo de tiempo más realista basado en:
    // - Número de records a procesar
    // - Tamaño de archivos  
    // - Complejidad de duplicación
    let processing_complexity_factor = if duplicate_count > 10 { 1.5 } else { 1.0 };
    let base_time_per_mb = 2.0; // segundos por MB
    let record_processing_time = (records_after_duplication as f64 / 10000.0) * processing_complexity_factor; // 10k records per second
    
    let estimated_time_seconds = ((estimated_size_mb as f64 * base_time_per_mb) + record_processing_time).max(5.0) as u64;
    
    println!("💾 Estimated output: {}MB, ⏱️ ~{}s", estimated_size_mb, estimated_time_seconds);
    
    Ok((estimated_size_mb, estimated_time_seconds))
}

#[tauri::command]
async fn get_mdd_file_details(file_path: String) -> Result<serde_json::Value, String> {
    println!("📋 Getting detailed file information for: {}", file_path);
    
    let mdd_path = PathBuf::from(&file_path);
    let ddf_path = mdd_path.with_extension("ddf");
    
    // Obtener información básica
    let file_info = match MddFileInfo::estimate_file_info(
        &file_path,
        &ddf_path.to_string_lossy()
    ) {
        Ok(info) => info,
        Err(e) => return Err(format!("Failed to analyze file: {}", e)),
    };
    
    // Intentar parsear estructura MDD
    let mdd_structure = match MddFileInfo::parse_mdd_file(&file_path) {
        Ok(structure) => Some(structure),
        Err(e) => {
            println!("⚠️ Could not parse MDD structure: {}", e);
            None
        }
    };
    
    // Intentar parsear variables DDF
    let ddf_variables = match MddFileInfo::parse_ddf_file(&ddf_path.to_string_lossy()) {
        Ok(vars) => Some(vars),
        Err(e) => {
            println!("⚠️ Could not parse DDF variables: {}", e);
            None
        }
    };
    
    // Validar integridad
    let validation_messages = match MddFileInfo::validate_mdd_integrity(
        &file_path,
        &ddf_path.to_string_lossy()
    ) {
        Ok(messages) => messages,
        Err(e) => vec![format!("Validation error: {}", e)],
    };
    
    // Crear respuesta completa
    let response = serde_json::json!({
        "file_info": file_info,
        "mdd_structure": mdd_structure,
        "ddf_variables": ddf_variables,
        "validation_messages": validation_messages,
        "analysis_timestamp": chrono::Utc::now().to_rfc3339(),
        "file_paths": {
            "mdd": file_path,
            "ddf": ddf_path.to_string_lossy()
        }
    });
    
    Ok(response)
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
async fn duplicate_mdd_files(request: DuplicationRequest) -> Result<DuplicationResult, String> {
    println!("🚀 Starting MDD duplication: {:?}", request);
    
    // TODO: Implementar lógica de duplicación real
    // Por ahora, simulación
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    
    Ok(DuplicationResult {
        success: true,
        output_file_path: format!("{}/test_output.zip", request.workspace_path),
        original_records: 1000,
        final_records: 1000 * request.duplicate_count,
        processing_time_seconds: 120,
        output_file_size_mb: 145.5,
        error_message: None,
    })
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
async fn copy_file_to_destination(
    source_path: String,
    destination_folder: String,
    keep_original: bool
) -> Result<String, String> {
    println!("📤 Copying file from {} to {}", source_path, destination_folder);
    
    let source = PathBuf::from(&source_path);
    let destination_dir = PathBuf::from(&destination_folder);
    
    if !source.exists() {
        return Err("Source file not found".to_string());
    }
    
    if !destination_dir.exists() {
        return Err("Destination folder not found".to_string());
    }
    
    let file_name = source.file_name()
        .ok_or("Invalid source file name")?;
    let destination_file = destination_dir.join(file_name);
    
    // Perform copy operation
    std::fs::copy(&source, &destination_file)
        .map_err(|e| format!("Copy failed: {}", e))?;
    
    // Remove original if requested
    if !keep_original {
        std::fs::remove_file(&source)
            .map_err(|e| format!("Failed to remove original: {}", e))?;
    }
    
    Ok(destination_file.to_string_lossy().to_string())
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
            validate_mdd_file,
            estimate_duplication_resources,
            get_mdd_file_details,
            check_workspace_space,
            duplicate_mdd_files,
            start_duplication_with_progress,
            cancel_duplication,
            get_duplication_status,
            run_performance_benchmark,
            select_folder,
            open_folder,
            copy_file_to_destination,
            // Aquí puedes agregar más commands nativos según necesites
        ])
        .run(tauri::generate_context!())
        .expect("Error al ejecutar Tauri");
}