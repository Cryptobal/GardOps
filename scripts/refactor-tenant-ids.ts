import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { logger } from '../src/lib/utils/logger';

/**
 * Script para refactorizar tenant_id hardcodeados de forma segura
 * Reemplaza el tenant_id inválido por la función getTenantId()
 */

const INVALID_TENANT_ID = await getTenantId(request);
const VALID_TENANT_ID = '1397e653-a702-4020-9702-3ae4f3f8b337';

interface RefactorResult {
  file: string;
  changes: number;
  errors: string[];
}

class TenantRefactorer {
  private results: RefactorResult[] = [];
  private totalChanges = 0;
  private totalErrors = 0;

  /**
   * Ejecuta la refactorización en todos los archivos
   */
  async refactorAll(): Promise<void> {
    console.log('🚀 Iniciando refactorización de tenant_id...\n');
    
    // Directorios a procesar
    const directories = [
      'src/app/api',
      'src/lib',
      'scripts'
    ];
    
    for (const dir of directories) {
      await this.processDirectory(dir);
    }
    
    this.printResults();
  }

  /**
   * Procesa un directorio recursivamente
   */
  private async processDirectory(dirPath: string): Promise<void> {
    try {
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = join(dirPath, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          await this.processDirectory(fullPath);
        } else if (stat.isFile() && this.shouldProcessFile(fullPath)) {
          await this.processFile(fullPath);
        }
      }
    } catch (error) {
      console.error(`❌ Error procesando directorio ${dirPath}:`, error);
    }
  }

  /**
   * Determina si un archivo debe ser procesado
   */
  private shouldProcessFile(filePath: string): boolean {
    const ext = filePath.split('.').pop();
    return ['ts', 'tsx', 'js', 'jsx'].includes(ext || '') && 
           !filePath.includes('node_modules') &&
           !filePath.includes('.git');
  }

  /**
   * Procesa un archivo individual
   */
  private async processFile(filePath: string): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf8');
      
      // Verificar si el archivo contiene el tenant_id inválido
      if (!content.includes(INVALID_TENANT_ID)) {
        return;
      }
      
      console.log(`🔍 Procesando: ${filePath}`);
      
      // Patrones a reemplazar
      const patterns = [
        // Patrón 1: const tenantId = await getTenantId(request);
        {
          regex: /const\s+tenantId\s*=\s*['"]accebf8a-bacc-41fa-9601-ed39cb320a52['"];?/g,
          replacement: "const tenantId = await getTenantId(request);"
        },
        // Patrón 2: tenant_id: await getTenantId(request)
        {
          regex: /tenant_id:\s*['"]accebf8a-bacc-41fa-9601-ed39cb320a52['"]/g,
          replacement: "tenant_id: await getTenantId(request)"
        },
        // Patrón 3: await getTenantId(request) como parámetro
        {
          regex: /['"]accebf8a-bacc-41fa-9601-ed39cb320a52['"]/g,
          replacement: "await getTenantId(request)"
        }
      ];
      
      let newContent = content;
      let changes = 0;
      
      // Aplicar reemplazos
      for (const pattern of patterns) {
        const matches = newContent.match(pattern.regex);
        if (matches) {
          newContent = newContent.replace(pattern.regex, pattern.replacement);
          changes += matches.length;
        }
      }
      
      // Agregar import si es necesario
      if (changes > 0 && !newContent.includes('getTenantId')) {
        newContent = this.addImport(newContent);
      }
      
      // Escribir archivo modificado
      if (changes > 0) {
        writeFileSync(filePath, newContent, 'utf8');
        console.log(`  ✅ ${changes} cambios aplicados`);
      }
      
      this.results.push({
        file: filePath,
        changes,
        errors: []
      });
      
      this.totalChanges += changes;
      
    } catch (error) {
      const errorMsg = `Error procesando ${filePath}: ${error}`;
      console.error(`❌ ${errorMsg}`);
      
      this.results.push({
        file: filePath,
        changes: 0,
        errors: [errorMsg]
      });
      
      this.totalErrors++;
    }
  }

  /**
   * Agrega el import necesario al archivo
   */
  private addImport(content: string): string {
    const importLine = "import { getTenantId } from '@/lib/utils/tenant-utils';";
    
    // Buscar la primera línea de import
    const lines = content.split('\n');
    let insertIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        insertIndex = i + 1;
      } else if (lines[i].trim() === '' && insertIndex > 0) {
        break;
      }
    }
    
    // Insertar el import
    lines.splice(insertIndex, 0, importLine);
    
    return lines.join('\n');
  }

  /**
   * Imprime los resultados de la refactorización
   */
  private printResults(): void {
    console.log('\n📊 RESULTADOS DE LA REFACTORIZACIÓN:');
    console.log('=====================================');
    
    const successfulFiles = this.results.filter(r => r.changes > 0);
    const errorFiles = this.results.filter(r => r.errors.length > 0);
    
    console.log(`✅ Archivos procesados: ${successfulFiles.length}`);
    console.log(`❌ Archivos con errores: ${errorFiles.length}`);
    console.log(`🔄 Total de cambios: ${this.totalChanges}`);
    
    if (successfulFiles.length > 0) {
      console.log('\n📁 ARCHIVOS MODIFICADOS:');
      successfulFiles.forEach(result => {
        console.log(`  - ${result.file}: ${result.changes} cambios`);
      });
    }
    
    if (errorFiles.length > 0) {
      console.log('\n❌ ARCHIVOS CON ERRORES:');
      errorFiles.forEach(result => {
        console.log(`  - ${result.file}: ${result.errors.join(', ')}`);
      });
    }
    
    console.log('\n🎉 Refactorización completada!');
    console.log('💡 Recuerda probar la aplicación después de estos cambios.');
  }
}

// Ejecutar refactorización
async function main() {
  const refactorer = new TenantRefactorer();
  await refactorer.refactorAll();
}

if (require.main === module) {
  main().catch(console.error);
}

export { TenantRefactorer };
