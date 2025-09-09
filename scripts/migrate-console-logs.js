#!/usr/bin/env node

/**
 * Script para migrar console.log a sistema de logging controlado
 * Uso: node scripts/migrate-console-logs.js [archivo]
 */

const fs = require('fs');
const path = require('path');

// Patrones de migración
const migrations = [
  // Logs con emojis de debug
  {
    pattern: /console\.log\('🔍([^']*)', ([^)]+)\);/g,
    replacement: "devLogger.search('$1', $2);"
  },
  {
    pattern: /console\.log\('🔄([^']*)', ([^)]+)\);/g,
    replacement: "devLogger.process('$1', $2);"
  },
  {
    pattern: /console\.log\('✅([^']*)', ([^)]+)\);/g,
    replacement: "devLogger.success('$1', $2);"
  },
  {
    pattern: /console\.log\('⚠️([^']*)', ([^)]+)\);/g,
    replacement: "logger.warn('$1', $2);"
  },
  {
    pattern: /console\.log\('🚨([^']*)', ([^)]+)\);/g,
    replacement: "devLogger.critical('$1', $2);"
  },
  
  // Console.log genéricos
  {
    pattern: /console\.log\(([^)]+)\);/g,
    replacement: "logger.debug($1);"
  },
  
  // Console.error (mantener pero mejorar formato)
  {
    pattern: /console\.error\('Error ([^']*)', ([^)]+)\);/g,
    replacement: "logger.error('Error $1:', $2);"
  },
  
  // Console.warn
  {
    pattern: /console\.warn\(([^)]+)\);/g,
    replacement: "logger.warn($1);"
  }
];

function migrateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Aplicar migraciones
    migrations.forEach(migration => {
      if (migration.pattern.test(content)) {
        content = content.replace(migration.pattern, migration.replacement);
        hasChanges = true;
      }
    });
    
    // Agregar import si hay cambios
    if (hasChanges && !content.includes('from \'@/lib/utils/logger\'')) {
      // Buscar existing imports
      const importMatch = content.match(/^(import[^;]+;[\s\n]*)+/);
      if (importMatch) {
        const existingImports = importMatch[0];
        const newImport = "import { logger, devLogger, apiLogger } from '@/lib/utils/logger';\n";
        content = content.replace(existingImports, existingImports + newImport);
      } else {
        // Agregar al inicio si no hay imports
        content = "import { logger, devLogger, apiLogger } from '@/lib/utils/logger';\n\n" + content;
      }
    }
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Migrado: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  Sin cambios: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error migrando ${filePath}:`, error.message);
    return false;
  }
}

function migrateDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let totalMigrated = 0;
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      totalMigrated += migrateDirectory(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (migrateFile(filePath)) {
        totalMigrated++;
      }
    }
  });
  
  return totalMigrated;
}

// Ejecutar script
const targetPath = process.argv[2] || './src';

console.log(`🚀 Iniciando migración de console.log en: ${targetPath}\n`);

if (fs.statSync(targetPath).isDirectory()) {
  const migrated = migrateDirectory(targetPath);
  console.log(`\n✅ Migración completada: ${migrated} archivos modificados`);
} else {
  const success = migrateFile(targetPath);
  console.log(success ? '\n✅ Archivo migrado exitosamente' : '\n⏭️  No se requirieron cambios');
}

console.log(`
🎯 Próximos pasos:
1. Revisar los archivos migrados
2. Ejecutar tests para verificar funcionamiento
3. Hacer commit de los cambios
4. Desplegar a producción para eliminar logs de debug
`);
