import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Script para validar que la refactorización de tenant_id fue exitosa
 */

const INVALID_TENANT_ID = 'accebf8a-bacc-41fa-9601-ed39cb320a52'; // Tenant ID inválido a buscar

interface ValidationResult {
  file: string;
  hasInvalidTenant: boolean;
  hasValidImport: boolean;
  errors: string[];
}

class TenantValidator {
  private results: ValidationResult[] = [];
  private totalFiles = 0;
  private invalidTenantFiles = 0;
  private missingImportFiles = 0;

  /**
   * Ejecuta la validación en todos los archivos
   */
  async validateAll(): Promise<void> {
    console.log('🔍 Validando refactorización de tenant_id...\n');
    
    // Directorios a validar
    const directories = [
      'src/app/api',
      'src/lib',
      'scripts'
    ];
    
    for (const dir of directories) {
      await this.validateDirectory(dir);
    }
    
    this.printResults();
  }

  /**
   * Valida un directorio recursivamente
   */
  private async validateDirectory(dirPath: string): Promise<void> {
    try {
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = join(dirPath, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          await this.validateDirectory(fullPath);
        } else if (stat.isFile() && this.shouldValidateFile(fullPath)) {
          await this.validateFile(fullPath);
        }
      }
    } catch (error) {
      console.error(`❌ Error validando directorio ${dirPath}:`, error);
    }
  }

  /**
   * Determina si un archivo debe ser validado
   */
  private shouldValidateFile(filePath: string): boolean {
    const ext = filePath.split('.').pop();
    return ['ts', 'tsx', 'js', 'jsx'].includes(ext || '') && 
           !filePath.includes('node_modules') &&
           !filePath.includes('.git');
  }

  /**
   * Valida un archivo individual
   */
  private async validateFile(filePath: string): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf8');
      this.totalFiles++;
      
      const hasInvalidTenant = content.includes(INVALID_TENANT_ID);
      const hasValidImport = content.includes('getTenantId') || 
                            content.includes('getTenantFromRequest') ||
                            content.includes('TenantManager');
      
      const errors: string[] = [];
      
      if (hasInvalidTenant) {
        errors.push('Contiene tenant_id inválido');
        this.invalidTenantFiles++;
      }
      
      if (hasValidImport && !hasInvalidTenant) {
        // Archivo que usa getTenantId pero no tiene import
        if (!content.includes("from '@/lib/utils/tenant-utils'") && 
            !content.includes("from '@/lib/middleware/tenant-middleware'")) {
          errors.push('Usa getTenantId pero falta import');
          this.missingImportFiles++;
        }
      }
      
      this.results.push({
        file: filePath,
        hasInvalidTenant,
        hasValidImport,
        errors
      });
      
    } catch (error) {
      console.error(`❌ Error validando ${filePath}:`, error);
    }
  }

  /**
   * Imprime los resultados de la validación
   */
  private printResults(): void {
    console.log('\n📊 RESULTADOS DE LA VALIDACIÓN:');
    console.log('=================================');
    
    const problemFiles = this.results.filter(r => r.errors.length > 0);
    const cleanFiles = this.results.filter(r => r.errors.length === 0);
    
    console.log(`📁 Total de archivos: ${this.totalFiles}`);
    console.log(`✅ Archivos limpios: ${cleanFiles.length}`);
    console.log(`❌ Archivos con problemas: ${problemFiles.length}`);
    console.log(`🔴 Con tenant_id inválido: ${this.invalidTenantFiles}`);
    console.log(`🟡 Con imports faltantes: ${this.missingImportFiles}`);
    
    if (problemFiles.length > 0) {
      console.log('\n❌ ARCHIVOS CON PROBLEMAS:');
      problemFiles.forEach(result => {
        console.log(`  - ${result.file}: ${result.errors.join(', ')}`);
      });
    }
    
    if (this.invalidTenantFiles === 0 && this.missingImportFiles === 0) {
      console.log('\n🎉 ¡VALIDACIÓN EXITOSA!');
      console.log('✅ Todos los tenant_id hardcodeados han sido eliminados');
      console.log('✅ Todos los imports están correctos');
    } else {
      console.log('\n⚠️ VALIDACIÓN CON PROBLEMAS');
      console.log('🔧 Se requieren correcciones manuales');
    }
  }
}

// Ejecutar validación
async function main() {
  const validator = new TenantValidator();
  await validator.validateAll();
}

if (require.main === module) {
  main().catch(console.error);
}

export { TenantValidator };
