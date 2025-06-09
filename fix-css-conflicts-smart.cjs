// 🤖 fix-css-conflicts-smart.cjs - Versión INTELIGENTE
// Solo toca clases que REALMENTE causan conflictos específicos

const fs = require('fs');
const path = require('path');

// 🎯 Solo clases ESPECÍFICAS que causan conflictos conocidos
const SPECIFIC_CONFLICTS = [
    'close-button',
    'modal-header', 
    'modal-content',
    'modal-backdrop',
    'loading-spinner',
    'progress-overlay',
    'download-modal-backdrop',
    'file-diff-overlay',
    'comparison-modal-overlay'
];

// 🔧 Mapeo: archivo CSS → prefijo (solo componentes problemáticos)
const COMPONENTS_TO_FIX = {
    'ReviewBranches.css': 'rb',
    'DownloadFiles.css': 'df'
};

console.log('🤖 Script INTELIGENTE - Solo toca conflictos específicos\n');

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

// Solo procesar archivos específicos
const filesToProcess = [];
Object.entries(COMPONENTS_TO_FIX).forEach(([filename, prefix]) => {
    const cssPath = path.join('src/components', filename);
    if (fs.existsSync(cssPath)) {
        filesToProcess.push({
            name: filename,
            path: cssPath,
            prefix: prefix
        });
        console.log(`📄 ${filename} → prefijo: "${prefix}"`);
    }
});

if (filesToProcess.length === 0) {
    console.log('❌ No se encontraron archivos para procesar');
    process.exit(1);
}

console.log('\n' + '='.repeat(50));
console.log('🔧 REPARACIÓN INTELIGENTE');
console.log('='.repeat(50));

let totalChanges = 0;

filesToProcess.forEach(file => {
    console.log(`\n🎯 Procesando: ${file.name}`);
    
    try {
        let content = fs.readFileSync(file.path, 'utf8');
        const originalContent = content;
        let changes = 0;
        
        // Backup
        const backupPath = file.path + '.smart-backup';
        fs.copyFileSync(file.path, backupPath);
        console.log(`   💾 Backup: ${file.name}.smart-backup`);
        
        // Solo agregar prefijos a clases ESPECÍFICAS
        SPECIFIC_CONFLICTS.forEach(className => {
            // Buscar SOLO clases exactas, no dentro de otras clases
            const exactClassRegex = new RegExp(`\\.${className}(?=\\s*[\\{\\,\\:]|\\s*$)`, 'g');
            const matches = content.match(exactClassRegex);
            
            if (matches) {
                const newClassName = `.${file.prefix}-${className}`;
                content = content.replace(exactClassRegex, newClassName);
                changes += matches.length;
                console.log(`   🔄 ${className} → ${file.prefix}-${className}`);
            }
        });
        
        // Guardar solo si hay cambios
        if (changes > 0) {
            fs.writeFileSync(file.path, content);
            console.log(`   ✅ ${changes} cambios guardados`);
            totalChanges += changes;
            
            // Actualizar TSX de forma inteligente
            updateTSXSmart(file);
        } else {
            console.log(`   ℹ️  Sin conflictos detectados`);
        }
        
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
    }
});

function updateTSXSmart(file) {
    const tsxPath = file.path.replace('.css', '.tsx');
    
    if (!fs.existsSync(tsxPath)) {
        console.log(`   ⚠️  TSX no encontrado`);
        return;
    }
    
    console.log(`   🔧 Actualizando TSX...`);
    
    let content = fs.readFileSync(tsxPath, 'utf8');
    const originalContent = content;
    
    // Backup TSX
    fs.copyFileSync(tsxPath, tsxPath + '.smart-backup');
    
    // Solo actualizar clases ESPECÍFICAS en className=""
    SPECIFIC_CONFLICTS.forEach(className => {
        // Buscar className="close-button" o className="algo close-button algo"
        const classNameRegex = new RegExp(
            `(className=["'][^"']*?)\\b${className}\\b([^"']*?["'])`,
            'g'
        );
        
        const oldContent = content;
        content = content.replace(classNameRegex, (match, before, after) => {
            // Evitar duplicados
            if (match.includes(`${file.prefix}-${className}`)) {
                return match;
            }
            return before + `${file.prefix}-${className}` + after;
        });
        
        if (oldContent !== content) {
            console.log(`   🔄 TSX: ${className} → ${file.prefix}-${className}`);
        }
    });
    
    if (originalContent !== content) {
        fs.writeFileSync(tsxPath, content);
        console.log(`   ✅ TSX actualizado`);
    }
}

function performRollback() {
    console.log('🔙 Restaurando archivos...\n');
    
    try {
        const files = fs.readdirSync('src/components');
        let restored = 0;
        
        files.forEach(file => {
            if (file.endsWith('.smart-backup')) {
                const originalFile = path.join('src/components', file.replace('.smart-backup', ''));
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

console.log('\n' + '='.repeat(50));
console.log('🎉 PROCESO COMPLETADO');
console.log('='.repeat(50));
console.log(`📊 Cambios realizados: ${totalChanges}`);

if (totalChanges > 0) {
    console.log(`
✅ Solo se modificaron clases que causan conflictos específicos
💾 Backups creados (.smart-backup)
🔄 Reinicia: npm run dev

🎯 Para deshacer: node fix-css-conflicts-smart.cjs --rollback
`);
} else {
    console.log('\n✨ No se detectaron conflictos específicos');
}