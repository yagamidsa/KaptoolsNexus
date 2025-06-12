# backend/models/duplicate_models.py
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from pathlib import Path
import os

# ============================================================================
# REQUEST MODELS
# ============================================================================

class FileInfo(BaseModel):
    """Información de archivo MDD/DDF"""
    name: str = Field(..., description="Nombre del archivo")
    path: str = Field(..., description="Ruta completa del archivo")
    size: int = Field(..., description="Tamaño del archivo en bytes")
    type: Literal["mdd", "ddf"] = Field(..., description="Tipo de archivo")
    last_modified: Optional[datetime] = Field(None, description="Fecha de última modificación")
    
    @validator('path')
    def validate_path_exists(cls, v):
        if not os.path.exists(v):
            raise ValueError(f"File path does not exist: {v}")
        return v
    
    @validator('type')
    def validate_file_type(cls, v, values):
        if 'name' in values:
            file_ext = Path(values['name']).suffix.lower()
            if v == 'mdd' and file_ext != '.mdd':
                raise ValueError("File type 'mdd' must have .mdd extension")
            elif v == 'ddf' and file_ext != '.ddf':
                raise ValueError("File type 'ddf' must have .ddf extension")
        return v

class DuplicationConfig(BaseModel):
    """Configuración para el proceso de duplicación"""
    duplicate_count: int = Field(
        default=5, 
        ge=1, 
        le=50, 
        description="Número de duplicados a crear"
    )
    id_offset: int = Field(
        default=1000, 
        ge=100, 
        le=10000, 
        description="Offset para renumeración de IDs"
    )
    preserve_original: bool = Field(
        default=True, 
        description="Mantener archivo original sin renumerar"
    )
    combine_files: bool = Field(
        default=True, 
        description="Combinar todos los archivos en uno solo"
    )
    create_zip: bool = Field(
        default=True, 
        description="Crear archivo ZIP con el resultado"
    )

class DuplicateRequest(BaseModel):
    """Request para iniciar proceso de duplicación"""
    source_files: List[FileInfo] = Field(..., min_items=1, description="Archivos fuente MDD/DDF")
    project_name: str = Field(..., min_length=1, max_length=100, description="Nombre del proyecto")
    output_path: str = Field(..., description="Directorio de salida")
    config: DuplicationConfig = Field(default_factory=DuplicationConfig, description="Configuración del proceso")
    
    @validator('project_name')
    def validate_project_name(cls, v):
        # Remover caracteres no válidos para nombres de archivo
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            if char in v:
                raise ValueError(f"Project name cannot contain: {invalid_chars}")
        return v.strip()
    
    @validator('output_path')
    def validate_output_path(cls, v):
        output_dir = Path(v)
        if not output_dir.exists():
            raise ValueError(f"Output directory does not exist: {v}")
        if not output_dir.is_dir():
            raise ValueError(f"Output path is not a directory: {v}")
        return v

class ValidationRequest(BaseModel):
    """Request para validar archivos MDD/DDF"""
    files: List[FileInfo] = Field(..., min_items=1, description="Archivos a validar")
    strict_mode: bool = Field(default=False, description="Modo de validación estricta")

# ============================================================================
# RESPONSE MODELS
# ============================================================================

class ValidationResult(BaseModel):
    """Resultado de validación de un archivo"""
    file_name: str = Field(..., description="Nombre del archivo validado")
    is_valid: bool = Field(..., description="¿Es válido el archivo?")
    file_type: Optional[str] = Field(None, description="Tipo detectado del archivo")
    record_count: Optional[int] = Field(None, description="Número de registros encontrados")
    encoding: Optional[str] = Field(None, description="Codificación detectada")
    issues: List[str] = Field(default_factory=list, description="Lista de problemas encontrados")
    warnings: List[str] = Field(default_factory=list, description="Lista de advertencias")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadatos adicionales")

class ValidationResponse(BaseModel):
    """Respuesta completa de validación"""
    overall_valid: bool = Field(..., description="¿Son válidos todos los archivos?")
    files_validated: int = Field(..., description="Número de archivos validados")
    results: List[ValidationResult] = Field(..., description="Resultados por archivo")
    summary: Dict[str, Any] = Field(default_factory=dict, description="Resumen de la validación")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp de la validación")

class ProcessingStage(BaseModel):
    """Etapa del proceso de duplicación"""
    stage_id: str = Field(..., description="ID único de la etapa")
    stage_name: str = Field(..., description="Nombre descriptivo de la etapa")
    progress: float = Field(..., ge=0, le=100, description="Progreso de la etapa (0-100)")
    status: Literal["pending", "running", "completed", "error"] = Field(..., description="Estado de la etapa")
    start_time: Optional[datetime] = Field(None, description="Tiempo de inicio")
    end_time: Optional[datetime] = Field(None, description="Tiempo de finalización")
    details: Dict[str, Any] = Field(default_factory=dict, description="Detalles adicionales")
    error_message: Optional[str] = Field(None, description="Mensaje de error si aplica")

class ProcessingProgress(BaseModel):
    """Progreso del proceso de duplicación"""
    job_id: str = Field(..., description="ID único del trabajo")
    overall_progress: float = Field(..., ge=0, le=100, description="Progreso general (0-100)")
    current_stage: Optional[str] = Field(None, description="Etapa actual")
    stages: List[ProcessingStage] = Field(default_factory=list, description="Lista de etapas")
    files_processed: int = Field(default=0, description="Archivos procesados")
    total_files: int = Field(default=0, description="Total de archivos a procesar")
    estimated_time_remaining: Optional[int] = Field(None, description="Tiempo estimado restante en segundos")
    processing_speed: Optional[float] = Field(None, description="Velocidad de procesamiento (archivos/segundo)")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp actual")

class OutputFile(BaseModel):
    """Información de archivo de salida generado"""
    name: str = Field(..., description="Nombre del archivo")
    path: str = Field(..., description="Ruta completa del archivo")
    size: int = Field(..., description="Tamaño del archivo en bytes")
    type: str = Field(..., description="Tipo de archivo")
    record_count: Optional[int] = Field(None, description="Número de registros")
    checksum: Optional[str] = Field(None, description="Checksum MD5 del archivo")

class DuplicationResult(BaseModel):
    """Resultado completo del proceso de duplicación"""
    job_id: str = Field(..., description="ID del trabajo")
    success: bool = Field(..., description="¿Fue exitoso el proceso?")
    project_name: str = Field(..., description="Nombre del proyecto")
    output_files: List[OutputFile] = Field(default_factory=list, description="Archivos generados")
    zip_file: Optional[OutputFile] = Field(None, description="Archivo ZIP generado")
    processing_time: float = Field(..., description="Tiempo total de procesamiento en segundos")
    records_processed: int = Field(default=0, description="Total de registros procesados")
    duplicates_created: int = Field(default=0, description="Número de duplicados creados")
    summary: Dict[str, Any] = Field(default_factory=dict, description="Resumen del proceso")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp de finalización")
    error_message: Optional[str] = Field(None, description="Mensaje de error si aplica")

# ============================================================================
# STATUS MODELS
# ============================================================================

class JobStatus(BaseModel):
    """Estado de un trabajo de duplicación"""
    job_id: str = Field(..., description="ID único del trabajo")
    status: Literal["queued", "running", "completed", "failed", "cancelled"] = Field(..., description="Estado del trabajo")
    created_at: datetime = Field(default_factory=datetime.now, description="Timestamp de creación")
    started_at: Optional[datetime] = Field(None, description="Timestamp de inicio")
    completed_at: Optional[datetime] = Field(None, description="Timestamp de finalización")
    progress: ProcessingProgress = Field(..., description="Progreso actual")
    result: Optional[DuplicationResult] = Field(None, description="Resultado si está completado")

class SystemStatus(BaseModel):
    """Estado general del sistema de duplicación"""
    active_jobs: int = Field(default=0, description="Trabajos activos")
    queued_jobs: int = Field(default=0, description="Trabajos en cola")
    completed_jobs: int = Field(default=0, description="Trabajos completados")
    failed_jobs: int = Field(default=0, description="Trabajos fallidos")
    system_load: float = Field(default=0.0, ge=0, le=100, description="Carga del sistema (0-100)")
    available_memory: Optional[int] = Field(None, description="Memoria disponible en MB")
    disk_space: Optional[int] = Field(None, description="Espacio en disco disponible en MB")
    uptime: Optional[int] = Field(None, description="Tiempo de actividad en segundos")

# ============================================================================
# ERROR MODELS
# ============================================================================

class ErrorDetail(BaseModel):
    """Detalle de error específico"""
    error_code: str = Field(..., description="Código de error")
    error_message: str = Field(..., description="Mensaje de error")
    file_name: Optional[str] = Field(None, description="Archivo relacionado al error")
    line_number: Optional[int] = Field(None, description="Línea donde ocurrió el error")
    context: Dict[str, Any] = Field(default_factory=dict, description="Contexto adicional del error")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp del error")

class DuplicationError(BaseModel):
    """Error durante el proceso de duplicación"""
    job_id: str = Field(..., description="ID del trabajo que falló")
    error_type: str = Field(..., description="Tipo de error")
    error_details: List[ErrorDetail] = Field(..., description="Detalles específicos del error")
    recovery_suggestions: List[str] = Field(default_factory=list, description="Sugerencias de recuperación")
    can_retry: bool = Field(default=False, description="¿Se puede reintentar el proceso?")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp del error")

# ============================================================================
# UTILITY MODELS
# ============================================================================

class FileStats(BaseModel):
    """Estadísticas de archivo procesado"""
    original_records: int = Field(..., description="Registros originales")
    duplicate_records: int = Field(..., description="Registros duplicados")
    total_records: int = Field(..., description="Total de registros finales")
    file_size_original: int = Field(..., description="Tamaño original en bytes")
    file_size_final: int = Field(..., description="Tamaño final en bytes")
    compression_ratio: Optional[float] = Field(None, description="Ratio de compresión si aplica")
    processing_time: float = Field(..., description="Tiempo de procesamiento en segundos")

class RenumberingStrategy(BaseModel):
    """Estrategia de renumeración de IDs"""
    strategy_type: Literal["linear", "exponential", "custom"] = Field(default="linear", description="Tipo de estrategia")
    base_offset: int = Field(default=1000, description="Offset base")
    multiplier: float = Field(default=1.0, description="Multiplicador para estrategias avanzadas")
    custom_ranges: Optional[List[tuple]] = Field(None, description="Rangos personalizados si aplica")
    preserve_zero: bool = Field(default=True, description="Preservar IDs con valor 0")

# ============================================================================
# CONFIG MODELS
# ============================================================================

class ProcessingConfig(BaseModel):
    """Configuración avanzada de procesamiento"""
    max_concurrent_jobs: int = Field(default=3, ge=1, le=10, description="Máximo de trabajos concurrentes")
    chunk_size: int = Field(default=10000, ge=1000, le=100000, description="Tamaño de chunk para procesamiento")
    memory_limit_mb: int = Field(default=512, ge=128, le=4096, description="Límite de memoria en MB")
    temp_dir: Optional[str] = Field(None, description="Directorio temporal personalizado")
    cleanup_temp_files: bool = Field(default=True, description="Limpiar archivos temporales")
    enable_compression: bool = Field(default=True, description="Habilitar compresión en ZIP")
    validation_level: Literal["basic", "standard", "strict"] = Field(default="standard", description="Nivel de validación")
    encoding_detection: bool = Field(default=True, description="Detectar codificación automáticamente")
    backup_originals: bool = Field(default=False, description="Crear backup de archivos originales")

class ExportFormat(BaseModel):
    """Formato de exportación"""
    format_type: Literal["mdd", "ddf", "csv", "json", "xml"] = Field(..., description="Tipo de formato")
    encoding: str = Field(default="utf-8", description="Codificación del archivo")
    separator: Optional[str] = Field(None, description="Separador para formatos CSV")
    include_headers: bool = Field(default=True, description="Incluir headers en la exportación")
    custom_options: Dict[str, Any] = Field(default_factory=dict, description="Opciones personalizadas")