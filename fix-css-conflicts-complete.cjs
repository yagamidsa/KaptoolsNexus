// 🚀 fix-css-conflicts-complete.cjs - VERSIÓN COMPLETA
// Detecta y arregla TODOS los conflictos CSS automáticamente

const fs = require('fs');
const path = require('path');

console.log('🚀 DETECTOR COMPLETO DE CONFLICTOS CSS\n');

// Verificar argumentos para rollback
const args = process.argv.slice(2);
if (args.includes('--rollback')) {
    performRollback();
    process.exit(0);
}

// Verificar estructura
if (!fs.existsSync('package.json') || !fs.existsSync('src/components')) {
    console.error('❌ ERROR: Ejecuta desde la raíz del proyecto');
    process.exit(1);
}

console.log('✅ Estructura validada');

// 📂 Mapeo: archivo CSS → prefijo único
const COMPONENT_MAPPING = {
    'DuplicateMDD.css': 'dup',
    'DownloadFiles.css': 'df', 
    'NeonDock.css': 'dock',
    'ShorcutsNexus.css': 'shortcuts',  // 'ShorcutsNexus' (typo en el nombre del archivo)
    'ReviewBranches.css': 'rb',
    'CreateStructure.css': 'cs',
    'ProductData.css': 'pd',
    'FuturisticBackground.css': 'bg',
    'HolographicButton.css': 'holo'
};

// 🔍 Análisis automático de conflictos
function analyzeConflicts() {
    console.log('🔍 ANALIZANDO CONFLICTOS...\n');
    
    const allClasses = new Map(); // className -> [archivos que la usan]
    const conflicts = new Map(); // className -> [archivos en conflicto]
    
    // Leer todos los archivos CSS
    Object.keys(COMPONENT_MAPPING).forEach(filename => {
        const cssPath = path.join('src/components', filename);
        if (!fs.existsSync(cssPath)) return;
        
        const content = fs.readFileSync(cssPath, 'utf8');
        
        // Extraer todas las clases CSS (mejorado)
        const classMatches = content.match(/\.[a-zA-Z][a-zA-Z0-9_-]*(?=[\s\{\,\:\.])/g);
        
        if (classMatches) {
            const uniqueClasses = [...new Set(classMatches.map(c => c.substring(1)))];
            
            uniqueClasses.forEach(className => {
                if (!allClasses.has(className)) {
                    allClasses.set(className, []);
                }
                allClasses.get(className).push(filename);
            });
        }
    });
    
    // Identificar conflictos (clases usadas en 2+ archivos)
    allClasses.forEach((files, className) => {
        if (files.length > 1) {
            conflicts.set(className, files);
        }
    });
    
    return { allClasses, conflicts };
}

// 📊 Mostrar análisis
const { allClasses, conflicts } = analyzeConflicts();

console.log(`📊 ESTADÍSTICAS:`);
console.log(`   📁 Archivos CSS: ${Object.keys(COMPONENT_MAPPING).filter(f => fs.existsSync(`src/components/${f}`)).length}`);
console.log(`   🎨 Clases totales: ${allClasses.size}`);
console.log(`   ⚠️  Conflictos detectados: ${conflicts.size}\n`);

if (conflicts.size === 0) {
    console.log('✨ ¡No se detectaron conflictos!');
    process.exit(0);
}

// 📋 Mostrar conflictos detallados
console.log('🔥 CONFLICTOS DETECTADOS:');
console.log('='.repeat(60));

[...conflicts.entries()]
    .sort((a, b) => b[1].length - a[1].length) // Ordenar por cantidad de archivos
    .slice(0, 20) // Mostrar top 20
    .forEach(([className, files]) => {
        console.log(`⚠️  "${className}" → ${files.join(', ')}`);
    });

if (conflicts.size > 20) {
    console.log(`   ... y ${conflicts.size - 20} conflictos más`);
}

console.log('\n' + '='.repeat(60));

// ❓ Confirmar reparación
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('\n🔧 ¿Reparar TODOS los conflictos automáticamente? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log('\n🚀 INICIANDO REPARACIÓN AUTOMÁTICA...\n');
        fixAllConflicts(conflicts);
    } else {
        console.log('❌ Reparación cancelada');
    }
    rl.close();
});

// 🔧 Reparar todos los conflictos
function fixAllConflicts(conflicts) {
    let totalChanges = 0;
    
    Object.entries(COMPONENT_MAPPING).forEach(([filename, prefix]) => {
        const cssPath = path.join('src/components', filename);
        
        if (!fs.existsSync(cssPath)) {
            console.log(`⚠️  Archivo no encontrado: ${filename}`);
            return;
        }
        
        console.log(`\n🎯 Procesando: ${filename} (prefijo: "${prefix}")`);
        
        try {
            let content = fs.readFileSync(cssPath, 'utf8');
            const originalContent = content;
            let fileChanges = 0;
            
            // 💾 Crear backup
            const backupPath = cssPath + '.complete-backup';
            fs.copyFileSync(cssPath, backupPath);
            console.log(`   💾 Backup: ${filename}.complete-backup`);
            
            // 🔄 Aplicar prefijos solo a clases conflictivas
            conflicts.forEach((files, className) => {
                if (files.includes(filename)) {
                    const regex = new RegExp(`\\.${escapeRegex(className)}(?=\\s*[\\{\\,\\:\\.]|\\s*$)`, 'g');
                    const matches = content.match(regex);
                    
                    if (matches) {
                        const newClassName = `.${prefix}-${className}`;
                        content = content.replace(regex, newClassName);
                        fileChanges += matches.length;
                        console.log(`   🔄 .${className} → .${prefix}-${className}`);
                    }
                }
            });
            
            // 💾 Guardar solo si hay cambios
            if (fileChanges > 0) {
                fs.writeFileSync(cssPath, content);
                console.log(`   ✅ ${fileChanges} cambios guardados`);
                totalChanges += fileChanges;
                
                // 🔧 Actualizar TSX correspondiente
                updateTSXFile(filename, prefix, conflicts);
            } else {
                console.log(`   ℹ️  Sin cambios necesarios`);
            }
            
        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
        }
    });
    
    // 📊 Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('🎉 REPARACIÓN COMPLETADA');
    console.log('='.repeat(60));
    console.log(`📊 Total de cambios: ${totalChanges}`);
    console.log(`⚠️  Conflictos resueltos: ${conflicts.size}`);
    
    if (totalChanges > 0) {
        console.log(`
✅ Todos los conflictos han sido reparados automáticamente
💾 Backups creados (.complete-backup)
🔄 Reinicia: npm run dev

🎯 Para deshacer: node fix-css-conflicts-complete.cjs --rollback
        `);
    }
}

// 🔧 Actualizar archivo TSX correspondiente
function updateTSXFile(cssFilename, prefix, conflicts) {
    const tsxFilename = cssFilename.replace('.css', '.tsx');
    const tsxPath = path.join('src/components', tsxFilename);
    
    if (!fs.existsSync(tsxPath)) {
        console.log(`   ⚠️  TSX no encontrado: ${tsxFilename}`);
        return;
    }
    
    console.log(`   🔧 Actualizando TSX: ${tsxFilename}`);
    
    let content = fs.readFileSync(tsxPath, 'utf8');
    const originalContent = content;
    
    // 💾 Backup TSX
    fs.copyFileSync(tsxPath, tsxPath + '.complete-backup');
    
    // 🔄 Actualizar className en JSX solo para clases conflictivas
    conflicts.forEach((files, className) => {
        if (files.includes(cssFilename)) {
            // Buscar className="..." que contenga la clase
            const classNameRegex = new RegExp(
                `(className=["'][^"']*?)\\b${escapeRegex(className)}\\b([^"']*?["'])`,
                'g'
            );
            
            const oldContent = content;
            content = content.replace(classNameRegex, (match, before, after) => {
                // Evitar duplicados
                if (match.includes(`${prefix}-${className}`)) {
                    return match;
                }
                return before + `${prefix}-${className}` + after;
            });
            
            if (oldContent !== content) {
                console.log(`   🔄 TSX: .${className} → .${prefix}-${className}`);
            }
        }
    });
    
    if (originalContent !== content) {
        fs.writeFileSync(tsxPath, content);
        console.log(`   ✅ TSX actualizado`);
    }
}

// 🔙 Función rollback
function performRollback() {
    console.log('🔙 RESTAURANDO ARCHIVOS...\n');
    
    try {
        const files = fs.readdirSync('src/components');
        let restored = 0;
        
        files.forEach(file => {
            if (file.endsWith('.complete-backup')) {
                const originalFile = path.join('src/components', file.replace('.complete-backup', ''));
                const backupFile = path.join('src/components', file);
                
                console.log(`📄 Restaurando: ${path.basename(originalFile)}`);
                fs.copyFileSync(backupFile, originalFile);
                fs.unlinkSync(backupFile);
                restored++;
            }
        });
        
        if (restored > 0) {
            console.log(`\n✅ ${restored} archivos restaurados`);
            console.log('🔄 Reinicia: npm run dev');
        } else {
            console.log('❌ No hay backups para restaurar');
        }
        
    } catch (error) {
        console.error('❌ Error en rollback:', error.message);
    }
}

// 🛠️ Utility: Escapar caracteres especiales para regex
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}