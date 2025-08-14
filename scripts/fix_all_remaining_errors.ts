import fs from 'fs';
import { execSync } from 'child_process';

function fixAllRemainingErrors() {
  console.log('🔧 Corrigiendo TODOS los errores restantes...');
  
  try {
    // Encontrar todos los archivos de API que pueden tener errores
    const findCmd = "find src/app/api -name '*.ts' -o -name '*.tsx'";
    const files = execSync(findCmd, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
    
    console.log(`📝 Encontrados ${files.length} archivos de API para verificar`);
    
    for (const file of files) {
      console.log(`🔧 Verificando ${file}`);
      
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;
      
      // 1. Corregir errores de sintaxis en parámetros de función
      const functionPattern = /export async function \w+\(\s*request: NextRequest,\s*\{\s*const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '[^']+', action: '[^']+' \}\);\s*if \(deny\) return deny;\s*params \}: \{ params: \{ [^}]+\} \}\s*\)\s*\{/g;
      
      if (functionPattern.test(content)) {
        console.log(`🔧 Corrigiendo sintaxis de función en ${file}`);
        content = content.replace(
          /export async function (\w+)\(\s*request: NextRequest,\s*\{\s*const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '([^']+)', action: '([^']+)' \}\);\s*if \(deny\) return deny;\s*params \}: \{ params: \{ ([^}]+) \}\s*\)\s*\{/g,
          (match, funcName, resource, action, params) => {
            return `export async function ${funcName}(
  request: NextRequest,
  { params }: { params: { ${params} } }
) {
  const deny = await requireAuthz(request, { resource: '${resource}', action: '${action}' });
  if (deny) return deny;`;
          }
        );
        modified = true;
      }
      
      // 2. Corregir variables duplicadas __req y deny
      const duplicatePattern = /const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '[^']+', action: '[^']+' \}\);\s*if \(deny\) return deny;\s*(?:const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '[^']+', action: '[^']+' \}\);\s*if \(deny\) return deny;\s*)+/g;
      
      if (duplicatePattern.test(content)) {
        console.log(`🔧 Corrigiendo variables duplicadas en ${file}`);
        content = content.replace(
          /const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '([^']+)', action: '([^']+)' \}\);\s*if \(deny\) return deny;\s*(?:const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '[^']+', action: '[^']+' \}\);\s*if \(deny\) return deny;\s*)+/g,
          (match, resource, action) => {
            return `  const deny = await requireAuthz(request, { resource: '${resource}', action: '${action}' });
  if (deny) return deny;

`;
          }
        );
        modified = true;
      }
      
      // 3. Corregir requireAuthz(req, ...) a requireAuthz(request, ...)
      content = content.replace(
        /requireAuthz\(req, \{ resource: '([^']+)', action: '([^']+)' \}\)/g,
        (match, resource, action) => {
          return `requireAuthz(request, { resource: '${resource}', action: '${action}' })`;
        }
      );
      
      // 4. Corregir requireAuthz(__req as any, ...) a requireAuthz(request, ...)
      content = content.replace(
        /requireAuthz\(__req as any, \{ resource: '([^']+)', action: '([^']+)' \}\)/g,
        (match, resource, action) => {
          return `requireAuthz(request, { resource: '${resource}', action: '${action}' })`;
        }
      );
      
      // 5. Remover líneas __req individuales que quedaron
      content = content.replace(
        /^\s*const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*$/gm,
        ''
      );
      
      // 6. Remover líneas deny individuales que quedaron
      content = content.replace(
        /^\s*const deny = await requireAuthz\(request, \{ resource: '[^']+', action: '[^']+' \}\);\s*if \(deny\) return deny;\s*$/gm,
        ''
      );
      
      // 7. Limpiar líneas en blanco múltiples
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
      
      if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`✅ Corregido ${file}`);
      }
    }
    
    console.log('✅ Corrección de errores completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAllRemainingErrors();
