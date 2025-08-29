import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

async function fixRbacErrors() {
  console.log('🔧 Corrigiendo errores de RBAC generados por codemod...');
  
  // Buscar todos los archivos de API con errores
  const apiFiles = await glob('src/app/api/**/*.ts', { absolute: true });
  
  let fixedFiles = 0;
  
  for (const filePath of apiFiles) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Patrón para encontrar múltiples gates duplicados
    const duplicatePattern = /const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '[^']+', action: '[^']+' \}\);\s*if \(deny\) return deny;\s*/g;
    
    // Encontrar todos los matches
    const matches = content.match(duplicatePattern);
    
    if (matches && matches.length > 1) {
      console.log(`📝 Corrigiendo ${filePath}`);
      
      // Para cada método HTTP, mantener solo el primer gate apropiado
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      
      for (const method of methods) {
        const methodPattern = new RegExp(`export async function ${method}\\(request: NextRequest\\) \\{[\\s\\S]*?\\}`, 'g');
        const methodMatches = content.match(methodPattern);
        
        if (methodMatches) {
          for (const methodMatch of methodMatches) {
            // Encontrar todos los gates en este método
            const gatePattern = /const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '([^']+)', action: '([^']+)' \}\);\s*if \(deny\) return deny;\s*/g;
            const gates = [];
            let gateMatch;
            
            while ((gateMatch = gatePattern.exec(methodMatch)) !== null) {
              gates.push({
                full: gateMatch[0],
                resource: gateMatch[1],
                action: gateMatch[2]
              });
            }
            
            if (gates.length > 1) {
              // Mantener solo el primer gate apropiado para el método
              let appropriateGate = gates[0];
              
              // Determinar la acción apropiada según el método HTTP
              if (method === 'GET') {
                appropriateGate = gates.find(g => g.action === 'read:list') || gates[0];
              } else if (method === 'POST') {
                appropriateGate = gates.find(g => g.action === 'create') || gates[0];
              } else if (method === 'PUT' || method === 'PATCH') {
                appropriateGate = gates.find(g => g.action === 'update') || gates[0];
              } else if (method === 'DELETE') {
                appropriateGate = gates.find(g => g.action === 'delete') || gates[0];
              }
              
              // Reemplazar todos los gates con solo el apropiado
              let newMethodContent = methodMatch;
              for (const gate of gates) {
                if (gate === appropriateGate) {
                  // Simplificar el gate apropiado
                  const simplifiedGate = `  const deny = await requireAuthz(request, { resource: '${gate.resource}', action: '${gate.action}' });\n  if (deny) return deny;\n\n`;
                  newMethodContent = newMethodContent.replace(gate.full, simplifiedGate);
                } else {
                  // Remover gates duplicados
                  newMethodContent = newMethodContent.replace(gate.full, '');
                }
              }
              
              // Actualizar el contenido del archivo
              content = content.replace(methodMatch, newMethodContent);
              modified = true;
            }
          }
        }
      }
      
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        fixedFiles++;
      }
    }
  }
  
  console.log(`✅ Corregidos ${fixedFiles} archivos`);
}

fixRbacErrors().catch(console.error);
