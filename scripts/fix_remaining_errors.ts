import fs from 'fs';
import { execSync } from 'child_process';

function fixRemainingErrors() {
  console.log('🔧 Corrigiendo errores restantes...');
  
  try {
    // Encontrar archivos que aún tienen el patrón problemático
    const findCmd = "find src/app/api -name '*.ts' -exec grep -l 'const __req = (typeof req' {} \\;";
    const files = execSync(findCmd, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
    
    console.log(`📝 Encontrados ${files.length} archivos con errores restantes`);
    
    for (const file of files) {
      console.log(`🔧 Corrigiendo ${file}`);
      
      let content = fs.readFileSync(file, 'utf8');
      
      // Corregir el patrón problemático específico
      content = content.replace(
        /const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '[^']+', action: '[^']+' \}\);\s*if \(deny\) return deny;\s*(?:const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '[^']+', action: '[^']+' \}\);\s*if \(deny\) return deny;\s*)+/g,
        (match) => {
          // Extraer el primer gate para simplificar
          const firstGate = match.match(/const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '([^']+)', action: '([^']+)' \}\);\s*if \(deny\) return deny;\s*/);
          if (firstGate) {
            return `  const deny = await requireAuthz(request, { resource: '${firstGate[1]}', action: '${firstGate[2]}' });\n  if (deny) return deny;\n\n`;
          }
          return match;
        }
      );
      
      // Corregir archivos que usan 'req' en lugar de 'request'
      content = content.replace(
        /const deny = await requireAuthz\(req, \{ resource: '([^']+)', action: '([^']+)' \}\);/g,
        (match, resource, action) => {
          return `const deny = await requireAuthz(req, { resource: '${resource}', action: '${action}' });`;
        }
      );
      
      fs.writeFileSync(file, content, 'utf8');
    }
    
    console.log('✅ Corrección de errores restantes completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixRemainingErrors();
