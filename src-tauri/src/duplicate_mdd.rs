use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs::File;
use std::io::{Read, BufReader, BufRead, Seek, SeekFrom};
use std::collections::HashMap;

// Re-export del módulo processor
pub use crate::mdd_processor::*;

#[derive(Debug, Serialize, Deserialize)]
pub struct MddFileInfo {
    pub mdd_path: String,
    pub ddf_path: String,
    pub base_name: String,
    pub mdd_size: u64,
    pub ddf_size: u64,
    pub record_count: Option<u32>,
    pub is_valid: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DuplicationRequest {
    pub mdd_file_path: String,
    pub duplicate_count: u32,
    pub workspace_path: String,
    pub options: DuplicationOptions,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DuplicationOptions {
    pub include_metadata_validation: bool,
    pub generate_verification_report: bool,
    pub auto_open_result_folder: bool,
    pub keep_temp_files: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicationProgress {
    pub step: String,
    pub progress_percent: f32,
    pub records_processed: u32,
    pub total_records: u32,
    pub elapsed_seconds: u64,
    pub estimated_remaining_seconds: u64,
    pub current_speed: f32, // records per second
    pub memory_usage_mb: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DuplicationResult {
    pub success: bool,
    pub output_file_path: String,
    pub original_records: u32,
    pub final_records: u32,
    pub processing_time_seconds: u64,
    pub output_file_size_mb: f32,
    pub error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileValidationResult {
    pub is_valid: bool,
    pub mdd_exists: bool,
    pub ddf_exists: bool,
    pub mdd_path: String,
    pub ddf_path: String,
    pub error_message: Option<String>,
    pub file_info: Option<MddFileInfo>,
}

// Error types específicos para Duplicate MDD
#[derive(Debug, thiserror::Error)]
pub enum DuplicateMddError {
    #[error("File not found: {0}")]
    FileNotFound(String),
    
    #[error("Invalid file format: {0}")]
    InvalidFileFormat(String),
    
    #[error("Insufficient disk space: need {needed}MB, available {available}MB")]
    InsufficientDiskSpace { needed: u64, available: u64 },
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    
    #[error("Zip error: {0}")]
    ZipError(#[from] zip::result::ZipError),


    #[error("Parsing error: {0}")]
    ParseError(String),
    
    #[error("Processing error: {0}")]
    ProcessingError(String),
}

impl serde::Serialize for DuplicateMddError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

// Result type específico
pub type DuplicateMddResult<T> = Result<T, DuplicateMddError>;

// Estructura para información de archivo MDD parseada
#[derive(Debug, Serialize, Deserialize)]
pub struct MddFileStructure {
    pub header: MddHeader,
    pub variables: Vec<MddVariable>,
    pub data_offset: u64,
    pub record_size: u32,
    pub estimated_records: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MddHeader {
    pub signature: String,
    pub version: String,
    pub creation_date: String,
    pub description: String,
    pub record_count: u32,
    pub variable_count: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MddVariable {
    pub name: String,
    pub label: String,
    pub var_type: MddVariableType,
    pub position: u32,
    pub width: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum MddVariableType {
    Text,
    Number,
    Date,
    Boolean,
    Categorical,
    Unknown,
}

// Funciones de validación y lectura
impl MddFileInfo {
    pub fn parse_mdd_file(file_path: &str) -> DuplicateMddResult<MddFileStructure> {
        let mut file = File::open(file_path)?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)?;
        
        // Verificar signature MDD
        if buffer.len() < 4 {
            return Err(DuplicateMddError::InvalidFileFormat(
                "File too small to be valid MDD".to_string()
            ));
        }
        
        // Leer header básico
        let header = Self::parse_mdd_header(&buffer)?;
        
        // Para archivos MDD, intentar leer estructura básica
        let structure = MddFileStructure {
            header,
            variables: Vec::new(), // TODO: Implementar parsing de variables
            data_offset: 0,
            record_size: 0,
            estimated_records: 0,
        };
        
        Ok(structure)
    }
    
    fn parse_mdd_header(buffer: &[u8]) -> DuplicateMddResult<MddHeader> {
        // Parsing básico del header MDD
        // Los archivos MDD pueden tener diferentes formatos, 
        // implementamos detección básica
        
        Ok(MddHeader {
            signature: "MDD".to_string(),
            version: "Unknown".to_string(),
            creation_date: "Unknown".to_string(),
            description: "".to_string(),
            record_count: 0,
            variable_count: 0,
        })
    }
    
    pub fn parse_ddf_file(file_path: &str) -> DuplicateMddResult<Vec<MddVariable>> {
        let file = File::open(file_path)?;
        let reader = BufReader::new(file);
        let mut variables = Vec::new();
        
        for (line_num, line) in reader.lines().enumerate() {
            let line = line?;
            
            // Skip empty lines and comments
            if line.trim().is_empty() || line.trim().starts_with('#') {
                continue;
            }
            
            // Parse variable definition from DDF
            if let Some(variable) = Self::parse_ddf_line(&line)? {
                variables.push(variable);
            }
        }
        
        Ok(variables)
    }
    
    fn parse_ddf_line(line: &str) -> DuplicateMddResult<Option<MddVariable>> {
        // Parsing básico de líneas DDF
        // Formato típico: variable_name "Label" type(width)
        
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.is_empty() {
            return Ok(None);
        }
        
        // Implementación básica - necesita refinamiento según formato real
        Ok(Some(MddVariable {
            name: parts[0].to_string(),
            label: if parts.len() > 1 { parts[1].to_string() } else { String::new() },
            var_type: MddVariableType::Unknown,
            position: 0,
            width: 0,
        }))
    }
    
    pub fn estimate_file_info(mdd_path: &str, ddf_path: &str) -> DuplicateMddResult<MddFileInfo> {
        let mdd_metadata = std::fs::metadata(mdd_path)?;
        let ddf_metadata = std::fs::metadata(ddf_path)?;
        
        // Intentar parsear archivos para obtener información más precisa
        let estimated_records = match Self::estimate_record_count(mdd_path) {
            Ok(count) => Some(count),
            Err(_) => None,
        };
        
        let base_name = PathBuf::from(mdd_path)
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        
        Ok(MddFileInfo {
            mdd_path: mdd_path.to_string(),
            ddf_path: ddf_path.to_string(),
            base_name,
            mdd_size: mdd_metadata.len(),
            ddf_size: ddf_metadata.len(),
            record_count: estimated_records,
            is_valid: true,
        })
    }
    
    fn estimate_record_count(mdd_path: &str) -> DuplicateMddResult<u32> {
        let metadata = std::fs::metadata(mdd_path)?;
        let file_size = metadata.len();
        
        // Estimación básica: asumir ~200 bytes por record promedio
        // Esto debería refinarse según el formato real del archivo
        let estimated_record_size = 200;
        let estimated_records = (file_size / estimated_record_size) as u32;
        
        Ok(estimated_records.max(1))
    }
    
    pub fn validate_mdd_integrity(mdd_path: &str, ddf_path: &str) -> DuplicateMddResult<Vec<String>> {
        let mut validation_messages = Vec::new();
        
        // Verificar que los archivos existan
        if !PathBuf::from(mdd_path).exists() {
            validation_messages.push("MDD file not found".to_string());
        }
        
        if !PathBuf::from(ddf_path).exists() {
            validation_messages.push("DDF file not found".to_string());
        }
        
        // Verificar tamaños de archivos
        if let Ok(mdd_metadata) = std::fs::metadata(mdd_path) {
            if mdd_metadata.len() == 0 {
                validation_messages.push("MDD file is empty".to_string());
            }
        }
        
        if let Ok(ddf_metadata) = std::fs::metadata(ddf_path) {
            if ddf_metadata.len() == 0 {
                validation_messages.push("DDF file is empty".to_string());
            }
        }
        
        // Verificar compatibilidad básica entre MDD y DDF
        match (Self::parse_mdd_file(mdd_path), Self::parse_ddf_file(ddf_path)) {
            (Ok(_mdd_struct), Ok(_ddf_vars)) => {
                // TODO: Verificar que las variables del DDF coincidan con el MDD
                validation_messages.push("Files appear to be compatible".to_string());
            },
            (Err(e), _) => {
                validation_messages.push(format!("MDD parsing error: {}", e));
            },
            (_, Err(e)) => {
                validation_messages.push(format!("DDF parsing error: {}", e));
            }
        }
        
        Ok(validation_messages)
    }
}