# backend/services/git_service.py - VERSIÓN COMPLETA CORREGIDA
import os
import subprocess
import asyncio
import git
from pathlib import Path
from typing import Dict, List, Optional
import configparser
from datetime import datetime
from pydantic import BaseModel

# Modelos para Review Branches
class BranchInfo(BaseModel):
    name: str
    display_name: str  # Sin 'origin/' prefix
    author: str
    author_email: str
    commit_hash: str
    commit_message: str
    date: datetime
    repository: str  # 'content' or 'dimensions'
    is_current: bool = False
    commits_ahead: int = 0
    commits_behind: int = 0

class ComparisonFile(BaseModel):
    path: str
    change_type: str  # 'added', 'deleted', 'modified'
    additions: int
    deletions: int
    old_path: Optional[str] = None

class BranchComparison(BaseModel):
    branch_name: str
    base_branch: str = "master"
    repository: str
    total_files: int
    total_additions: int
    total_deletions: int
    files: List[ComparisonFile]
    summary: str

class CheckoutResult(BaseModel):
    success: bool
    message: str
    current_branch: str
    repository: str
    previous_branch: Optional[str] = None

class RepositoryStatus(BaseModel):
    exists: bool
    is_git_repo: bool
    current_branch: Optional[str] = None
    has_uncommitted_changes: bool = False
    has_untracked_files: bool = False
    is_clean: bool = True
    last_commit_hash: Optional[str] = None
    last_commit_date: Optional[datetime] = None
    remote_url: Optional[str] = None

# 🔥 NUEVOS MODELOS PARA FILE DIFF VIEWER
class DiffLine(BaseModel):
    """Single line in a file diff"""
    line_number_old: Optional[int] = None
    line_number_new: Optional[int] = None
    content: str = ""
    type: str = "context"  # 'added', 'deleted', 'context', 'header'

class FileDiff(BaseModel):
    """File difference information"""
    path: str
    old_content: str = ""
    new_content: str = ""
    diff_lines: List[DiffLine] = []
    change_type: str = "modified"


class GitService:
    def __init__(self):
        self.config = self._load_config()
    
    def _load_config(self) -> configparser.ConfigParser:
        """Load configuration from config.ini"""
        config = configparser.ConfigParser()
        config_path = Path(__file__).parent.parent / 'config' / 'config.ini'
        if config_path.exists():
            config.read(config_path)
        return config
    
    async def clone_microservices(self, project_path: str, branch: str = "develop") -> Dict[str, any]:
        """
        Clone microservices to specified path
        
        Args:
            project_path: Path where to clone repositories
            branch: Branch to clone (develop or master)
            
        Returns:
            Dict with success status and message
        """
        try:
            # Validate project path
            if not project_path or project_path.strip() == "Path of your workspace":
                return {
                    "success": False,
                    "message": "Debe especificar un workspace válido"
                }
            
            project_path = project_path.strip()
            workspace = Path(project_path)
            
            # Create workspace if it doesn't exist
            workspace.mkdir(parents=True, exist_ok=True)
            
            # Define repositories and their target directories
            repos = [
                {
                    "name": "outputs-dimensions-content",
                    "path": workspace / "outputs-dimensions-content",
                    "url_key": f"git_clone_command_content{'_master' if branch == 'master' else ''}"
                },
                {
                    "name": "outputs-dimensions", 
                    "path": workspace / "outputs-dimensions",
                    "url_key": f"git_clone_command_dimensions{'_master' if branch == 'master' else ''}"
                }
            ]
            
            results = []
            
            for repo in repos:
                # Check if repo already exists
                if repo["path"].exists():
                    results.append({
                        "repo": repo["name"],
                        "status": "skipped",
                        "message": f"Repository {repo['name']} already exists"
                    })
                    continue
                
                # Get clone command from config
                clone_command = self.config.get('Git', repo["url_key"], fallback='')
                if not clone_command:
                    results.append({
                        "repo": repo["name"],
                        "status": "error", 
                        "message": f"Clone command not found for {repo['name']}"
                    })
                    continue
                
                # Execute clone
                try:
                    process = await asyncio.create_subprocess_shell(
                        f'cd "{workspace}" && {clone_command}',
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    
                    stdout, stderr = await process.communicate()
                    
                    if process.returncode == 0:
                        results.append({
                            "repo": repo["name"],
                            "status": "success",
                            "message": f"Successfully cloned {repo['name']}"
                        })
                    else:
                        error_msg = stderr.decode() if stderr else "Unknown error"
                        results.append({
                            "repo": repo["name"],
                            "status": "error",
                            "message": f"Failed to clone {repo['name']}: {error_msg}"
                        })
                        
                except Exception as e:
                    results.append({
                        "repo": repo["name"],
                        "status": "error",
                        "message": f"Exception cloning {repo['name']}: {str(e)}"
                    })
            
            # Determine overall success
            successful_repos = [r for r in results if r["status"] in ["success", "skipped"]]
            total_success = len(successful_repos) == len(repos)
            
            return {
                "success": total_success,
                "message": f"Cloned {len([r for r in results if r['status'] == 'success'])} repositories successfully",
                "branch": branch,
                "workspace": str(workspace),
                "results": results
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Error during clone operation: {str(e)}",
                "branch": branch,
                "workspace": project_path,
                "results": []
            }
    
    def validate_workspace(self, workspace_path: str) -> Dict[str, any]:
        """
        Validate workspace for Git operations
        
        Args:
            workspace_path: Path to validate
            
        Returns:
            Dict with validation results
        """
        issues = []
        
        if not workspace_path or workspace_path.strip() == "Path of your workspace":
            issues.append("Workspace path is not set")
            return {
                "valid": False,
                "issues": issues,
                "workspace_path": workspace_path
            }
        
        workspace = Path(workspace_path.strip())
        
        # Check if path exists
        if not workspace.exists():
            try:
                workspace.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                issues.append(f"Cannot create workspace directory: {str(e)}")
        
        # Check if path is writable
        if workspace.exists() and not os.access(workspace, os.W_OK):
            issues.append("Workspace directory is not writable")
        
        # Check if Git is available
        try:
            result = subprocess.run(['git', '--version'], capture_output=True, text=True)
            if result.returncode != 0:
                issues.append("Git is not installed or not available in PATH")
        except FileNotFoundError:
            issues.append("Git is not installed")
        
        # Check for existing repositories
        existing_repos = []
        if workspace.exists():
            content_repo = workspace / "outputs-dimensions-content"
            dimensions_repo = workspace / "outputs-dimensions"
            
            if content_repo.exists():
                existing_repos.append("outputs-dimensions-content")
            if dimensions_repo.exists():
                existing_repos.append("outputs-dimensions")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "workspace_path": str(workspace),
            "existing_repositories": existing_repos,
            "git_available": len([i for i in issues if "Git" in i]) == 0
        }
    
    def validate_git_config(self) -> Dict[str, any]:
        """
        Validate Git configuration
        
        Returns:
            Dict with validation results
        """
        issues = []
        
        # Check required config keys
        required_keys = [
            'git_clone_command_content',
            'git_clone_command_dimensions', 
            'git_clone_command_content_master',
            'git_clone_command_dimensions_master'
        ]
        
        for key in required_keys:
            value = self.config.get('Git', key, fallback='')
            if not value:
                issues.append(f"Missing Git configuration: {key}")
        
        # Check Git availability
        try:
            result = subprocess.run(['git', '--version'], capture_output=True, text=True)
            if result.returncode != 0:
                issues.append("Git is not installed or not available")
        except FileNotFoundError:
            issues.append("Git is not installed")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "git_section_exists": self.config.has_section('Git'),
            "config_keys_found": [key for key in required_keys if self.config.get('Git', key, fallback='')]
        }
    
    def get_git_config(self) -> Dict[str, any]:
        """
        Get Git configuration details
        
        Returns:
            Dict with Git configuration
        """
        git_config = {}
        
        if self.config.has_section('Git'):
            git_config = dict(self.config['Git'])
        
        return {
            "config": git_config,
            "section_exists": self.config.has_section('Git'),
            "total_keys": len(git_config)
        }

    # 🌿 MÉTODOS PARA REVIEW BRANCHES

    def get_recent_branches(self, project_path: str, repo_name: str = "both", limit: int = 15) -> List[BranchInfo]:
        """
        Obtiene las ramas más recientes de uno o ambos repositorios
        
        Args:
            project_path: Ruta del workspace
            repo_name: 'content', 'dimensions', o 'both'
            limit: Número máximo de ramas por repositorio
        """
        branches = []
        
        repos_to_check = []
        if repo_name in ['content', 'both']:
            content_path = os.path.join(project_path, "outputs-dimensions-content")
            if os.path.exists(content_path):
                repos_to_check.append(('content', content_path))
        
        if repo_name in ['dimensions', 'both']:
            dimensions_path = os.path.join(project_path, "outputs-dimensions")
            if os.path.exists(dimensions_path):
                repos_to_check.append(('dimensions', dimensions_path))
        
        for repo_type, repo_path in repos_to_check:
            try:
                repo = git.Repo(repo_path)
                
                # Obtener ramas remotas excluyendo HEAD y algunas especiales
                exclude_patterns = ['HEAD', 'develop', 'release', 'main']
                remote_refs = []
                
                # Fetch para obtener las últimas ramas
                try:
                    repo.remotes.origin.fetch()
                except Exception as e:
                    print(f"Warning: Could not fetch from origin: {e}")
                
                for ref in repo.remotes.origin.refs:
                    branch_name = ref.name
                    if not any(pattern in branch_name for pattern in exclude_patterns):
                        remote_refs.append(ref)
                
                # Ordenar por fecha de commit (más recientes primero)
                remote_refs.sort(key=lambda x: x.commit.committed_datetime, reverse=True)
                
                # Obtener la rama actual
                try:
                    current_branch = repo.active_branch.name
                except:
                    current_branch = None
                
                # Tomar solo las primeras 'limit' ramas
                for ref in remote_refs[:limit]:
                    display_name = ref.name.replace('origin/', '')
                    
                    # Calcular commits ahead/behind de master
                    commits_ahead = 0
                    commits_behind = 0
                    try:
                        if 'master' in [b.name for b in repo.heads]:
                            master_ref = repo.heads.master
                            ahead_behind = repo.git.rev_list('--left-right', '--count', 
                                                           f'{master_ref.commit.hexsha}...{ref.commit.hexsha}')
                            parts = ahead_behind.strip().split('\t')
                            if len(parts) == 2:
                                commits_behind = int(parts[0])
                                commits_ahead = int(parts[1])
                    except:
                        pass
                    
                    branch_info = BranchInfo(
                        name=ref.name,
                        display_name=display_name,
                        author=ref.commit.author.name,
                        author_email=ref.commit.author.email,
                        commit_hash=ref.commit.hexsha[:8],
                        commit_message=ref.commit.message.strip().split('\n')[0][:100],
                        date=ref.commit.committed_datetime,
                        repository=repo_type,
                        is_current=(display_name == current_branch),
                        commits_ahead=commits_ahead,
                        commits_behind=commits_behind
                    )
                    branches.append(branch_info)
                    
            except Exception as e:
                print(f"Error processing {repo_type} repository: {e}")
                continue
        
        # Ordenar todas las ramas por fecha
        branches.sort(key=lambda x: x.date, reverse=True)
        return branches

    def checkout_branch(self, project_path: str, repo_name: str, branch_name: str) -> CheckoutResult:
        """
        Hace checkout a una rama específica
        
        Args:
            project_path: Ruta del workspace  
            repo_name: 'content' o 'dimensions'
            branch_name: Nombre de la rama (sin 'origin/')
        """
        try:
            repo_path = os.path.join(project_path, f"outputs-dimensions-{repo_name}")
            
            if not os.path.exists(repo_path):
                return CheckoutResult(
                    success=False,
                    message=f"Repository {repo_name} not found in workspace",
                    current_branch="",
                    repository=repo_name
                )
            
            repo = git.Repo(repo_path)
            
            # Obtener rama actual antes del checkout
            try:
                previous_branch = repo.active_branch.name
            except:
                previous_branch = "detached"
            
            # Fetch primero para asegurar que tenemos la rama
            repo.remotes.origin.fetch()
            
            # Limpiar el nombre de la rama
            clean_branch_name = branch_name.replace('origin/', '')
            
            # Verificar si hay cambios sin commitear
            if repo.is_dirty():
                return CheckoutResult(
                    success=False,
                    message=f"Repository has uncommitted changes. Please commit or stash changes before checkout.",
                    current_branch=previous_branch,
                    repository=repo_name,
                    previous_branch=previous_branch
                )
            
            # Verificar si la rama local ya existe
            local_branches = [b.name for b in repo.heads]
            
            if clean_branch_name in local_branches:
                # Rama local existe, hacer checkout
                repo.heads[clean_branch_name].checkout()
            else:
                # Crear rama local desde la remota
                remote_ref = repo.remotes.origin.refs[clean_branch_name]
                local_branch = repo.create_head(clean_branch_name, remote_ref)
                local_branch.set_tracking_branch(remote_ref)
                local_branch.checkout()
            
            # Verificar el checkout
            current_branch = repo.active_branch.name
            
            return CheckoutResult(
                success=True,
                message=f"Successfully checked out to branch '{clean_branch_name}'",
                current_branch=current_branch,
                repository=repo_name,
                previous_branch=previous_branch
            )
            
        except Exception as e:
            return CheckoutResult(
                success=False,
                message=f"Failed to checkout branch: {str(e)}",
                current_branch="",
                repository=repo_name
            )

    def compare_branch_with_master(self, project_path: str, repo_name: str, branch_name: str) -> BranchComparison:
        """
        Compara una rama con master y retorna las diferencias
        
        Args:
            project_path: Ruta del workspace
            repo_name: 'content' o 'dimensions'  
            branch_name: Nombre de la rama a comparar
        """
        try:
            repo_path = os.path.join(project_path, f"outputs-dimensions-{repo_name}")
            
            if not os.path.exists(repo_path):
                raise Exception(f"Repository {repo_name} not found")
            
            repo = git.Repo(repo_path)
            
            # Obtener referencias
            master_ref = repo.heads.master
            clean_branch_name = branch_name.replace('origin/', '')
            
            # Intentar obtener la rama como referencia remota primero
            try:
                branch_ref = repo.remotes.origin.refs[clean_branch_name]
            except:
                # Si no existe como remota, buscar como local
                branch_ref = repo.heads[clean_branch_name]
            
            # Obtener diferencias
            diffs = master_ref.commit.diff(branch_ref.commit, create_patch=True)
            
            files = []
            total_additions = 0
            total_deletions = 0
            
            for diff in diffs:
                # Determinar tipo de cambio
                if diff.new_file:
                    change_type = "added"
                elif diff.deleted_file:
                    change_type = "deleted"
                elif diff.renamed_file:
                    change_type = "renamed"
                else:
                    change_type = "modified"
                
                # Contar líneas (aproximado)
                additions = 0
                deletions = 0
                
                if diff.diff:
                    try:
                        diff_text = diff.diff.decode('utf-8')
                        lines = diff_text.split('\n')
                        for line in lines:
                            if line.startswith('+') and not line.startswith('+++'):
                                additions += 1
                            elif line.startswith('-') and not line.startswith('---'):
                                deletions += 1
                    except:
                        # Si hay problemas de encoding, usar estimaciones
                        additions = 1 if change_type == "added" else 0
                        deletions = 1 if change_type == "deleted" else 0
                
                total_additions += additions
                total_deletions += deletions
                
                files.append(ComparisonFile(
                    path=diff.a_path or diff.b_path or "unknown",
                    change_type=change_type,
                    additions=additions,
                    deletions=deletions,
                    old_path=diff.a_path if diff.renamed_file else None
                ))
            
            # Crear resumen
            summary = f"{len(files)} files changed"
            if total_additions > 0:
                summary += f", {total_additions} insertions(+)"
            if total_deletions > 0:
                summary += f", {total_deletions} deletions(-)"
            
            return BranchComparison(
                branch_name=clean_branch_name,
                base_branch="master",
                repository=repo_name,
                total_files=len(files),
                total_additions=total_additions,
                total_deletions=total_deletions,
                files=files,
                summary=summary
            )
            
        except Exception as e:
            raise Exception(f"Failed to compare branches: {str(e)}")

    def get_repository_status(self, project_path: str) -> Dict[str, RepositoryStatus]:
        """
        Obtiene el estado actual de ambos repositorios
        """
        status = {}
        
        for repo_name in ["content", "dimensions"]:
            repo_path = os.path.join(project_path, f"outputs-dimensions-{repo_name}")
            
            if os.path.exists(repo_path):
                try:
                    repo = git.Repo(repo_path)
                    
                    # Obtener rama actual
                    try:
                        current_branch = repo.active_branch.name
                    except:
                        current_branch = "detached"
                    
                    # Verificar cambios
                    has_uncommitted = repo.is_dirty()
                    has_untracked = len(repo.untracked_files) > 0
                    is_clean = not has_uncommitted and not has_untracked
                    
                    # Información del último commit
                    last_commit = repo.head.commit
                    
                    # URL remota
                    try:
                        remote_url = repo.remotes.origin.url
                    except:
                        remote_url = None
                    
                    status[repo_name] = RepositoryStatus(
                        exists=True,
                        is_git_repo=True,
                        current_branch=current_branch,
                        has_uncommitted_changes=has_uncommitted,
                        has_untracked_files=has_untracked,
                        is_clean=is_clean,
                        last_commit_hash=last_commit.hexsha[:8],
                        last_commit_date=last_commit.committed_datetime,
                        remote_url=remote_url
                    )
                    
                except Exception as e:
                    print(f"Error checking {repo_name} status: {e}")
                    status[repo_name] = RepositoryStatus(
                        exists=True,
                        is_git_repo=False
                    )
            else:
                status[repo_name] = RepositoryStatus(
                    exists=False,
                    is_git_repo=False
                )
        
        return status

    def validate_repositories_for_branches(self, project_path: str) -> Dict[str, any]:
        """
        Valida que los repositorios necesarios existan para Review Branches
        """
        try:
            if not project_path or not os.path.exists(project_path):
                return {
                    "valid": False,
                    "message": "Workspace path does not exist",
                    "repositories": {"content": False, "dimensions": False}
                }
            
            content_path = os.path.join(project_path, "outputs-dimensions-content")
            dimensions_path = os.path.join(project_path, "outputs-dimensions")
            
            content_exists = os.path.exists(content_path) and os.path.exists(os.path.join(content_path, ".git"))
            dimensions_exists = os.path.exists(dimensions_path) and os.path.exists(os.path.join(dimensions_path, ".git"))
            
            valid = content_exists or dimensions_exists  # Al menos uno debe existir
            
            message = ""
            if not valid:
                message = "No Git repositories found. Please clone microservices first."
            elif content_exists and dimensions_exists:
                message = "Both repositories available"
            elif content_exists:
                message = "Only outputs-dimensions-content available"
            else:
                message = "Only outputs-dimensions available"
            
            return {
                "valid": valid,
                "message": message,
                "repositories": {
                    "content": content_exists,
                    "dimensions": dimensions_exists
                }
            }
            
        except Exception as e:
            return {
                "valid": False,
                "message": f"Validation error: {str(e)}",
                "repositories": {"content": False, "dimensions": False}
            }

    # 🔥 MÉTODOS PARA FILE DIFF VIEWER
    
    def get_file_diff(self, project_path: str, repo_name: str, branch_name: str, file_path: str) -> FileDiff:
        """
        Obtiene las diferencias detalladas de un archivo específico entre una rama y master
        
        Args:
            project_path: Ruta del workspace
            repo_name: 'content' o 'dimensions'
            branch_name: Nombre de la rama
            file_path: Ruta del archivo a comparar
        """
        try:
            repo_path = os.path.join(project_path, f"outputs-dimensions-{repo_name}")
            
            if not os.path.exists(repo_path):
                raise Exception(f"Repository {repo_name} not found")
            
            repo = git.Repo(repo_path)
            
            # Obtener referencias
            master_ref = repo.heads.master
            clean_branch_name = branch_name.replace('origin/', '')
            
            try:
                branch_ref = repo.remotes.origin.refs[clean_branch_name]
            except:
                branch_ref = repo.heads[clean_branch_name]
            
            # Obtener el diff específico del archivo
            diffs = master_ref.commit.diff(branch_ref.commit, paths=[file_path], create_patch=True)
            
            if not diffs:
                # El archivo no tiene cambios o no existe en una de las ramas
                return FileDiff(
                    path=file_path,
                    old_content="",
                    new_content="",
                    diff_lines=[],
                    change_type="unchanged"
                )
            
            diff = diffs[0]
            
            # Determinar tipo de cambio
            if diff.new_file:
                change_type = "added"
                old_content = ""
                try:
                    new_content = diff.b_blob.data_stream.read().decode('utf-8')
                except:
                    new_content = "[Binary file or encoding error]"
            elif diff.deleted_file:
                change_type = "deleted"
                try:
                    old_content = diff.a_blob.data_stream.read().decode('utf-8')
                except:
                    old_content = "[Binary file or encoding error]"
                new_content = ""
            else:
                change_type = "modified"
                try:
                    old_content = diff.a_blob.data_stream.read().decode('utf-8') if diff.a_blob else ""
                    new_content = diff.b_blob.data_stream.read().decode('utf-8') if diff.b_blob else ""
                except:
                    old_content = "[Binary file or encoding error]"
                    new_content = "[Binary file or encoding error]"
            
            # Procesar el diff línea por línea
            diff_lines = []
            
            if diff.diff:
                try:
                    diff_text = diff.diff.decode('utf-8')
                    lines = diff_text.split('\n')
                    
                    old_line_num = 1
                    new_line_num = 1
                    
                    for line in lines:
                        if line.startswith('@@'):
                            # Header de ubicación del chunk
                            # Extraer números de línea del formato @@ -old_start,old_count +new_start,new_count @@
                            import re
                            match = re.match(r'@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@', line)
                            if match:
                                old_line_num = int(match.group(1))
                                new_line_num = int(match.group(2))
                            
                            diff_lines.append(DiffLine(
                                line_number_old=None,
                                line_number_new=None,
                                content=line,
                                type="header"
                            ))
                        elif line.startswith('---') or line.startswith('+++'):
                            # Headers de archivo
                            diff_lines.append(DiffLine(
                                line_number_old=None,
                                line_number_new=None,
                                content=line,
                                type="header"
                            ))
                        elif line.startswith('-'):
                            # Línea eliminada
                            diff_lines.append(DiffLine(
                                line_number_old=old_line_num,
                                line_number_new=None,
                                content=line[1:],  # Remover el prefijo '-'
                                type="deleted"
                            ))
                            old_line_num += 1
                        elif line.startswith('+'):
                            # Línea añadida
                            diff_lines.append(DiffLine(
                                line_number_old=None,
                                line_number_new=new_line_num,
                                content=line[1:],  # Remover el prefijo '+'
                                type="added"
                            ))
                            new_line_num += 1
                        elif line.startswith(' '):
                            # Línea sin cambios (contexto)
                            diff_lines.append(DiffLine(
                                line_number_old=old_line_num,
                                line_number_new=new_line_num,
                                content=line[1:],  # Remover el prefijo ' '
                                type="context"
                            ))
                            old_line_num += 1
                            new_line_num += 1
                        elif line.strip() == '':
                            # Línea vacía
                            continue
                        else:
                            # Otras líneas (como metadatos)
                            diff_lines.append(DiffLine(
                                line_number_old=None,
                                line_number_new=None,
                                content=line,
                                type="context"
                            ))
                            
                except Exception as e:
                    print(f"Error processing diff: {e}")
                    # Fallback básico
                    diff_lines = [DiffLine(
                        line_number_old=None,
                        line_number_new=None,
                        content=f"Error processing diff: {str(e)}",
                        type="header"
                    )]
            
            return FileDiff(
                path=file_path,
                old_content=old_content,
                new_content=new_content,
                diff_lines=diff_lines,
                change_type=change_type
            )
            
        except Exception as e:
            raise Exception(f"Failed to get file diff: {str(e)}")

    def get_multiple_file_diffs(self, project_path: str, repo_name: str, branch_name: str, file_paths: List[str]) -> List[FileDiff]:
        """
        Obtiene las diferencias de múltiples archivos de forma eficiente
        
        Args:
            project_path: Ruta del workspace
            repo_name: 'content' o 'dimensions'
            branch_name: Nombre de la rama
            file_paths: Lista de rutas de archivos
        """
        results = []
        
        for file_path in file_paths:
            try:
                file_diff = self.get_file_diff(project_path, repo_name, branch_name, file_path)
                results.append(file_diff)
            except Exception as e:
                # En caso de error, crear un FileDiff con error
                error_diff = FileDiff(
                    path=file_path,
                    old_content="",
                    new_content="",
                    diff_lines=[DiffLine(
                        line_number_old=None,
                        line_number_new=None,
                        content=f"Error loading diff: {str(e)}",
                        type="header"
                    )],
                    change_type="error"
                )
                results.append(error_diff)
        
        return results

    def get_file_content_at_commit(self, project_path: str, repo_name: str, commit_sha: str, file_path: str) -> str:
        """
        Obtiene el contenido de un archivo en un commit específico
        
        Args:
            project_path: Ruta del workspace
            repo_name: 'content' o 'dimensions'
            commit_sha: SHA del commit
            file_path: Ruta del archivo
        """
        try:
            repo_path = os.path.join(project_path, f"outputs-dimensions-{repo_name}")
            repo = git.Repo(repo_path)
            
            commit = repo.commit(commit_sha)
            blob = commit.tree / file_path
            
            return blob.data_stream.read().decode('utf-8')
            
        except Exception as e:
            return f"Error reading file: {str(e)}"

    def get_branch_file_tree(self, project_path: str, repo_name: str, branch_name: str) -> Dict[str, any]:
        """
        Obtiene el árbol de archivos de una rama específica
        
        Args:
            project_path: Ruta del workspace
            repo_name: 'content' o 'dimensions'
            branch_name: Nombre de la rama
        """
        try:
            repo_path = os.path.join(project_path, f"outputs-dimensions-{repo_name}")
            repo = git.Repo(repo_path)
            
            clean_branch_name = branch_name.replace('origin/', '')
            
            try:
                branch_ref = repo.remotes.origin.refs[clean_branch_name]
            except:
                branch_ref = repo.heads[clean_branch_name]
            
            # Obtener el árbol de archivos
            tree = branch_ref.commit.tree
            
            def build_tree_structure(tree_obj, path=""):
                items = []
                
                for item in tree_obj:
                    item_path = os.path.join(path, item.name) if path else item.name
                    
                    if item.type == 'tree':  # Directorio
                        items.append({
                            "name": item.name,
                            "path": item_path,
                            "type": "directory",
                            "children": build_tree_structure(item, item_path)
                        })
                    else:  # Archivo
                        items.append({
                            "name": item.name,
                            "path": item_path,
                            "type": "file",
                            "size": item.size if hasattr(item, 'size') else 0
                        })
                
                return sorted(items, key=lambda x: (x["type"] == "file", x["name"]))
            
            return {
                "branch": clean_branch_name,
                "repository": repo_name,
                "commit": branch_ref.commit.hexsha[:8],
                "tree": build_tree_structure(tree)
            }
            
        except Exception as e:
            raise Exception(f"Failed to get file tree: {str(e)}")

    def get_detailed_comparison(self, project_path: str, repo_name: str, branch_name: str) -> Dict[str, any]:
        """
        Obtiene una comparación detallada completa entre una rama y master
        Incluye: resumen, archivos cambiados, y diffs detallados
        
        Args:
            project_path: Ruta del workspace
            repo_name: 'content' o 'dimensions'
            branch_name: Nombre de la rama
        """
        try:
            # Obtener comparación básica
            comparison = self.compare_branch_with_master(project_path, repo_name, branch_name)
            
            # Obtener diffs detallados para archivos pequeños (< 50 cambios)
            detailed_files = []
            summary_files = []
            
            for file_info in comparison.files:
                total_changes = file_info.additions + file_info.deletions
                
                # Solo obtener diff detallado para archivos con pocos cambios
                if total_changes < 50 and file_info.change_type != "binary":
                    try:
                        file_diff = self.get_file_diff(project_path, repo_name, branch_name, file_info.path)
                        detailed_files.append({
                            "file_info": file_info,
                            "diff": file_diff
                        })
                    except:
                        summary_files.append(file_info)
                else:
                    summary_files.append(file_info)
            
            return {
                "comparison": comparison,
                "detailed_files": detailed_files,  # Archivos con diff completo
                "summary_files": summary_files,    # Archivos solo con resumen
                "has_large_files": len(summary_files) > 0,
                "total_detailed": len(detailed_files),
                "total_summary": len(summary_files)
            }
            
        except Exception as e:
            raise Exception(f"Failed to get detailed comparison: {str(e)}")