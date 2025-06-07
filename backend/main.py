# backend/main.py - Complete version with Review Branches + File Diff Viewer
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import uvicorn
import os

# Import services - ACTUALIZADO para incluir FileDiff y DiffLine
try:
    from services.git_service import GitService, BranchInfo, BranchComparison, CheckoutResult, RepositoryStatus, FileDiff, DiffLine
    from services.azure_service import AzureService
    git_service = GitService()
    azure_service = AzureService()
    SERVICES_AVAILABLE = True
except ImportError as e:
    print(f"⚠️  Warning: Could not import services: {e}")
    SERVICES_AVAILABLE = False

app = FastAPI(title="KapTools Nexus API", version="2.0.0")

# Permitir CORS para que React pueda conectarse
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

# 🔥 NUEVO MODELO PARA FILE DIFFS
class MultipleFileDiffRequest(BaseModel):
    project_path: str
    repo_name: str
    branch_name: str
    file_paths: List[str]

# ================================
# ENDPOINTS BÁSICOS
# ================================

@app.get("/")
async def root():
    return {
        "message": "KapTools Nexus API is running! 🚀",
        "version": "2.0.0",
        "services_available": SERVICES_AVAILABLE,
        "status": "healthy",
        "features": [
            "Git Operations",
            "Azure Downloads", 
            "Review Branches",
            "File Diff Viewer",  # ← NUEVO
            "Workspace Management"
        ]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "version": "2.0.0",
        "services": {
            "git": "active" if SERVICES_AVAILABLE else "unavailable",
            "azure": "active" if SERVICES_AVAILABLE else "unavailable"
        },
        "endpoints": {
            "git_clone": "/git/clone-microservices",
            "git_branches": "/git/branches",
            "git_checkout": "/git/checkout",
            "git_compare": "/git/compare",
            "git_file_diff": "/git/file-diff",  # ← NUEVO
            "azure_download": "/azure/download-files"
        }
    }

# ================================
# GIT OPERATIONS - BÁSICAS
# ================================

@app.post("/git/clone-microservices")
async def clone_microservices(request: CloneRequest):
    """Clone Git microservices to specified path"""
    if not SERVICES_AVAILABLE:
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
    if not SERVICES_AVAILABLE:
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
    """
    Obtiene las ramas más recientes de los repositorios
    """
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        if not project_path or not os.path.exists(project_path):
            raise HTTPException(status_code=400, detail="Invalid project path")
        
        # Validar primero que existen los repositorios
        validation = git_service.validate_repositories_for_branches(project_path)
        if not validation["valid"]:
            raise HTTPException(status_code=400, detail=validation["message"])
        
        branches = git_service.get_recent_branches(project_path, repo, limit)
        
        return {
            "success": True,
            "branches": [branch.dict() for branch in branches],
            "total": len(branches),
            "repository_filter": repo,
            "workspace_path": project_path,
            "available_repositories": validation["repositories"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get branches: {str(e)}")

@app.post("/git/checkout")
async def checkout_branch(
    project_path: str,
    repo_name: str,  # 'content' or 'dimensions'
    branch_name: str
):
    """
    Hace checkout a una rama específica
    """
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        if not project_path or not os.path.exists(project_path):
            raise HTTPException(status_code=400, detail="Invalid project path")
        
        if repo_name not in ['content', 'dimensions']:
            raise HTTPException(status_code=400, detail="Repository must be 'content' or 'dimensions'")
        
        result = git_service.checkout_branch(project_path, repo_name, branch_name)
        
        if result.success:
            return {
                "success": True,
                "message": result.message,
                "current_branch": result.current_branch,
                "previous_branch": result.previous_branch,
                "repository": result.repository
            }
        else:
            raise HTTPException(status_code=400, detail=result.message)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Checkout failed: {str(e)}")

@app.get("/git/compare")
async def compare_branches(
    project_path: str,
    repo_name: str,  # 'content' or 'dimensions'
    branch_name: str,
    base_branch: str = "master"
):
    """
    Compara una rama con master (o otra rama base)
    """
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        if not project_path or not os.path.exists(project_path):
            raise HTTPException(status_code=400, detail="Invalid project path")
        
        if repo_name not in ['content', 'dimensions']:
            raise HTTPException(status_code=400, detail="Repository must be 'content' or 'dimensions'")
        
        comparison = git_service.compare_branch_with_master(project_path, repo_name, branch_name)
        
        return {
            "success": True,
            "comparison": comparison.dict(),
            "summary": f"Comparing {branch_name} with {base_branch} in {repo_name} repository"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

@app.get("/git/status")
async def get_repository_status(project_path: str):
    """
    Obtiene el estado actual de ambos repositorios
    """
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        if not project_path or not os.path.exists(project_path):
            raise HTTPException(status_code=400, detail="Invalid project path")
        
        status = git_service.get_repository_status(project_path)
        
        # Convertir RepositoryStatus a dict
        status_dict = {}
        for repo_name, repo_status in status.items():
            status_dict[repo_name] = repo_status.dict()
        
        return {
            "success": True,
            "status": status_dict,
            "workspace_path": project_path,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

@app.get("/git/validate-repositories")
async def validate_repositories(project_path: str):
    """
    Valida que los repositorios necesarios existan en el workspace
    """
    if not SERVICES_AVAILABLE:
        return {
            "success": False,
            "validation": {
                "valid": False,
                "message": "Git service not available",
                "repositories": {"content": False, "dimensions": False}
            }
        }
        
    try:
        validation = git_service.validate_repositories_for_branches(project_path)
        
        return {
            "success": True,
            "validation": validation
        }
        
    except Exception as e:
        return {
            "success": False,
            "validation": {
                "valid": False,
                "message": f"Validation error: {str(e)}",
                "repositories": {"content": False, "dimensions": False}
            }
        }

@app.get("/git/branch-details")
async def get_branch_details(
    project_path: str,
    repo_name: str,
    branch_name: str
):
    """
    Obtiene detalles específicos de una rama
    """
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        if not project_path or not os.path.exists(project_path):
            raise HTTPException(status_code=400, detail="Invalid project path")
        
        if repo_name not in ['content', 'dimensions']:
            raise HTTPException(status_code=400, detail="Repository must be 'content' or 'dimensions'")
        
        # Obtener la rama específica
        branches = git_service.get_recent_branches(project_path, repo_name, 50)  # Buscar en más ramas
        target_branch = None
        
        clean_branch_name = branch_name.replace('origin/', '')
        for branch in branches:
            if branch.display_name == clean_branch_name:
                target_branch = branch
                break
        
        if not target_branch:
            raise HTTPException(status_code=404, detail=f"Branch '{clean_branch_name}' not found")
        
        # Obtener comparación con master
        try:
            comparison = git_service.compare_branch_with_master(project_path, repo_name, branch_name)
            comparison_data = comparison.dict()
        except Exception as e:
            comparison_data = None
            print(f"Could not get comparison: {e}")
        
        return {
            "success": True,
            "branch": target_branch.dict(),
            "comparison": comparison_data,
            "repository": repo_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get branch details: {str(e)}")

@app.get("/git/branch-commits")
async def get_branch_commits(
    project_path: str,
    repo_name: str,
    branch_name: str,
    limit: int = 10
):
    """
    Obtiene el historial de commits de una rama específica
    """
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        if not project_path or not os.path.exists(project_path):
            raise HTTPException(status_code=400, detail="Invalid project path")
        
        if repo_name not in ['content', 'dimensions']:
            raise HTTPException(status_code=400, detail="Repository must be 'content' or 'dimensions'")
        
        import git
        
        repo_path = os.path.join(project_path, f"outputs-dimensions-{repo_name}")
        
        if not os.path.exists(repo_path):
            raise HTTPException(status_code=404, detail=f"Repository {repo_name} not found")
        
        repo = git.Repo(repo_path)
        clean_branch_name = branch_name.replace('origin/', '')
        
        # Intentar obtener la rama
        try:
            branch_ref = repo.remotes.origin.refs[clean_branch_name]
        except:
            try:
                branch_ref = repo.heads[clean_branch_name]
            except:
                raise HTTPException(status_code=404, detail=f"Branch '{clean_branch_name}' not found")
        
        # Obtener commits
        commits = []
        for commit in repo.iter_commits(branch_ref, max_count=limit):
            commits.append({
                "hash": commit.hexsha[:8],
                "full_hash": commit.hexsha,
                "message": commit.message.strip().split('\n')[0][:100],
                "author": commit.author.name,
                "author_email": commit.author.email,
                "date": commit.committed_datetime.isoformat(),
                "stats": {
                    "files_changed": len(commit.stats.files),
                    "insertions": commit.stats.total['insertions'],
                    "deletions": commit.stats.total['deletions']
                }
            })
        
        return {
            "success": True,
            "commits": commits,
            "branch_name": clean_branch_name,
            "repository": repo_name,
            "total_commits": len(commits)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get commits: {str(e)}")

@app.post("/git/fetch-all")
async def fetch_all_branches(project_path: str):
    """
    Hace fetch de todas las ramas remotas en ambos repositorios
    """
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        if not project_path or not os.path.exists(project_path):
            raise HTTPException(status_code=400, detail="Invalid project path")
        
        import git
        
        results = {}
        
        for repo_name in ['content', 'dimensions']:
            repo_path = os.path.join(project_path, f"outputs-dimensions-{repo_name}")
            
            if os.path.exists(repo_path):
                try:
                    repo = git.Repo(repo_path)
                    fetch_info = repo.remotes.origin.fetch()
                    
                    results[repo_name] = {
                        "success": True,
                        "message": f"Successfully fetched {len(fetch_info)} references",
                        "fetched_refs": [str(info.ref) for info in fetch_info]
                    }
                except Exception as e:
                    results[repo_name] = {
                        "success": False,
                        "message": f"Failed to fetch: {str(e)}",
                        "fetched_refs": []
                    }
            else:
                results[repo_name] = {
                    "success": False,
                    "message": "Repository not found",
                    "fetched_refs": []
                }
        
        overall_success = any(result["success"] for result in results.values())
        
        return {
            "success": overall_success,
            "results": results,
            "workspace_path": project_path
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fetch operation failed: {str(e)}")

# ================================
# 🔥 GIT OPERATIONS - FILE DIFF VIEWER
# ================================

@app.get("/git/file-diff")
async def get_file_diff(
    project_path: str,
    repo_name: str,
    branch_name: str,
    file_path: str,
    base_branch: str = "master"
):
    """
    Obtiene las diferencias detalladas de un archivo específico entre una rama y master
    
    Query Parameters:
        project_path: Ruta del workspace
        repo_name: 'content' o 'dimensions'
        branch_name: Nombre de la rama
        file_path: Ruta del archivo
        base_branch: Rama base para comparar (default: master)
    """
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        if not project_path or not os.path.exists(project_path):
            raise HTTPException(status_code=400, detail="Invalid project path")
        
        if repo_name not in ['content', 'dimensions']:
            raise HTTPException(status_code=400, detail="Repository must be 'content' or 'dimensions'")
        
        if not file_path:
            raise HTTPException(status_code=400, detail="File path is required")
        
        # Obtener el diff del archivo
        file_diff = git_service.get_file_diff(project_path, repo_name, branch_name, file_path)
        
        return {
            "success": True,
            "diff": file_diff.dict(),  # ← Usar "diff" para coincidir con el frontend
            "file_path": file_path,
            "branch_name": branch_name.replace('origin/', ''),
            "base_branch": base_branch,
            "repository": repo_name,
            "message": f"File diff retrieved for {file_path}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get file diff: {str(e)}")

@app.post("/git/multiple-file-diffs")
async def get_multiple_file_diffs(request: MultipleFileDiffRequest):
    """
    Obtiene las diferencias de múltiples archivos
    
    Body: {
        "project_path": "C:/workspace",
        "repo_name": "content",
        "branch_name": "feature/branch",
        "file_paths": ["file1.txt", "file2.py"]
    }
    """
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        if not os.path.exists(request.project_path):
            raise HTTPException(status_code=400, detail="Invalid project path")
        
        if request.repo_name not in ['content', 'dimensions']:
            raise HTTPException(status_code=400, detail="Repository must be 'content' or 'dimensions'")
        
        if not request.file_paths:
            raise HTTPException(status_code=400, detail="File paths are required")
        
        # Obtener diffs de múltiples archivos
        file_diffs = git_service.get_multiple_file_diffs(
            request.project_path, 
            request.repo_name, 
            request.branch_name, 
            request.file_paths
        )
        
        return {
            "success": True,
            "file_diffs": [diff.dict() for diff in file_diffs],
            "total_files": len(file_diffs),
            "branch_name": request.branch_name.replace('origin/', ''),
            "repository": request.repo_name,
            "message": f"Retrieved diffs for {len(file_diffs)} files"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get multiple file diffs: {str(e)}")

@app.get("/git/detailed-comparison")
async def get_detailed_comparison(
    project_path: str,
    repo_name: str,
    branch_name: str
):
    """
    Obtiene una comparación detallada completa entre una rama y master
    Incluye archivos con diffs completos y resúmenes
    
    Query Parameters:
        project_path: Ruta del workspace
        repo_name: 'content' o 'dimensions'
        branch_name: Nombre de la rama
    """
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        if not project_path or not os.path.exists(project_path):
            raise HTTPException(status_code=400, detail="Invalid project path")
        
        if repo_name not in ['content', 'dimensions']:
            raise HTTPException(status_code=400, detail="Repository must be 'content' or 'dimensions'")
        
        # Obtener comparación detallada
        detailed_comparison = git_service.get_detailed_comparison(project_path, repo_name, branch_name)
        
        # Convertir a dict manteniendo la estructura
        result = {
            "comparison": detailed_comparison["comparison"].dict(),
            "detailed_files": detailed_comparison["detailed_files"],
            "summary_files": [file_info.dict() for file_info in detailed_comparison["summary_files"]],
            "has_large_files": detailed_comparison["has_large_files"],
            "total_detailed": detailed_comparison["total_detailed"],
            "total_summary": detailed_comparison["total_summary"]
        }
        
        return {
            "success": True,
            "detailed_comparison": result,
            "branch_name": branch_name.replace('origin/', ''),
            "repository": repo_name,
            "message": f"Detailed comparison retrieved for {branch_name}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get detailed comparison: {str(e)}")

@app.get("/git/file-content")
async def get_file_content_at_commit(
    project_path: str,
    repo_name: str,
    commit_sha: str,
    file_path: str
):
    """
    Obtiene el contenido de un archivo en un commit específico
    
    Query Parameters:
        project_path: Ruta del workspace
        repo_name: 'content' o 'dimensions'
        commit_sha: SHA del commit
        file_path: Ruta del archivo
    """
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        if not project_path or not os.path.exists(project_path):
            raise HTTPException(status_code=400, detail="Invalid project path")
        
        if repo_name not in ['content', 'dimensions']:
            raise HTTPException(status_code=400, detail="Repository must be 'content' or 'dimensions'")
        
        if not commit_sha or not file_path:
            raise HTTPException(status_code=400, detail="Commit SHA and file path are required")
        
        # Obtener contenido del archivo
        file_content = git_service.get_file_content_at_commit(project_path, repo_name, commit_sha, file_path)
        
        return {
            "success": True,
            "file_content": file_content,
            "file_path": file_path,
            "commit_sha": commit_sha,
            "repository": repo_name,
            "message": f"File content retrieved for {file_path} at commit {commit_sha[:8]}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get file content: {str(e)}")

@app.get("/git/branch-file-tree")
async def get_branch_file_tree(
    project_path: str,
    repo_name: str,
    branch_name: str
):
    """
    Obtiene el árbol de archivos de una rama específica
    
    Query Parameters:
        project_path: Ruta del workspace
        repo_name: 'content' o 'dimensions'
        branch_name: Nombre de la rama
    """
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        if not project_path or not os.path.exists(project_path):
            raise HTTPException(status_code=400, detail="Invalid project path")
        
        if repo_name not in ['content', 'dimensions']:
            raise HTTPException(status_code=400, detail="Repository must be 'content' or 'dimensions'")
        
        # Obtener árbol de archivos
        file_tree = git_service.get_branch_file_tree(project_path, repo_name, branch_name)
        
        return {
            "success": True,
            "file_tree": file_tree,
            "branch_name": branch_name.replace('origin/', ''),
            "repository": repo_name,
            "message": f"File tree retrieved for branch {branch_name}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get file tree: {str(e)}")

# ================================
# AZURE OPERATIONS  
# ================================

@app.post("/azure/download-files")
async def download_azure_files(request: AzureDownloadRequest):
    """Download Azure files for a project"""
    if not SERVICES_AVAILABLE:
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
    if not SERVICES_AVAILABLE:
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
# TEST ENDPOINTS - ACTUALIZADO
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
                "/git/status",
                "/git/file-diff",  # ← NUEVO
                "/git/multiple-file-diffs",  # ← NUEVO
                "/git/detailed-comparison",  # ← NUEVO
                "/git/file-content",  # ← NUEVO
                "/git/branch-file-tree"  # ← NUEVO
            ],
            "azure": [
                "/azure/download-files",
                "/azure/servers"
            ]
        }
    }

@app.get("/test/git")
async def test_git_service():
    """Test Git service availability"""
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Git service not available")
        
    try:
        config_validation = git_service.validate_git_config()
        
        return {
            "message": "Git service test successful! 🌿",
            "service_status": "active",
            "config_valid": config_validation["valid"],
            "config_issues": config_validation.get("issues", []),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Git service test failed: {str(e)}")

if __name__ == "__main__":
    print("🚀 Starting KapTools Nexus API...")
    print("📡 Backend will be available at: http://127.0.0.1:8000")
    print("📖 API docs available at: http://127.0.0.1:8000/docs")
    print("🧪 Test endpoint: http://127.0.0.1:8000/test")
    print("🌿 Git endpoints: http://127.0.0.1:8000/git/branches")
    print("🔥 File diff endpoint: http://127.0.0.1:8000/git/file-diff")  # ← NUEVO
    print("☁️  Azure endpoints: http://127.0.0.1:8000/azure/servers")
    
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8000,
        log_level="info"
    )