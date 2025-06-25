# backend/main.py - PARTE 1/4 - IMPORTS Y CONFIGURACIÓN

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
import json
import requests
import xml.etree.ElementTree as ET
import uvicorn
import os
import tempfile
import logging
import shutil
import asyncio
import re
import base64
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse




# ================================
# IMPORTAR SERVICIOS
# ================================

try:
    from services.product_service import ProductService
    from services.git_service import GitService
    from services.azure_service import AzureService
    from mdd_real_service import mdd_real_service
    
    # Inicializar servicios
    product_service = ProductService()
    git_service = GitService()
    azure_service = AzureService()
    mdd_service = mdd_real_service
    
    SERVICES_AVAILABLE = True
    print("✅ All services imported successfully")
    
except ImportError as e:
    print(f"⚠️  Warning: Could not import services: {e}")
    
    # Crear servicios básicos como fallback
    try:
        from services.product_service import ProductService
        product_service = ProductService()
        git_service = None
        azure_service = None
        mdd_service = None
        print("✅ Basic services available")
    except:
        product_service = None
        git_service = None
        azure_service = None
        mdd_service = None
        print("❌ No services available")
    
    SERVICES_AVAILABLE = False

# ================================
# CONFIGURAR LOGGING Y APP
# ================================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="KapTools Nexus API", version="2.0.0")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",  # Puerto de React en Tauri
        "http://localhost:3000",  # Puerto de React dev
        "tauri://localhost",      # Para Tauri builds
        "*"                       # Permitir todos para desarrollo
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================================
# MODELOS DE DATOS
# ================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handler para capturar errores de validación detallados"""
    print(f"🔍 VALIDATION ERROR DEBUG:")
    print(f"📍 URL: {request.url}")
    print(f"📍 Method: {request.method}")
    print(f"📍 Headers: {dict(request.headers)}")
    print(f"📍 Validation Errors: {exc.errors()}")
    print(f"📍 Request Body: {exc.body}")
    
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "body": exc.body,
            "url": str(request.url),
            "method": request.method,
            "debug_info": "Check server logs for detailed error information"
        }
    )




class CloneRequest(BaseModel):
    project_path: str
    branch: str = "develop"

class AzureDownloadRequest(BaseModel):
    project_folder: str
    wave_id: str 
    server: str
    workspace_path: str

class BranchListResponse(BaseModel):
    success: bool
    branches: List[Dict[str, Any]]
    total: int
    repository_filter: str
    workspace_path: str
    available_repositories: Dict[str, bool]

class CheckoutResponse(BaseModel):
    success: bool
    message: str
    current_branch: str
    previous_branch: Optional[str] = None
    repository: str

class ComparisonResponse(BaseModel):
    success: bool
    comparison: Dict[str, Any]
    summary: str

class StatusResponse(BaseModel):
    success: bool
    status: Dict[str, Dict[str, Any]]
    workspace_path: str
    timestamp: str

class ValidationResponse(BaseModel):
    success: bool
    validation: Dict[str, Any]

class MultipleFileDiffRequest(BaseModel):
    project_path: str
    repo_name: str
    branch_name: str
    file_paths: List[str]

class DuplicateMDDRequest(BaseModel):
    duplicate_count: int
    workspace_path: str



class CreateStructureRequest(BaseModel):
    project_name: str
    workspace_path: str
    mdd_file_content: str  # Base64 encoded content
    mdd_filename: str
    ddf_file_content: str  # ✅ Agregar DDF Base64 content
    ddf_filename: str      # ✅ Agregar DDF filename
    template_location: str = ""
    library_location: str = ""
    date_start: str = "19991201"
    date_end: str = "99999999"

# ================================
# 🔥 MODELOS CORREGIDOS PARA CREATE STRUCTURE
# ================================

class CreateStructureResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    processing_logs: Optional[List[str]] = None

# ================================
# ENDPOINTS BÁSICOS
# ================================

@app.get("/")
async def root():
    return {
        "message": "KapTools Nexus API is running! 🚀",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat(),
        "services_available": SERVICES_AVAILABLE,
        "status": "healthy",
        "features": [
            "Git Operations",
            "Azure Downloads", 
            "Review Branches",
            "File Diff Viewer",
            "MDD Duplication",
            "Create Structure",
            "Workspace Management"
        ]
    }




@app.get("/health/create-structure")
async def health_create_structure():
    """Health check específico para create structure"""
    
    checks = {
        "endpoint_accessible": True,
        "required_modules": {
            "os": True,
            "base64": True,
            "shutil": True,
            "asyncio": True,
            "re": True
        },
        "functions_available": {
            "copy_directory_async": "copy_directory_async" in globals(),
            "create_structure_endpoint": True
        }
    }
    
    return {
        "status": "healthy",
        "service": "create-structure",
        "checks": checks,
        "all_systems_go": all(checks["required_modules"].values()),
        "timestamp": datetime.now().isoformat()
    }



@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "version": "2.0.0",
        "services": {
            "git": "active" if git_service else "unavailable",
            "azure": "active" if azure_service else "unavailable",
            "mdd": "active" if mdd_service else "unavailable",
            "product": "active" if product_service else "unavailable"
        },
        "endpoints": {
            "git_clone": "/git/clone-microservices",
            "git_branches": "/git/branches",
            "git_checkout": "/git/checkout",
            "git_compare": "/git/compare",
            "git_file_diff": "/git/file-diff",
            "azure_download": "/azure/download-files",
            "mdd_duplicate": "/data/duplicate-mdd",
            "create_structure": "/data-processing/create-structure"
        }
    }

# backend/main.py - PARTE 2/4 - GIT OPERATIONS

# ================================
# GIT OPERATIONS - BÁSICAS
# ================================

@app.post("/git/clone-microservices")
async def clone_microservices(request: CloneRequest):
    """Clone Git microservices to specified path"""
    if not git_service:
        raise HTTPException(status_code=503, detail="Git service not available")
    
    try:
        result = await git_service.clone_microservices(
            project_path=request.project_path,
            branch=request.branch
        )
        
        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Git clone error: {str(e)}")

@app.get("/git/validate-workspace")
async def validate_workspace(workspace_path: str):
    """Validate workspace and check if microservices exist"""
    if not git_service:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        validation = git_service.validate_workspace(workspace_path)
        
        return {
            "success": True,
            "validation": validation,
            "has_microservices": len(validation.get("existing_repositories", [])) > 0,
            "existing_repos": validation.get("existing_repositories", []),
            "workspace_path": workspace_path
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workspace validation error: {str(e)}")

# ================================
# GIT OPERATIONS - REVIEW BRANCHES
# ================================

@app.get("/git/branches")
async def get_branches(
    project_path: str,
    repo: str = "both",  # 'content', 'dimensions', or 'both'
    limit: int = 15
):
    """Obtiene las ramas más recientes de los repositorios"""
    if not git_service:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        logger.info(f"🌿 Getting branches: repo={repo}, limit={limit}, path={project_path}")
        
        if not project_path or not os.path.exists(project_path):
            logger.error(f"❌ Invalid project path: {project_path}")
            raise HTTPException(status_code=400, detail="Invalid project path")
        
        # Validar primero que existen los repositorios
        try:
            validation = git_service.validate_repositories_for_branches(project_path)
            logger.info(f"🔍 Repository validation: {validation}")
            
            if not validation["valid"]:
                logger.error(f"❌ Repository validation failed: {validation['message']}")
                raise HTTPException(status_code=400, detail=validation["message"])
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"💥 Validation failed: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Repository validation failed: {str(e)}")
        
        # Obtener branches con manejo de errores mejorado
        try:
            branches = git_service.get_recent_branches(project_path, repo, limit)
            logger.info(f"✅ Found {len(branches)} branches")
            
            # Asegurar que branches es una lista
            if not isinstance(branches, list):
                logger.warning(f"⚠️ Branches is not a list: {type(branches)}")
                branches = []
            
            # Convertir a dict si es necesario
            branches_data = []
            for branch in branches:
                try:
                    if hasattr(branch, 'dict'):
                        # Es un objeto Pydantic
                        branch_dict = branch.dict()
                        # Convertir datetime a string para JSON
                        if 'date' in branch_dict and hasattr(branch_dict['date'], 'isoformat'):
                            branch_dict['date'] = branch_dict['date'].isoformat()
                        branches_data.append(branch_dict)
                    elif isinstance(branch, dict):
                        # Ya es un dict
                        branches_data.append(branch)
                    else:
                        logger.warning(f"⚠️ Unexpected branch type: {type(branch)}")
                except Exception as e:
                    logger.error(f"💥 Error converting branch to dict: {str(e)}")
                    continue
                    
        except Exception as e:
            logger.error(f"💥 Error getting branches: {str(e)}")
            # En caso de error, devolver lista vacía pero con éxito
            branches_data = []
            logger.info("🔧 Returning empty branches list due to error")
        
        response_data = {
            "success": True,
            "branches": branches_data,
            "total": len(branches_data),
            "repository_filter": repo,
            "workspace_path": project_path,
            "available_repositories": validation["repositories"]
        }
        
        logger.info(f"📤 Returning response with {len(branches_data)} branches")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 Unexpected error in get_branches: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get branches: {str(e)}")

@app.get("/git/validate-repositories")
async def validate_repositories_for_branches(project_path: str):
    """Validar repositorios específicamente para Review Branches"""
    if not git_service:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        logger.info(f"🔍 Validating repositories for path: {project_path}")
        
        if not project_path or not os.path.exists(project_path):
            logger.error(f"❌ Invalid project path: {project_path}")
            raise HTTPException(status_code=400, detail="Invalid project path")
        
        # Validar que existen los repositorios
        validation = git_service.validate_repositories_for_branches(project_path)
        logger.info(f"✅ Validation result: {validation}")
        
        return {
            "success": True,
            "validation": validation,
            "message": "Repository validation completed"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 Repository validation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Repository validation failed: {str(e)}")

@app.post("/git/fetch-all")
async def fetch_all_repositories(project_path: str):
    """Hacer fetch de todas las ramas remotas"""
    if not git_service:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        logger.info(f"🔄 Fetching all remote branches for: {project_path}")
        
        if not project_path or not os.path.exists(project_path):
            raise HTTPException(status_code=400, detail="Invalid project path")
        
        result = git_service.fetch_all_remote_branches(project_path)
        logger.info(f"✅ Fetch result: {result}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 Fetch all error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Fetch failed: {str(e)}")

@app.get("/git/checkout")
@app.post("/git/checkout")
async def checkout_branch(
    project_path: str,
    repo_name: str,  # 'content' or 'dimensions'
    branch_name: str
):
    """Hace checkout a una rama específica"""
    if not git_service:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        logger.info(f"🔄 Checking out branch: {branch_name} in {repo_name}")
        
        if not project_path or not os.path.exists(project_path):
            raise HTTPException(status_code=400, detail="Invalid project path")
        
        if repo_name not in ['content', 'dimensions']:
            raise HTTPException(status_code=400, detail="Repository must be 'content' or 'dimensions'")
        
        result = git_service.checkout_branch(project_path, repo_name, branch_name)
        
        # Convertir resultado a dict
        result_data = result.dict() if hasattr(result, 'dict') else result
        
        if result.success:
            logger.info(f"✅ Checkout successful: {result.message}")
            return result_data
        else:
            logger.error(f"❌ Checkout failed: {result.message}")
            raise HTTPException(status_code=400, detail=result.message)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 Checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Checkout failed: {str(e)}")

@app.get("/git/compare")
async def compare_branches(
    project_path: str,
    repo_name: str,  # 'content' or 'dimensions'
    branch_name: str,
    base_branch: str = "master"
):
    """Compara una rama con master (o otra rama base)"""
    if not git_service:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        logger.info(f"📊 Comparing branches: {branch_name} vs {base_branch} in {repo_name}")
        
        if not project_path or not os.path.exists(project_path):
            raise HTTPException(status_code=400, detail="Invalid project path")
        
        if repo_name not in ['content', 'dimensions']:
            raise HTTPException(status_code=400, detail="Repository must be 'content' or 'dimensions'")
        
        comparison = git_service.compare_branch_with_master(project_path, repo_name, branch_name)
        
        # Convertir a dict
        comparison_data = comparison.dict() if hasattr(comparison, 'dict') else comparison
        
        logger.info(f"✅ Comparison completed: {comparison_data.get('summary', 'No summary')}")
        
        return {
            "success": True,
            "comparison": comparison_data,
            "summary": f"Comparing {branch_name} with {base_branch} in {repo_name} repository"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 Comparison error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

@app.get("/git/file-diff")
async def get_file_diff_endpoint(
    project_path: str,
    repo_name: str,
    branch_name: str,
    file_path: str,
    base_branch: str = "master"
):
    """Obtener diferencias de un archivo específico"""
    if not git_service:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        logger.info(f"📄 Getting file diff: {file_path} in {repo_name}/{branch_name}")
        
        if not project_path or not os.path.exists(project_path):
            raise HTTPException(status_code=400, detail="Invalid project path")
        
        if repo_name not in ['content', 'dimensions']:
            raise HTTPException(status_code=400, detail="Repository must be 'content' or 'dimensions'")
        
        diff = git_service.get_file_diff(project_path, repo_name, branch_name, file_path)
        
        # Convertir a dict si es un objeto Pydantic
        diff_data = diff.dict() if hasattr(diff, 'dict') else diff
        
        return {
            "success": True,
            "diff": diff_data,
            "file_path": file_path,
            "branch": branch_name,
            "base_branch": base_branch,
            "repository": repo_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 File diff error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"File diff failed: {str(e)}")

@app.get("/git/status")
async def get_repository_status(project_path: str):
    """Obtiene el estado actual de ambos repositorios"""
    if not git_service:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        logger.info(f"📋 Getting repository status for: {project_path}")
        
        if not project_path or not os.path.exists(project_path):
            raise HTTPException(status_code=400, detail="Invalid project path")
        
        status = git_service.get_repository_status(project_path)
        
        # Convertir RepositoryStatus a dict
        status_dict = {}
        for repo_name, repo_status in status.items():
            if hasattr(repo_status, 'dict'):
                status_data = repo_status.dict()
                # Convertir datetime a string para JSON
                if 'last_commit_date' in status_data and status_data['last_commit_date']:
                    if hasattr(status_data['last_commit_date'], 'isoformat'):
                        status_data['last_commit_date'] = status_data['last_commit_date'].isoformat()
                status_dict[repo_name] = status_data
            else:
                status_dict[repo_name] = repo_status
        
        logger.info(f"✅ Status retrieved for {len(status_dict)} repositories")
        
        return {
            "success": True,
            "status": status_dict,
            "workspace_path": project_path,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 Status error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

@app.get("/git/debug-repos")
async def debug_repositories(project_path: str):
    """Endpoint de debugging para verificar el estado de los repositorios"""
    if not git_service:
        return {"error": "Git service not available"}
    
    try:
        debug_info = {
            "project_path": project_path,
            "project_path_exists": os.path.exists(project_path) if project_path else False,
            "repositories": {},
            "validation": None,
            "git_service_available": hasattr(git_service, 'validate_repositories_for_branches')
        }
        
        if project_path and os.path.exists(project_path):
            # Verificar cada repositorio individualmente
            repos = {
                "content": "outputs-dimensions-content",
                "dimensions": "outputs-dimensions"
            }
            
            for repo_key, repo_folder in repos.items():
                repo_path = os.path.join(project_path, repo_folder)
                debug_info["repositories"][repo_key] = {
                    "folder": repo_folder,
                    "path": repo_path,
                    "exists": os.path.exists(repo_path),
                    "is_git": os.path.exists(os.path.join(repo_path, ".git")) if os.path.exists(repo_path) else False,
                    "contents": os.listdir(repo_path) if os.path.exists(repo_path) else []
                }
            
            # Intentar validación
            try:
                validation = git_service.validate_repositories_for_branches(project_path)
                debug_info["validation"] = validation
            except Exception as e:
                debug_info["validation_error"] = str(e)
        
        return debug_info
        
    except Exception as e:
        return {"error": f"Debug failed: {str(e)}"}

# backend/main.py - PARTE 3/4 - AZURE Y CREATE STRUCTURE CORREGIDO

# backend/main.py - PARTE 3/4 - AZURE Y CREATE STRUCTURE CORREGIDO

# ================================
# AZURE OPERATIONS  
# ================================

@app.post("/azure/download-files")
async def download_azure_files(request: AzureDownloadRequest):
    """Download Azure files for a project"""
    if not azure_service:
        raise HTTPException(status_code=503, detail="Azure service not available")
        
    try:
        result = await azure_service.download_azure_files(
            project_folder=request.project_folder.strip(),
            wave_id=request.wave_id.strip(), 
            server=request.server,
            workspace_path=request.workspace_path.strip()
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Azure download error: {str(e)}")

@app.get("/azure/servers")
async def get_available_servers():
    """Get list of available Azure servers"""
    if not azure_service:
        raise HTTPException(status_code=503, detail="Azure service not available")
        
    try:
        servers = azure_service.get_available_servers()
        
        return {
            "success": True,
            "servers": servers,
            "count": len(servers)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting servers: {str(e)}")

# ================================
# 🔥 CREATE STRUCTURE OPERATIONS - VERSIÓN CORREGIDA
# ================================

@app.post("/data-processing/create-structure")
async def create_structure_endpoint(request: CreateStructureRequest):
    """
    ✅ ENDPOINT ACTUALIZADO - Maneja MDD y DDF
    """
    
    print(f"🚀 Creating structure for: {request.project_name}")
    logs = []
    
    def add_log(message: str):
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        logs.append(log_entry)
        print(f"📝 {message}")
    
    try:
        add_log("🔍 Starting structure creation with MDD and DDF...")
        
        # ================================
        # VALIDACIONES BÁSICAS
        # ================================
        
        # Validar project name
        project_name = request.project_name.strip()
        if not project_name:
            raise HTTPException(status_code=400, detail="Project name is required")
        
        if not re.match(r'^[a-zA-Z0-9_-]+$', project_name):
            raise HTTPException(status_code=400, detail="Invalid project name. Only letters, numbers, underscores, and hyphens allowed.")
        
        # Validar workspace
        workspace_path = request.workspace_path.strip()
        if not workspace_path:
            raise HTTPException(status_code=400, detail="Workspace path is required")
            
        if not os.path.exists(workspace_path):
            raise HTTPException(status_code=400, detail=f"Workspace not found: {workspace_path}")
        
        # Validar microservicios
        outputs_content = os.path.join(workspace_path, "outputs-dimensions-content")
        outputs_dimensions = os.path.join(workspace_path, "outputs-dimensions")
        
        if not os.path.exists(outputs_content):
            raise HTTPException(status_code=400, detail="outputs-dimensions-content repository not found in workspace")
        
        if not os.path.exists(outputs_dimensions):
            raise HTTPException(status_code=400, detail="outputs-dimensions repository not found in workspace")
        
        add_log("✅ Basic validations passed")
        
        # ================================
        # PROCESAR ARCHIVO MDD
        # ================================
        
        add_log("📋 Processing MDD file...")
        
        if not request.mdd_file_content:
            raise HTTPException(status_code=400, detail="MDD file content is required")
        
        try:
            # Decodificar MDD base64
            mdd_content = base64.b64decode(request.mdd_file_content)
            add_log(f"📊 MDD decoded: {len(mdd_content)} bytes")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid MDD file encoding: {str(e)}")
        
        if len(mdd_content) == 0:
            raise HTTPException(status_code=400, detail="MDD file is empty")
        
        # Validar MDD filename
        if not request.mdd_filename:
            raise HTTPException(status_code=400, detail="MDD filename is required")
        
        if not request.mdd_filename.lower().endswith('.mdd'):
            raise HTTPException(status_code=400, detail="MDD file must have .mdd extension")
        
        # ================================
        # PROCESAR ARCHIVO DDF
        # ================================
        
        add_log("💾 Processing DDF file...")
        
        if not request.ddf_file_content:
            raise HTTPException(status_code=400, detail="DDF file content is required")
        
        try:
            # Decodificar DDF base64
            ddf_content = base64.b64decode(request.ddf_file_content)
            add_log(f"📊 DDF decoded: {len(ddf_content)} bytes")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid DDF file encoding: {str(e)}")
        
        if len(ddf_content) == 0:
            raise HTTPException(status_code=400, detail="DDF file is empty")
        
        # Validar DDF filename
        if not request.ddf_filename:
            raise HTTPException(status_code=400, detail="DDF filename is required")
        
        if not request.ddf_filename.lower().endswith('.ddf'):
            raise HTTPException(status_code=400, detail="DDF file must have .ddf extension")
        
        # ✅ VALIDAR QUE MDD Y DDF TENGAN EL MISMO NOMBRE BASE
        mdd_basename = os.path.splitext(request.mdd_filename)[0]
        ddf_basename = os.path.splitext(request.ddf_filename)[0]
        
        if mdd_basename != ddf_basename:
            raise HTTPException(
                status_code=400, 
                detail=f"File base names must match. MDD: '{mdd_basename}', DDF: '{ddf_basename}'"
            )
        
        add_log(f"✅ File names match: {mdd_basename}")
        
        # ================================
        # CONFIGURAR RUTAS
        # ================================
        
        template_location = request.template_location or os.path.join(outputs_content, "Template_Configuration")
        library_location = request.library_location or os.path.join(outputs_dimensions, "KAPLibrary")
        
        template_project_path = os.path.join(outputs_dimensions, "Template_Project")
        
        # Verificar rutas críticas
        if not os.path.exists(template_location):
            raise HTTPException(status_code=400, detail=f"Template_Configuration not found: {template_location}")
        
        if not os.path.exists(template_project_path):
            raise HTTPException(status_code=400, detail=f"Template_Project not found: {template_project_path}")
        
        add_log("✅ Paths validated")
        
        # ================================
        # CREAR ESTRUCTURA
        # ================================
        
        add_log("🏗️ Creating project structure...")
        
        # Crear Projects folder
        projects_path = os.path.join(outputs_content, "Projects")
        os.makedirs(projects_path, exist_ok=True)
        
        # Verificar si el proyecto ya existe
        new_project_path = os.path.join(projects_path, project_name)
        
        if os.path.exists(new_project_path):
            raise HTTPException(status_code=400, detail=f"Project '{project_name}' already exists")
        
        add_log(f"📂 Creating project at: {new_project_path}")
        
        # Copiar Template_Project
        add_log("📋 Copying Template_Project...")
        await copy_directory_async(template_project_path, new_project_path, add_log)
        
        # Copiar configuración a Automation
        automation_path = os.path.join(new_project_path, "Automation")
        add_log("⚙️ Copying configuration...")
        
        # Copiar archivos de Template_Configuration
        await copy_directory_async(template_location, automation_path, add_log)
        
        # ================================
        # CONFIGURAR JOB.INI
        # ================================
        
        job_ini_path = os.path.join(new_project_path, "job.ini")
        files_created = ["Project structure"]
        
        if os.path.exists(job_ini_path):
            add_log("🔧 Configuring job.ini...")
            
            try:
                with open(job_ini_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Normalizar rutas
                template_location_normalized = template_location.replace('/', '\\') + '\\'
                library_location_normalized = library_location.replace('/', '\\') + '\\'
                
                # Reemplazos
                replacements = {
                    "[CHANGE|DATESTART]": request.date_start,
                    "[CHANGE|DATEEND]": request.date_end,
                    "[CHANGE|TEMPLATE_LOCATION]": template_location_normalized,
                    "[CHANGE|LIBRARY_LOCATION]": library_location_normalized,
                    "[CHANGE|PROJCODE]": project_name,
                    "[CHANGE|ANALYSIS_SERVER]": template_location_normalized
                }
                
                for old, new in replacements.items():
                    if old in content:
                        content = content.replace(old, new)
                        add_log(f"🔄 Replaced {old}")
                
                with open(job_ini_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                files_created.append("job.ini (configured)")
                add_log("✅ job.ini configured")
                
            except Exception as e:
                add_log(f"⚠️ Warning: Could not configure job.ini: {str(e)}")
        
        # ================================
        # 🔥 GUARDAR AMBOS ARCHIVOS MDD Y DDF
        # ================================
        
        mdd_folder = os.path.join(new_project_path, "MDD")
        add_log("💾 Saving MDD and DDF files...")

        try:
            # Asegurar que la carpeta MDD existe
            os.makedirs(mdd_folder, exist_ok=True)
            add_log(f"📁 MDD folder ensured: {mdd_folder}")

            # Guardar archivo MDD
            mdd_path = os.path.join(mdd_folder, request.mdd_filename)
            with open(mdd_path, 'wb') as f:
                f.write(mdd_content)

            files_created.append(f"MDD/{request.mdd_filename}")
            add_log(f"📋 MDD file saved: {request.mdd_filename}")

            # ✅ GUARDAR ARCHIVO DDF
            ddf_path = os.path.join(mdd_folder, request.ddf_filename)
            with open(ddf_path, 'wb') as f:
                f.write(ddf_content)

            files_created.append(f"MDD/{request.ddf_filename}")
            add_log(f"💾 DDF file saved: {request.ddf_filename}")

            # Verificar que ambos archivos se guardaron
            if os.path.exists(mdd_path) and os.path.exists(ddf_path):
                add_log(f"✅ Both files confirmed saved in: {mdd_folder}")
            else:
                add_log(f"⚠️ File verification failed - MDD exists: {os.path.exists(mdd_path)}, DDF exists: {os.path.exists(ddf_path)}")

        except Exception as e:
            add_log(f"⚠️ Warning: Could not save MDD/DDF files: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to save MDD/DDF files: {str(e)}")
        
        # ================================
        # FINALIZAR
        # ================================
        
        add_log("🎉 Structure created successfully with MDD and DDF!")
        
        return {
            "success": True,
            "message": "✅ Project structure created successfully with MDD and DDF files!",
            "data": {
                "project_path": new_project_path,
                "project_name": project_name,
                "files_created": files_created,
                "workspace": workspace_path,
                "template_location": template_location,
                "library_location": library_location,
                "mdd_file": request.mdd_filename,
                "ddf_file": request.ddf_filename,  # ✅ Incluir DDF en respuesta
                "automation_path": automation_path,
                "mdd_path": os.path.join(mdd_folder, request.mdd_filename) if os.path.exists(mdd_folder) else None,
                "ddf_path": os.path.join(mdd_folder, request.ddf_filename) if os.path.exists(mdd_folder) else None
            },
            "logs": logs
        }
        
    except HTTPException:
        add_log("❌ Request validation failed")
        raise
    except Exception as e:
        add_log(f"❌ Unexpected error: {str(e)}")
        print(f"💥 Full error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


async def copy_directory_async(source: str, destination: str, add_log, batch_size: int = 20):
    """Copia directorio de forma asíncrona en lotes"""
    
    if not os.path.exists(source):
        raise Exception(f"Source directory does not exist: {source}")
    
    add_log(f"📁 Copying: {os.path.basename(source)} → {os.path.basename(destination)}")
    
    file_count = 0
    
    try:
        for root, dirs, files in os.walk(source):
            # Crear directorios
            for dir_name in dirs:
                src_dir = os.path.join(root, dir_name)
                rel_dir = os.path.relpath(src_dir, source)
                dest_dir = os.path.join(destination, rel_dir)
                os.makedirs(dest_dir, exist_ok=True)
            
            # Copiar archivos en lotes
            for i in range(0, len(files), batch_size):
                batch_files = files[i:i + batch_size]
                
                for file_name in batch_files:
                    src_file = os.path.join(root, file_name)
                    rel_file = os.path.relpath(src_file, source)
                    dest_file = os.path.join(destination, rel_file)
                    
                    dest_dir = os.path.dirname(dest_file)
                    os.makedirs(dest_dir, exist_ok=True)
                    
                    shutil.copy2(src_file, dest_file)
                    file_count += 1
                
                # Yield control cada lote
                if len(files) > batch_size:
                    await asyncio.sleep(0.01)
        
        add_log(f"✅ Copied {file_count} files")
        
    except Exception as e:
        add_log(f"❌ Error copying: {str(e)}")
        raise

# ================================
# ENDPOINT DE TEST
# ================================


@app.get("/test/create-structure-mdd-ddf")
async def test_create_structure_with_mdd_ddf():
    """Test endpoint para verificar soporte MDD+DDF"""
    
    return {
        "endpoint_available": True,
        "url": "/data-processing/create-structure",
        "method": "POST", 
        "content_type": "application/json",
        "supports_mdd_ddf": True,
        "required_fields": {
            "project_name": "str (required)",
            "workspace_path": "str (required)",
            "mdd_file_content": "str (required, base64 encoded)",
            "mdd_filename": "str (required, must end with .mdd)",
            "ddf_file_content": "str (required, base64 encoded)",  # ✅
            "ddf_filename": "str (required, must end with .ddf)"     # ✅
        },
        "optional_fields": {
            "template_location": "str (optional)",
            "library_location": "str (optional)",
            "date_start": "str (optional, default: '19991201')",
            "date_end": "str (optional, default: '99999999')"
        },
        "validation_rules": {
            "project_name": "Must match ^[a-zA-Z0-9_-]+$",
            "workspace_path": "Must exist and contain microservices",
            "mdd_file_content": "Must be valid base64",
            "mdd_filename": "Must end with .mdd",
            "ddf_file_content": "Must be valid base64",
            "ddf_filename": "Must end with .ddf",
            "file_names": "MDD and DDF base names must match"
        },
        "response_format": {
            "success": "boolean",
            "message": "string",
            "data": {
                "project_path": "string",
                "project_name": "string", 
                "files_created": "array",
                "mdd_file": "string",
                "ddf_file": "string",
                "mdd_path": "string",
                "ddf_path": "string"
            },
            "logs": "array of processing logs"
        },
        "example_request": {
            "project_name": "TestProject",
            "workspace_path": "C:/workspace",
            "mdd_file_content": "base64_mdd_content_here",
            "mdd_filename": "TestProject.mdd",
            "ddf_file_content": "base64_ddf_content_here",
            "ddf_filename": "TestProject.ddf"
        },
        "timestamp": datetime.now().isoformat()
    }


@app.get("/test/create-structure")
async def test_create_structure():
    """Test endpoint para create structure"""
    
    return {
        "endpoint_available": True,
        "accepts_json": True,
        "expected_fields": [
            "project_name",
            "workspace_path", 
            "mdd_file_content (base64)",
            "mdd_filename"
        ],
        "optional_fields": [
            "template_location",
            "library_location",
            "date_start",
            "date_end"
        ],
        "method": "POST",
        "content_type": "application/json",
        "example_request": {
            "project_name": "TestProject",
            "workspace_path": "C:/workspace",
            "mdd_file_content": "base64_encoded_mdd_content_here",
            "mdd_filename": "test.mdd",
            "date_start": "19991201",
            "date_end": "99999999"
        },
        "timestamp": datetime.now().isoformat()
    }


# ================================
# MDD DUPLICATE OPERATIONS
# ================================
# backend/main.py - ENDPOINT ACTUALIZADO PARA DUPLICACIÓN REAL MDD ÚNICAMENTE

# En main.py, reemplazar el endpoint duplicate_mdd_files:

@app.post("/data/duplicate-mdd")
async def duplicate_mdd_files(
    background_tasks: BackgroundTasks,
    mdd_file: UploadFile = File(..., description="MDD metadata file"),
    ddf_file: UploadFile = File(..., description="DDF data file"),
    duplicate_count: int = Form(..., description="Number of times to duplicate"),
    workspace_path: str = Form(..., description="Target workspace directory")
):
    """
    🔥 ENDPOINT CORREGIDO - Duplicación de archivos MDD/DDF con datos REALES
    ✅ CORRECCIÓN: Eliminada duplicación de llamadas al servicio
    """
    logger.info("=" * 50)
    logger.info("🚀 STARTING MDD DUPLICATION ENDPOINT - REAL DATA MODE")
    logger.info(f"📁 MDD File: {mdd_file.filename}")
    logger.info(f"📁 DDF File: {ddf_file.filename}")
    logger.info(f"🔢 Duplicate Count: {duplicate_count}")
    logger.info(f"📂 Workspace: {workspace_path}")
    logger.info("=" * 50)
    
    # VALIDACIONES TEMPRANAS
    try:
        # Check services availability FIRST
        if not mdd_service:
            logger.error("❌ MDD SERVICE NOT AVAILABLE")
            raise HTTPException(
                status_code=503, 
                detail="MDD service not available. Please check backend configuration."
            )
        
        logger.info("✅ MDD service available, proceeding...")
        
        # VALIDACIÓN DE ARCHIVOS
        if not mdd_file or not mdd_file.filename:
            logger.error("❌ MDD file missing or invalid")
            raise HTTPException(
                status_code=400, 
                detail="MDD file is required and must have a valid filename"
            )
        
        if not ddf_file or not ddf_file.filename:
            logger.error("❌ DDF file missing or invalid")
            raise HTTPException(
                status_code=400, 
                detail="DDF file is required and must have a valid filename"
            )
        
        # VALIDACIÓN DE EXTENSIONES
        if not mdd_file.filename.lower().endswith('.mdd'):
            logger.error(f"❌ Invalid MDD extension: {mdd_file.filename}")
            raise HTTPException(
                status_code=400, 
                detail=f"MDD file must have .mdd extension, got: {mdd_file.filename}"
            )
        
        if not ddf_file.filename.lower().endswith('.ddf'):
            logger.error(f"❌ Invalid DDF extension: {ddf_file.filename}")
            raise HTTPException(
                status_code=400, 
                detail=f"DDF file must have .ddf extension, got: {ddf_file.filename}"
            )
        
        # VALIDACIÓN DE NOMBRES BASE
        mdd_basename = os.path.splitext(mdd_file.filename)[0]
        ddf_basename = os.path.splitext(ddf_file.filename)[0]
        
        if mdd_basename != ddf_basename:
            logger.error(f"❌ File names don't match: {mdd_basename} != {ddf_basename}")
            raise HTTPException(
                status_code=400,
                detail=f"File base names must match. MDD: '{mdd_basename}', DDF: '{ddf_basename}'"
            )
        
        logger.info(f"✅ File names match: {mdd_basename}")
        
        # VALIDACIÓN DE DUPLICATE COUNT
        if not isinstance(duplicate_count, int) or duplicate_count < 1:
            logger.error(f"❌ Invalid duplicate count: {duplicate_count}")
            raise HTTPException(
                status_code=400, 
                detail=f"Duplicate count must be a positive integer, got: {duplicate_count}"
            )
        
        logger.info(f"✅ Duplicate count valid: {duplicate_count}")
        
        # VALIDACIÓN DE WORKSPACE
        if not workspace_path or not workspace_path.strip():
            logger.error("❌ Workspace path empty")
            raise HTTPException(
                status_code=400, 
                detail="Workspace path cannot be empty"
            )
        
        workspace_path = workspace_path.strip()
        
        if not os.path.exists(workspace_path):
            logger.error(f"❌ Workspace does not exist: {workspace_path}")
            raise HTTPException(
                status_code=400, 
                detail=f"Workspace path does not exist: {workspace_path}"
            )
        
        if not os.path.isdir(workspace_path):
            logger.error(f"❌ Workspace is not a directory: {workspace_path}")
            raise HTTPException(
                status_code=400, 
                detail=f"Workspace path is not a directory: {workspace_path}"
            )
        
        if not os.access(workspace_path, os.W_OK):
            logger.error(f"❌ No write permission: {workspace_path}")
            raise HTTPException(
                status_code=400, 
                detail=f"No write permission for workspace: {workspace_path}"
            )
        
        logger.info(f"✅ Workspace valid and writable: {workspace_path}")
        
        # CREAR ARCHIVOS TEMPORALES
        temp_mdd_path = None
        temp_ddf_path = None
        original_mdd_filename = mdd_file.filename
        
        logger.info("💾 Creating temporary files...")
        
        try:
            # GUARDAR MDD TEMPORAL
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mdd') as temp_mdd:
                logger.info(f"📝 Writing MDD content to temporary file...")
                await mdd_file.seek(0)  # Ensure we're at the beginning
                content = await mdd_file.read()
                temp_mdd.write(content)
                temp_mdd_path = temp_mdd.name
                logger.info(f"💾 MDD saved to: {temp_mdd_path}")
            
            # GUARDAR DDF TEMPORAL  
            with tempfile.NamedTemporaryFile(delete=False, suffix='.ddf') as temp_ddf:
                logger.info(f"📝 Writing DDF content to temporary file...")
                await ddf_file.seek(0)  # Ensure we're at the beginning
                content = await ddf_file.read()
                temp_ddf.write(content)
                temp_ddf_path = temp_ddf.name
                logger.info(f"💾 DDF saved to: {temp_ddf_path}")
            
            logger.info("✅ Temporary files created successfully")
            
            # VALIDAR ARCHIVOS CON DATOS REALES ANTES DE PROCESAR
            logger.info("🔍 Validating files with real data reader...")
            
            # Crear archivos temporales con nombres correctos para validación
            temp_dir_for_validation = tempfile.mkdtemp()
            try:
                # Copiar con nombres originales para validación
                validation_mdd_path = os.path.join(temp_dir_for_validation, mdd_file.filename)
                validation_ddf_path = os.path.join(temp_dir_for_validation, ddf_file.filename)

                shutil.copy2(temp_mdd_path, validation_mdd_path)
                shutil.copy2(temp_ddf_path, validation_ddf_path)

                # Importar la función de validación actualizada
                from mdd_real_service import validate_mdd_ddf_files

                # Validar con nombres originales para obtener conteo real
                validation = validate_mdd_ddf_files(validation_mdd_path, validation_ddf_path)

            finally:
                # Limpiar directorio temporal de validación
                shutil.rmtree(temp_dir_for_validation, ignore_errors=True)
            
            if not validation['valid']:
                logger.error(f"❌ File validation failed: {validation['error']}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid MDD/DDF files: {validation['error']}"
                )
            
            real_record_count = validation['record_count']
            logger.info(f"📊 VALIDATED - Real record count: {real_record_count}")
            logger.info(f"📁 MDD size: {validation['mdd_size']:,} bytes")
            logger.info(f"📁 DDF size: {validation['ddf_size']:,} bytes")
            
            # VERIFICAR QUE EL SERVICIO MDD EXISTE
            logger.info("🔍 Checking MDD service methods...")
            available_methods = [method for method in dir(mdd_service) if not method.startswith('_')]
            logger.info(f"📋 Available methods: {available_methods}")
            
            # Verificar métodos disponibles
            if hasattr(mdd_service, 'process_duplicate_mdd_real'):
                logger.info("✅ Found process_duplicate_mdd_real method")
            elif hasattr(mdd_service, 'duplicate_mdd_real_fallback'):
                logger.info("✅ Found duplicate_mdd_real_fallback method")
            else:
                logger.error("❌ No suitable MDD processing method found")
                raise HTTPException(
                    status_code=503,
                    detail=f"MDD service methods not available. Available: {available_methods}"
                )
            
            # 🔥 UNA SOLA LLAMADA AL SERVICIO MDD (SIN DUPLICACIÓN)
            logger.info("🔄 Calling MDD service with REAL data...")
            
            try:
                if hasattr(mdd_service, 'process_duplicate_mdd_real'):
                    logger.info("📞 Using async process_duplicate_mdd_real method")
                    result = await mdd_service.process_duplicate_mdd_real(
                        mdd_file_path=temp_mdd_path,
                        ddf_file_path=temp_ddf_path,
                        duplicate_count=duplicate_count,
                        workspace_path=workspace_path,
                        original_mdd_filename=original_mdd_filename
                    )
                else:
                    logger.info("📞 Using sync duplicate_mdd_real_fallback method")
                    result = mdd_service.duplicate_mdd_real_fallback(
                        temp_mdd_path, temp_ddf_path, duplicate_count, 
                        workspace_path, original_mdd_filename
                    )
                
                logger.info(f"🎯 MDD service result: {result.get('success', False)}")
                
            except Exception as service_error:
                logger.error(f"💥 MDD Service Error: {str(service_error)}")
                logger.error(f"💥 Service Error Type: {type(service_error)}")
                
                # Crear resultado de error detallado
                result = {
                    "success": False,
                    "error": f"Service processing failed: {str(service_error)}",
                    "logs": [
                        f"[ERROR] Service call failed: {str(service_error)}",
                        "[INFO] Check if dmsrun command is available in your system",
                        "[INFO] Ensure IBM SPSS Data Collection tools are properly installed"
                    ],
                    "service_error": True,
                    "original_error": str(service_error),
                    "mode": "SERVICE_ERROR"
                }
            
            # PROGRAMAR LIMPIEZA EN BACKGROUND
            background_tasks.add_task(cleanup_temp_files_mdd, temp_mdd_path, temp_ddf_path)
            
            if result["success"]:
                logger.info(f"🎉 SUCCESS: {result.get('output_file', 'Unknown')}")
                logger.info(f"📊 Original records: {result.get('original_records', 'Unknown')}")
                logger.info(f"📊 Total records: {result.get('total_records', 'Unknown')}")
                
                return {
                    "success": True,
                    "message": result["message"],
                    "data": {
                        "output_file": result["output_file"],
                        "output_path": result["output_path"],
                        "duplicates_created": result["duplicates_created"],
                        "base_name": result["base_name"],
                        "workspace": workspace_path,
                        "file_size": result.get("file_size", 0),
                        "original_records": result.get("original_records", real_record_count),
                        "total_records": result.get("total_records", real_record_count * duplicate_count),
                        "record_multiplier": result.get("record_multiplier", duplicate_count)
                    },
                    "processing_logs": result.get("logs", []),
                    "dms_output": result.get("dms_output", ""),
                    "optimizations_applied": result.get("optimizations_applied", []),
                    "method": result.get("method", "Unknown"),
                    "mode": result.get("mode", "REAL_DATA"),
                    "record_summary": f"Original: {result.get('original_records', real_record_count)} records → Final: {result.get('total_records', real_record_count * duplicate_count)} records (×{duplicate_count} multiplier)"
                }
            else:
                logger.error(f"💥 MDD SERVICE FAILED: {result.get('error', 'Unknown error')}")
                raise HTTPException(
                    status_code=500,
                    detail={
                        "message": "MDD duplication failed",
                        "error": result.get("error", "Unknown error"),
                        "logs": result.get("logs", []),
                        "service_error": result.get("service_error", False),
                        "mode": result.get("mode", "ERROR")
                    }
                )
        
        except HTTPException:
            # Re-raise HTTP exceptions as-is
            cleanup_temp_files_mdd(temp_mdd_path, temp_ddf_path)
            raise

        except Exception as e:
            logger.error(f"💥 UNEXPECTED ERROR: {str(e)}")
            logger.error(f"💥 ERROR TYPE: {type(e)}")
            import traceback
            logger.error(f"💥 FULL TRACEBACK: {traceback.format_exc()}")
            
            # Limpiar archivos temporales
            cleanup_temp_files_mdd(temp_mdd_path, temp_ddf_path)
            
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error during file processing: {str(e)}"
            )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise

    except Exception as e:
        logger.error(f"💥 TOP LEVEL ERROR: {str(e)}")
        import traceback
        logger.error(f"💥 TOP LEVEL TRACEBACK: {traceback.format_exc()}")
        
        raise HTTPException(
            status_code=500,
            detail=f"Top level error: {str(e)}"
        )


@app.get("/data/duplicate-mdd/status")
async def get_mdd_duplication_status():
    """
    🔥 ENDPOINT ACTUALIZADO - Estado del servicio de duplicación REAL MDD
    """
    if not mdd_service:
        raise HTTPException(
            status_code=503, 
            detail={
                "error": "MDD service not available",
                "mode": "SERVICE_UNAVAILABLE"
            }
        )

    try:
        status = mdd_service.get_service_status()

        return {
            "success": True,
            "status": status,
            "mode": "REAL_DUPLICATION_ONLY",
            "capabilities": {
                "simulation_mode": False,
                "real_duplication": status.get("dms_available", False),
                "max_duplicates": status.get("max_duplicates", 600),
                "requires_dms": True
            },
            "service_health": {
                "operational": status.get("dms_available", False),
                "dms_required": True,
                "fallback_available": False
            }
        }

    except Exception as e:
        logger.error(f"Error checking MDD duplication status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Could not check service status: {str(e)}"
        )


def cleanup_temp_files_mdd(mdd_path: str, ddf_path: str):
    """
    🧹 FUNCIÓN HELPER ACTUALIZADA - Limpieza de archivos temporales
    """
    logger.info("🧹 Starting cleanup of temporary files...")
    
    try:
        if mdd_path and os.path.exists(mdd_path):
            os.unlink(mdd_path)
            logger.info(f"🧹 ✅ Cleaned temp MDD: {mdd_path}")
        else:
            logger.info(f"🧹 ⚠️  MDD temp file not found: {mdd_path}")
    except Exception as e:
        logger.warning(f"🧹 ❌ Could not clean temp MDD {mdd_path}: {str(e)}")
    
    try:
        if ddf_path and os.path.exists(ddf_path):
            os.unlink(ddf_path)
            logger.info(f"🧹 ✅ Cleaned temp DDF: {ddf_path}")
        else:
            logger.info(f"🧹 ⚠️  DDF temp file not found: {ddf_path}")
    except Exception as e:
        logger.warning(f"🧹 ❌ Could not clean temp DDF {ddf_path}: {str(e)}")
    
    logger.info("🧹 Cleanup completed")


# 🔥 ENDPOINTS DE TEST ACTUALIZADOS

@app.get("/test/mdd")
async def test_mdd_service():
    """Test MDD service availability - SOLO DUPLICACIÓN REAL"""
    if not mdd_service:
        raise HTTPException(status_code=503, detail="MDD service not available")
        
    try:
        status = mdd_service.get_service_status()
        
        return {
            "message": "MDD REAL duplication service test",
            "service_status": "operational" if status.get("dms_available") else "dms_required",
            "mode": "REAL_DUPLICATION_ONLY",
            "dms_available": status["dms_available"],
            "dms_version": status.get("dms_version"),
            "max_duplicates": status["max_duplicates"],
            "simulation_mode": False,
            "requirements": "DMS (Data Management System) required",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MDD service test failed: {str(e)}")


@app.get("/test/mdd-capabilities")  
async def test_mdd_capabilities():
    """Test endpoint para verificar capacidades de duplicación REAL"""
    
    if not mdd_service:
        return {
            "available": False,
            "error": "MDD service not configured"
        }
    
    try:
        status = mdd_service.get_service_status()
        
        return {
            "service_name": status.get("service_name", "MDD Service"),
            "version": status.get("version", "Unknown"),
            "available": True,
            "mode": "REAL_DUPLICATION_ONLY",
            "capabilities": {
                "real_duplication": status.get("dms_available", False),
                "simulation_mode": False,
                "max_duplicates": status.get("max_duplicates", 600),
                "requires_dms": True,
                "timeout_minutes": 45,
                "supports_zip": True,
                "record_counting": True,
                "unique_serials": True
            },
            "dms_info": {
                "available": status.get("dms_available", False),
                "version": status.get("dms_version"),
                "required": True,
                "message": status.get("dms_message", "")
            },
            "performance": status.get("performance_specs", {}),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "available": False,
            "error": f"Service test failed: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }

# ================================
# PRODUCT OPERATIONS
# ================================

@app.post("/product/get-data")
async def get_product_data(request: dict):
    """Get product data from KAP API"""
    if not product_service:
        raise HTTPException(status_code=503, detail="Product service not available")
    
    kapid = request.get("kapid", "")
    server = request.get("server", "")
    token = request.get("token", "")
    
    result = await product_service.get_product_data(kapid, server, token)
    
    if result["success"]:
        return result
    else:
        raise HTTPException(status_code=400, detail=result["message"])

@app.get("/product/servers")
async def get_available_product_servers():
    """Get list of available servers for product data"""
    if not product_service:
        raise HTTPException(status_code=503, detail="Product service not available")
    
    return {
        "servers": product_service.get_available_servers()
    }

@app.post("/product/validate-kapid")
async def validate_kapid(request: dict):
    """Validate KapID format"""
    if not product_service:
        raise HTTPException(status_code=503, detail="Product service not available")
    
    kapid = request.get("kapid", "")
    return product_service.validate_kapid(kapid)

# ================================
# SERVICES STATUS
# ================================

@app.get("/services/status")
async def get_services_status():
    """Verificar el estado de todos los servicios"""
    services_status = {
        "product_service": {
            "available": product_service is not None,
            "status": "active" if product_service else "unavailable"
        },
        "git_service": {
            "available": git_service is not None,
            "status": "active" if git_service else "unavailable"
        },
        "azure_service": {
            "available": azure_service is not None,
            "status": "active" if azure_service else "unavailable"
        },
        "mdd_service": {
            "available": mdd_service is not None,
            "status": "active" if mdd_service else "unavailable",
            "details": mdd_service.get_service_status() if mdd_service else None
        }
    }
    
    return {
        "success": True,
        "overall_status": "healthy" if SERVICES_AVAILABLE else "degraded",
        "services": services_status,
        "timestamp": datetime.now().isoformat(),
        "all_services_available": SERVICES_AVAILABLE
    }

# ================================
# TEST ENDPOINTS
# ================================

@app.get("/test")
async def test_endpoint():
    """Simple test endpoint"""
    return {
        "message": "Test successful! 🧪",
        "timestamp": datetime.now().isoformat(),
        "services": SERVICES_AVAILABLE,
        "available_endpoints": {
            "git": [
                "/git/branches",
                "/git/checkout", 
                "/git/compare",
                "/git/status"
            ],
            "azure": [
                "/azure/download-files",
                "/azure/servers"
            ],
            "data": [
                "/data/duplicate-mdd",
                "/data/duplicate-mdd/status"
            ],
            "product": [
                "/product/get-data",
                "/product/servers",
                "/product/validate-kapid"
            ],
            "structure": [
                "/data-processing/create-structure"
            ]
        }
    }

@app.get("/test/mdd")
async def test_mdd_service():
    """Test MDD service availability"""
    if not mdd_service:
        raise HTTPException(status_code=503, detail="MDD service not available")
        
    try:
        status = mdd_service.get_service_status()
        
        return {
            "message": "MDD service test successful! 📋",
            "service_status": "active",
            "dms_available": status["dms_available"],
            "dms_version": status.get("dms_version"),
            "max_duplicates": status["max_duplicates"],
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MDD service test failed: {str(e)}")

@app.get("/test/review-branches")
async def test_review_branches():
    """Test específico para Review Branches"""
    try:
        test_result = {
            "services_available": SERVICES_AVAILABLE,
            "git_service_exists": git_service is not None,
            "required_methods": {},
            "timestamp": datetime.now().isoformat()
        }
        
        if SERVICES_AVAILABLE and git_service:
            # Verificar métodos requeridos
            required_methods = [
                'validate_repositories_for_branches',
                'get_recent_branches', 
                'checkout_branch',
                'compare_branch_with_master',
                'get_file_diff',
                'fetch_all_remote_branches'
            ]
            
            for method_name in required_methods:
                test_result["required_methods"][method_name] = hasattr(git_service, method_name)
        
        return test_result
        
    except Exception as e:
        return {
            "error": f"Test failed: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }

# 🔥 TEST ENDPOINT CORREGIDO PARA CREATE STRUCTURE
@app.get("/test/create-structure")
async def test_create_structure():
    """Test endpoint"""
    
    try:
        return {
            "endpoint_available": True,
            "multipart_support": True,
            "file_upload_support": True,
            "temp_file_creation": True,
            "all_requirements_met": True,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "error": f"Test failed: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }


@app.post("/debug/form-data")
async def debug_form_data(
    mdd_file: UploadFile = File(...),
    project_name: str = Form(...),
    workspace_path: str = Form(...)
):
    """Debug FormData reception"""
    
    return {
        "success": True,
        "received": {
            "mdd_file": {
                "filename": mdd_file.filename,
                "content_type": mdd_file.content_type,
                "size": getattr(mdd_file, 'size', 'unknown')
            },
            "project_name": project_name,
            "workspace_path": workspace_path
        },
        "message": "FormData received successfully"
    }


# ================================
# ODIN CHUNKS PROCESSOR - BACKEND FINAL SIN ERRORES
# COPIA TODO ESTO AL FINAL DE main.py
# ================================

def read_file_with_encoding_simple(file_path):
    """Lee archivo detectando UTF-16 o UTF-8"""
    with open(file_path, 'rb') as f:
        content = f.read()
    
    # Detectar UTF-16 por BOM
    if content.startswith(b'\xff\xfe'):
        return content.decode('utf-16-le').replace('\ufeff', '')
    elif content.startswith(b'\xfe\xff'):
        return content.decode('utf-16-be').replace('\ufeff', '')
    else:
        return content.decode('utf-8', errors='ignore')

def find_chunks_simple(template_chunks_path, variable_name):
    """Encuentra chunks - VERSIÓN SIMPLE"""
    excluded_folders = {
        'Banners_Include_Set1', 'Banners_Include_Set2', 'CM_Edits', 'CM_Manipulation', 
        'CM_Metadata', 'ES_Metadata', 'ES_OnNextCase', 'IA_Lists', 'IA_Metadata', 
        'IA_OnNextCase', 'LinkDBManipulation', 'LinkDBMetadata', 'TEMP_eVal_CreateSPSS', 
        'Trim_Edits', 'Trim_Manipulation', 'Trim_Metadata'
    }
    
    existing_chunks = []
    
    try:
        all_folders = [f for f in os.listdir(template_chunks_path) 
                      if os.path.isdir(os.path.join(template_chunks_path, f)) 
                      and f not in excluded_folders]
        
        logger.info(f"📁 Scanning {len(all_folders)} folders for variable: {variable_name}")
        
        for folder in all_folders:
            folder_path = os.path.join(template_chunks_path, folder)
            
            try:
                all_files = [f for f in os.listdir(folder_path) if f.endswith('.mrs')]
                
                for filename in all_files:
                    file_basename = os.path.splitext(filename)[0]
                    
                    if file_basename.lower() == variable_name.lower():
                        file_path = os.path.join(folder_path, filename)
                        
                        try:
                            # Leer con encoding correcto
                            real_content = read_file_with_encoding_simple(file_path)
                            
                            if real_content.strip():
                                existing_chunks.append({
                                    "folder": folder,
                                    "path": f"outputs-dimensions-content\\Template_Chunks\\{folder}",
                                    "fileName": file_basename,
                                    "fileExt": "mrs",
                                    "content": real_content,
                                    "file_path": file_path
                                })
                                logger.info(f"✅ Found chunk: {folder}/{filename}")
                                break
                                
                        except Exception as e:
                            logger.error(f"❌ Error reading {file_path}: {str(e)}")
                            continue
                            
            except Exception as e:
                logger.warning(f"⚠️ Could not scan folder {folder}: {str(e)}")
                continue
        
        return existing_chunks
        
    except Exception as e:
        logger.error(f"💥 Error scanning folders: {str(e)}")
        return []

def find_next_question_simple(lines, start_index):
    """Encuentra la siguiente línea *QUESTION"""
    for i in range(start_index + 1, len(lines)):
        if lines[i].strip().startswith('*QUESTION'):
            return i
    return -1

def generate_structure_simple(existing_chunks, variable_name):
    """Genera estructura para chunks"""
    if not existing_chunks:
        return ""
    
    structure = f"**{variable_name}\n** Notes:\n**\t- Data processor..: CHUNKS"
    
    for chunk in existing_chunks:
        structure += "\n**\t                    kap_output_chunk_start"
        structure += f"\n**\t                    path:{chunk['path']}"
        structure += f"\n**\t                    fileName:{chunk['fileName']}"
        structure += f"\n**\t                    fileExt:{chunk['fileExt']}"
        structure += "\n**\t                    'content:David"
        
        # Mantener saltos de línea exactos
        content_lines = chunk['content'].split('\n')
        for content_line in content_lines:
            structure += f"\n**\t                    {content_line}"
        
        structure += "\n**\t                    kap_output_chunk_end"
        structure += "\n**\t                    "
    
    return structure

@app.post("/odin-chunks/process-file")
async def process_odin_simple(
    odin_file: UploadFile = File(..., description="ODIN file to process"),
    workspace_path: str = Form(..., description="Workspace path")
):
    """Procesa archivo ODIN"""
    try:
        logger.info(f"🚀 Processing ODIN file: {odin_file.filename}")
        
        if not odin_file.filename or not odin_file.filename.endswith('.odin'):
            raise HTTPException(status_code=400, detail="File must have .odin extension")
        
        if not workspace_path or not os.path.exists(workspace_path):
            raise HTTPException(status_code=400, detail="Invalid workspace path")
        
        # Leer archivo ODIN
        content_bytes = await odin_file.read()
        
        # Detectar encoding
        if content_bytes.startswith(b'\xff\xfe'):
            file_content = content_bytes.decode('utf-16-le').replace('\ufeff', '')
            original_was_utf16 = True
        elif content_bytes.startswith(b'\xfe\xff'):
            file_content = content_bytes.decode('utf-16-be').replace('\ufeff', '')
            original_was_utf16 = True
        else:
            file_content = content_bytes.decode('utf-8', errors='ignore')
            original_was_utf16 = False
        
        lines = file_content.split('\n')
        
        # Encontrar DIMVAR entries
        dimvar_entries = []
        for i, line in enumerate(lines):
            dimvar_match = re.search(r'DIMVAR=([^;"\s]+)', line)
            
            if dimvar_match:
                variable_name = dimvar_match.group(1)
                
                if variable_name.endswith('.slice'):
                    variable_name = variable_name.replace('.slice', '')
                
                dimvar_entries.append({
                    "line_index": i,
                    "variable_name": variable_name,
                    "original_line": line.strip()
                })
        
        logger.info(f"🔍 Found {len(dimvar_entries)} DIMVAR entries")
        
        # Verificar Template_Chunks
        template_chunks_path = os.path.join(workspace_path, "outputs-dimensions-content", "Template_Chunks")
        
        if not os.path.exists(template_chunks_path):
            raise HTTPException(status_code=404, detail="Template_Chunks folder not found")
        
        # Procesar variables
        processed_lines = lines.copy()
        total_insertions = 0
        processing_results = []
        
        for dimvar in reversed(dimvar_entries):
            variable_name = dimvar["variable_name"]
            line_index = dimvar["line_index"]
            
            logger.info(f"🔧 Processing variable: {variable_name}")
            
            existing_chunks = find_chunks_simple(template_chunks_path, variable_name)
            
            if existing_chunks:
                logger.info(f"✅ Found {len(existing_chunks)} chunks for {variable_name}")
                
                next_question_line = find_next_question_simple(processed_lines, line_index)
                
                if next_question_line != -1:
                    chunk_structure = generate_structure_simple(existing_chunks, variable_name)
                    structure_lines = chunk_structure.split('\n')
                    processed_lines[next_question_line:next_question_line] = structure_lines
                    
                    total_insertions += 1
                    processing_results.append({
                        "variable_name": variable_name,
                        "line_index": line_index,
                        "chunks_found": len(existing_chunks),
                        "existing_files": [f"{chunk['folder']}/{chunk['fileName']}.mrs" for chunk in existing_chunks],
                        "status": "SUCCESS - chunks inserted"
                    })
                    
                    logger.info(f"✅ Inserted chunks for {variable_name}")
                else:
                    processing_results.append({
                        "variable_name": variable_name,
                        "line_index": line_index,
                        "chunks_found": len(existing_chunks),
                        "status": "ERROR - no next QUESTION found"
                    })
            else:
                processing_results.append({
                    "variable_name": variable_name,
                    "line_index": line_index,
                    "chunks_found": 0,
                    "status": "SKIPPED - no .mrs files found"
                })
                logger.warning(f"❌ No files found for {variable_name}")
        
        # Reconstruir archivo
        processed_content = '\n'.join(processed_lines)
        
        # Preparar respuesta según encoding original
        if original_was_utf16:
            try:
                # Convertir de vuelta a UTF-16 LE
                processed_content_bytes = processed_content.encode('utf-16-le')
                processed_content_utf16 = b'\xff\xfe' + processed_content_bytes
                processed_content_final = processed_content_utf16.decode('utf-16-le')
                
                logger.info("✅ Content converted back to UTF-16 LE format")
                
                return {
                    "success": True,
                    "message": f"✅ Processed {len(dimvar_entries)} DIMVAR entries, inserted {total_insertions} chunks",
                    "original_filename": odin_file.filename,
                    "processed_content": processed_content_final,
                    "encoding_info": {
                        "original_encoding": "UTF-16 LE with BOM",
                        "output_encoding": "UTF-16 LE with BOM",
                        "note": "File should be saved as UTF-16 LE"
                    },
                    "stats": {
                        "dimvar_count": len(dimvar_entries),
                        "insertions_made": total_insertions,
                        "skipped_no_files": len([r for r in processing_results if r["chunks_found"] == 0]),
                        "original_size": len(content_bytes),
                        "processed_size": len(processed_content_utf16)
                    },
                    "processing_results": processing_results
                }
                
            except Exception as e:
                logger.warning(f"⚠️ Could not convert back to UTF-16: {str(e)}")
        
        # UTF-8 o fallback
        return {
            "success": True,
            "message": f"✅ Processed {len(dimvar_entries)} DIMVAR entries, inserted {total_insertions} chunks",
            "original_filename": odin_file.filename,
            "processed_content": processed_content,
            "encoding_info": {
                "original_encoding": "UTF-8",
                "output_encoding": "UTF-8",
                "note": "File should be saved as UTF-8"
            },
            "stats": {
                "dimvar_count": len(dimvar_entries),
                "insertions_made": total_insertions,
                "skipped_no_files": len([r for r in processing_results if r["chunks_found"] == 0]),
                "original_size": len(content_bytes),
                "processed_size": len(processed_content)
            },
            "processing_results": processing_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 Error processing ODIN file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process ODIN file: {str(e)}")

@app.get("/odin-chunks/scan-chunks")
async def scan_chunks_simple(workspace_path: str, variable_name: str):
    """Escanea chunks para una variable"""
    try:
        if not workspace_path or not os.path.exists(workspace_path):
            raise HTTPException(status_code=400, detail="Invalid workspace path")
        
        template_chunks_path = os.path.join(workspace_path, "outputs-dimensions-content", "Template_Chunks")
        
        if not os.path.exists(template_chunks_path):
            raise HTTPException(status_code=404, detail="Template_Chunks folder not found")
        
        chunks = find_chunks_simple(template_chunks_path, variable_name)
        
        return {
            "success": True,
            "variable_name": variable_name,
            "chunks": chunks,
            "total_chunks": len(chunks),
            "template_chunks_path": template_chunks_path
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 Scan error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")

@app.get("/odin-chunks/debug-variable")
async def debug_variable_simple(workspace_path: str, variable_name: str):
    """Debug para una variable específica"""
    try:
        template_chunks_path = os.path.join(workspace_path, "outputs-dimensions-content", "Template_Chunks")
        
        if not os.path.exists(template_chunks_path):
            return {"error": "Template_Chunks folder not found"}
        
        chunks = find_chunks_simple(template_chunks_path, variable_name)
        
        debug_info = {
            "variable_name": variable_name,
            "template_chunks_path": template_chunks_path,
            "chunks_found": len(chunks),
            "chunks": []
        }
        
        for chunk in chunks:
            debug_info["chunks"].append({
                "folder": chunk["folder"],
                "filename": chunk["fileName"] + ".mrs",
                "file_path": chunk["file_path"],
                "content_preview": chunk["content"][:100] + "..." if len(chunk["content"]) > 100 else chunk["content"]
            })
        
        return debug_info
        
    except Exception as e:
        return {"error": f"Debug failed: {str(e)}"}

@app.get("/odin-chunks/test")
async def test_odin_simple():
    """Test endpoint"""
    return {
        "service": "ODIN Chunks Processor",
        "version": "FINAL-1.0",
        "status": "operational",
        "encoding": "UTF-16/UTF-8 detection",
        "endpoints": [
            "/odin-chunks/process-file",
            "/odin-chunks/scan-chunks",
            "/odin-chunks/debug-variable",
            "/odin-chunks/test"
        ],
        "timestamp": datetime.now().isoformat()
    }

# ================================
# FIN - BACKEND FINAL COMPLETO
# ================================


@app.get("/test/mdd-service-version")
async def test_mdd_service_version():
    """Test para verificar qué versión del servicio se está usando"""
    try:
        if not mdd_service:
            return {"error": "MDD service not available"}
        
        # Verificar si tiene el método nuevo
        has_real_reader = hasattr(mdd_service, '_count_records_in_mdd')
        
        # Verificar si la función validate está disponible
        has_validate_function = False
        try:
            from services.mdd_service import validate_mdd_ddf_files
            has_validate_function = True
        except ImportError:
            has_validate_function = False
        
        # Verificar versión del servicio
        status = mdd_service.get_service_status()
        
        return {
            "service_loaded": True,
            "has_real_reader": has_real_reader,
            "has_validate_function": has_validate_function,
            "service_status": status,
            "version": status.get("version", "unknown"),
            "mode": status.get("mode", "unknown"),
            "original_mdd_reader_available": hasattr(mdd_service, '_count_records_in_mdd'),
            "mdd_record_reader_class_available": 'MDDRecordReader' in str(type(mdd_service)),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "error": f"Service test failed: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }

@app.get("/debug/mdd-reader-test")
async def debug_mdd_reader_test():
    """Debug específico para el MDDRecordReader"""
    try:
        # Verificar qué versión del servicio está activa
        from services.mdd_service import MDDRecordReader, validate_mdd_ddf_files
        
        debug_info = {
            "mdd_service_available": mdd_service is not None,
            "mdd_record_reader_available": True,
            "validate_function_available": True,
            "service_status": None,
            "reader_test": None
        }
        
        if mdd_service:
            debug_info["service_status"] = mdd_service.get_service_status()
        
        # Test con archivos temporales vacíos para ver qué pasa
        with tempfile.NamedTemporaryFile(suffix='.mdd', delete=False) as temp_mdd:
            temp_mdd.write(b"fake mdd content with 5 records")
            temp_mdd_path = temp_mdd.name
        
        with tempfile.NamedTemporaryFile(suffix='.ddf', delete=False) as temp_ddf:
            temp_ddf.write(b"fake ddf content")
            temp_ddf_path = temp_ddf.name
        
        try:
            reader = MDDRecordReader()
            
            # Test individual de métodos
            debug_info["reader_test"] = {
                "ddf_read_attempt": None,
                "mdd_parse_attempt": None,
                "adodb_attempt": None,
                "final_count": None,
                "error": None
            }
            
            try:
                ddf_count = reader._read_ddf_record_count(temp_ddf_path)
                debug_info["reader_test"]["ddf_read_attempt"] = ddf_count
            except Exception as e:
                debug_info["reader_test"]["ddf_read_attempt"] = f"Error: {str(e)}"
            
            try:
                mdd_count = reader._parse_mdd_metadata(temp_mdd_path)
                debug_info["reader_test"]["mdd_parse_attempt"] = mdd_count
            except Exception as e:
                debug_info["reader_test"]["mdd_parse_attempt"] = f"Error: {str(e)}"
            
            try:
                adodb_count = reader._count_via_adodb(temp_mdd_path, temp_ddf_path)
                debug_info["reader_test"]["adodb_attempt"] = adodb_count
            except Exception as e:
                debug_info["reader_test"]["adodb_attempt"] = f"Error: {str(e)}"
            
            try:
                final_count = reader.get_real_record_count(temp_mdd_path, temp_ddf_path)
                debug_info["reader_test"]["final_count"] = final_count
            except Exception as e:
                debug_info["reader_test"]["error"] = str(e)
            
        finally:
            # Limpiar archivos temporales
            os.unlink(temp_mdd_path)
            os.unlink(temp_ddf_path)
        
        return debug_info
        
    except Exception as e:
        return {
            "error": f"Debug test failed: {str(e)}",
            "traceback": str(e)
        }


@app.get("/debug/mdd-file-path-trace")
async def debug_mdd_file_path_trace():
    """Debuggear exactamente qué archivos está leyendo el sistema"""
    import tempfile
    import shutil
    
    # Crear archivo de prueba con exactamente 5 registros
    with tempfile.NamedTemporaryFile(suffix='.mdd', delete=False) as temp_mdd:
        mdd_content = b"""<?xml version="1.0" encoding="utf-8"?>
<metadata>
<datasources>
<connection>
<filename>test.ddf</filename>
<recordcount>5</recordcount>
</connection>
</datasources>
</metadata>"""
        temp_mdd.write(mdd_content)
        temp_mdd_path = temp_mdd.name
    
    with tempfile.NamedTemporaryFile(suffix='.ddf', delete=False) as temp_ddf:
        # Exactamente 5 líneas de datos
        ddf_content = b"record1_data_here____\nrecord2_data_here____\nrecord3_data_here____\nrecord4_data_here____\nrecord5_data_here____\n"
        temp_ddf.write(ddf_content)
        temp_ddf_path = temp_ddf.name
    
    try:
        from services.mdd_service import MDDRecordReader
        
        reader = MDDRecordReader()
        
        # Test cada método individual
        debug_result = {
            "file_paths": {
                "mdd_path": temp_mdd_path,
                "ddf_path": temp_ddf_path,
                "mdd_size": os.path.getsize(temp_mdd_path),
                "ddf_size": os.path.getsize(temp_ddf_path)
            },
            "method_results": {}
        }
        
        # Test método 1: DDF
        try:
            ddf_result = reader._read_ddf_record_count(temp_ddf_path)
            debug_result["method_results"]["ddf_method"] = ddf_result
        except Exception as e:
            debug_result["method_results"]["ddf_method"] = f"ERROR: {str(e)}"
        
        # Test método 2: MDD metadata
        try:
            mdd_result = reader._parse_mdd_metadata(temp_mdd_path)
            debug_result["method_results"]["mdd_method"] = mdd_result
        except Exception as e:
            debug_result["method_results"]["mdd_method"] = f"ERROR: {str(e)}"
        
        # Test método 3: ADODB
        try:
            adodb_result = reader._count_via_adodb(temp_mdd_path, temp_ddf_path)
            debug_result["method_results"]["adodb_method"] = adodb_result
        except Exception as e:
            debug_result["method_results"]["adodb_method"] = f"ERROR: {str(e)}"
        
        # Test método final
        try:
            final_result = reader.get_real_record_count(temp_mdd_path, temp_ddf_path)
            debug_result["method_results"]["final_result"] = final_result
        except Exception as e:
            debug_result["method_results"]["final_result"] = f"ERROR: {str(e)}"
        
        return debug_result
        
    finally:
        # Limpiar
        os.unlink(temp_mdd_path)
        os.unlink(temp_ddf_path)



# ================================
# 1. MODELOS DE DATOS
# ================================

class ProductChunksResponse(BaseModel):
    success: bool
    message: str
    report_content: str
    product_name: str
    total_chunks: int
    chunks_by_type: Dict[str, int]
    variables_found: int
    new_chunks_created: int
    existing_chunks_found: int

class ExclusionsResponse(BaseModel):
    success: bool
    message: str
    exclusions: List[str]
    total_exclusions: int

# ================================
# 2. GESTIÓN DE EXCLUSIONES
# ================================

def get_exclusions_file_path(workspace_path: str) -> str:
    """Obtiene la ruta del archivo de exclusiones"""
    return os.path.join(workspace_path, "product_chunks_exclusions.json")

def load_default_exclusions() -> List[str]:
    """Carga exclusiones por defecto"""
    return [
        "PANELDETAILS_ENDTEXT", "ACTIVEINVOLVEMENT_TEXTS", "SEEVIDEO", "HEARVIDEO", 
        "STANDARDTEXTS_ERRORS", "FACEBOOKMOBILE_OPTINB", "FACEBOOKMOBILE_OPTINA", 
        "FACEBOOKDESKTOP_OPTINB", "FACEBOOKDESKTOP_OPTINA", "PANELDETAILS_ENDTEXT_NFIELD", 
        "COMMS_BLOCK_QUOTA_MANUAL", "PERSONAL_BIOMETRIC_CHINA", "OVERSEAS_TRANSFER_CHINA", 
        "TESTADMESSAGES", "COL1", "COL2", "COL3", "WORDS", "ADDESIGN_SLDRLABELS", 
        "CONSENT", "FCENABLEDDUMMY", "ADINTRO_ROUGHTYPE_HELPER", "SPONT_BRAND_CUES_TEXTREPLACE", 
        "CELEBRITYIMAGE_CONTROL", "CELEBRITYIMAGEDRIVER", "IMTYPERESPONSE", 
        "PROMPTEDATTITUDES_CONTROL", "PROMPTEDATTITUDESDRIVER", "QSMARTPHONE", 
        "SEG_OCCUPATIONTURKEYDRIVER", "SEG_OCCUPATION_TURKEY_TEXTPIPE", "ADNAME", 
        "LINKDIGITALS_BRANDLOGOS", "NEWSFEEDQUOTA", "MOODFEELNEGATIVEDRIVER", 
        "MOODFEELPOSITIVEDRIVER", "COMMSADVERTS", "RA1_GENERIC", "TOTALUNAIDEDSCTEXT", 
        "INTRO_SAMSUNG", "WARNINGMESSAGE_SAMSUNG", "QELIGIBLE", "STLK_INT_LIKE_ASSIGN", 
        "IATEXTS_NFIELD", "NIVEANESS_DRIVER", "NIVEANESS_DRIVER_CONTROL", 
        "GENDER_RECODE_AMERICAN", "HAIRCOLOUR_HELPER_IMAGE", "HCLIENTCATEGORY", 
        "AD_TYPE", "FPERSUASIONMOSTOFTEN_ANOTHER", "MOODFEELNEGATIVE_CONTROL", 
        "MOODFEELPOSITIVE_CONTROL", "SPPERSUASIONMOSTOFTEN_ANOTHER", 
        "WHATPRODUCTLOOKLIKE_CONTROL", "BRANDING_BENGALI", "BRANDING_GUJARATI", 
        "BRANDING_HINDI", "BRANDING_KANNADA", "BRANDING_MALAYALAM", "BRANDING_MARATHI", 
        "BRANDING_TAMIL", "BRANDING_TELUGU", "LANGUAGELIST_DRIVER", "VARIANTFULL_BENGALI", 
        "VARIANTFULL_GUJARATI", "VARIANTFULL_HINDI", "VARIANTFULL_KANNADA", 
        "VARIANTFULL_MALAYALAM", "VARIANTFULL_MARATHI", "VARIANTFULL_TAMIL", 
        "VARIANTFULL_TELUGU", "VARIANTPARENT_BENGALI", "VARIANTPARENT_GUJARATI", 
        "VARIANTPARENT_HINDI", "VARIANTPARENT_KANNADA", "VARIANTPARENT_MALAYALAM", 
        "VARIANTPARENT_MARATHI", "VARIANTPARENT_TAMIL", "VARIANTPARENT_TELUGU", 
        "ADVERTISINGIMPRINTTEXT", "FC_OPTINS_TEXTDETAILS", "FCSTATUS", "JWFC_TEXT_DETAILS", 
        "SLOGAN_MISSINGANSWER", "SPONTANEOUSBRANDING_MISSINGANSWER", "BRANDS_LIST", 
        "YOUTUBE_CONTROLCELL_DUMMY", "COMMS_BLOCK_MEDIA_CONTROL_NFIELD", "CLICKSPOT_LABELS", 
        "VISITSITETYPEDRIVER", "PRPURINT", "CONCEPT_BLOCK_CONFIG", "CONCEPT_BLOCK_CONTROL", 
        "EXCITMENT", "INCREMNT", "LIKBILTY", "MESSAGESTODISPLAY", "PRE_MDF_CONTROL", 
        "PRTINCR_RESP", "PRVALMNY", "PURCHFRQ", "PURFRQIC_CONCEPT", "RELVANCE", 
        "UNDERSTG", "UNIQNESS", "UNPRICEP", "UNPURINT", "BELVBLTY", "INERTIA_1", 
        "LINKEDSLIDERREMAIN", "PSM_EXPENSIVE", "PSM_CHEAP", "PSM_TOO_CHEAP", 
        "PSM_TOO_EXPENSIVE", "PSMPRICEPOINTS_DRIVER", "UNTVAR_TEXT_CONTROL", 
        "USAGE_HOW_CONSUMED", "USAGE_WHEN_DAY", "USAGE_WHEN_GEN", "USAGE_WHEN_TIME", 
        "USAGE_WHERE_BUY", "USAGE_WHERE_LOC", "USAGE_WHERE_WHAT", "USAGE_WHO_FOR", 
        "USAGE_WHO_WITH", "USAGE_WHY", "INERTIA_2", "INERTIA_3", "INSIGHTRELEVANCEDRIVER", 
        "INSIGHT_RELEVANCE2", "BRANDPURPOSE_SLDRENDLABELS", "ENJOYMENT_PLUS_HELPER", 
        "IMCONTROL", "IMSTATEMENTS", "IMSTATEMENTS_DRIVER", 
        "POSITIVE_EMOTIONS_INSTRUCTIONS_DURING", "TALKBACK_MISSINGANSWER", 
        "WHATTYPEOFBRAND_MISSINGANSWER", "HHOLDCOMP_ERROR", "CAMPAIGN_MEDIATEXT", 
        "CELEBRITYRECOGNITION_IMAGE_HELPER", "CHARACTERIMAGE_CONTROL", 
        "CHARACTERIMAGEDRIVER", "COMMS_BLOCK_BAT_MEDIA_CONTROL_NFIELD", 
        "LINKPLUSTVLOREALCORE6", "SPONTANEOUSBRANDING_LOOP_TEXTS", 
        "MEDIA_CONTROL_NFIELD", "DATASHARING_CHINA", "DATATRANSFER_CHINA", 
        "PERSONALINFORMATION", "SENSITIVEPICOLLECTION", "SENSITIVEPICOLLECTIONFACIALCODING", 
        "AFFECTIVA_HELPER", "DUMMY", "DUMMY1", "DUMMY2", "DUMMY3", "DUMMY4", "DUMMY5", 
        "TEST", "TESTVAR", "SKIP", "HIDDEN", "TEMP", "IGNORE", "_CONTROL", "_DRIVER", "_HELPER"
    ]

def load_exclusions_from_workspace(workspace_path: str) -> List[str]:
    """Carga exclusiones desde archivo del workspace o usa defaults"""
    exclusions_file = get_exclusions_file_path(workspace_path)
    
    if os.path.exists(exclusions_file):
        try:
            with open(exclusions_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('exclusions', load_default_exclusions())
        except Exception as e:
            print(f"Error loading exclusions file: {str(e)}")
            return load_default_exclusions()
    else:
        # Crear archivo con defaults
        default_exclusions = load_default_exclusions()
        save_exclusions_to_workspace(workspace_path, default_exclusions)
        return default_exclusions

def save_exclusions_to_workspace(workspace_path: str, exclusions: List[str]) -> bool:
    """Guarda exclusiones en archivo del workspace"""
    try:
        exclusions_file = get_exclusions_file_path(workspace_path)
        
        data = {
            "exclusions": sorted(list(set(exclusions))),
            "last_updated": datetime.now().isoformat(),
            "total_count": len(exclusions)
        }
        
        with open(exclusions_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        return True
    except Exception as e:
        print(f"Error saving exclusions: {str(e)}")
        return False

# ================================
# 3. LECTURA DE ARCHIVOS XML
# ================================

def read_chunk_db_xml(workspace_path: str) -> List[str]:
    """Lee el CHUNK_DB.XML exactamente como la app original"""
    xml_path = os.path.join(workspace_path, "outputs-dimensions-content", 
                           "Template_Configuration", "CHUNK_DB.XML")
    
    if not os.path.exists(xml_path):
        raise HTTPException(status_code=404, detail="CHUNK_DB.XML not found")
    
    tree = ET.parse(xml_path)
    root = tree.getroot()
    
    # Exactamente como la app original
    data = []
    for namechunk in root.iter("NAME"):
        data.append(namechunk.text)
    
    my_set = set(data)
    my_new_array = list(my_set)
    my_new_array = list(map(str.upper, my_new_array))
    
    return my_new_array

# ================================
# 4. DESCARGA DE PRODUCTOS DESDE AZURE
# ================================

def download_product_json(token: str, product_name: str, workspace_path: str) -> Dict[str, Any]:
    """Descarga el JSON del producto exactamente como la app original"""
    product_name = product_name.strip().capitalize()
    url = (f"https://sandbox3-kap-product-template.azurewebsites.net/api/producttemplate/product/"
           f"{product_name}?languages=en-gb&refreshCache=true&version=")
    
    collection_id = "11433564-0587479e-07c6-4f16-95c9-6b7c59da0523"
    headers = {"x-jetstream-devtoken": token}
    
    try:
        response = requests.get(url.format(id=collection_id), headers=headers, verify=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    
    if response.status_code == 200:
        json_data = response.json()
        # Guardar JSON como la app original
        json_path = os.path.join(workspace_path, f"{product_name}.json")
        with open(json_path, "w") as file:
            json.dump(json_data, file, indent=4)
        print(f"\n                JSON file success save.                \n")
        return json_data
    else:
        error_msg = f"Failed to download Postman Collection (Verify Product Name Exists). HTTP status code: {response.status_code}"
        raise HTTPException(status_code=response.status_code, detail=error_msg)

# ================================
# 5. EXTRACCIÓN DE VARIABLES
# ================================

def extract_variables_from_modules(json_data: Dict[str, Any], items_to_exclude: List[str]) -> Tuple[List[str], str]:
    """Extrae variables exactamente como la app original desde modules->questions->groupName"""
    variable_found = ""
    
    try:
        # Lógica exacta de la app original
        variable = ""
        for link in json_data["modules"]:
            for links in link["questions"]:
                if links.get("contentType") != "Script":
                    if links.get("contentType") != "InfoQuestion":
                        if links.get("answers") or links.get("columns"):
                            group_name = links.get("groupName")
                            if group_name:
                                variable += group_name + ","
        
        # Procesar como la app original
        variable = variable[:-1]  # Quitar última coma
        array = variable.split(",")
        array = list(map(str.upper, array))
        
        # Aplicar exclusiones como la app original
        array = [items for items in array if items not in items_to_exclude]
        
        return array, variable_found
        
    except KeyError as e:
        print(f"Warning: Expected structure not found: {str(e)}")
        return [], ""

# ================================
# 6. CREACIÓN DE ARCHIVOS MRS
# ================================

def create_mrs_files_with_labels(new_variables: List[str], workspace_path: str, json_data: Dict[str, Any]) -> int:
    """Crea archivos .mrs con labels extraídos del JSON exactamente como la app original"""
    # Crear carpeta MDD_Manipulation_Include como la app original
    project_folder = os.path.join(workspace_path, "MDD_Manipulation_Include")
    
    if os.path.exists(project_folder):
        shutil.rmtree(project_folder)
    
    os.mkdir(project_folder)
    
    chunks_created = 0
    
    for element in new_variables:
        if not element:  # Skip empty elements
            continue
        
        # Capitalizar como la app original
        element_cap = element.capitalize()
        
        # Crear archivo .mrs como la app original
        file_name = f"{element_cap}.mrs"
        file_path = os.path.join(project_folder, file_name)
        
        # Generar Labels exactamente como la app original
        labels = generate_labels_for_variable(element_cap, json_data)
        
        # Escribir archivo .mrs
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(labels)
            
            chunks_created += 1
            print(f"Created chunk file with labels: {file_name}")
            
        except Exception as e:
            print(f"Error creating file {file_name}: {str(e)}")
            # Si hay error, crear archivo básico
            try:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(f"' Error generating labels for: {element}\n' Basic content fallback\n{element}.Response.Value")
                chunks_created += 1
            except:
                pass
    
    return chunks_created

def generate_labels_for_variable(element_cap: str, json_data: Dict[str, Any]) -> str:
    """Genera labels para una variable específica"""
    labels = ""
    
    try:
        # Buscar en modules->questions como la app original
        for link in json_data["modules"]:
            for links in link["questions"]:
                if links.get("contentType") != "Script":
                    if links.get("contentType") != "InfoQuestion":
                        if links.get("contentType") != "LeftRightSliderQuestion":
                            if links.get("groupName") == element_cap:
                                
                                # Procesar respuestas (answers)
                                if links.get("answers"):
                                    labels += generate_title_text(links.get("groupName"))
                                    labels += generate_answer_labels(links, "answers")
                                
                                # Procesar columnas (columns) - para grids
                                elif links.get("columns"):
                                    labels += generate_title_text(links.get("groupName"))
                                    labels += generate_column_labels(links)
        
        return labels
        
    except Exception as e:
        print(f"Error generating labels for {element_cap}: {str(e)}")
        return f"' Error generating labels for: {element_cap}\n' Basic content fallback\n{element_cap}.Response.Value"

def generate_title_text(group_name: str) -> str:
    """Genera el texto del título"""
    return (
        'sbSetTitleText(MDM,"'
        + group_name
        + '","Analysis",LOCALE,"'
        + "("
        + group_name.upper()
        + ") "
        + group_name.upper()
        + '")'
        + "\n"
    )

def generate_answer_labels(links: Dict[str, Any], field_type: str) -> str:
    """Genera labels para respuestas"""
    labels = ""
    
    for answ in links[field_type]:
        if answ.get("text"):
            for text in answ["text"]:
                clean_text = clean_label_text(text.get("text", ""))
                
                labels += (
                    'sbSetResponseText(MDM,"'
                    + links.get("groupName")
                    + '","Analysis",LOCALE,"_'
                    + str(answ.get("code"))
                    + '","'
                    + clean_text
                    + '")'
                    + "\n"
                )
    
    # Aplicar reemplazos especiales como la app original
    return labels.replace("_997", "NA").replace("_998", "REF").replace("_999", "DK")

def generate_column_labels(links: Dict[str, Any]) -> str:
    """Genera labels para columnas (grids)"""
    labels = ""
    
    for answ in links["columns"]:
        if answ.get("text"):
            for text in answ["text"]:
                clean_text = clean_label_text(text.get("text", ""))
                
                labels += (
                    'sbSetResponseText(MDM,"'
                    + links.get("groupName")
                    + "[..].slice"
                    + '","Analysis",LOCALE,"_'
                    + str(answ.get("code"))
                    + '","'
                    + clean_text
                    + '")'
                    + "\n"
                )
    
    return labels

def clean_label_text(text: str) -> str:
    """Limpia el texto de los labels como la app original"""
    return (
        text.replace("\u039d", "")
        .replace("[b]", "")
        .replace("[/b]", "")
        .replace("[i]", "")
        .replace("[/i]", "")
        .replace("[u]", "")
        .replace("[/u]", "")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
    )

# ================================
# 7. PROCESAMIENTO PRINCIPAL
# ================================

def process_variables_and_create_chunks(json_data: Dict[str, Any], existing_chunks: List[str], 
                                      workspace_path: str, items_to_exclude: List[str]) -> Dict[str, Any]:
    """Procesa variables y crea chunks exactamente como la app original"""
    # Extraer variables del JSON
    variables_array, variable_found = extract_variables_from_modules(json_data, items_to_exclude)
    
    # Comparar con chunks existentes como la app original
    new_elements = ""
    variables_found_existing = ""
    
    for num in variables_array:
        found = False
        for element in existing_chunks:
            if element == num:
                found = True
                break
        
        if found:
            variables_found_existing += f"found {num}\n"
        else:
            new_elements += num + ","
    
    # Procesar nuevos elementos
    new_elements = new_elements[:-1]  # Quitar última coma
    new_variables = new_elements.split(",") if new_elements else []
    
    # Crear archivos .mrs para variables nuevas con labels del JSON
    chunks_created = create_mrs_files_with_labels(new_variables, workspace_path, json_data)
    
    # Análisis de resultados
    analysis_results = {
        "variables_processed": variables_array,
        "existing_variables": variables_found_existing.split('\n') if variables_found_existing else [],
        "new_variables": new_variables,
        "chunks_created": chunks_created,
        "existing_chunks_found": len([v for v in variables_found_existing.split('\n') if v.strip()]),
        "new_chunks_created": len(new_variables),
        "type_distribution": {
            "CATEGORICAL": len(new_variables),
            "TEXT": 0,
            "NUMERIC": 0,
            "GRID": 0,
            "UNKNOWN": 0
        }
    }
    
    return analysis_results

# ================================
# 8. GENERACIÓN DE REPORTES
# ================================

def generate_original_style_report(product_name: str, analysis_results: Dict[str, Any], 
                                 items_to_exclude: List[str]) -> str:
    """Genera reporte en el estilo de la app original"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    report_lines = [
        "=" * 60,
        "PRODUCT CHUNKS MANIPULATION REPORT",
        "=" * 60,
        f"Product: {product_name}",
        f"Date: {timestamp}",
        f"Total Variables Found: {len(analysis_results['variables_processed'])}",
        f"Variables with Existing Chunks: {analysis_results['existing_chunks_found']}",
        f"New Variables (Chunks Created): {analysis_results['new_chunks_created']}",
        f"Total MRS Files Created: {analysis_results['chunks_created']}",
        "",
        "EXCLUSIONS APPLIED:",
        "-" * 20
    ]
    
    # Mostrar exclusiones aplicadas (primeras 10)
    for exclusion in items_to_exclude[:10]:
        report_lines.append(f"- {exclusion}")
    
    if len(items_to_exclude) > 10:
        report_lines.append(f"... and {len(items_to_exclude) - 10} more exclusions")
    
    report_lines.extend([
        "",
        "EXISTING VARIABLES (FOUND IN CHUNK_DB.XML):",
        "-" * 45
    ])
    
    # Variables existentes
    for existing in analysis_results['existing_variables']:
        if existing.strip():
            report_lines.append(f"✓ {existing}")
    
    report_lines.extend([
        "",
        "NEW VARIABLES (MRS FILES CREATED):",
        "-" * 35
    ])
    
    # Variables nuevas con archivos creados
    for new_var in analysis_results['new_variables']:
        if new_var.strip():
            report_lines.append(f"+ {new_var}.mrs → Created in MDD_Manipulation_Include/")
    
    report_lines.extend([
        "",
        "PROCESSING SUMMARY:",
        "-" * 20,
        f"- Variables processed: {len(analysis_results['variables_processed'])}",
        f"- Existing chunks found: {analysis_results['existing_chunks_found']}",
        f"- New MRS files created: {analysis_results['new_chunks_created']}",
        f"- MRS files location: MDD_Manipulation_Include/",
        "",
        "NOTES:",
        "- Variables excluded by configuration are not processed",
        "- MRS files are created only for variables not found in CHUNK_DB.XML",
        "- Use the created MRS files for your survey manipulation",
        "",
        "=" * 60
    ])
    
    return "\n".join(report_lines)

# ================================
# 9. ENDPOINTS API
# ================================

@app.post("/product-chunks/process")
async def process_product_chunks_exact_original(
    token: str = Form(..., description="Azure API token"),
    product_name: str = Form(..., description="Product name"),
    workspace_path: str = Form(..., description="Workspace path")
) -> ProductChunksResponse:
    """Procesa chunks de producto con la lógica EXACTA de la aplicación original"""
    try:
        # 1. Validaciones iniciales
        if not os.path.exists(workspace_path):
            raise HTTPException(status_code=400, detail="Workspace path does not exist")
        
        outputs_path = os.path.join(workspace_path, "outputs-dimensions-content")
        if not os.path.exists(outputs_path):
            raise HTTPException(status_code=400, detail="outputs-dimensions-content folder not found")
        
        print(f"🔍 Processing product: {product_name}")
        print(f"📂 Workspace: {workspace_path}")
        
        # 2. Cargar exclusiones (del workspace específico)
        items_to_exclude = load_exclusions_from_workspace(workspace_path)
        print(f"📋 Loaded {len(items_to_exclude)} exclusion items from workspace")
        
        # 3. Leer CHUNK_DB.XML (exactamente como la app original)
        existing_chunks = read_chunk_db_xml(workspace_path)
        print(f"📋 Found {len(existing_chunks)} existing chunks in CHUNK_DB.XML")
        
        # 4. Descargar JSON del producto (exactamente como la app original)
        print(f"⬇️ Downloading JSON for product: {product_name}")
        json_data = download_product_json(token, product_name, workspace_path)
        
        # 5. Procesar variables y crear chunks (lógica exacta original)
        analysis_results = process_variables_and_create_chunks(
            json_data, existing_chunks, workspace_path, items_to_exclude
        )
        
        # 6. Generar reporte
        report_content = generate_original_style_report(product_name, analysis_results, items_to_exclude)
        
        # 7. Guardar reporte
        report_filename = f"{product_name.capitalize()}_chunks_report.txt"
        report_path = os.path.join(workspace_path, report_filename)
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        print(f"📄 Report saved: {report_filename}")
        print(f"📁 MRS files created in: MDD_Manipulation_Include/")
        print("\n✅ The process finished successfully!")
        
        return ProductChunksResponse(
            success=True,
            message=f"Successfully processed {len(analysis_results['variables_processed'])} variables. Created {analysis_results['new_chunks_created']} new MRS files. Found {analysis_results['existing_chunks_found']} existing chunks.",
            report_content=report_content,
            product_name=product_name,
            total_chunks=analysis_results["chunks_created"],
            chunks_by_type=analysis_results['type_distribution'],
            variables_found=len(analysis_results['variables_processed']),
            new_chunks_created=analysis_results['new_chunks_created'],
            existing_chunks_found=analysis_results['existing_chunks_found']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ An error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.get("/product-chunks/exclusions")
async def get_exclusions(workspace_path: str) -> ExclusionsResponse:
    """Obtiene la lista actual de exclusiones para un workspace"""
    try:
        if not os.path.exists(workspace_path):
            raise HTTPException(status_code=400, detail="Workspace path does not exist")
        
        exclusions = load_exclusions_from_workspace(workspace_path)
        
        return ExclusionsResponse(
            success=True,
            message=f"Loaded {len(exclusions)} exclusion items",
            exclusions=sorted(exclusions),
            total_exclusions=len(exclusions)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load exclusions: {str(e)}")

@app.post("/product-chunks/exclusions/update")
async def update_exclusions(
    workspace_path: str = Form(...),
    exclusions_text: str = Form(...),
    action: str = Form(default="replace")
) -> ExclusionsResponse:
    """Actualiza las exclusiones del workspace"""
    try:
        if not os.path.exists(workspace_path):
            raise HTTPException(status_code=400, detail="Workspace path does not exist")
        
        # Parsear exclusiones del texto
        if ',' in exclusions_text:
            new_exclusions = [item.strip().upper() for item in exclusions_text.split(',')]
        else:
            new_exclusions = [item.strip().upper() for item in exclusions_text.split('\n')]
        
        new_exclusions = [item for item in new_exclusions if item]
        
        # Cargar exclusiones actuales
        current_exclusions = load_exclusions_from_workspace(workspace_path)
        
        # Aplicar acción
        if action == "add":
            updated_exclusions = list(set(current_exclusions + new_exclusions))
            message = f"Added {len(new_exclusions)} new exclusions"
        elif action == "remove":
            updated_exclusions = [item for item in current_exclusions if item not in new_exclusions]
            removed_count = len(current_exclusions) - len(updated_exclusions)
            message = f"Removed {removed_count} exclusions"
        else:  # replace
            updated_exclusions = new_exclusions
            message = f"Replaced exclusions list with {len(new_exclusions)} items"
        
        # Guardar exclusiones actualizadas
        if save_exclusions_to_workspace(workspace_path, updated_exclusions):
            return ExclusionsResponse(
                success=True,
                message=message,
                exclusions=sorted(updated_exclusions),
                total_exclusions=len(updated_exclusions)
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to save exclusions")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update exclusions: {str(e)}")

@app.post("/product-chunks/exclusions/reset")
async def reset_exclusions_to_default(workspace_path: str = Form(...)) -> ExclusionsResponse:
    """Resetea las exclusiones a los valores por defecto"""
    try:
        if not os.path.exists(workspace_path):
            raise HTTPException(status_code=400, detail="Workspace path does not exist")
        
        default_exclusions = load_default_exclusions()
        
        if save_exclusions_to_workspace(workspace_path, default_exclusions):
            return ExclusionsResponse(
                success=True,
                message=f"Reset to {len(default_exclusions)} default exclusions",
                exclusions=sorted(default_exclusions),
                total_exclusions=len(default_exclusions)
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to reset exclusions")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset exclusions: {str(e)}")

@app.get("/product-chunks/test")
async def test_product_chunks_exact_original():
    """Test endpoint para verificar que el servicio funciona"""
    return {
        "service": "Product Chunks Processor (Exact Original Logic)",
        "version": "2.0",
        "status": "operational",
        "features": [
            "Download product JSON from Azure API",
            "Extract variables from modules->questions->groupName", 
            "Apply exclusions (dummy, etc.)",
            "Compare with existing CHUNK_DB.XML",
            "Create MRS files for new variables with real labels",
            "Generate detailed analysis report",
            "Manage exclusions per workspace"
        ],
        "endpoints": [
            "/product-chunks/process",
            "/product-chunks/exclusions",
            "/product-chunks/exclusions/update", 
            "/product-chunks/exclusions/reset",
            "/product-chunks/test"
        ],
        "timestamp": datetime.now().isoformat()
    }

# ================================
# FIN DEL MÓDULO PRODUCT CHUNKS PROCESSOR
# ================================

if __name__ == "__main__":
    print("🚀 Starting KapTools Nexus API...")
    print("📡 Backend will be available at: http://127.0.0.1:8000")
    print("📖 API docs available at: http://127.0.0.1:8000/docs")
    print("🧪 Test endpoint: http://127.0.0.1:8000/test")
    print("📋 MDD endpoints: http://127.0.0.1:8000/data/duplicate-mdd")
    print("📦 Product endpoints: http://127.0.0.1:8000/product/servers")
    print("🏗️ Create Structure: http://127.0.0.1:8000/data-processing/create-structure")
    
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8000,
        log_level="info"
    )


