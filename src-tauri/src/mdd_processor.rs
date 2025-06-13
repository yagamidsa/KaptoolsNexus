// src-tauri/src/mdd_processor.rs

use crate::duplicate_mdd::{
    DuplicationProgress, DuplicationOptions, DuplicationResult, DuplicateMddResult, 
    DuplicateMddError, MddVariable, MddVariableType, MddFileInfo
};
use std::fs::{File, OpenOptions};
use std::io::{Read, Write, BufReader, BufWriter, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use byteorder::{LittleEndian, ReadBytesExt, WriteBytesExt};
use zip::{ZipWriter, CompressionMethod};
use uuid::Uuid;
use chrono::Utc;

// Callback para reportar progreso
pub type ProgressCallback = Arc<dyn Fn(DuplicationProgress) + Send + Sync>;

#[derive(Debug, Clone)]
pub struct MddRecord {
    pub record_id: u32,
    pub data: Vec<u8>,
    pub variables: HashMap<String, MddFieldValue>,
}

#[derive(Debug, Clone)]
pub enum MddFieldValue {
    Text(String),
    Number(f64),
    Integer(i32),
    Boolean(bool),
    Null,
}

pub struct MddProcessor {
    pub input_mdd_path: String,
    pub input_ddf_path: String,
    pub output_directory: String,
    pub duplicate_count: u32,
    pub options: DuplicationOptions,
    pub progress_callback: Option<ProgressCallback>,
}

impl MddProcessor {
    pub fn new(
        mdd_path: String,
        ddf_path: String,
        output_dir: String,
        duplicate_count: u32,
        options: DuplicationOptions,
    ) -> Self {
        Self {
            input_mdd_path: mdd_path,
            input_ddf_path: ddf_path,
            output_directory: output_dir,
            duplicate_count,
            options,
            progress_callback: None,
        }
    }

    pub fn set_progress_callback(&mut self, callback: ProgressCallback) {
        self.progress_callback = Some(callback);
    }

    fn report_progress(&self, progress: DuplicationProgress) {
        if let Some(ref callback) = self.progress_callback {
            callback(progress.clone());
        }
        println!("📊 Progress: {}% - {}", progress.progress_percent, progress.step);
    }

    pub async fn process_duplication(&mut self) -> DuplicateMddResult<DuplicationResult> {
        let start_time = std::time::Instant::now();
        
        self.report_progress(DuplicationProgress {
            step: "Initializing duplication process...".to_string(),
            progress_percent: 0.0,
            records_processed: 0,
            total_records: 0,
            elapsed_seconds: 0,
            estimated_remaining_seconds: 0,
            current_speed: 0.0,
            memory_usage_mb: 0.0,
        });

        // PASO 1: Validación inicial
        self.validate_input_files()?;
        println!("✅ Validation completed");

        // PASO 2: Leer y parsear archivos originales
        let (original_records, ddf_variables) = self.load_original_files().await?;
        let total_records = original_records.len() as u32;
        
        self.report_progress(DuplicationProgress {
            step: format!("Loaded {} records from original files", total_records),
            progress_percent: 15.0,
            records_processed: 0,
            total_records,
            elapsed_seconds: start_time.elapsed().as_secs(),
            estimated_remaining_seconds: self.estimate_remaining_time(&start_time, 15.0),
            current_speed: total_records as f32 / start_time.elapsed().as_secs_f32(),
            memory_usage_mb: self.estimate_memory_usage(&original_records),
        });

        // PASO 3: Generar records duplicados
        let duplicated_records = self.generate_duplicated_records_optimized(&original_records).await?;
        let final_record_count = duplicated_records.len() as u32;

        self.report_progress(DuplicationProgress {
            step: format!("Generated {} duplicated records", final_record_count),
            progress_percent: 60.0,
            records_processed: final_record_count,
            total_records: final_record_count,
            elapsed_seconds: start_time.elapsed().as_secs(),
            estimated_remaining_seconds: self.estimate_remaining_time(&start_time, 60.0),
            current_speed: final_record_count as f32 / start_time.elapsed().as_secs_f32(),
            memory_usage_mb: self.estimate_memory_usage(&duplicated_records),
        });

        // PASO 4: Crear archivos de salida
        let output_file_path = self.create_output_files_optimized(&duplicated_records, &ddf_variables).await?;

        self.report_progress(DuplicationProgress {
            step: "Output files created successfully".to_string(),
            progress_percent: 85.0,
            records_processed: final_record_count,
            total_records: final_record_count,
            elapsed_seconds: start_time.elapsed().as_secs(),
            estimated_remaining_seconds: self.estimate_remaining_time(&start_time, 85.0),
            current_speed: final_record_count as f32 / start_time.elapsed().as_secs_f32(),
            memory_usage_mb: self.estimate_memory_usage(&duplicated_records),
        });

        // PASO 5: Crear ZIP final
        let zip_path = self.create_final_zip_optimized(&output_file_path).await?;
        let zip_size_mb = std::fs::metadata(&zip_path)?.len() as f32 / 1_048_576.0;

        // PASO 6: Generar reporte si está habilitado
        if self.options.generate_verification_report {
            self.create_performance_report(&zip_path, &start_time, total_records, final_record_count).await?;
        }

        self.report_progress(DuplicationProgress {
            step: "Process completed successfully!".to_string(),
            progress_percent: 100.0,
            records_processed: final_record_count,
            total_records: final_record_count,
            elapsed_seconds: start_time.elapsed().as_secs(),
            estimated_remaining_seconds: 0,
            current_speed: final_record_count as f32 / start_time.elapsed().as_secs_f32(),
            memory_usage_mb: zip_size_mb,
        });

        Ok(DuplicationResult {
            success: true,
            output_file_path: zip_path,
            original_records: total_records,
            final_records: final_record_count,
            processing_time_seconds: start_time.elapsed().as_secs(),
            output_file_size_mb: zip_size_mb,
            error_message: None,
        })
    }

    fn validate_input_files(&self) -> DuplicateMddResult<()> {
        if !PathBuf::from(&self.input_mdd_path).exists() {
            return Err(DuplicateMddError::FileNotFound(self.input_mdd_path.clone()));
        }
        
        if !PathBuf::from(&self.input_ddf_path).exists() {
            return Err(DuplicateMddError::FileNotFound(self.input_ddf_path.clone()));
        }
        
        Ok(())
    }

    fn estimate_remaining_time(&self, start_time: &std::time::Instant, current_progress: f32) -> u64 {
        if current_progress <= 0.0 {
            return 0;
        }
        
        let elapsed = start_time.elapsed().as_secs_f32();
        let total_estimated = elapsed * (100.0 / current_progress);
        let remaining = (total_estimated - elapsed).max(0.0);
        
        remaining as u64
    }

    async fn generate_duplicated_records_optimized(&self, original_records: &[MddRecord]) -> DuplicateMddResult<Vec<MddRecord>> {
        println!("🚀 Generating {} duplicated records with optimizations...", self.duplicate_count);
        
        let mut duplicated_records = Vec::with_capacity(original_records.len() * self.duplicate_count as usize);
        let mut current_record_id = 0u32;

        const CHUNK_SIZE: usize = 1000;
        
        for duplication_index in 0..self.duplicate_count {
            for chunk in original_records.chunks(CHUNK_SIZE) {
                for (chunk_index, original_record) in chunk.iter().enumerate() {
                    let mut new_record = original_record.clone();
                    new_record.record_id = current_record_id;
                    
                    self.modify_unique_fields_optimized(&mut new_record, duplication_index, chunk_index)?;
                    
                    duplicated_records.push(new_record);
                    current_record_id += 1;
                }
                
                if current_record_id % 5000 == 0 {
                    tokio::task::yield_now().await;
                    
                    let progress = (current_record_id as f32) / (original_records.len() as f32 * self.duplicate_count as f32) * 100.0;
                    self.report_progress(DuplicationProgress {
                        step: format!("Duplicating records... ({}/{})", current_record_id, original_records.len() * self.duplicate_count as usize),
                        progress_percent: 20.0 + (progress * 0.4),
                        records_processed: current_record_id,
                        total_records: (original_records.len() * self.duplicate_count as usize) as u32,
                        elapsed_seconds: 0,
                        estimated_remaining_seconds: 0,
                        current_speed: 5000.0,
                        memory_usage_mb: self.estimate_memory_usage(&duplicated_records),
                    });
                }
            }
        }

        println!("✅ Generated {} total records", duplicated_records.len());
        Ok(duplicated_records)
    }

    fn modify_unique_fields_optimized(&self, record: &mut MddRecord, duplication_index: u32, original_index: usize) -> DuplicateMddResult<()> {
        let suffix = format!("_d{}_r{}", duplication_index, original_index);
        let id_increment = (duplication_index as i64 * 1_000_000) + original_index as i64;
        
        for (field_name, field_value) in record.variables.iter_mut() {
            let field_lower = field_name.to_lowercase();
            
            if field_lower.contains("serial") || field_lower.contains("id") || field_lower.contains("unique") {
                match field_value {
                    MddFieldValue::Text(ref mut text) => {
                        text.push_str(&suffix);
                    },
                    MddFieldValue::Integer(ref mut num) => {
                        *num = (*num as i64 + id_increment) as i32;
                    },
                    MddFieldValue::Number(ref mut num) => {
                        *num += id_increment as f64;
                    },
                    _ => {}
                }
            }
        }
        
        Ok(())
    }

    async fn create_output_files_optimized(&self, records: &[MddRecord], variables: &[MddVariable]) -> DuplicateMddResult<String> {
        println!("💾 Creating output files with streaming optimizations...");

        let output_base_name = format!("duplicated_{}x_{}", self.duplicate_count, 
            chrono::Utc::now().format("%Y%m%d_%H%M%S"));
        let output_dir = PathBuf::from(&self.output_directory).join(&output_base_name);
        std::fs::create_dir_all(&output_dir)?;

        let output_mdd_path = output_dir.join(format!("{}.mdd", output_base_name));
        self.stream_write_mdd_file(&output_mdd_path, records).await?;

        let output_ddf_path = output_dir.join(format!("{}.ddf", output_base_name));
        self.write_ddf_file(&output_ddf_path, variables, records.len()).await?;

        Ok(output_dir.to_string_lossy().to_string())
    }

    async fn stream_write_mdd_file(&self, output_path: &Path, records: &[MddRecord]) -> DuplicateMddResult<()> {
        println!("📝 Stream writing MDD file: {:?}", output_path);
        
        let mut file = BufWriter::with_capacity(1_048_576, File::create(output_path)?);
        
        let header = format!("MDD_DUPLICATED_V1\n{}\n", records.len());
        file.write_all(header.as_bytes())?;

        const WRITE_CHUNK_SIZE: usize = 500;
        
        for (chunk_index, chunk) in records.chunks(WRITE_CHUNK_SIZE).enumerate() {
            for record in chunk {
                file.write_all(&record.data)?;
            }
            
            if chunk_index % 10 == 0 {
                file.flush()?;
                
                let progress = 60.0 + ((chunk_index * WRITE_CHUNK_SIZE) as f32 / records.len() as f32) * 25.0;
                self.report_progress(DuplicationProgress {
                    step: format!("Writing MDD file... ({}/{})", chunk_index * WRITE_CHUNK_SIZE, records.len()),
                    progress_percent: progress,
                    records_processed: (chunk_index * WRITE_CHUNK_SIZE) as u32,
                    total_records: records.len() as u32,
                    elapsed_seconds: 0,
                    estimated_remaining_seconds: 0,
                    current_speed: WRITE_CHUNK_SIZE as f32,
                    memory_usage_mb: 0.0,
                });
                
                tokio::task::yield_now().await;
            }
        }

        file.flush()?;
        println!("✅ MDD file written: {} records", records.len());
        Ok(())
    }

    async fn create_final_zip_optimized(&self, output_directory: &str) -> DuplicateMddResult<String> {
        println!("📦 Creating optimized ZIP package...");
        
        let output_dir = PathBuf::from(output_directory);
        let zip_name = format!("{}.zip", output_dir.file_name().unwrap().to_string_lossy());
        let zip_path = output_dir.parent().unwrap().join(zip_name);
        
        let zip_file = File::create(&zip_path)?;
        let mut zip = ZipWriter::new(zip_file);
        
        let options = zip::write::FileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated)
            .compression_level(Some(6));
        
        let entries: Vec<_> = std::fs::read_dir(&output_dir)?.collect();
        
        for (index, entry) in entries.iter().enumerate() {
            let entry = entry.as_ref().unwrap();
            let file_path = entry.path();
            
            if file_path.is_file() {
                let file_name = file_path.file_name().unwrap().to_string_lossy();
                zip.start_file(file_name.as_ref(), options)?;
                
                let mut file = File::open(&file_path)?;
                let mut buffer = vec![0u8; 65536];
                
                loop {
                    let bytes_read = file.read(&mut buffer)?;
                    if bytes_read == 0 {
                        break;
                    }
                    zip.write_all(&buffer[..bytes_read])?;
                }
                
                let progress = 85.0 + ((index + 1) as f32 / entries.len() as f32) * 10.0;
                self.report_progress(DuplicationProgress {
                    step: format!("Compressing files... ({}/{})", index + 1, entries.len()),
                    progress_percent: progress,
                    records_processed: 0,
                    total_records: 0,
                    elapsed_seconds: 0,
                    estimated_remaining_seconds: 0,
                    current_speed: 0.0,
                    memory_usage_mb: 0.0,
                });
            }
        }
        
        zip.finish()?;
        
        if !self.options.keep_temp_files {
            std::fs::remove_dir_all(&output_dir)?;
        }
        
        let zip_path_str = zip_path.to_string_lossy().to_string();
        println!("✅ Optimized ZIP created: {}", zip_path_str);
        Ok(zip_path_str)
    }

    async fn create_performance_report(
        &self,
        zip_path: &str,
        start_time: &std::time::Instant,
        original_records: u32,
        final_records: u32
    ) -> DuplicateMddResult<()> {
        println!("📊 Creating performance report...");
        
        let report_path = PathBuf::from(zip_path)
            .with_file_name("performance_report.txt");
        
        let processing_time = start_time.elapsed();
        let zip_size_mb = std::fs::metadata(zip_path)?.len() as f32 / 1_048_576.0;
        
        let report_content = format!(
            "DUPLICATION PERFORMANCE REPORT\n\
            ===============================\n\
            Generated: {}\n\
            \n\
            PROCESSING DETAILS:\n\
            - Original records: {}\n\
            - Final records: {}\n\
            - Duplication factor: {}x\n\
            - Processing time: {:.2}s\n\
            - Records per second: {:.0}\n\
            - Output file size: {:.2} MB\n\
            - Memory efficiency: {:.2} records/MB\n\
            \n\
            FILES:\n\
            - MDD input: {}\n\
            - DDF input: {}\n\
            - Output: {}\n",
            chrono::Utc::now().to_rfc3339(),
            original_records,
            final_records,
            self.duplicate_count,
            processing_time.as_secs_f32(),
            final_records as f32 / processing_time.as_secs_f32(),
            zip_size_mb,
            final_records as f32 / zip_size_mb,
            self.input_mdd_path,
            self.input_ddf_path,
            zip_path
        );
        
        std::fs::write(&report_path, report_content)?;
        println!("✅ Performance report created: {:?}", report_path);
        
        Ok(())
    }

    async fn load_original_files(&self) -> DuplicateMddResult<(Vec<MddRecord>, Vec<MddVariable>)> {
        println!("📂 Loading original MDD/DDF files...");

        let ddf_variables = MddFileInfo::parse_ddf_file(&self.input_ddf_path)?;
        println!("✅ DDF parsed: {} variables found", ddf_variables.len());

        let mdd_records = self.load_mdd_records(&ddf_variables).await?;
        println!("✅ MDD parsed: {} records loaded", mdd_records.len());

        Ok((mdd_records, ddf_variables))
    }

    async fn load_mdd_records(&self, variables: &[MddVariable]) -> DuplicateMddResult<Vec<MddRecord>> {
        let mut file = File::open(&self.input_mdd_path)?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)?;

        println!("📊 MDD file size: {} bytes", buffer.len());

        let mut records = Vec::new();
        let estimated_record_size = self.estimate_record_size(&buffer, variables);
        let estimated_record_count = if estimated_record_size > 0 {
            buffer.len() / estimated_record_size
        } else {
            1
        };

        println!("📈 Estimated: {} records of ~{} bytes each", estimated_record_count, estimated_record_size);

        for i in 0..estimated_record_count.min(10000) {
            let start_pos = i * estimated_record_size;
            let end_pos = (start_pos + estimated_record_size).min(buffer.len());
            
            if start_pos >= buffer.len() {
                break;
            }

            let record_data = buffer[start_pos..end_pos].to_vec();
            let mut record_variables = HashMap::new();

            for (_var_idx, variable) in variables.iter().enumerate() {
                let value = match variable.var_type {
                    MddVariableType::Text => MddFieldValue::Text(format!("Text_{}", i)),
                    MddVariableType::Number => MddFieldValue::Number(i as f64),
                    MddVariableType::Boolean => MddFieldValue::Boolean(i % 2 == 0),
                    _ => MddFieldValue::Null,
                };
                record_variables.insert(variable.name.clone(), value);
            }

            records.push(MddRecord {
                record_id: i as u32,
                data: record_data,
                variables: record_variables,
            });
        }

        Ok(records)
    }

    fn estimate_record_size(&self, buffer: &[u8], variables: &[MddVariable]) -> usize {
        if variables.is_empty() {
            return 200;
        }

        let estimated_size: u32 = variables.iter()
            .map(|v| v.width.max(1))
            .sum();

        if estimated_size > 0 && estimated_size < 10000 {
            estimated_size as usize
        } else {
            buffer.len() / 1000
        }
    }

    async fn write_ddf_file(&self, output_path: &Path, variables: &[MddVariable], record_count: usize) -> DuplicateMddResult<()> {
        println!("📝 Writing DDF file: {:?}", output_path);
        
        let mut file = BufWriter::new(File::create(output_path)?);
        
        writeln!(file, "# DDF File - Duplicated {} times", self.duplicate_count)?;
        writeln!(file, "# Generated: {}", Utc::now().to_rfc3339())?;
        writeln!(file, "# Total records: {}", record_count)?;
        writeln!(file, "")?;

        for variable in variables {
            writeln!(file, "{} \"{}\" {} Width({})", 
                variable.name, variable.label, 
                self.format_variable_type(&variable.var_type),
                variable.width)?;
        }

        file.flush()?;
        println!("✅ DDF file written: {} variables", variables.len());
        Ok(())
    }

    fn format_variable_type(&self, var_type: &MddVariableType) -> &str {
        match var_type {
            MddVariableType::Text => "Text",
            MddVariableType::Number => "Double",
            MddVariableType::Date => "Date",
            MddVariableType::Boolean => "Boolean",
            MddVariableType::Categorical => "Categorical",
            MddVariableType::Unknown => "Text",
        }
    }

    fn estimate_memory_usage(&self, records: &[MddRecord]) -> f32 {
        if records.is_empty() {
            return 0.0;
        }
        
        let sample_size = records.len().min(100);
        let average_record_size: usize = records.iter()
            .take(sample_size)
            .map(|r| r.data.len() + r.variables.len() * 50)
            .sum::<usize>() / sample_size;
        
        let total_memory_bytes = average_record_size * records.len();
        (total_memory_bytes as f32) / 1_048_576.0
    }
}