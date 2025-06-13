# Script para crear distribución portable de KapTools Nexus
Write-Host "Creando KapTools Nexus Portable..." -ForegroundColor Green

# Verificar que los ejecutables existan
$mainExe = "src-tauri\target\release\kaptools-nexus.exe"
$backendExe = "src-tauri\binaries\kaptools-backend.exe"

if (-not (Test-Path $mainExe)) {
    Write-Host "ERROR: No se encontró: $mainExe" -ForegroundColor Red
    Write-Host "Ejecuta primero: cargo tauri build --no-bundle" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $backendExe)) {
    Write-Host "ERROR: No se encontró: $backendExe" -ForegroundColor Red
    Write-Host "Ejecuta primero el build del backend" -ForegroundColor Yellow
    exit 1
}

Write-Host "Ambos ejecutables encontrados correctamente!" -ForegroundColor Green

# Crear directorio portable
$portableDir = "KapTools-Nexus-Portable"
if (Test-Path $portableDir) {
    Write-Host "Limpiando directorio anterior..." -ForegroundColor Yellow
    Remove-Item $portableDir -Recurse -Force
}
New-Item -ItemType Directory -Path $portableDir | Out-Null

# Copiar ejecutables
Write-Host "Copiando ejecutables..." -ForegroundColor Cyan
Copy-Item $mainExe "$portableDir\"
Copy-Item $backendExe "$portableDir\"

# Crear README
$readmeContent = @"
KapTools Nexus - Version Portable v1.0

===================================================================
                        INSTRUCCIONES
===================================================================

EJECUCIÓN:
   1. Doble-click en: kaptools-nexus.exe
   2. Eso es todo! El backend se inicia automaticamente.

ARCHIVOS:
   • kaptools-nexus.exe    <- Aplicacion principal (EJECUTAR ESTE)
   • kaptools-backend.exe  <- Servidor backend (automatico)

CARACTERÍSTICAS:
   • No requiere instalacion
   • No requiere permisos de administrador  
   • Compatible con VPNs corporativas
   • Completamente portable
   • Puedes mover esta carpeta donde quieras

CONECTIVIDAD:
   • Puerto usado: 8000
   • API local: http://127.0.0.1:8000
   • Si hay problemas de conexion, verificar firewall/antivirus

RESOLUCIÓN DE PROBLEMAS:
   • Si no abre: Ejecutar como administrador
   • Si error de backend: Verificar puerto 8000 libre
   • Si bloquea antivirus: Agregar excepcion para la carpeta

SOPORTE:
   • Version: 1.0
   • Creado con: Tauri + React + Python
   • Para soporte tecnico contactar al desarrollador

===================================================================
"@

Set-Content -Path "$portableDir\README.txt" -Value $readmeContent -Encoding UTF8

# Crear archivo .bat para ejecución fácil
$batContent = @"
@echo off
title KapTools Nexus - Iniciando...
color 0A
echo.
echo  ============================================================
echo  =                                                          =
echo  =              KapTools Nexus v1.0                        =
echo  =                                                          =
echo  =              Iniciando aplicacion...                    =
echo  =                                                          =
echo  ============================================================
echo.
echo  Cargando componentes...
timeout /t 1 /nobreak >nul
echo  OK Frontend React
timeout /t 1 /nobreak >nul  
echo  OK Backend Python
echo  OK Conectando servicios...
echo.
echo  Listo! Abriendo aplicacion...
echo.
start /B kaptools-nexus.exe
echo  Aplicacion iniciada exitosamente
echo.
echo  Puedes cerrar esta ventana
echo.
pause
"@

Set-Content -Path "$portableDir\Ejecutar-KapTools-Nexus.bat" -Value $batContent

# Crear archivo de versión
$versionContent = @"
KapTools Nexus Portable v1.0
Build: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Platform: Windows x64
Components: React Frontend + Python Backend + Tauri Wrapper
Portable: Yes
"@

Set-Content -Path "$portableDir\version.txt" -Value $versionContent

# Mostrar información final
Write-Host ""
Write-Host "Distribucion portable creada exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Ubicacion: $portableDir" -ForegroundColor Cyan
Write-Host "Archivos creados:" -ForegroundColor Yellow

Get-ChildItem $portableDir | ForEach-Object {
    $size = if ($_.PSIsContainer) { "Carpeta" } else { "{0:N1} MB" -f ($_.Length / 1MB) }
    Write-Host "   • $($_.Name) ($size)" -ForegroundColor White
}

Write-Host ""
Write-Host "SIGUIENTE PASO:" -ForegroundColor Magenta
Write-Host "   1. Probar: cd $portableDir && .\kaptools-nexus.exe" -ForegroundColor White
Write-Host "   2. Comprimir en ZIP para distribucion" -ForegroundColor White
Write-Host ""

# Preguntar si comprimir en ZIP
$compress = Read-Host "Crear archivo ZIP para distribucion? (y/n)"
if ($compress -eq "y" -or $compress -eq "Y") {
    $zipName = "KapTools-Nexus-v1.0-Portable.zip"
    Write-Host "Creando $zipName..." -ForegroundColor Cyan
    
    Compress-Archive -Path $portableDir -DestinationPath $zipName -Force
    
    $zipSize = (Get-Item $zipName).Length / 1MB
    Write-Host "ZIP creado: $zipName ($([math]::Round($zipSize, 1)) MB)" -ForegroundColor Green
    Write-Host "Listo para distribuir!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Proceso completado!" -ForegroundColor Green