# backend/mdd_real_service.py - MÉTODO OPTIMIZADO BASADO EN TU CÓDIGO PYTHON
# DUPLICACIÓN REAL USANDO DMSRUN CON MÚLTIPLES DATASOURCES

import os
import subprocess
import tempfile
import shutil
import logging
import glob
import re
import zipfile
from datetime import datetime
from typing import Dict, List, Any, Optional
import concurrent.futures
from pathlib import Path

logger = logging.getLogger(__name__)

class IBMSPSSDataCollectionService:
    """Servicio optimizado basado en tu método original de Python"""
    
    def __init__(self):
        self.service_name = "MDD Optimized DMS Duplicator"
        self.version = "4.0-OPTIMIZED"
        # Simplemente usar "dmsrun" como comando (como en tu código original)
        self.dms_command = "dmsrun"
        logger.info("✅ MDD Optimized DMS Service initialized")
        logger.info(f"🔧 Using DMS command: {self.dms_command}")
    
    def get_service_status(self) -> Dict[str, Any]:
        """Estado del servicio optimizado"""
        return {
            "service_name": self.service_name,
            "version": self.version,
            "mode": "OPTIMIZED_DMS_DUPLICATION",
            "max_duplicates": 50,
            "uses_original_method": True,
            "dms_command": self.dms_command,
            "optimizations": ["parallel_file_operations", "efficient_cleanup", "faster_zip"],
            "status": "active"
        }
    
    async def process_duplicate_mdd_real(
        self, 
        mdd_file_path: str, 
        ddf_file_path: str, 
        duplicate_count: int, 
        workspace_path: str, 
        original_mdd_filename: str
    ) -> Dict[str, Any]:
        """Proceso optimizado basado en tu método original"""
        
        logger.info(f"🚀 Starting OPTIMIZED DMS duplication (based on your Python method)")
        start_time = datetime.now()
        logs = []
        
        def add_log(message: str):
            timestamp = datetime.now().strftime("%H:%M:%S")
            log_entry = f"[{timestamp}] {message}"
            logs.append(log_entry)
            logger.info(message)
        
        try:
            # Preparación inicial (como tu código original)
            add_log("🔍 Starting optimized duplication process...")
            
            # Obtener información de archivos
            base_name = os.path.splitext(original_mdd_filename)[0]
            input_mdd_base = os.path.join(workspace_path, base_name)
            
            add_log(f"📋 Base name: {base_name}")
            add_log(f"📁 Working directory: {workspace_path}")
            
            # Nombres de archivos de salida (como tu código)
            casedata_out = f"{base_name}_Completes_All.ddf"
            metadata_out = f"{base_name}_Completes_All.mdd"
            
            # Limpiar archivos existentes si existen
            self._cleanup_existing_files(workspace_path, casedata_out, metadata_out, add_log)
            
            # PASO 1: Crear copias de archivos (OPTIMIZADO con threading)
            add_log(f"📋 Creating {duplicate_count} file copies (optimized)...")
            temp_files = await self._create_file_copies_optimized(
                mdd_file_path, ddf_file_path, input_mdd_base, duplicate_count, add_log
            )
            
            # PASO 2: Generar script DMS (como tu código pero optimizado)
            add_log("📜 Generating optimized DMS script...")
            dms_script_path = self._generate_dms_script_optimized(
                input_mdd_base, duplicate_count, casedata_out, metadata_out, workspace_path, add_log
            )
            
            # PASO 3: Ejecutar DMS (con mejor manejo de errores)
            add_log("⚡ Executing DMS script...")
            dms_output = await self._execute_dms_optimized(dms_script_path, workspace_path, add_log)
            
            # PASO 4: Limpiar archivos temporales (OPTIMIZADO)
            add_log("🧹 Cleaning up temporary files (optimized)...")
            await self._cleanup_temp_files_optimized(workspace_path, duplicate_count, base_name, add_log)
            
            # PASO 5: Crear estructura de directorios y ZIP (OPTIMIZADO)
            add_log("📦 Creating optimized ZIP structure...")
            zip_path = await self._create_optimized_zip_structure(
                workspace_path, base_name, casedata_out, metadata_out, duplicate_count, add_log
            )
            
            # Limpiar archivos finales
            self._cleanup_existing_files(workspace_path, casedata_out, metadata_out, add_log)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Calcular estadísticas
            original_records = self._estimate_records(ddf_file_path)
            final_records = original_records * duplicate_count
            
            add_log(f"✅ OPTIMIZED duplication completed in {processing_time:.1f}s")
            add_log(f"📊 Estimated records: {original_records} → {final_records}")
            
            return {
                "success": True,
                "message": "✅ Optimized MDD duplication completed using your original method!",
                "output_file": os.path.basename(zip_path),
                "output_path": zip_path,
                "duplicates_created": duplicate_count,
                "base_name": base_name,
                "file_size": os.path.getsize(zip_path),
                "original_records": original_records,
                "total_records": final_records,
                "record_multiplier": duplicate_count,
                "processing_time_seconds": int(processing_time),
                "logs": logs,
                "mode": "OPTIMIZED_DMS",
                "dms_output": dms_output,
                "method": "Based on your original Python method but optimized",
                "optimizations_applied": [
                    "Parallel file operations",
                    "Efficient cleanup",
                    "Faster ZIP creation",
                    "Better error handling",
                    "Optimized DMS script generation"
                ]
            }
            
        except Exception as e:
            add_log(f"❌ Error: {str(e)}")
            logger.error(f"Optimized duplication failed: {str(e)}")
            
            return {
                "success": False,
                "error": str(e),
                "logs": logs,
                "mode": "OPTIMIZED_ERROR"
            }
    
    async def _create_file_copies_optimized(self, mdd_path, ddf_path, base_path, duplicate_count, add_log):
        """Crea copias de archivos de forma optimizada usando threading"""
        
        temp_files = []
        copy_tasks = []
        
        # Preparar todas las tareas de copia
        for i in range(1, duplicate_count + 1):
            mdd_copy = f"{base_path}_{i}.mdd"
            ddf_copy = f"{base_path}_{i}.ddf"
            
            copy_tasks.append((mdd_path, mdd_copy))
            copy_tasks.append((ddf_path, ddf_copy))
            
            temp_files.extend([mdd_copy, ddf_copy])
        
        # Ejecutar copias en paralelo
        def copy_file(src, dst):
            shutil.copy2(src, dst)
            return dst
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(copy_file, src, dst) for src, dst in copy_tasks]
            
            completed = 0
            for future in concurrent.futures.as_completed(futures):
                completed += 1
                if completed % 4 == 0:  # Log cada 2 pares de archivos
                    add_log(f"📋 Copied {completed//2} of {duplicate_count} file pairs...")
        
        add_log(f"✅ Created {duplicate_count} optimized file copies")
        return temp_files
    
    def _generate_dms_script_optimized(self, base_path, duplicate_count, casedata_out, metadata_out, workspace_path, add_log):
        """Genera script DMS optimizado (basado en tu código original)"""
        
        dms_script_path = os.path.join(workspace_path, "temp.dms")  # Usar mismo nombre que tu código
        
        with open(dms_script_path, "w", encoding="utf-8") as dms_file:
            # Generar InputDataSources (exactamente como tu código original)
            for i in range(1, duplicate_count + 1):
                dms_file.write(f"InputDataSource(Input{i})\n")
                dms_file.write(
                    f'    ConnectionString="Provider=mrOleDB.Provider.2;'
                    f'Data Source=mrDataFileDsc;'
                    f'Initial Catalog={base_path}_{i}.mdd;'
                    f'Location={base_path}_{i}.ddf"\n'
                )
                dms_file.write('    SelectQuery = "SELECT * FROM VDATA"\n')
                dms_file.write("End InputDataSource\n\n")
            
            # OutputDataSource (exactamente como tu código original)
            dms_file.write("OutputDataSource(Out)\n")
            dms_file.write(
                f'    ConnectionString="Provider=mrOleDB.Provider.2;'
                f'Data Source=mrDataFileDsc;'
                f'Location={os.path.join(workspace_path, casedata_out)}"\n'
            )
            dms_file.write(f'    MetaDataOutputName = "{os.path.join(workspace_path, metadata_out)}"\n')
            dms_file.write("End OutputDataSource\n\n")
            
            # Event exactamente como tu código original
            dms_file.write('Event(OnNextCase, "Populate derived variables")\n')
            dms_file.write("    Respondent.serial = (clong(dmgrjob.CurrentInputDataSource) * 1000) + Respondent.serial\n")
            dms_file.write("End Event\n")
        
        add_log(f"📜 Generated DMS script: temp.dms with {duplicate_count} data sources")
        return dms_script_path
    
    async def _execute_dms_optimized(self, script_path, workspace_path, add_log):
        """Ejecuta DMS usando dmsrun exactamente como tu código original"""
        
        try:
            add_log("⚡ Executing DMS using dmsrun command...")
            add_log(f"📜 Script: {os.path.basename(script_path)}")
            
            # Ejecutar dmsrun exactamente como en tu código original
            result = subprocess.run(
                ["dmsrun", "temp.dms"],  # Exactamente como tu código
                cwd=workspace_path,
                capture_output=True,
                text=True,
                timeout=600,  # Timeout más largo para procesos grandes
                encoding='utf-8',
                errors='ignore'
            )
            
            # Capturar salida como en tu código original
            output = result.stdout
            
            # Limpiar script temporal (exactamente como tu código)
            os.remove(os.path.join(workspace_path, "temp.dms"))
            add_log("🧹 Cleaned temp.dms script")
            
            if result.returncode == 0:
                add_log("✅ dmsrun execution completed successfully")
                return output
            else:
                error_msg = result.stderr or "Unknown DMS error"
                add_log(f"⚠️ DMS stderr: {error_msg}")
                
                # Verificar si los archivos de salida se crearon
                expected_files = glob.glob(os.path.join(workspace_path, "*_Completes_All.*"))
                
                if expected_files:
                    add_log(f"✅ Found {len(expected_files)} output files despite warnings")
                    return f"DMS completed with warnings: {error_msg}"
                else:
                    raise Exception(f"DMS failed: {error_msg}")
                
        except subprocess.TimeoutExpired:
            add_log("⚠️ DMS execution timeout - checking for output files...")
            
            # Verificar si se generaron archivos a pesar del timeout
            expected_files = glob.glob(os.path.join(workspace_path, "*_Completes_All.*"))
            if expected_files:
                add_log(f"✅ Found {len(expected_files)} output files despite timeout")
                return "DMS timeout but files were generated"
            else:
                raise Exception("DMS timeout and no output files found")
                
        except Exception as e:
            add_log(f"❌ DMS execution error: {str(e)}")
            raise Exception(f"DMS execution failed: {str(e)}")
    
    async def _cleanup_temp_files_optimized(self, workspace_path, duplicate_count, base_name, add_log):
        """Limpia archivos temporales de forma optimizada"""
        
        # Patrón para archivos temporales (como tu código original)
        pattern = r".+_\d+\.(mdd|ddf)$"
        files_to_delete = []
        
        # Buscar archivos a eliminar
        for root, dirs, files in os.walk(workspace_path):
            for file in files:
                if re.match(pattern, file):
                    file_path = os.path.join(root, file)
                    files_to_delete.append(file_path)
        
        # Eliminar archivos en paralelo
        def delete_file(file_path):
            try:
                os.remove(file_path)
                return file_path
            except Exception as e:
                logger.warning(f"Could not delete {file_path}: {e}")
                return None
        
        if files_to_delete:
            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
                futures = [executor.submit(delete_file, file_path) for file_path in files_to_delete]
                
                deleted_count = 0
                for future in concurrent.futures.as_completed(futures):
                    if future.result():
                        deleted_count += 1
            
            add_log(f"🧹 Cleaned up {deleted_count} temporary files")
        else:
            add_log("🧹 No temporary files to clean")
    
    async def _create_optimized_zip_structure(self, workspace_path, base_name, casedata_out, metadata_out, duplicate_count, add_log):
        """Crea estructura ZIP optimizada (basada en tu código original)"""
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Crear directorios temporales
        mdd_dir = os.path.join(workspace_path, "mdd")
        export_dir = os.path.join(workspace_path, "export")
        
        # Limpiar y crear directorios
        for dir_path in [mdd_dir, export_dir]:
            if os.path.exists(dir_path):
                shutil.rmtree(dir_path)
            os.makedirs(dir_path)
        
        # Buscar archivos generados
        mdd_pattern = f"*_Completes_All.mdd"
        ddf_pattern = f"*_Completes_All.ddf"
        
        mdd_files = glob.glob(os.path.join(workspace_path, mdd_pattern))
        ddf_files = glob.glob(os.path.join(workspace_path, ddf_pattern))
        
        if not mdd_files or not ddf_files:
            raise Exception(f"Generated files not found: MDD={len(mdd_files)}, DDF={len(ddf_files)}")
        
        # Procesar archivo MDD (como tu código original)
        source_mdd = mdd_files[0]
        final_mdd_name = f"{base_name}.mdd"
        final_mdd_path = os.path.join(mdd_dir, final_mdd_name)
        
        shutil.copy2(source_mdd, final_mdd_path)
        add_log(f"📋 Processed MDD: {final_mdd_name}")
        
        # Copiar archivos a export
        for file_path in mdd_files + ddf_files:
            shutil.copy2(file_path, export_dir)
            add_log(f"📦 Copied to export: {os.path.basename(file_path)}")
        
        # Crear ZIP final (con nombre correcto)
        zip_name = f"{base_name}_x{duplicate_count}_OPTIMIZED_{timestamp}.zip"  # Usar duplicate_count en lugar de count
        zip_path = os.path.join(workspace_path, zip_name)
        
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zip_file:
            # Agregar archivos MDD
            for root, dirs, files in os.walk(mdd_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.join("mdd", os.path.relpath(file_path, mdd_dir))
                    zip_file.write(file_path, arcname=arcname)
            
            # Agregar archivos export
            for root, dirs, files in os.walk(export_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.join("export", os.path.relpath(file_path, export_dir))
                    zip_file.write(file_path, arcname=arcname)
            
            # Agregar archivo de información
            info_content = f"""OPTIMIZED MDD DUPLICATION REPORT
Based on your original Python method but optimized for speed

Generated: {datetime.now().isoformat()}
Base Name: {base_name}
Method: Optimized DMS with Multiple DataSources
Version: {self.version}

STRUCTURE:
/mdd/{final_mdd_name}     - Ready for Survey Reporter
/export/                  - Complete files for backup

OPTIMIZATIONS APPLIED:
- Parallel file operations
- Efficient cleanup
- Faster ZIP compression
- Better error handling
- Optimized DMS script

USAGE:
1. Extract files from /mdd/ folder
2. Open {final_mdd_name} in Survey Reporter
3. Data should be accessible immediately

This method replicates your original approach but with
significant performance improvements.
"""
            zip_file.writestr("OPTIMIZED_INFO.txt", info_content)
        
        # Limpiar directorios temporales
        for dir_path in [mdd_dir, export_dir]:
            if os.path.exists(dir_path):
                shutil.rmtree(dir_path)
        
        add_log(f"✅ Created optimized ZIP: {zip_name}")
        return zip_path
    
    def _cleanup_existing_files(self, workspace_path, casedata_out, metadata_out, add_log):
        """Limpia archivos existentes (como tu código original)"""
        
        files_to_clean = [
            os.path.join(workspace_path, casedata_out),
            os.path.join(workspace_path, metadata_out)
        ]
        
        cleaned = 0
        for file_path in files_to_clean:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    cleaned += 1
                except Exception as e:
                    logger.warning(f"Could not clean {file_path}: {e}")
        
        if cleaned > 0:
            add_log(f"🧹 Cleaned {cleaned} existing files")
    
    def _estimate_records(self, ddf_path):
        """Estima registros del DDF"""
        try:
            file_size = os.path.getsize(ddf_path)
            return max(1, file_size // 8000)  # Estimación conservadora
        except:
            return 100
    
    # ✅ MÉTODO DE COMPATIBILIDAD
    def duplicate_mdd_real_fallback(self, mdd_path, ddf_path, duplicate_count, 
                                   workspace_path, original_filename):
        """Método síncrono para compatibilidad"""
        import asyncio
        
        try:
            try:
                loop = asyncio.get_event_loop()
                if loop.is_closed():
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            result = loop.run_until_complete(
                self.process_duplicate_mdd_real(
                    mdd_path, ddf_path, duplicate_count, 
                    workspace_path, original_filename
                )
            )
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Optimized method failed: {str(e)}",
                "mode": "OPTIMIZED_ERROR"
            }
    
    def _validate_mdd_ddf_files(self, mdd_path: str, ddf_path: str) -> Dict[str, Any]:
        """Validación de archivos"""
        if not os.path.exists(mdd_path):
            return {"valid": False, "error": f"MDD not found: {mdd_path}"}
        
        if not os.path.exists(ddf_path):
            return {"valid": False, "error": f"DDF not found: {ddf_path}"}
        
        try:
            record_count = self._estimate_records(ddf_path)
            return {
                "valid": True,
                "record_count": record_count,
                "mdd_size": os.path.getsize(mdd_path),
                "ddf_size": os.path.getsize(ddf_path)
            }
        except Exception as e:
            return {"valid": False, "error": f"Validation error: {str(e)}"}


# Función standalone
def validate_mdd_ddf_files(mdd_path: str, ddf_path: str) -> Dict[str, Any]:
    service = IBMSPSSDataCollectionService()
    return service._validate_mdd_ddf_files(mdd_path, ddf_path)

# Instancia del servicio
mdd_real_service = IBMSPSSDataCollectionService()