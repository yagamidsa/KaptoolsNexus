# backend/services/mdd_processor.py
import os
import re
import shutil
import zipfile
import asyncio
import hashlib
from typing import List, Dict, Any, Optional, Tuple, AsyncGenerator
from pathlib import Path
from datetime import datetime
import chardet
import tempfile
import uuid
from concurrent.futures import ThreadPoolExecutor
import logging

from ..models.duplicate_models import (
    FileInfo, DuplicationConfig, ValidationResult, ValidationResponse,
    ProcessingProgress, ProcessingStage, DuplicationResult, OutputFile,
    ErrorDetail, DuplicationError, FileStats, RenumberingStrategy
)

# ============================================================================
# CONFIGURACIÓN DE LOGGING
# ============================================================================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# EXCEPCIONES PERSONALIZADAS
# ============================================================================

class MDDProcessingError(Exception):
    """Error durante el procesamiento de archivos MDD/DDF"""
    pass

class ValidationError(Exception):
    """Error durante la validación de archivos"""
    pass

class FileProcessingError(Exception):
    """Error durante el procesamiento de archivos individuales"""
    pass

# ============================================================================
# SERVICIO PRINCIPAL
# ============================================================================

class MDDProcessor:
    """Servicio principal para procesamiento de archivos MDD/DDF"""
    
    def __init__(self):
        self.active_jobs: Dict[str, Dict] = {}
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.temp_dir = tempfile.gettempdir()
        
        # Patrones de validación
        self.mdd_patterns = {
            'variable_definition': re.compile(r'^\s*(\w+)\s*"([^"]*)".*$', re.MULTILINE),
            'category_definition': re.compile(r'^\s*\{.*\}\s*categorical.*$', re.IGNORECASE | re.MULTILINE),
            'loop_definition': re.compile(r'^\s*(\w+)\s*loop.*$', re.IGNORECASE | re.MULTILINE),
            'response_definition': re.compile(r'^\s*\d+\s*"[^"]*".*$', re.MULTILINE)
        }
        
        self.ddf_patterns = {
            'record_separator': re.compile(r'^(?:hdn|cdn|1|0)\s*'),
            'field_definition': re.compile(r'^\s*(\w+)\s+(\d+)-(\d+).*$'),
            'variable_reference': re.compile(r'(?:C|L|T)\[\d+\.\d+\]')
        }

    # ========================================================================
    # MÉTODOS DE VALIDACIÓN
    # ========================================================================

    async def validate_files(self, files: List[FileInfo], strict_mode: bool = False) -> ValidationResponse:
        """Valida una lista de archivos MDD/DDF"""
        logger.info(f"Iniciando validación de {len(files)} archivos (strict_mode={strict_mode})")
        
        results = []
        overall_valid = True
        
        for file_info in files:
            try:
                result = await self._validate_single_file(file_info, strict_mode)
                results.append(result)
                if not result.is_valid:
                    overall_valid = False
            except Exception as e:
                logger.error(f"Error validando {file_info.name}: {str(e)}")
                results.append(ValidationResult(
                    file_name=file_info.name,
                    is_valid=False,
                    issues=[f"Validation error: {str(e)}"]
                ))
                overall_valid = False
        
        summary = self._generate_validation_summary(results)
        
        return ValidationResponse(
            overall_valid=overall_valid,
            files_validated=len(files),
            results=results,
            summary=summary
        )

    async def _validate_single_file(self, file_info: FileInfo, strict_mode: bool) -> ValidationResult:
        """Valida un archivo individual"""
        result = ValidationResult(
            file_name=file_info.name,
            is_valid=True,
            file_type=file_info.type
        )
        
        try:
            # Verificar existencia y acceso al archivo
            if not os.path.exists(file_info.path):
                result.is_valid = False
                result.issues.append("File does not exist")
                return result
            
            if not os.access(file_info.path, os.R_OK):
                result.is_valid = False
                result.issues.append("File is not readable")
                return result
            
            # Detectar codificación
            encoding = await self._detect_encoding(file_info.path)
            result.encoding = encoding
            
            # Leer contenido del archivo
            content = await self._read_file_content(file_info.path, encoding)
            
            # Validar según el tipo de archivo
            if file_info.type == "mdd":
                await self._validate_mdd_content(content, result, strict_mode)
            elif file_info.type == "ddf":
                await self._validate_ddf_content(content, result, strict_mode)
            
            # Contar registros/variables
            result.record_count = await self._count_records(content, file_info.type)
            
            # Metadatos adicionales
            result.metadata = {
                "file_size": os.path.getsize(file_info.path),
                "line_count": len(content.splitlines()),
                "encoding": encoding,
                "last_modified": datetime.fromtimestamp(os.path.getmtime(file_info.path))
            }
            
        except Exception as e:
            logger.error(f"Error validating {file_info.name}: {str(e)}")
            result.is_valid = False
            result.issues.append(f"Validation exception: {str(e)}")
        
        return result

    async def _validate_mdd_content(self, content: str, result: ValidationResult, strict_mode: bool):
        """Valida contenido de archivo MDD"""
        issues = []
        warnings = []
        
        # Verificar estructura básica
        if not self.mdd_patterns['variable_definition'].search(content):
            issues.append("No variable definitions found")
        
        # Verificar definiciones categóricas
        categorical_matches = self.mdd_patterns['category_definition'].findall(content)
        if categorical_matches and strict_mode:
            for match in categorical_matches:
                if '"' not in match:
                    warnings.append("Categorical definition without proper quotes")
        
        # Verificar loops
        loop_matches = self.mdd_patterns['loop_definition'].findall(content)
        result.metadata["loop_count"] = len(loop_matches)
        
        # Verificar sintaxis de respuestas
        response_matches = self.mdd_patterns['response_definition'].findall(content)
        result.metadata["response_count"] = len(response_matches)
        
        # Validaciones estrictas adicionales
        if strict_mode:
            if 'metadata' not in content.lower():
                warnings.append("No metadata section found")
            
            if content.count('{') != content.count('}'):
                issues.append("Unmatched braces in file")
        
        result.issues.extend(issues)
        result.warnings.extend(warnings)
        
        if issues:
            result.is_valid = False

    async def _validate_ddf_content(self, content: str, result: ValidationResult, strict_mode: bool):
        """Valida contenido de archivo DDF"""
        issues = []
        warnings = []
        lines = content.splitlines()
        
        # Verificar estructura de registros
        record_count = 0
        field_definitions = []
        
        for i, line in enumerate(lines, 1):
            line = line.strip()
            if not line:
                continue
            
            # Verificar separador de registros
            if self.ddf_patterns['record_separator'].match(line):
                record_count += 1
            
            # Verificar definiciones de campos
            field_match = self.ddf_patterns['field_definition'].match(line)
            if field_match:
                field_definitions.append(field_match.groups())
            
            # Validaciones de línea en modo estricto
            if strict_mode:
                if len(line) > 1000:  # Líneas muy largas pueden ser problemáticas
                    warnings.append(f"Very long line at line {i}")
        
        result.metadata["record_count"] = record_count
        result.metadata["field_definitions"] = len(field_definitions)
        
        # Verificar referencias de variables
        var_refs = self.ddf_patterns['variable_reference'].findall(content)
        result.metadata["variable_references"] = len(var_refs)
        
        if record_count == 0:
            issues.append("No valid records found")
        
        result.issues.extend(issues)
        result.warnings.extend(warnings)
        
        if issues:
            result.is_valid = False

    # ========================================================================
    # MÉTODOS DE PROCESAMIENTO PRINCIPAL
    # ========================================================================

    async def start_duplication_process(self, 
                                      source_files: List[FileInfo], 
                                      project_name: str, 
                                      output_path: str, 
                                      config: DuplicationConfig) -> str:
        """Inicia el proceso de duplicación de archivos"""
        job_id = str(uuid.uuid4())
        logger.info(f"Iniciando trabajo de duplicación {job_id} para proyecto '{project_name}'")
        
        # Crear estructura de trabajo
        job_data = {
            "job_id": job_id,
            "project_name": project_name,
            "source_files": source_files,
            "output_path": output_path,
            "config": config,
            "status": "queued",
            "created_at": datetime.now(),
            "progress": ProcessingProgress(
                job_id=job_id,
                overall_progress=0.0,
                stages=[],
                total_files=len(source_files) * (config.duplicate_count + 1)
            )
        }
        
        self.active_jobs[job_id] = job_data
        
        # Ejecutar proceso de forma asíncrona
        asyncio.create_task(self._execute_duplication_process(job_id))
        
        return job_id

    async def _execute_duplication_process(self, job_id: str):
        """Ejecuta el proceso completo de duplicación"""
        job_data = self.active_jobs[job_id]
        
        try:
            job_data["status"] = "running"
            job_data["started_at"] = datetime.now()
            
            # Definir etapas del proceso
            stages = [
                ("validate_files", "Validating source files", self._stage_validate_files),
                ("prepare_workspace", "Preparing workspace", self._stage_prepare_workspace),
                ("process_duplicates", "Creating duplicates", self._stage_process_duplicates),
                ("renumber_records", "Renumbering records", self._stage_renumber_records),
                ("combine_files", "Combining files", self._stage_combine_files),
                ("create_structure", "Creating folder structure", self._stage_create_structure),
                ("generate_zip", "Generating ZIP archive", self._stage_generate_zip),
                ("cleanup", "Cleaning up temporary files", self._stage_cleanup)
            ]
            
            progress = job_data["progress"]
            progress.stages = [
                ProcessingStage(
                    stage_id=stage_id,
                    stage_name=stage_name,
                    progress=0.0,
                    status="pending"
                ) for stage_id, stage_name, _ in stages
            ]
            
            # Ejecutar etapas secuencialmente
            for i, (stage_id, stage_name, stage_func) in enumerate(stages):
                current_stage = progress.stages[i]
                current_stage.status = "running"
                current_stage.start_time = datetime.now()
                progress.current_stage = stage_name
                
                try:
                    await stage_func(job_data, current_stage)
                    current_stage.status = "completed"
                    current_stage.progress = 100.0
                    current_stage.end_time = datetime.now()
                except Exception as e:
                    current_stage.status = "error"
                    current_stage.error_message = str(e)
                    raise
                
                # Actualizar progreso general
                progress.overall_progress = ((i + 1) / len(stages)) * 100
            
            # Finalizar trabajo exitosamente
            job_data["status"] = "completed"
            job_data["completed_at"] = datetime.now()
            
            logger.info(f"Trabajo {job_id} completado exitosamente")
            
        except Exception as e:
            logger.error(f"Error en trabajo {job_id}: {str(e)}")
            job_data["status"] = "failed"
            job_data["error"] = str(e)
            job_data["completed_at"] = datetime.now()

    # ========================================================================
    # ETAPAS DEL PROCESO
    # ========================================================================

    async def _stage_validate_files(self, job_data: Dict, stage: ProcessingStage):
        """Etapa: Validar archivos fuente"""
        source_files = job_data["source_files"]
        
        stage.details["validating_files"] = len(source_files)
        
        validation_response = await self.validate_files(source_files, strict_mode=True)
        
        if not validation_response.overall_valid:
            error_messages = []
            for result in validation_response.results:
                if not result.is_valid:
                    error_messages.extend(result.issues)
            raise ValidationError(f"File validation failed: {'; '.join(error_messages)}")
        
        stage.details["validation_result"] = "All files valid"

    async def _stage_prepare_workspace(self, job_data: Dict, stage: ProcessingStage):
        """Etapa: Preparar espacio de trabajo"""
        output_path = Path(job_data["output_path"])
        project_name = job_data["project_name"]
        
        # Crear directorio del proyecto
        project_dir = output_path / f"{project_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        project_dir.mkdir(parents=True, exist_ok=True)
        
        # Crear directorios de trabajo
        work_dirs = {
            "temp": project_dir / "temp",
            "duplicates": project_dir / "duplicates",
            "combined": project_dir / "combined",
            "output": project_dir / "output"
        }
        
        for dir_path in work_dirs.values():
            dir_path.mkdir(parents=True, exist_ok=True)
        
        job_data["project_dir"] = project_dir
        job_data["work_dirs"] = work_dirs
        
        stage.details["project_directory"] = str(project_dir)

    async def _stage_process_duplicates(self, job_data: Dict, stage: ProcessingStage):
        """Etapa: Crear duplicados de archivos"""
        source_files = job_data["source_files"]
        config = job_data["config"]
        work_dirs = job_data["work_dirs"]
        
        duplicated_files = []
        total_operations = len(source_files) * (config.duplicate_count + 1)
        completed_operations = 0
        
        for file_info in source_files:
            # Procesar archivo original
            if config.preserve_original:
                original_path = work_dirs["duplicates"] / f"original_{file_info.name}"
                shutil.copy2(file_info.path, original_path)
                duplicated_files.append({
                    "path": original_path,
                    "type": file_info.type,
                    "duplicate_index": 0,
                    "id_offset": 0
                })
                completed_operations += 1
                stage.progress = (completed_operations / total_operations) * 100
            
            # Crear duplicados
            for i in range(1, config.duplicate_count + 1):
                duplicate_path = work_dirs["duplicates"] / f"duplicate_{i}_{file_info.name}"
                shutil.copy2(file_info.path, duplicate_path)
                
                duplicated_files.append({
                    "path": duplicate_path,
                    "type": file_info.type,
                    "duplicate_index": i,
                    "id_offset": i * config.id_offset
                })
                
                completed_operations += 1
                stage.progress = (completed_operations / total_operations) * 100
        
        job_data["duplicated_files"] = duplicated_files
        stage.details["files_created"] = len(duplicated_files)

    async def _stage_renumber_records(self, job_data: Dict, stage: ProcessingStage):
        """Etapa: Renumerar registros en duplicados"""
        duplicated_files = job_data["duplicated_files"]
        config = job_data["config"]
        
        total_files = len(duplicated_files)
        processed_files = 0
        
        for file_data in duplicated_files:
            if file_data["id_offset"] > 0:  # Solo renumerar duplicados, no originales
                await self._renumber_file_records(
                    file_data["path"], 
                    file_data["type"], 
                    file_data["id_offset"]
                )
            
            processed_files += 1
            stage.progress = (processed_files / total_files) * 100
        
        stage.details["files_renumbered"] = processed_files

    async def _stage_combine_files(self, job_data: Dict, stage: ProcessingStage):
        """Etapa: Combinar archivos duplicados"""
        if not job_data["config"].combine_files:
            stage.details["skipped"] = "File combination disabled"
            return
        
        duplicated_files = job_data["duplicated_files"]
        work_dirs = job_data["work_dirs"]
        project_name = job_data["project_name"]
        
        # Agrupar por tipo de archivo
        files_by_type = {}
        for file_data in duplicated_files:
            file_type = file_data["type"]
            if file_type not in files_by_type:
                files_by_type[file_type] = []
            files_by_type[file_type].append(file_data["path"])
        
        combined_files = []
        
        for file_type, file_paths in files_by_type.items():
            combined_path = work_dirs["combined"] / f"{project_name}_combined.{file_type}"
            
            await self._combine_files_of_type(file_paths, combined_path, file_type)
            combined_files.append(combined_path)
            
            stage.progress = (len(combined_files) / len(files_by_type)) * 100
        
        job_data["combined_files"] = combined_files
        stage.details["combined_files_created"] = len(combined_files)

    async def _stage_create_structure(self, job_data: Dict, stage: ProcessingStage):
        """Etapa: Crear estructura de carpetas final"""
        work_dirs = job_data["work_dirs"]
        project_name = job_data["project_name"]
        
        # Crear estructura final
        final_structure = {
            "individual_files": work_dirs["output"] / "individual",
            "combined_files": work_dirs["output"] / "combined",
            "documentation": work_dirs["output"] / "docs"
        }
        
        for dir_path in final_structure.values():
            dir_path.mkdir(parents=True, exist_ok=True)
        
        # Copiar archivos a estructura final
        if "duplicated_files" in job_data:
            for file_data in job_data["duplicated_files"]:
                dest_path = final_structure["individual_files"] / file_data["path"].name
                shutil.copy2(file_data["path"], dest_path)
        
        if "combined_files" in job_data:
            for combined_file in job_data["combined_files"]:
                dest_path = final_structure["combined_files"] / combined_file.name
                shutil.copy2(combined_file, dest_path)
        
        # Crear documentación
        await self._create_documentation(job_data, final_structure["documentation"])
        
        job_data["final_structure"] = final_structure
        stage.details["structure_created"] = True

    async def _stage_generate_zip(self, job_data: Dict, stage: ProcessingStage):
        """Etapa: Generar archivo ZIP"""
        if not job_data["config"].create_zip:
            stage.details["skipped"] = "ZIP creation disabled"
            return
        
        project_dir = job_data["project_dir"]
        project_name = job_data["project_name"]
        output_path = Path(job_data["output_path"])
        
        zip_path = output_path / f"{project_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(project_dir / "output"):
                for file in files:
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(project_dir / "output")
                    zipf.write(file_path, arcname)
        
        # Calcular checksum
        zip_checksum = await self._calculate_file_checksum(zip_path)
        
        job_data["zip_file"] = OutputFile(
            name=zip_path.name,
            path=str(zip_path),
            size=zip_path.stat().st_size,
            type="zip",
            checksum=zip_checksum
        )
        
        stage.details["zip_created"] = str(zip_path)

    async def _stage_cleanup(self, job_data: Dict, stage: ProcessingStage):
        """Etapa: Limpiar archivos temporales"""
        work_dirs = job_data["work_dirs"]
        
        # Limpiar directorios temporales
        temp_dirs = ["temp", "duplicates", "combined"]
        
        for temp_dir_name in temp_dirs:
            if temp_dir_name in work_dirs:
                temp_dir = work_dirs[temp_dir_name]
                if temp_dir.exists():
                    shutil.rmtree(temp_dir)
        
        stage.details["cleanup_completed"] = True

    # ========================================================================
    # MÉTODOS AUXILIARES
    # ========================================================================

    async def _detect_encoding(self, file_path: str) -> str:
        """Detecta la codificación de un archivo"""
        try:
            with open(file_path, 'rb') as f:
                raw_data = f.read(10000)  # Leer primeros 10KB
                result = chardet.detect(raw_data)
                return result['encoding'] or 'utf-8'
        except Exception:
            return 'utf-8'

    async def _read_file_content(self, file_path: str, encoding: str) -> str:
        """Lee el contenido completo de un archivo"""
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                return f.read()
        except UnicodeDecodeError:
            # Fallback a utf-8 con ignore
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()

    async def _count_records(self, content: str, file_type: str) -> int:
        """Cuenta registros en el archivo según su tipo"""
        if file_type == "mdd":
            # Contar definiciones de variables
            matches = self.mdd_patterns['variable_definition'].findall(content)
            return len(matches)
        elif file_type == "ddf":
            # Contar registros de datos
            lines = content.splitlines()
            record_count = 0
            for line in lines:
                if self.ddf_patterns['record_separator'].match(line.strip()):
                    record_count += 1
            return record_count
        return 0

    async def _renumber_file_records(self, file_path: Path, file_type: str, id_offset: int):
        """Renumera los registros de un archivo con el offset especificado"""
        encoding = await self._detect_encoding(str(file_path))
        content = await self._read_file_content(str(file_path), encoding)
        
        if file_type == "mdd":
            # Renumerar variables en MDD
            content = await self._renumber_mdd_variables(content, id_offset)
        elif file_type == "ddf":
            # Renumerar registros en DDF
            content = await self._renumber_ddf_records(content, id_offset)
        
        # Escribir archivo modificado
        with open(file_path, 'w', encoding=encoding) as f:
            f.write(content)

    async def _renumber_mdd_variables(self, content: str, id_offset: int) -> str:
        """Renumera variables en contenido MDD"""
        def replace_variable_id(match):
            var_name = match.group(1)
            var_label = match.group(2)
            # Buscar ID numérico en el nombre de variable
            id_match = re.search(r'(\d+)', var_name)
            if id_match:
                old_id = int(id_match.group(1))
                new_id = old_id + id_offset
                new_var_name = var_name.replace(id_match.group(1), str(new_id))
                return f'{new_var_name} "{var_label}"'
            return match.group(0)
        
        return self.mdd_patterns['variable_definition'].sub(replace_variable_id, content)

    async def _renumber_ddf_records(self, content: str, id_offset: int) -> str:
        """Renumera registros en contenido DDF"""
        lines = content.splitlines()
        new_lines = []
        
        for line in lines:
            # Buscar IDs numéricos al inicio de la línea
            id_match = re.match(r'^(\d+)(.*)$', line.strip())
            if id_match:
                old_id = int(id_match.group(1))
                rest_of_line = id_match.group(2)
                new_id = old_id + id_offset
                new_lines.append(f"{new_id}{rest_of_line}")
            else:
                new_lines.append(line)
        
        return '\n'.join(new_lines)

    async def _combine_files_of_type(self, file_paths: List[Path], output_path: Path, file_type: str):
        """Combina múltiples archivos del mismo tipo"""
        combined_content = []
        
        for file_path in file_paths:
            encoding = await self._detect_encoding(str(file_path))
            content = await self._read_file_content(str(file_path), encoding)
            
            if file_type == "mdd":
                # Para MDD, combinar definiciones de variables
                variables = self.mdd_patterns['variable_definition'].findall(content)
                for var_def in variables:
                    combined_content.append(f'{var_def[0]} "{var_def[1]}"')
            elif file_type == "ddf":
                # Para DDF, combinar registros de datos
                lines = content.splitlines()
                for line in lines:
                    if line.strip() and self.ddf_patterns['record_separator'].match(line.strip()):
                        combined_content.append(line)
        
        # Escribir archivo combinado
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(combined_content))

    async def _create_documentation(self, job_data: Dict, docs_dir: Path):
        """Crea documentación del proceso"""
        project_name = job_data["project_name"]
        config = job_data["config"]
        
        # Crear archivo README
        readme_content = f"""# {project_name} - MDD Duplication Project

## Project Information
- Project Name: {project_name}
- Created: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- Number of Duplicates: {config.duplicate_count}
- ID Offset: {config.id_offset}

## Source Files
"""
        
        for file_info in job_data["source_files"]:
            readme_content += f"- {file_info.name} ({file_info.type.upper()})\n"
        
        readme_content += f"""
## Configuration
- Preserve Original: {config.preserve_original}
- Combine Files: {config.combine_files}
- Create ZIP: {config.create_zip}

## Processing Summary
- Total Files Created: {len(job_data.get('duplicated_files', []))}
- Combined Files: {len(job_data.get('combined_files', []))}
"""
        
        with open(docs_dir / "README.md", 'w', encoding='utf-8') as f:
            f.write(readme_content)

    async def _calculate_file_checksum(self, file_path: Path) -> str:
        """Calcula checksum MD5 de un archivo"""
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()

    def _generate_validation_summary(self, results: List[ValidationResult]) -> Dict[str, Any]:
        """Genera resumen de validación"""
        total_files = len(results)
        valid_files = sum(1 for r in results if r.is_valid)
        total_issues = sum(len(r.issues) for r in results)
        total_warnings = sum(len(r.warnings) for r in results)
        
        file_types = {}
        for result in results:
            if result.file_type:
                file_types[result.file_type] = file_types.get(result.file_type, 0) + 1
        
        return {
            "total_files": total_files,
            "valid_files": valid_files,
            "invalid_files": total_files - valid_files,
            "total_issues": total_issues,
            "total_warnings": total_warnings,
            "file_types": file_types,
            "validation_rate": (valid_files / total_files) * 100 if total_files > 0 else 0
        }

    # ========================================================================
    # MÉTODOS PÚBLICOS DE CONSULTA
    # ========================================================================

    async def get_job_status(self, job_id: str) -> Optional[Dict]:
        """Obtiene el estado de un trabajo"""
        return self.active_jobs.get(job_id)

    async def get_job_progress(self, job_id: str) -> Optional[ProcessingProgress]:
        """Obtiene el progreso de un trabajo"""
        job_data = self.active_jobs.get(job_id)
        if job_data:
            return job_data.get("progress")
        return None

    async def cancel_job(self, job_id: str) -> bool:
        """Cancela un trabajo en ejecución"""
        if job_id in self.active_jobs:
            job_data = self.active_jobs[job_id]
            if job_data["status"] in ["queued", "running"]:
                job_data["status"] = "cancelled"
                job_data["completed_at"] = datetime.now()
                return True
        return False

    async def list_active_jobs(self) -> List[str]:
        """Lista trabajos activos"""
        return [job_id for job_id, job_data in self.active_jobs.items() 
                if job_data["status"] in ["queued", "running"]]

    async def cleanup_completed_jobs(self, max_age_hours: int = 24):
        """Limpia trabajos completados antiguos"""
        cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
        
        jobs_to_remove = []
        for job_id, job_data in self.active_jobs.items():
            if (job_data["status"] in ["completed", "failed", "cancelled"] and 
                job_data.get("completed_at", datetime.now()) < cutoff_time):
                jobs_to_remove.append(job_id)
        
        for job_id in jobs_to_remove:
            del self.active_jobs[job_id]
        
        return len(jobs_to_remove)

# ============================================================================
# INSTANCIA GLOBAL DEL SERVICIO
# ============================================================================

mdd_processor = MDDProcessor()