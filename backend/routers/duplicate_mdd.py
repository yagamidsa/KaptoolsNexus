# backend/routers/duplicate_mdd.py
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Path
from fastapi.responses import JSONResponse, FileResponse
from typing import List, Optional, Dict, Any
import asyncio
import logging
from pathlib import Path as PathLib
import os

from ..models.duplicate_models import (
    FileInfo, DuplicationConfig, DuplicateRequest, ValidationRequest,
    ValidationResponse, ProcessingProgress, DuplicationResult, JobStatus,
    SystemStatus, DuplicationError
)
from ..services.mdd_processor import mdd_processor

# ============================================================================
# ENDPOINTS DE DESCARGA Y ARCHIVOS
# ============================================================================

@router.get("/download/{job_id}")
async def download_result(job_id: str = Path(..., description="Job ID")):
    """
    Descarga el archivo ZIP resultado de un trabajo completado
    
    - **job_id**: ID único del trabajo
    """
    try:
        job_data = await mdd_processor.get_job_status(job_id)
        
        if job_data is None:
            raise HTTPException(
                status_code=404,
                detail=f"Job not found: {job_id}"
            )
        
        if job_data["status"] != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Job {job_id} is not completed yet. Current status: {job_data['status']}"
            )
        
        # Verificar si existe archivo ZIP
        zip_file = job_data.get("zip_file")
        if not zip_file or not os.path.exists(zip_file["path"]):
            raise HTTPException(
                status_code=404,
                detail="Result file not found or has been cleaned up"
            )
        
        return FileResponse(
            path=zip_file["path"],
            filename=zip_file["name"],
            media_type='application/zip'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading result: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download result: {str(e)}"
        )

@router.get("/download/{job_id}/individual/{file_name}")
async def download_individual_file(
    job_id: str = Path(..., description="Job ID"),
    file_name: str = Path(..., description="File name")
):
    """
    Descarga un archivo individual del resultado
    
    - **job_id**: ID único del trabajo
    - **file_name**: Nombre del archivo a descargar
    """
    try:
        job_data = await mdd_processor.get_job_status(job_id)
        
        if job_data is None:
            raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
        
        if job_data["status"] != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Job {job_id} is not completed yet"
            )
        
        # Buscar archivo en la estructura del proyecto
        project_dir = job_data.get("project_dir")
        if not project_dir:
            raise HTTPException(status_code=404, detail="Project directory not found")
        
        # Buscar en directorios de salida
        possible_paths = [
            PathLib(project_dir) / "output" / "individual" / file_name,
            PathLib(project_dir) / "output" / "combined" / file_name,
            PathLib(project_dir) / "output" / file_name
        ]
        
        file_path = None
        for path in possible_paths:
            if path.exists():
                file_path = path
                break
        
        if not file_path:
            raise HTTPException(status_code=404, detail=f"File not found: {file_name}")
        
        # Determinar media type basado en la extensión
        media_type = "application/octet-stream"
        if file_name.endswith('.mdd'):
            media_type = "text/plain"
        elif file_name.endswith('.ddf'):
            media_type = "text/plain"
        elif file_name.endswith('.zip'):
            media_type = "application/zip"
        
        return FileResponse(
            path=str(file_path),
            filename=file_name,
            media_type=media_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading individual file: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download file: {str(e)}"
        )

@router.get("/result/{job_id}/files", response_model=List[Dict[str, Any]])
async def list_result_files(job_id: str = Path(..., description="Job ID")):
    """
    Lista todos los archivos disponibles en el resultado de un trabajo
    
    - **job_id**: ID único del trabajo
    """
    try:
        job_data = await mdd_processor.get_job_status(job_id)
        
        if job_data is None:
            raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
        
        if job_data["status"] != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Job {job_id} is not completed yet"
            )
        
        files_list = []
        project_dir = job_data.get("project_dir")
        
        if project_dir:
            output_dir = PathLib(project_dir) / "output"
            
            if output_dir.exists():
                for file_path in output_dir.rglob("*"):
                    if file_path.is_file():
                        relative_path = file_path.relative_to(output_dir)
                        file_info = {
                            "name": file_path.name,
                            "path": str(relative_path),
                            "size": file_path.stat().st_size,
                            "type": file_path.suffix.lower().lstrip('.'),
                            "category": relative_path.parts[0] if len(relative_path.parts) > 1 else "root"
                        }
                        files_list.append(file_info)
        
        # Agregar archivo ZIP si existe
        zip_file = job_data.get("zip_file")
        if zip_file:
            files_list.append({
                "name": zip_file["name"],
                "path": "zip",
                "size": zip_file["size"],
                "type": "zip",
                "category": "archive"
            })
        
        return files_list
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing result files: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list result files: {str(e)}"
        )

# ============================================================================
# ENDPOINTS DE CONFIGURACIÓN Y UTILIDADES
# ============================================================================

@router.get("/config/default", response_model=DuplicationConfig)
async def get_default_config():
    """
    Obtiene la configuración por defecto para duplicación
    """
    return DuplicationConfig()

@router.post("/config/validate")
async def validate_config(config: DuplicationConfig):
    """
    Valida una configuración de duplicación
    
    - **config**: Configuración a validar
    """
    try:
        # Validaciones personalizadas
        validation_errors = []
        
        if config.duplicate_count < 1:
            validation_errors.append("duplicate_count must be at least 1")
        
        if config.duplicate_count > 50:
            validation_errors.append("duplicate_count cannot exceed 50")
        
        if config.id_offset < 100:
            validation_errors.append("id_offset should be at least 100 to avoid conflicts")
        
        if config.id_offset > 10000:
            validation_errors.append("id_offset too large, may cause overflow issues")
        
        if validation_errors:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Configuration validation failed",
                    "errors": validation_errors
                }
            )
        
        return {
            "valid": True,
            "message": "Configuration is valid",
            "estimated_files": config.duplicate_count + (1 if config.preserve_original else 0),
            "estimated_records": "Depends on source files"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating config: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to validate configuration: {str(e)}"
        )

@router.post("/estimate")
async def estimate_processing_time(request: DuplicateRequest):
    """
    Estima el tiempo de procesamiento para una configuración dada
    
    - **request**: Request de duplicación para estimar
    """
    try:
        # Calcular estimaciones basadas en tamaño de archivos y configuración
        total_size = sum(file_info.size for file_info in request.source_files)
        total_files = len(request.source_files)
        duplicates = request.config.duplicate_count
        
        # Estimaciones aproximadas (ajustar según experiencia real)
        base_time_per_mb = 2  # segundos por MB
        file_overhead = 1  # segundo por archivo
        duplicate_multiplier = 0.5  # factor por cada duplicado
        
        total_size_mb = total_size / (1024 * 1024)
        
        estimated_seconds = (
            (total_size_mb * base_time_per_mb) +
            (total_files * file_overhead) +
            (duplicates * total_files * duplicate_multiplier)
        )
        
        # Agregar tiempo para operaciones adicionales
        if request.config.combine_files:
            estimated_seconds += total_size_mb * 0.5
        
        if request.config.create_zip:
            estimated_seconds += total_size_mb * 0.3
        
        return {
            "estimated_time_seconds": int(estimated_seconds),
            "estimated_time_formatted": f"{int(estimated_seconds // 60)}m {int(estimated_seconds % 60)}s",
            "total_files_to_create": total_files * (duplicates + (1 if request.config.preserve_original else 0)),
            "estimated_output_size_mb": int(total_size_mb * (duplicates + 1)),
            "complexity": "low" if total_size_mb < 10 else "medium" if total_size_mb < 100 else "high"
        }
        
    except Exception as e:
        logger.error(f"Error estimating processing time: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to estimate processing time: {str(e)}"
        )

# ============================================================================
# ENDPOINTS DE MANTENIMIENTO
# ============================================================================

@router.post("/cleanup/completed")
async def cleanup_completed_jobs(max_age_hours: int = Query(24, ge=1, le=168)):
    """
    Limpia trabajos completados antiguos
    
    - **max_age_hours**: Edad máxima en horas para conservar trabajos
    """
    try:
        cleaned_count = await mdd_processor.cleanup_completed_jobs(max_age_hours)
        
        return {
            "message": f"Cleanup completed successfully",
            "jobs_cleaned": cleaned_count,
            "max_age_hours": max_age_hours
        }
        
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Cleanup failed: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """
    Endpoint de health check para el servicio de duplicación
    """
    try:
        # Verificar estado del procesador
        active_jobs = await mdd_processor.list_active_jobs()
        total_jobs = len(mdd_processor.active_jobs)
        
        # Verificar recursos del sistema
        import psutil
        memory_percent = psutil.virtual_memory().percent
        disk_usage = psutil.disk_usage('/').percent
        
        health_status = "healthy"
        if memory_percent > 90 or disk_usage > 95:
            health_status = "warning"
        if memory_percent > 95 or disk_usage > 98:
            health_status = "critical"
        
        return {
            "status": health_status,
            "timestamp": datetime.now(),
            "active_jobs": len(active_jobs),
            "total_jobs": total_jobs,
            "memory_usage_percent": memory_percent,
            "disk_usage_percent": disk_usage,
            "service_version": "1.0.0"
        }
        
    except ImportError:
        # psutil no disponible, retornar estado básico
        return {
            "status": "healthy",
            "timestamp": datetime.now(),
            "active_jobs": len(await mdd_processor.list_active_jobs()),
            "total_jobs": len(mdd_processor.active_jobs),
            "service_version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Health check failed: {str(e)}"
        )

# ============================================================================
# WEBSOCKET PARA PROGRESO EN TIEMPO REAL (OPCIONAL)
# ============================================================================

from fastapi import WebSocket, WebSocketDisconnect
import json

@router.websocket("/ws/progress/{job_id}")
async def websocket_progress(websocket: WebSocket, job_id: str):
    """
    WebSocket para recibir actualizaciones de progreso en tiempo real
    
    - **job_id**: ID del trabajo a monitorear
    """
    await websocket.accept()
    
    try:
        while True:
            # Obtener progreso actual
            progress = await mdd_processor.get_job_progress(job_id)
            
            if progress is None:
                await websocket.send_text(json.dumps({
                    "error": "Job not found",
                    "job_id": job_id
                }))
                break
            
            # Enviar progreso
            progress_data = {
                "job_id": job_id,
                "overall_progress": progress.overall_progress,
                "current_stage": progress.current_stage,
                "files_processed": progress.files_processed,
                "total_files": progress.total_files,
                "timestamp": progress.timestamp.isoformat()
            }
            
            await websocket.send_text(json.dumps(progress_data))
            
            # Si el trabajo está completado, enviar mensaje final y cerrar
            job_data = await mdd_processor.get_job_status(job_id)
            if job_data and job_data["status"] in ["completed", "failed", "cancelled"]:
                await websocket.send_text(json.dumps({
                    "status": "final",
                    "job_status": job_data["status"],
                    "message": f"Job {job_data['status']}"
                }))
                break
            
            # Esperar 1 segundo antes de la siguiente actualización
            await asyncio.sleep(1)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for job {job_id}")
    except Exception as e:
        logger.error(f"WebSocket error for job {job_id}: {str(e)}")
        try:
            await websocket.send_text(json.dumps({
                "error": f"WebSocket error: {str(e)}"
            }))
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass

# ============================================================================
# ENDPOINTS DE DEBUG (SOLO PARA DESARROLLO)
# ============================================================================

@router.get("/debug/jobs")
async def debug_list_all_jobs():
    """
    Debug: Lista todos los trabajos en memoria (solo para desarrollo)
    """
    try:
        debug_jobs = {}
        
        for job_id, job_data in mdd_processor.active_jobs.items():
            debug_jobs[job_id] = {
                "project_name": job_data["project_name"],
                "status": job_data["status"],
                "created_at": job_data["created_at"],
                "progress": job_data["progress"].overall_progress,
                "current_stage": job_data["progress"].current_stage
            }
        
        return {
            "total_jobs": len(debug_jobs),
            "jobs": debug_jobs
        }
        
    except Exception as e:
        logger.error(f"Debug endpoint error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Debug endpoint failed: {str(e)}"
        )

@router.delete("/debug/jobs/{job_id}")
async def debug_force_delete_job(job_id: str):
    """
    Debug: Fuerza la eliminación de un trabajo (solo para desarrollo)
    """
    try:
        if job_id in mdd_processor.active_jobs:
            del mdd_processor.active_jobs[job_id]
            return {"message": f"Job {job_id} force deleted"}
        else:
            raise HTTPException(status_code=404, detail="Job not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Debug force delete error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Force delete failed: {str(e)}"
        )
# CONFIGURACIÓN DEL ROUTER
# ============================================================================

router = APIRouter(
    prefix="/duplicate-mdd",
    tags=["MDD Duplication"],
    responses={
        404: {"description": "Not found"},
        500: {"description": "Internal server error"}
    }
)

logger = logging.getLogger(__name__)

# ============================================================================
# ENDPOINTS DE VALIDACIÓN
# ============================================================================

@router.post("/validate", response_model=ValidationResponse)
async def validate_files(request: ValidationRequest):
    """
    Valida archivos MDD/DDF antes del procesamiento
    
    - **files**: Lista de archivos a validar
    - **strict_mode**: Activar validación estricta (opcional)
    """
    try:
        logger.info(f"Validating {len(request.files)} files (strict_mode={request.strict_mode})")
        
        # Verificar que los archivos existen
        for file_info in request.files:
            if not os.path.exists(file_info.path):
                raise HTTPException(
                    status_code=400,
                    detail=f"File not found: {file_info.path}"
                )
        
        # Ejecutar validación
        validation_response = await mdd_processor.validate_files(
            request.files, 
            request.strict_mode
        )
        
        logger.info(f"Validation completed: {validation_response.overall_valid}")
        return validation_response
        
    except Exception as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Validation failed: {str(e)}"
        )

@router.post("/validate-single")
async def validate_single_file(file_path: str, file_type: str, strict_mode: bool = False):
    """
    Valida un archivo individual
    
    - **file_path**: Ruta del archivo
    - **file_type**: Tipo de archivo (mdd/ddf)
    - **strict_mode**: Validación estricta
    """
    try:
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        file_info = FileInfo(
            name=os.path.basename(file_path),
            path=file_path,
            size=os.path.getsize(file_path),
            type=file_type
        )
        
        validation_request = ValidationRequest(files=[file_info], strict_mode=strict_mode)
        result = await validate_files(validation_request)
        
        return result.results[0] if result.results else None
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Single file validation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"File validation failed: {str(e)}"
        )

# ============================================================================
# ENDPOINTS DE PROCESAMIENTO
# ============================================================================

@router.post("/start", response_model=Dict[str, str])
async def start_duplication(request: DuplicateRequest):
    """
    Inicia el proceso de duplicación de archivos MDD/DDF
    
    - **source_files**: Archivos fuente a duplicar
    - **project_name**: Nombre del proyecto
    - **output_path**: Directorio de salida
    - **config**: Configuración del proceso
    """
    try:
        logger.info(f"Starting duplication for project: {request.project_name}")
        
        # Validar archivos fuente primero
        validation_request = ValidationRequest(files=request.source_files, strict_mode=True)
        validation_response = await validate_files(validation_request)
        
        if not validation_response.overall_valid:
            raise HTTPException(
                status_code=400,
                detail="Source files validation failed. Please validate files first."
            )
        
        # Verificar directorio de salida
        if not os.path.exists(request.output_path):
            raise HTTPException(
                status_code=400,
                detail=f"Output directory does not exist: {request.output_path}"
            )
        
        # Iniciar proceso de duplicación
        job_id = await mdd_processor.start_duplication_process(
            source_files=request.source_files,
            project_name=request.project_name,
            output_path=request.output_path,
            config=request.config
        )
        
        logger.info(f"Duplication job started with ID: {job_id}")
        
        return {
            "job_id": job_id,
            "message": "Duplication process started successfully",
            "status": "queued"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting duplication: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start duplication: {str(e)}"
        )

@router.get("/progress/{job_id}", response_model=ProcessingProgress)
async def get_job_progress(job_id: str = Path(..., description="Job ID")):
    """
    Obtiene el progreso de un trabajo de duplicación
    
    - **job_id**: ID único del trabajo
    """
    try:
        progress = await mdd_processor.get_job_progress(job_id)
        
        if progress is None:
            raise HTTPException(
                status_code=404,
                detail=f"Job not found: {job_id}"
            )
        
        return progress
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job progress: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get job progress: {str(e)}"
        )

@router.get("/status/{job_id}", response_model=Dict[str, Any])
async def get_job_status(job_id: str = Path(..., description="Job ID")):
    """
    Obtiene el estado completo de un trabajo
    
    - **job_id**: ID único del trabajo
    """
    try:
        job_data = await mdd_processor.get_job_status(job_id)
        
        if job_data is None:
            raise HTTPException(
                status_code=404,
                detail=f"Job not found: {job_id}"
            )
        
        # Formatear respuesta
        response = {
            "job_id": job_data["job_id"],
            "project_name": job_data["project_name"],
            "status": job_data["status"],
            "created_at": job_data["created_at"],
            "started_at": job_data.get("started_at"),
            "completed_at": job_data.get("completed_at"),
            "progress": job_data["progress"],
            "error": job_data.get("error")
        }
        
        # Agregar resultados si está completado
        if job_data["status"] == "completed" and "result" in job_data:
            response["result"] = job_data["result"]
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get job status: {str(e)}"
        )

@router.post("/cancel/{job_id}")
async def cancel_job(job_id: str = Path(..., description="Job ID")):
    """
    Cancela un trabajo en ejecución
    
    - **job_id**: ID único del trabajo a cancelar
    """
    try:
        success = await mdd_processor.cancel_job(job_id)
        
        if not success:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel job {job_id}. Job not found or not cancellable."
            )
        
        return {
            "job_id": job_id,
            "message": "Job cancelled successfully",
            "status": "cancelled"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling job: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cancel job: {str(e)}"
        )

# ============================================================================
# ENDPOINTS DE CONSULTA
# ============================================================================

@router.get("/jobs/active", response_model=List[str])
async def list_active_jobs():
    """
    Lista todos los trabajos activos (en cola o ejecutándose)
    """
    try:
        active_jobs = await mdd_processor.list_active_jobs()
        return active_jobs
        
    except Exception as e:
        logger.error(f"Error listing active jobs: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list active jobs: {str(e)}"
        )

@router.get("/jobs/history")
async def get_jobs_history(limit: int = Query(50, ge=1, le=500)):
    """
    Obtiene historial de trabajos
    
    - **limit**: Número máximo de trabajos a retornar
    """
    try:
        all_jobs = []
        
        for job_id, job_data in mdd_processor.active_jobs.items():
            job_summary = {
                "job_id": job_id,
                "project_name": job_data["project_name"],
                "status": job_data["status"],
                "created_at": job_data["created_at"],
                "completed_at": job_data.get("completed_at"),
                "overall_progress": job_data["progress"].overall_progress
            }
            all_jobs.append(job_summary)
        
        # Ordenar por fecha de creación (más recientes primero)
        all_jobs.sort(key=lambda x: x["created_at"], reverse=True)
        
        return all_jobs[:limit]
        
    except Exception as e:
        logger.error(f"Error getting jobs history: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get jobs history: {str(e)}"
        )

@router.get("/system/status", response_model=SystemStatus)
async def get_system_status():
    """
    Obtiene el estado general del sistema de duplicación
    """
    try:
        active_jobs = await mdd_processor.list_active_jobs()
        
        # Contar trabajos por estado
        job_counts = {"queued": 0, "running": 0, "completed": 0, "failed": 0}
        
        for job_data in mdd_processor.active_jobs.values():
            status = job_data["status"]
            if status in job_counts:
                job_counts[status] += 1
        
        # Calcular carga del sistema (simplificado)
        system_load = min((len(active_jobs) / 5) * 100, 100)  # Max 5 trabajos = 100% carga
        
        return SystemStatus(
            active_jobs=len(active_jobs),
            queued_jobs=job_counts["queued"],
            completed_jobs=job_counts["completed"],
            failed_jobs=job_counts["failed"],
            system_load=system_load
        )
        
    except Exception as e:
        logger.error(f"Error getting system status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get system status: {str(e)}"
        )

# ============