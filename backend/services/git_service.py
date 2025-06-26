import os
import subprocess
import asyncio
import git
from pathlib import Path
from typing import Dict, List, Optional
import configparser
from datetime import datetime
from pydantic import BaseModel
import re


class BranchInfo(BaseModel):
    name: str
    display_name: str  
    author: str
    author_email: str
    commit_hash: str
    commit_message: str
    date: datetime
    repository: str  
    is_current: bool = False
    commits_ahead: int = 0
    commits_behind: int = 0

class ComparisonFile(BaseModel):
    path: str
    change_type: str  
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





class DiffLine(BaseModel):

    line_number_old: Optional[int] = None
    line_number_new: Optional[int] = None
    content: str = ""
    type: str = "context"  

class FileDiff(BaseModel):

    path: str
    old_content: str = ""
    new_content: str = ""
    diff_lines: List[DiffLine] = []
    change_type: str = "modified"





class GitService:
    def __init__(self):
        self.config = self._load_config()
    
    def _load_config(self) -> configparser.ConfigParser:

        config = configparser.ConfigParser()
        
        possible_paths = [
            Path(__file__).parent.parent / 'config' / 'config.ini',
            Path(__file__).parent / 'config.ini',
            Path(__file__).parent.parent / 'config.ini',
            Path('config.ini'),
            Path('other_files/config.ini')
        ]
        
        for config_path in possible_paths:
            if config_path.exists():
                config.read(config_path, encoding='utf-8')
                print(f"✅ Config loaded from: {config_path}")
                break
        else:
            print("⚠️ Config file not found, using defaults")
        
        return config
    
    
    
    
    
    async def clone_microservices(self, project_path: str, branch: str = "develop") -> Dict[str, any]:

        try:
            
            if not project_path or project_path.strip() == "Path of your workspace":
                return {
                    "success": False,
                    "message": "Debe especificar un workspace válido"
                }
            
            project_path = project_path.strip()
            workspace = Path(project_path)
            
            
            workspace.mkdir(parents=True, exist_ok=True)
            
            
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
                
                if repo["path"].exists():
                    results.append({
                        "repo": repo["name"],
                        "status": "skipped",
                        "message": f"Repository {repo['name']} already exists"
                    })
                    continue
                
                
                clone_command = self.config.get('Git', repo["url_key"], fallback='')
                if not clone_command:
                    results.append({
                        "repo": repo["name"],
                        "status": "error", 
                        "message": f"Clone command not found for {repo['name']}"
                    })
                    continue
                
                
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

        issues = []
        
        if not workspace_path or workspace_path.strip() == "Path of your workspace":
            issues.append("Workspace path is not set")
            return {
                "valid": False,
                "issues": issues,
                "workspace_path": workspace_path
            }
        
        workspace = Path(workspace_path.strip())
        
        
        if not workspace.exists():
            try:
                workspace.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                issues.append(f"Cannot create workspace directory: {str(e)}")
        
        
        if workspace.exists() and not os.access(workspace, os.W_OK):
            issues.append("Workspace directory is not writable")
        
        
        try:
            result = subprocess.run(['git', '--version'], capture_output=True, text=True)
            if result.returncode != 0:
                issues.append("Git is not installed or not available in PATH")
        except FileNotFoundError:
            issues.append("Git is not installed")
        
        
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
    
    def validate_repositories_for_branches(self, project_path: str) -> Dict[str, any]:

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
            
            valid = content_exists or dimensions_exists  
            
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

    def validate_git_config(self) -> Dict[str, any]:

        issues = []
        
        
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

        git_config = {}
        
        if self.config.has_section('Git'):
            git_config = dict(self.config['Git'])
        
        return {
            "config": git_config,
            "section_exists": self.config.has_section('Git'),
            "total_keys": len(git_config)
        }
    


    
    

    def get_recent_branches(self, project_path: str, repo_name: str = "both", limit: int = 15) -> List[BranchInfo]:

        branches = []

        repos_to_check = []

        
        if repo_name in ['content', 'both']:
            content_path = os.path.join(project_path, "outputs-dimensions-content")
            if os.path.exists(content_path) and os.path.exists(os.path.join(content_path, ".git")):
                repos_to_check.append(('content', content_path))

        if repo_name in ['dimensions', 'both']:
            dimensions_path = os.path.join(project_path, "outputs-dimensions")
            if os.path.exists(dimensions_path) and os.path.exists(os.path.join(dimensions_path, ".git")):
                repos_to_check.append(('dimensions', dimensions_path))

        for repo_type, repo_path in repos_to_check:
            try:
                repo = git.Repo(repo_path)

                
                try:
                    repo.remotes.origin.fetch()
                except Exception as e:
                    print(f"Warning: Could not fetch from origin for {repo_type}: {e}")

                
                exclude_patterns = ['HEAD', 'develop', 'release', 'main', 'master']
                remote_refs = []

                try:
                    for ref in repo.remotes.origin.refs:
                        branch_name = ref.name
                        display_name = branch_name.replace('origin/', '')

                        
                        if not any(pattern.lower() in display_name.lower() for pattern in exclude_patterns):
                            remote_refs.append(ref)
                except Exception as e:
                    print(f"Error getting remote refs for {repo_type}: {e}")
                    continue
                
                
                try:
                    remote_refs.sort(key=lambda x: x.commit.committed_datetime, reverse=True)
                except Exception as e:
                    print(f"Warning: Could not sort branches for {repo_type}: {e}")

                
                current_branch = None
                try:
                    current_branch = repo.active_branch.name
                except:
                    try:
                        current_branch = repo.head.ref.name if repo.head.ref else None
                    except:
                        current_branch = None

                
                for ref in remote_refs[:limit]:
                    try:
                        display_name = ref.name.replace('origin/', '')

                        
                        commits_ahead = 0
                        commits_behind = 0

                        try:
                            if hasattr(repo.remotes.origin.refs, 'master'):
                                master_ref = repo.remotes.origin.refs.master
                                commits_behind = len(list(repo.iter_commits(f'{ref.commit}..{master_ref.commit}')))
                                commits_ahead = len(list(repo.iter_commits(f'{master_ref.commit}..{ref.commit}')))
                        except Exception as e:
                            print(f"Warning: Could not calculate ahead/behind for {display_name}: {e}")

                        
                        commit_message = ""
                        try:
                            commit_message = ref.commit.message.strip()
                            if commit_message:
                                commit_message = commit_message.split('\n')[0][:100]
                            else:
                                commit_message = "No commit message"
                        except:
                            commit_message = "Error reading commit message"

                        
                        author_name = "Unknown"
                        author_email = "unknown@unknown.com"
                        try:
                            author_name = ref.commit.author.name or "Unknown"
                            author_email = ref.commit.author.email or "unknown@unknown.com"
                        except:
                            pass
                        
                        branch_info = BranchInfo(
                            name=ref.name,
                            display_name=display_name,
                            author=author_name,
                            author_email=author_email,
                            commit_hash=ref.commit.hexsha[:8],
                            commit_message=commit_message,
                            date=ref.commit.committed_datetime,
                            repository=repo_type,
                            is_current=(display_name == current_branch),
                            commits_ahead=commits_ahead,
                            commits_behind=commits_behind
                        )
                        branches.append(branch_info)

                    except Exception as e:
                        print(f"Error processing branch {ref.name}: {e}")
                        continue

            except Exception as e:
                print(f"Error processing {repo_type} repository: {e}")
                continue
            
        
        try:
            branches.sort(key=lambda x: x.date, reverse=True)
        except Exception as e:
            print(f"Warning: Could not sort all branches: {e}")

        return branches

    def checkout_branch(self, project_path: str, repo_name: str, branch_name: str) -> CheckoutResult:

        try:
            
            repo_folder_map = {
                'content': 'outputs-dimensions-content',
                'dimensions': 'outputs-dimensions'
            }

            if repo_name not in repo_folder_map:
                return CheckoutResult(
                    success=False,
                    message=f"Invalid repository name: {repo_name}. Must be 'content' or 'dimensions'",
                    current_branch="",
                    repository=repo_name
                )

            repo_folder = repo_folder_map[repo_name]
            repo_path = os.path.join(project_path, repo_folder)

            if not os.path.exists(repo_path):
                return CheckoutResult(
                    success=False,
                    message=f"Repository {repo_folder} not found in workspace: {repo_path}",
                    current_branch="",
                    repository=repo_name
                )

            if not os.path.exists(os.path.join(repo_path, ".git")):
                return CheckoutResult(
                    success=False,
                    message=f"Path {repo_path} is not a Git repository",
                    current_branch="",
                    repository=repo_name
                )

            repo = git.Repo(repo_path)

            
            previous_branch = "unknown"
            try:
                previous_branch = repo.active_branch.name
            except:
                try:
                    previous_branch = repo.head.ref.name if repo.head.ref else "detached"
                except:
                    previous_branch = "detached"

            
            try:
                repo.remotes.origin.fetch()
            except Exception as e:
                print(f"Warning: Could not fetch from origin: {e}")

            
            clean_branch_name = branch_name.replace('origin/', '')

            
            try:
                if repo.is_dirty(untracked_files=True):
                    return CheckoutResult(
                        success=False,
                        message=f"Repository has uncommitted changes. Please commit or stash changes before checkout.",
                        current_branch=previous_branch,
                        repository=repo_name,
                        previous_branch=previous_branch
                    )
            except Exception as e:
                print(f"Warning: Could not check if repo is dirty: {e}")

            
            try:
                
                local_branches = [b.name for b in repo.heads]

                if clean_branch_name in local_branches:
                    
                    repo.heads[clean_branch_name].checkout()
                    print(f"Checked out to existing local branch: {clean_branch_name}")
                else:
                    
                    try:
                        remote_ref = repo.remotes.origin.refs[clean_branch_name]
                        local_branch = repo.create_head(clean_branch_name, remote_ref)
                        local_branch.set_tracking_branch(remote_ref)
                        local_branch.checkout()
                        print(f"Created and checked out new local branch: {clean_branch_name}")
                    except Exception as e:
                        return CheckoutResult(
                            success=False,
                            message=f"Could not find or create branch '{clean_branch_name}': {str(e)}",
                            current_branch=previous_branch,
                            repository=repo_name,
                            previous_branch=previous_branch
                        )
            except Exception as e:
                return CheckoutResult(
                    success=False,
                    message=f"Checkout operation failed: {str(e)}",
                    current_branch=previous_branch,
                    repository=repo_name,
                    previous_branch=previous_branch
                )

            
            current_branch = previous_branch
            try:
                current_branch = repo.active_branch.name
            except:
                try:
                    current_branch = repo.head.ref.name if repo.head.ref else "detached"
                except:
                    current_branch = "unknown"

            success = current_branch == clean_branch_name

            return CheckoutResult(
                success=success,
                message=f"Successfully checked out to branch '{clean_branch_name}'" if success else f"Checkout may have failed. Current branch: {current_branch}",
                current_branch=current_branch,
                repository=repo_name,
                previous_branch=previous_branch
            )

        except Exception as e:
            return CheckoutResult(
                success=False,
                message=f"Unexpected error during checkout: {str(e)}",
                current_branch="",
                repository=repo_name
            )

    def compare_branch_with_master(self, project_path: str, repo_name: str, branch_name: str) -> BranchComparison:

        try:
            
            repo_folder_map = {
                'content': 'outputs-dimensions-content',
                'dimensions': 'outputs-dimensions'
            }

            if repo_name not in repo_folder_map:
                raise Exception(f"Invalid repository name: {repo_name}")

            repo_folder = repo_folder_map[repo_name]
            repo_path = os.path.join(project_path, repo_folder)

            if not os.path.exists(repo_path):
                raise Exception(f"Repository {repo_folder} not found at {repo_path}")

            repo = git.Repo(repo_path)

            
            try:
                
                try:
                    master_ref = repo.remotes.origin.refs.master
                except:
                    
                    master_ref = repo.heads.master
            except Exception as e:
                raise Exception(f"Could not find master branch: {str(e)}")

            
            clean_branch_name = branch_name.replace('origin/', '')

            try:
                
                try:
                    branch_ref = repo.remotes.origin.refs[clean_branch_name]
                except:
                    
                    branch_ref = repo.heads[clean_branch_name]
            except Exception as e:
                raise Exception(f"Could not find branch '{clean_branch_name}': {str(e)}")

            
            try:
                diffs = master_ref.commit.diff(branch_ref.commit, create_patch=True)
            except Exception as e:
                raise Exception(f"Could not generate diff: {str(e)}")

            files = []
            total_additions = 0
            total_deletions = 0

            for diff in diffs:
                try:
                    
                    if diff.new_file:
                        change_type = "added"
                    elif diff.deleted_file:
                        change_type = "deleted"
                    elif diff.renamed_file:
                        change_type = "renamed"
                    else:
                        change_type = "modified"

                    
                    additions = 0
                    deletions = 0

                    if diff.diff:
                        try:
                            
                            diff_text = ""
                            try:
                                diff_text = diff.diff.decode('utf-8')
                            except UnicodeDecodeError:
                                try:
                                    diff_text = diff.diff.decode('latin-1')
                                except:
                                    diff_text = diff.diff.decode('utf-8', errors='ignore')

                            if diff_text:
                                lines = diff_text.split('\n')
                                for line in lines:
                                    if line.startswith('+') and not line.startswith('+++'):
                                        additions += 1
                                    elif line.startswith('-') and not line.startswith('---'):
                                        deletions += 1
                        except Exception as e:
                            print(f"Warning: Could not process diff for {diff.a_path or diff.b_path}: {e}")
                            
                            if change_type == "added":
                                additions = 1
                            elif change_type == "deleted":
                                deletions = 1
                            else:
                                additions = 1
                                deletions = 1

                    total_additions += additions
                    total_deletions += deletions

                    file_path = diff.a_path or diff.b_path or "unknown"

                    files.append(ComparisonFile(
                        path=file_path,
                        change_type=change_type,
                        additions=additions,
                        deletions=deletions,
                        old_path=diff.a_path if diff.renamed_file else None
                    ))

                except Exception as e:
                    print(f"Error processing diff item: {e}")
                    continue
                
            
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

    def fetch_all_remote_branches(self, project_path: str) -> Dict[str, any]:
        try:
            validation = self.validate_repositories_for_branches(project_path)
            if not validation["valid"]:
                return {
                    "success": False,
                    "message": validation["message"],
                    "fetched_repos": []
                }
            
            fetched_repos = []
            errors = []
            
            repo_folder_map = {
                'content': 'outputs-dimensions-content',
                'dimensions': 'outputs-dimensions'
            }
            
            for repo_name, available in validation["repositories"].items():
                if available:
                    try:
                        repo_folder = repo_folder_map[repo_name]
                        repo_path = os.path.join(project_path, repo_folder)
                        repo = git.Repo(repo_path)
                        
                        
                        repo.remotes.origin.fetch()
                        fetched_repos.append(repo_folder)
                        print(f"Successfully fetched {repo_folder}")
                        
                    except Exception as e:
                        error_msg = f"{repo_folder_map[repo_name]} fetch failed: {str(e)}"
                        errors.append(error_msg)
                        print(f"Error: {error_msg}")
            
            if fetched_repos:
                return {
                    "success": True,
                    "message": f"Successfully fetched {len(fetched_repos)} repositories",
                    "fetched_repos": fetched_repos,
                    "errors": errors if errors else None
                }
            else:
                return {
                    "success": False,
                    "message": "No repositories could be fetched",
                    "fetched_repos": [],
                    "errors": errors
                }
                
        except Exception as e:
            return {
                "success": False,
                "message": f"Fetch operation failed: {str(e)}",
                "fetched_repos": []
            }

    def get_repository_status(self, project_path: str) -> Dict[str, RepositoryStatus]:
        
        status = {}
        
        repos = {
            "content": "outputs-dimensions-content",
            "dimensions": "outputs-dimensions"
        }
        
        for repo_name, repo_folder in repos.items():
            repo_path = os.path.join(project_path, repo_folder)
            
            try:
                if not os.path.exists(repo_path):
                    status[repo_name] = RepositoryStatus(
                        exists=False,
                        is_git_repo=False
                    )
                    continue
                
                if not os.path.exists(os.path.join(repo_path, ".git")):
                    status[repo_name] = RepositoryStatus(
                        exists=True,
                        is_git_repo=False
                    )
                    continue
                
                repo = git.Repo(repo_path)
                
                
                current_branch = None
                try:
                    current_branch = repo.active_branch.name
                except:
                    try:
                        current_branch = repo.head.ref.name if repo.head.ref else None
                    except:
                        current_branch = None
                
                
                is_dirty = False
                has_untracked = False
                try:
                    is_dirty = repo.is_dirty()
                    has_untracked = len(repo.untracked_files) > 0
                except:
                    pass
                
                
                last_commit_hash = None
                last_commit_date = None
                try:
                    last_commit = repo.head.commit
                    last_commit_hash = last_commit.hexsha[:8]
                    last_commit_date = last_commit.committed_datetime
                except:
                    pass
                
                
                remote_url = None
                try:
                    remote_url = repo.remotes.origin.url
                except:
                    pass
                
                status[repo_name] = RepositoryStatus(
                    exists=True,
                    is_git_repo=True,
                    current_branch=current_branch,
                    has_uncommitted_changes=is_dirty,
                    has_untracked_files=has_untracked,
                    is_clean=not is_dirty and not has_untracked,
                    last_commit_hash=last_commit_hash,
                    last_commit_date=last_commit_date,
                    remote_url=remote_url
                )
                
            except Exception as e:
                print(f"Error getting status for {repo_name}: {e}")
                status[repo_name] = RepositoryStatus(
                    exists=True,
                    is_git_repo=False,
                    current_branch=None
                )
        
        return status

    
    
    
    
    def get_file_diff(self, project_path: str, repo_name: str, branch_name: str, file_path: str) -> FileDiff:
        try:
            
            repo_folder_map = {
                'content': 'outputs-dimensions-content',
                'dimensions': 'outputs-dimensions'
            }
            
            if repo_name not in repo_folder_map:
                raise Exception(f"Invalid repository name: {repo_name}")
            
            repo_folder = repo_folder_map[repo_name]
            repo_path = os.path.join(project_path, repo_folder)
            
            if not os.path.exists(repo_path):
                raise Exception(f"Repository {repo_folder} not found")
            
            repo = git.Repo(repo_path)
            
            
            try:
                master_ref = repo.remotes.origin.refs.master
            except:
                master_ref = repo.heads.master
            
            clean_branch_name = branch_name.replace('origin/', '')
            
            try:
                branch_ref = repo.remotes.origin.refs[clean_branch_name]
            except:
                branch_ref = repo.heads[clean_branch_name]
            
            
            diffs = master_ref.commit.diff(branch_ref.commit, paths=[file_path], create_patch=True)
            
            if not diffs:
                
                return FileDiff(
                    path=file_path,
                    old_content="",
                    new_content="",
                    diff_lines=[],
                    change_type="unchanged"
                )
            
            diff = diffs[0]
            
            
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
            
            
            diff_lines = []
            
            if diff.diff:
                try:
                    diff_text = diff.diff.decode('utf-8')
                    lines = diff_text.split('\n')
                    
                    old_line_num = 1
                    new_line_num = 1
                    
                    for line in lines:
                        if line.startswith('@@'):
                            
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
                            
                            diff_lines.append(DiffLine(
                                line_number_old=None,
                                line_number_new=None,
                                content=line,
                                type="header"
                            ))
                        elif line.startswith('-'):
                            
                            diff_lines.append(DiffLine(
                                line_number_old=old_line_num,
                                line_number_new=None,
                                content=line[1:],  
                                type="deleted"
                            ))
                            old_line_num += 1
                        elif line.startswith('+'):
                            
                            diff_lines.append(DiffLine(
                                line_number_old=None,
                                line_number_new=new_line_num,
                                content=line[1:],  
                                type="added"
                            ))
                            new_line_num += 1
                        elif line.startswith(' '):
                            
                            diff_lines.append(DiffLine(
                                line_number_old=old_line_num,
                                line_number_new=new_line_num,
                                content=line[1:],  
                                type="context"
                            ))
                            old_line_num += 1
                            new_line_num += 1
                        elif line.strip() == '':
                            
                            continue
                        else:
                            
                            diff_lines.append(DiffLine(
                                line_number_old=None,
                                line_number_new=None,
                                content=line,
                                type="context"
                            ))
                            
                except Exception as e:
                    print(f"Error processing diff: {e}")
                    
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
   
        results = []
        
        for file_path in file_paths:
            try:
                file_diff = self.get_file_diff(project_path, repo_name, branch_name, file_path)
                results.append(file_diff)
            except Exception as e:
                
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
        try:
            repo_folder_map = {
                'content': 'outputs-dimensions-content',
                'dimensions': 'outputs-dimensions'
            }
            
            repo_folder = repo_folder_map[repo_name]
            repo_path = os.path.join(project_path, repo_folder)
            repo = git.Repo(repo_path)
            
            commit = repo.commit(commit_sha)
            blob = commit.tree / file_path
            
            return blob.data_stream.read().decode('utf-8')
            
        except Exception as e:
            return f"Error reading file: {str(e)}"

    def get_branch_file_tree(self, project_path: str, repo_name: str, branch_name: str) -> Dict[str, any]:
        try:
            repo_folder_map = {
                'content': 'outputs-dimensions-content',
                'dimensions': 'outputs-dimensions'
            }
            
            repo_folder = repo_folder_map[repo_name]
            repo_path = os.path.join(project_path, repo_folder)
            repo = git.Repo(repo_path)
            
            clean_branch_name = branch_name.replace('origin/', '')
            
            try:
                branch_ref = repo.remotes.origin.refs[clean_branch_name]
            except:
                branch_ref = repo.heads[clean_branch_name]
            
            
            tree = branch_ref.commit.tree
            
            def build_tree_structure(tree_obj, path=""):
                items = []
                
                for item in tree_obj:
                    item_path = os.path.join(path, item.name) if path else item.name
                    
                    if item.type == 'tree':  
                        items.append({
                            "name": item.name,
                            "path": item_path,
                            "type": "directory",
                            "children": build_tree_structure(item, item_path)
                        })
                    else:  
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
        try:
            
            comparison = self.compare_branch_with_master(project_path, repo_name, branch_name)
            
            
            detailed_files = []
            summary_files = []
            
            for file_info in comparison.files:
                total_changes = file_info.additions + file_info.deletions
                
                
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
                "detailed_files": detailed_files,  
                "summary_files": summary_files,    
                "has_large_files": len(summary_files) > 0,
                "total_detailed": len(detailed_files),
                "total_summary": len(summary_files)
            }
            
        except Exception as e:
            raise Exception(f"Failed to get detailed comparison: {str(e)}")    