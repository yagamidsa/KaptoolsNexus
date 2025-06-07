import os
import time
import shutil
import subprocess
import asyncio
from typing import Dict, List, Optional
from pathlib import Path
import configparser

class AzureService:
    def __init__(self):
        self.config = self._load_config()
        self.base_path = self.config.get('DEFAULT', 'base_path', fallback='')
        self.azure_transfer_exe = self.config.get('DEFAULT', 'azure_transfer', fallback='AzureFileTransfer\\AzureFileTransfer.exe')
    
    def _load_config(self) -> configparser.ConfigParser:
        """Load configuration from config.ini"""
        config = configparser.ConfigParser()
        config_path = Path(__file__).parent.parent / 'config' / 'config.ini'
        if config_path.exists():
            config.read(config_path)
        return config
    
    async def download_azure_files(
        self, 
        project_folder: str, 
        wave_id: str, 
        server: str, 
        workspace_path: str
    ) -> Dict[str, any]:
        """
        Download Azure files from specified server
        
        Args:
            project_folder: KapID del proyecto
            wave_id: WaveID del proyecto  
            server: Servidor (ProdBlue, Prod, Uat, Dev, Sandbox3-13, Staging)
            workspace_path: Ruta del workspace local
            
        Returns:
            Dict con status y mensaje
        """
        try:
            # Validate inputs
            if not all([project_folder, wave_id, server, workspace_path]):
                return {
                    "success": False,
                    "message": "Todos los campos son requeridos",
                    "files_downloaded": []
                }
            
            # Create destination path
            destination_path = Path(workspace_path) / project_folder
            if destination_path.exists():
                shutil.rmtree(destination_path)
            destination_path.mkdir(parents=True, exist_ok=True)
            
            # Define files to download
            files_to_download = [
                f"metadata-create\\{project_folder}\\{project_folder}_{wave_id}_Metadata.json",
                f"metadata-create\\{project_folder}\\combined_portal_information.json",
                f"metadata-create\\{project_folder}\\Project_Metadata.csv",
                f"metadata-create\\{project_folder}\\{project_folder}_input.json",
                f"linkdb-interface\\{project_folder}\\{project_folder}_input.json",
                f"dashboard\\{project_folder}_{wave_id}\\{project_folder}_{wave_id}_Metadata.json",
                f"dashboard\\{project_folder}_{wave_id}\\combined_portal_information.json",
                f"beast-interface\\download\\{project_folder}.zip",
                f"beast-interface\\download\\{project_folder}_{wave_id}.zip"
            ]
            
            # Build Azure transfer commands
            azure_transfer_path = Path(self.base_path) / server / self.azure_transfer_exe
            commands = []
            
            for file_path in files_to_download:
                cmd = [
                    str(azure_transfer_path),
                    "d",  # download
                    "-f",  # force
                    "-s", file_path,  # source
                    "-d", str(destination_path),  # destination
                    "-sf", "NA"  # source filter
                ]
                commands.append(cmd)
            
            # Execute downloads
            downloaded_files = []
            failed_files = []
            
            for i, cmd in enumerate(commands):
                try:
                    # Run command
                    result = await asyncio.create_subprocess_exec(
                        *cmd,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    
                    stdout, stderr = await result.communicate()
                    
                    if result.returncode == 0:
                        downloaded_files.append(files_to_download[i])
                    else:
                        failed_files.append({
                            "file": files_to_download[i],
                            "error": stderr.decode() if stderr else "Unknown error"
                        })
                        
                except Exception as e:
                    failed_files.append({
                        "file": files_to_download[i],
                        "error": str(e)
                    })
            
            # Wait a bit for file system to sync
            await asyncio.sleep(2)
            
            # Check final results
            actual_files = list(destination_path.rglob("*"))
            actual_file_count = len([f for f in actual_files if f.is_file()])
            
            success = actual_file_count > 0
            
            message = (
                f"Proceso completado. {actual_file_count} archivos descargados."
                if success 
                else "No se pudieron descargar archivos. Verifique el servidor y los parámetros."
            )
            
            return {
                "success": success,
                "message": message,
                "files_downloaded": downloaded_files,
                "files_failed": failed_files,
                "total_files": actual_file_count,
                "destination_path": str(destination_path)
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Error durante la descarga: {str(e)}",
                "files_downloaded": [],
                "files_failed": [],
                "total_files": 0
            }
    
    def get_available_servers(self) -> List[str]:
        """Get list of available servers"""
        return [
            "ProdBlue",
            "Prod", 
            "Uat",
            "Dev",
            "Sandbox3",
            "Sandbox4", 
            "Sandbox5",
            "Sandbox6",
            "Sandbox7",
            "Sandbox8",
            "Sandbox9", 
            "Sandbox10",
            "Sandbox11",
            "Sandbox12",
            "Sandbox13",
            "Staging"
        ]
    
    def validate_azure_config(self) -> Dict[str, any]:
        """Validate Azure configuration"""
        issues = []
        
        if not self.base_path:
            issues.append("base_path no configurado en config.ini")
        elif not Path(self.base_path).exists():
            issues.append(f"base_path no existe: {self.base_path}")
            
        if not self.azure_transfer_exe:
            issues.append("azure_transfer no configurado en config.ini")
            
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "base_path": self.base_path,
            "azure_transfer": self.azure_transfer_exe
        }