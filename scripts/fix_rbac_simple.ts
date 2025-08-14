import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function fixRbacErrors() {
  console.log('🔧 Corrigiendo errores de RBAC con sed...');
  
  try {
    // Encontrar todos los archivos con errores
    const findCmd = "find src/app/api -name '*.ts' -exec grep -l 'const __req = (typeof req' {} \\;";
    const files = execSync(findCmd, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
    
    console.log(`📝 Encontrados ${files.length} archivos para corregir`);
    
    for (const file of files) {
      console.log(`🔧 Corrigiendo ${file}`);
      
      let content = fs.readFileSync(file, 'utf8');
      
      // Reemplazar múltiples gates duplicados con uno solo apropiado
      // Para GET: mantener read:list
      content = content.replace(
        /const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '[^']+', action: '[^']+' \}\);\s*if \(deny\) return deny;\s*(?:const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '[^']+', action: '[^']+' \}\);\s*if \(deny\) return deny;\s*)+/g,
        (match) => {
          // Extraer el primer gate y simplificarlo
          const firstGate = match.match(/const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '([^']+)', action: '([^']+)' \}\);\s*if \(deny\) return deny;\s*/);
          if (firstGate) {
            return `  const deny = await requireAuthz(request, { resource: '${firstGate[1]}', action: '${firstGate[2]}' });\n  if (deny) return deny;\n\n`;
          }
          return match;
        }
      );
      
      fs.writeFileSync(file, content, 'utf8');
    }
    
    console.log('✅ Corrección completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixRbacErrors();
