import fs from 'fs';
import { execSync } from 'child_process';

function fixSyntaxErrors() {
  console.log('🔧 Corrigiendo errores de sintaxis...');
  
  try {
    // Encontrar archivos con errores de sintaxis
    const findCmd = "find src/app/api -name '*.ts' -exec grep -l 'const deny = await requireAuthz(request' {} \\;";
    const files = execSync(findCmd, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
    
    console.log(`📝 Encontrados ${files.length} archivos con errores de sintaxis`);
    
    for (const file of files) {
      console.log(`🔧 Corrigiendo ${file}`);
      
      let content = fs.readFileSync(file, 'utf8');
      
      // Corregir errores de sintaxis en parámetros de función
      content = content.replace(
        /export async function \w+\(\s*request: NextRequest,\s*\{\s*const deny = await requireAuthz\(request, \{ resource: '[^']+', action: '[^']+' \}\);\s*if \(deny\) return deny;\s*params \}: \{ params: \{ [^}]+\} \}\s*\)\s*\{/g,
        (match) => {
          // Extraer información del match
          const functionMatch = match.match(/export async function (\w+)\(/);
          const resourceMatch = match.match(/resource: '([^']+)'/);
          const actionMatch = match.match(/action: '([^']+)'/);
          const paramsMatch = match.match(/params: \{ ([^}]+) \}/);
          
          if (functionMatch && resourceMatch && actionMatch && paramsMatch) {
            const functionName = functionMatch[1];
            const resource = resourceMatch[1];
            const action = actionMatch[1];
            const params = paramsMatch[1];
            
            return `export async function ${functionName}(
  request: NextRequest,
  { params }: { params: { ${params} } }
) {
  const deny = await requireAuthz(request, { resource: '${resource}', action: '${action}' });
  if (deny) return deny;`;
          }
          return match;
        }
      );
      
      // Corregir errores donde se usa 'request' en lugar del parámetro correcto
      content = content.replace(
        /export async function \w+\(\s*req: Request\s*\)\s*\{\s*const deny = await requireAuthz\(request,/g,
        (match) => {
          return match.replace('request,', 'req,');
        }
      );
      
      fs.writeFileSync(file, content, 'utf8');
    }
    
    console.log('✅ Corrección de sintaxis completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixSyntaxErrors();
