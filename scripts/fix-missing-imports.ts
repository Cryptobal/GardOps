import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Script para agregar imports faltantes de getTenantId
 */

class ImportFixer {
  private results: { file: string; added: boolean; errors: string[] }[] = [];
  private totalFiles = 0;
  private fixedFiles = 0;

  /**
   * Ejecuta la corrección de imports en todos los archivos
   */
  async fixAll(): Promise<void> {
    console.log('🔧 Corrigiendo imports faltantes de getTenantId...\n');
    
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
      this.totalFiles++;
      
      // Verificar si el archivo usa getTenantId pero no tiene el import
      const usesGetTenantId = content.includes('getTenantId') || 
                             content.includes('getTenantFromRequest') ||
                             content.includes('TenantManager');
      
      const hasImport = content.includes("from '@/lib/utils/tenant-utils'") || 
                       content.includes("from '@/lib/middleware/tenant-middleware'");
      
      if (usesGetTenantId && !hasImport) {
        console.log(`🔍 Corrigiendo: ${filePath}`);
        
        const newContent = this.addImport(content);
        writeFileSync(filePath, newContent, 'utf8');
        
        this.results.push({
          file: filePath,
          added: true,
          errors: []
        });
        
        this.fixedFiles++;
        console.log(`  ✅ Import agregado`);
      } else {
        this.results.push({
          file: filePath,
          added: false,
          errors: []
        });
      }
      
    } catch (error) {
      const errorMsg = `Error procesando ${filePath}: ${error}`;
      console.error(`❌ ${errorMsg}`);
      
      this.results.push({
        file: filePath,
        added: false,
        errors: [errorMsg]
      });
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
   * Imprime los resultados de la corrección
   */
  private printResults(): void {
    console.log('\n📊 RESULTADOS DE LA CORRECCIÓN:');
    console.log('=================================');
    
    const fixedFiles = this.results.filter(r => r.added);
    const errorFiles = this.results.filter(r => r.errors.length > 0);
    
    console.log(`📁 Total de archivos: ${this.totalFiles}`);
    console.log(`✅ Archivos corregidos: ${this.fixedFiles}`);
    console.log(`❌ Archivos con errores: ${errorFiles.length}`);
    
    if (fixedFiles.length > 0) {
      console.log('\n📁 ARCHIVOS CORREGIDOS:');
      fixedFiles.forEach(result => {
        console.log(`  - ${result.file}`);
      });
    }
    
    if (errorFiles.length > 0) {
      console.log('\n❌ ARCHIVOS CON ERRORES:');
      errorFiles.forEach(result => {
        console.log(`  - ${result.file}: ${result.errors.join(', ')}`);
      });
    }
    
    console.log('\n🎉 Corrección de imports completada!');
  }
}

// Ejecutar corrección
async function main() {
  const fixer = new ImportFixer();
  await fixer.fixAll();
}

if (require.main === module) {
  main().catch(console.error);
}

export { ImportFixer };
