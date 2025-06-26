import os
import sys
import shutil
import subprocess
from pathlib import Path

def main():
    print("🚀 Construyendo backend KapTools Nexus...")
    

    if not os.path.exists('main.py'):
        print("❌ Error: No se encuentra main.py")
        print("   Ejecuta este script desde la carpeta backend/")
        return False
    

    try:
        import PyInstaller
    except ImportError:
        print("📦 Instalando PyInstaller...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
    

    for dir_name in ['dist', 'build', '__pycache__']:
        if os.path.exists(dir_name):
            print(f"🧹 Limpiando {dir_name}/")
            shutil.rmtree(dir_name)
    

    binaries_dir = Path("../src-tauri/binaries")
    binaries_dir.mkdir(parents=True, exist_ok=True)
    

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "main.py",
        "--onefile",
        "--console",
        "--name=kaptools-backend",
        "--distpath=../src-tauri/binaries",
        "--workpath=build",
        "--specpath=build",
        "--noconfirm",
        
    
        "--hidden-import=uvicorn",
        "--hidden-import=fastapi",
        "--hidden-import=git",
        "--hidden-import=pydantic",
        "--hidden-import=configparser",
    ]
    

    if os.path.exists('services') and os.listdir('services'):
        cmd.append("--add-data=services;services")
        print("📁 Incluyendo carpeta services/")
    
    print("🔨 Ejecutando PyInstaller...")
    print(f"📋 Comando: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print("✅ PyInstaller completado")
        
    
        exe_path = Path("../src-tauri/binaries/kaptools-backend.exe")
        if exe_path.exists():
            size_mb = exe_path.stat().st_size / (1024 * 1024)
            print(f"🎉 ¡Ejecutable creado exitosamente!")
            print(f"📁 Ubicación: {exe_path.absolute()}")
            print(f"📏 Tamaño: {size_mb:.1f} MB")
            return True
        else:
            print("❌ Error: No se pudo crear el ejecutable")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Error en PyInstaller:")
        print(f"   stdout: {e.stdout}")
        print(f"   stderr: {e.stderr}")
        return False

if __name__ == "__main__":
    success = main()
    if success:
        print("\n✅ ¡Backend listo! Ahora puedes hacer: npm run build")
    else:
        print("\n❌ Error en la construcción del backend")
    sys.exit(0 if success else 1)