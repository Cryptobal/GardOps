import fs from 'fs';
import { execSync } from 'child_process';

function fixUltimateErrors() {
  console.log('🔧 Corrigiendo TODOS los errores finales de forma agresiva...');
  
  try {
    // 1. Eliminar archivo authz-ui.ts si existe
    if (fs.existsSync('src/lib/authz-ui.ts')) {
      fs.unlinkSync('src/lib/authz-ui.ts');
      console.log('✅ Eliminado: src/lib/authz-ui.ts');
    }
    
    // 2. Recrear authz-ui.tsx completamente
    const authzContent = `import React from 'react';

export type Action =
  | 'read:list' | 'read:detail' | 'create' | 'update' | 'delete' | 'export'
  | 'manage:roles' | 'admin:*';

export type Resource =
  | 'clientes' | 'instalaciones' | 'guardias' | 'puestos'
  | 'pauta_mensual' | 'pauta_diaria' | 'payroll' | 'configuracion';

export function can(resource: Resource, action: Action, eff: Record<string, string[]>) {
  const actions = eff[resource] || [];
  return actions.includes(action) || actions.includes('admin:*');
}

export function Authorize(
  { resource, action, eff, children }:
  { resource: Resource, action: Action, eff: Record<string, string[]>, children: React.ReactNode }
) {
  if (!can(resource, action, eff)) return null;
  return <>{children}</>;
}

export function GuardButton(
  { resource, action, eff, onClick, children, ...props }:
  { resource: Resource, action: Action, eff: Record<string, string[]>, onClick?: () => void, children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  if (!can(resource, action, eff)) {
    return <button {...props} disabled>{children}</button>;
  }
  return <button {...props} onClick={onClick}>{children}</button>;
}`;
    
    fs.writeFileSync('src/lib/authz-ui.tsx', authzContent, 'utf8');
    console.log('✅ Recreado: src/lib/authz-ui.tsx');
    
    // 3. Corregir directiva 'use client' en todos los archivos
    console.log('🔧 Corrigiendo directiva "use client"...');
    const findCmd = "find src -name '*.tsx' -exec grep -l \"'use client'\" {} \\;";
    const files = execSync(findCmd, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
    
    console.log(`📝 Encontrados ${files.length} archivos con 'use client'`);
    
    for (const file of files) {
      console.log(`🔧 Verificando ${file}`);
      
      let content = fs.readFileSync(file, 'utf8');
      
      // Verificar si 'use client' está después de imports
      if (content.includes("import") && content.indexOf("'use client'") > content.indexOf("import")) {
        console.log(`🔧 Corrigiendo ${file}`);
        
        // Remover 'use client' de su posición actual
        content = content.replace(/'use client';\s*\n?/g, '');
        
        // Agregar 'use client' al principio
        content = "'use client';\n\n" + content;
        
        fs.writeFileSync(file, content, 'utf8');
      }
    }
    
    // 4. Corregir TODOS los errores de variables duplicadas y sintaxis
    console.log('🔧 Corrigiendo errores de sintaxis y variables duplicadas...');
    const apiFiles = execSync("find src/app/api -name '*.ts' -o -name '*.tsx'", { encoding: 'utf8' }).trim().split('\n').filter(f => f);
    
    console.log(`📝 Encontrados ${apiFiles.length} archivos de API para corregir`);
    
    for (const file of apiFiles) {
      console.log(`🔧 Corrigiendo ${file}`);
      
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;
      
      // 1. Corregir errores de sintaxis en parámetros de función
      const functionPattern = /export async function \w+\(\s*request: NextRequest,\s*\{\s*const deny = await requireAuthz\(request, \{ resource: '[^']+', action: '[^']+' \}\);\s*if \(deny\) return deny;\s*params \}: \{ params: \{ [^}]+\} \}\s*\)\s*\{/g;
      content = content.replace(functionPattern, (match) => {
        const functionMatch = match.match(/export async function (\w+)\(/);
        const resourceMatch = match.match(/resource: '([^']+)'/);
        const actionMatch = match.match(/action: '([^']+)'/);
        const paramsMatch = match.match(/params: \{ ([^}]+) \}/);
        if (functionMatch && resourceMatch && actionMatch && paramsMatch) {
          const functionName = functionMatch[1];
          const resource = resourceMatch[1];
          const action = actionMatch[1];
          const params = paramsMatch[1];
          modified = true;
          return `export async function ${functionName}(
  request: NextRequest,
  { params }: { params: { ${params} } }
) {
  const deny = await requireAuthz(request, { resource: '${resource}', action: '${action}' });
  if (deny) return deny;`;
        }
        return match;
      });
      
      // 2. Eliminar variables duplicadas __req y deny
      const duplicatePattern = /const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '[^']+', action: '[^']+' \}\);\s*if \(deny\) return deny;\s*(?:const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '[^']+', action: '[^']+' \}\);\s*if \(deny\) return deny;\s*)+/g;
      content = content.replace(duplicatePattern, (match) => {
        const firstGate = match.match(/const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '([^']+)', action: '([^']+)' \}\);\s*if \(deny\) return deny;\s*/);
        if (firstGate) {
          modified = true;
          return `  const deny = await requireAuthz(request, { resource: '${firstGate[1]}', action: '${firstGate[2]}' });
  if (deny) return deny;

`;
        }
        return match;
      });
      
      // 3. Corregir requireAuthz(req, ...) a requireAuthz(request, ...)
      content = content.replace(
        /const deny = await requireAuthz\(req, \{ resource: '([^']+)', action: '([^']+)' \}\);/g,
        (match, resource, action) => {
          modified = true;
          return `const deny = await requireAuthz(request, { resource: '${resource}', action: '${action}' });`;
        }
      );
      
      if (modified) {
        fs.writeFileSync(file, content, 'utf8');
      }
    }
    
    // 5. Corregir importación de db en guardias/route.ts
    console.log('🔧 Corrigiendo importación de db en guardias...');
    const guardiasFile = 'src/app/api/guardias/route.ts';
    if (fs.existsSync(guardiasFile)) {
      let content = fs.readFileSync(guardiasFile, 'utf8');
      content = content.replace(
        /import \{ db \} from ['"]@\/lib\/db['"]/g,
        "import { pool } from '@/lib/db'"
      );
      content = content.replace(/db\./g, 'pool.');
      fs.writeFileSync(guardiasFile, content, 'utf8');
      console.log('✅ Corregida importación de db en guardias');
    }
    
    console.log('✅ Corrección final completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixUltimateErrors();
