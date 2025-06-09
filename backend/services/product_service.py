# backend/services/product_service.py - VERSIÓN MEJORADA
import asyncio
import aiohttp
import ssl
from typing import Dict, Optional
from pydantic import BaseModel
from datetime import datetime
import logging

class ProductInfo(BaseModel):
    """Product information model"""
    kapid: str
    server: str
    creator: str = ""
    product_type: str = ""
    version: str = ""
    platform: str = ""
    status: str = ""
    wave_id: str = ""
    language: str = ""
    creation_date: str = ""
    raw_data: Dict = {}

class ProductService:
    def __init__(self):
        self.available_servers = [
            "Sandbox3", "Sandbox4", "Sandbox5", "Sandbox6", "Sandbox7", "Sandbox8",
            "Sandbox9", "Sandbox10", "Sandbox11", "Sandbox12", "Sandbox13", "Staging"
        ]
        # Configurar logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    async def get_product_data(
        self, 
        kapid: str, 
        server: str, 
        token: str
    ) -> Dict[str, any]:
        """
        Fetch product data from KAP API with improved error handling
        """
        try:
            # Validate inputs
            if not all([kapid, server, token]):
                return {
                    "success": False,
                    "message": "KapID, Server y Token son requeridos",
                    "error_type": "validation_error",
                    "data": None
                }
            
            if server not in self.available_servers:
                return {
                    "success": False,
                    "message": f"Servidor '{server}' no válido",
                    "error_type": "invalid_server",
                    "data": None
                }
            
            # Build API URL
            kapid_upper = kapid.upper().strip()
            url = f"https://{server.lower()}-kap-studydef.azurewebsites.net/studies/{kapid_upper}"
            
            self.logger.info(f"🔍 Consultando: {url}")
            
            # Headers
            headers = {
                "x-jetstream-devtoken": token.strip(),
                "User-Agent": "KapTools-Nexus/2.0",
                "Accept": "application/json"
            }
            
            # Create SSL context
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            # Make HTTP request
            timeout = aiohttp.ClientTimeout(total=30)
            
            async with aiohttp.ClientSession(
                timeout=timeout,
                connector=aiohttp.TCPConnector(ssl=ssl_context)
            ) as session:
                async with session.get(url, headers=headers) as response:
                    
                    # Log response details
                    self.logger.info(f"📊 Status: {response.status}")
                    
                    if response.status == 200:
                        json_data = await response.json()
                        
                        # Parse response data
                        product_info = self._parse_product_data(json_data, kapid_upper, server)
                        
                        return {
                            "success": True,
                            "message": f"✅ Datos obtenidos exitosamente para {kapid_upper}",
                            "data": product_info
                        }
                    
                    elif response.status == 404:
                        return {
                            "success": False,
                            "message": f"❌ Producto '{kapid_upper}' no encontrado en {server}",
                            "error_type": "not_found",
                            "suggestion": f"• Verifica que el KapID '{kapid_upper}' existe\n• Prueba en otro servidor\n• Revisa que el producto esté activo",
                            "data": None
                        }
                    
                    elif response.status == 401:
                        return {
                            "success": False,
                            "message": "❌ Token de autenticación inválido",
                            "error_type": "unauthorized",
                            "suggestion": "• Verifica el token en Azure KeyVault\n• Asegúrate de que el token tenga permisos\n• Prueba regenerar el token",
                            "data": None
                        }
                    
                    elif response.status == 500:
                        # 🔥 MANEJO ESPECÍFICO PARA ERROR 500
                        error_text = await response.text()
                        
                        try:
                            error_json = await response.json()
                            error_code = error_json.get('code', 'Unknown')
                            error_description = error_json.get('description', 'Internal Server Error')
                            error_source = error_json.get('source', 'Unknown')
                            
                            return {
                                "success": False,
                                "message": f"🔥 Error interno del servidor KAP ({error_code})",
                                "error_type": "server_error",
                                "error_details": {
                                    "code": error_code,
                                    "description": error_description,
                                    "source": error_source,
                                    "kapid": kapid_upper,
                                    "server": server
                                },
                                "suggestion": f"""• Este es un error del servidor KAP, no de tu aplicación
• El KapID '{kapid_upper}' puede tener datos corruptos o inconsistentes
• Soluciones posibles:
  → Reportar error '{error_code}' al equipo KAP
  → Intentar en otro servidor ({', '.join([s for s in self.available_servers if s != server][:3])})
  → Verificar si el estudio existe realmente en el portal KAP
  → Contactar al owner del producto para validación""",
                                "data": None
                            }
                        except:
                            # Si no se puede parsear el JSON del error
                            return {
                                "success": False,
                                "message": f"🔥 Error 500: Servidor KAP no disponible",
                                "error_type": "server_error",
                                "suggestion": f"• Error interno del servidor KAP\n• Intenta más tarde o en otro servidor\n• Reporta el problema al equipo de KAP",
                                "raw_error": error_text[:500],
                                "data": None
                            }
                    
                    elif response.status == 403:
                        return {
                            "success": False,
                            "message": f"❌ Sin permisos para acceder a '{kapid_upper}' en {server}",
                            "error_type": "forbidden",
                            "suggestion": "• Verifica permisos del token\n• El producto puede ser privado\n• Contacta al administrador",
                            "data": None
                        }
                    
                    else:
                        error_text = await response.text()
                        return {
                            "success": False,
                            "message": f"❌ Error HTTP {response.status}",
                            "error_type": "http_error",
                            "raw_error": error_text[:200] if error_text else "No response body",
                            "suggestion": f"• Error inesperado del servidor\n• Revisa conectividad\n• Intenta en otro servidor",
                            "data": None
                        }
                        
        except asyncio.TimeoutError:
            return {
                "success": False,
                "message": "⏱️ Timeout: El servidor no respondió en 30 segundos",
                "error_type": "timeout",
                "suggestion": "• Revisa tu conexión a internet\n• El servidor puede estar sobrecargado\n• Intenta más tarde",
                "data": None
            }
            
        except aiohttp.ClientError as e:
            return {
                "success": False,
                "message": f"🌐 Error de conexión: {str(e)}",
                "error_type": "connection_error",
                "suggestion": "• Verifica tu conexión a internet\n• Revisa configuración de proxy/firewall\n• El servidor puede estar caído",
                "data": None
            }
            
        except Exception as e:
            self.logger.error(f"❌ Error inesperado: {str(e)}")
            return {
                "success": False,
                "message": f"💥 Error inesperado: {str(e)}",
                "error_type": "unexpected_error",
                "suggestion": "• Error interno de la aplicación\n• Revisa logs para más detalles\n• Contacta soporte técnico",
                "data": None
            }
    
    def _parse_product_data(self, json_data: Dict, kapid: str, server: str) -> ProductInfo:
        """Parse JSON response to extract product information"""
        try:
            # Extract creator information
            creator = ""
            created_by = json_data.get("created_by", {})
            if isinstance(created_by, dict):
                creator = created_by.get("full_name", "")
            
            # Extract product type
            product_type = ""
            product_type_obj = json_data.get("product_type", {})
            if isinstance(product_type_obj, dict):
                product_type = product_type_obj.get("id", "")
            
            # Extract version and platform
            version = json_data.get("product_version", "")
            platform = json_data.get("platform", "")
            
            # Extract wave information
            wave_id = ""
            status = ""
            waves = json_data.get("waves", [])
            if waves and isinstance(waves, list):
                first_wave = waves[0]
                if isinstance(first_wave, dict):
                    wave_id = first_wave.get("id", "")
                    status = first_wave.get("status", "")
            
            # Extract language
            language = ""
            languages = json_data.get("languages", [])
            if languages and isinstance(languages, list):
                first_language = languages[0]
                if isinstance(first_language, dict):
                    language = first_language.get("name", "")
            
            # Extract creation date
            creation_date = json_data.get("created_timestamp", "")
            
            return ProductInfo(
                kapid=kapid,
                server=server,
                creator=creator,
                product_type=product_type,
                version=version,
                platform=platform,
                status=status,
                wave_id=wave_id,
                language=language,
                creation_date=creation_date,
                raw_data=json_data
            )
            
        except Exception as e:
            # Return basic info if parsing fails
            return ProductInfo(
                kapid=kapid,
                server=server,
                creator=f"Error parsing: {str(e)}",
                raw_data=json_data
            )
    
    def get_available_servers(self) -> list[str]:
        """Get list of available servers"""
        return self.available_servers.copy()
    
    def validate_kapid(self, kapid: str) -> Dict[str, any]:
        """Validate KapID format"""
        if not kapid or not kapid.strip():
            return {
                "valid": False,
                "message": "KapID no puede estar vacío"
            }
        
        kapid = kapid.strip().upper()
        
        # Basic validation (adjust as needed)
        if len(kapid) < 3:
            return {
                "valid": False,
                "message": "KapID debe tener al menos 3 caracteres"
            }
        
        return {
            "valid": True,
            "message": "KapID válido",
            "formatted_kapid": kapid
        }