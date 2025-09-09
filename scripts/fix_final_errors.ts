import fs from 'fs';
import { execSync } from 'child_process';

function fixFinalErrors() {
  console.log('🔧 Corrigiendo TODOS los errores finales...');
  
  try {
    // 1. Corregir authz-ui.ts - recrear completamente
    console.log('🔧 Recreando authz-ui.tsx...');
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
}
`;
    
    // Eliminar archivo .ts si existe
    if (fs.existsSync('src/lib/authz-ui.ts')) {
      fs.unlinkSync('src/lib/authz-ui.ts');
    }
    
    // Crear archivo .tsx
    fs.writeFileSync('src/lib/authz-ui.tsx', authzContent, 'utf8');
    
    // 2. Corregir directiva 'use client' en todos los archivos
    console.log('🔧 Corrigiendo directiva use client...');
    const findCmd = "find src -name '*.tsx' -exec grep -l \"'use client'\" {} \\;";
    const files = execSync(findCmd, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
    
    for (const file of files) {
      let content = fs.readFileSync(file, 'utf8');
      
      // Si 'use client' está después de imports, moverlo al principio
      if (content.includes("import") && content.indexOf("'use client'") > content.indexOf("import")) {
        content = content.replace("'use client';", "");
        content = "'use client';\n\n" + content;
        fs.writeFileSync(file, content, 'utf8');
        console.log(`✅ Corregido: ${file}`);
      }
    }
    
    // 3. Corregir variables duplicadas en archivos de API
    console.log('🔧 Corrigiendo variables duplicadas en API...');
    const apiFiles = execSync("find src/app/api -name '*.ts' -o -name '*.tsx'", { encoding: 'utf8' }).trim().split('\n').filter(f => f);
    
    for (const file of apiFiles) {
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;
      
      // Corregir errores de sintaxis en parámetros de función
      content = content.replace(
        /export async function \w+\(\s*request: NextRequest,\s*\{\s*const deny = await requireAuthz\(request, \{ resource: '[^']+', action: '[^']+' \}\);\s*if \(deny\) return deny;\s*params \}: \{ params: \{ [^}]+\} \}\s*\)\s*\{/g,
        (match) => {
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
        }
      );
      
      // Eliminar variables duplicadas __req y deny
      content = content.replace(
        /const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '[^']+', action: '[^']+' \}\);\s*if \(deny\) return deny;\s*(?:const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '[^']+', action: '[^']+' \}\);\s*if \(deny\) return deny;\s*)+/g,
        (match) => {
          const firstGate = match.match(/const __req = \(typeof req!== 'undefined' \? req : \(typeof request !== 'undefined' \? request : \(arguments as any\)\[0\]\)\);\s*const deny = await requireAuthz\(__req as any, \{ resource: '([^']+)', action: '([^']+)' \}\);\s*if \(deny\) return deny;\s*/);
          if (firstGate) {
            modified = true;
            return `  const deny = await requireAuthz(request, { resource: '${firstGate[1]}', action: '${firstGate[2]}' });
  if (deny) return deny;

`;
          }
          return match;
        }
      );
      
      // Corregir requireAuthz(req, ...) a requireAuthz(request, ...)
      content = content.replace(
        /const deny = await requireAuthz\(req, \{ resource: '([^']+)', action: '([^']+)' \}\);/g,
        (match, resource, action) => {
          modified = true;
          return `const deny = await requireAuthz(request, { resource: '${resource}', action: '${action}' });`;
        }
      );
      
      if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`✅ Corregido: ${file}`);
      }
    }
    
    // 4. Corregir archivos específicos problemáticos
    console.log('🔧 Corrigiendo archivos específicos...');
    
    // Corregir clientes/[id]/route.ts
    const clientesIdContent = `import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz';
import { db } from '@/lib/db';

// GET /api/clientes/[id] - Obtener cliente por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'clientes', action: 'read:detail' });
  if (deny) return deny;

  try {
    const clienteId = params.id;
    const result = await db.query(
      'SELECT * FROM clientes WHERE id = $1',
      [clienteId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/clientes/[id] - Actualizar cliente
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'clientes', action: 'update' });
  if (deny) return deny;

  try {
    const clienteId = params.id;
    const body = await request.json();
    
    const { nombre, email, telefono, direccion, activo } = body;
    
    const updateResult = await db.query(
      'UPDATE clientes SET nombre = $1, email = $2, telefono = $3, direccion = $4, activo = $5, updated_at = NOW() WHERE id = $6 RETURNING *',
      [nombre, email, telefono, direccion, activo, clienteId]
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/clientes/[id] - Eliminar cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'clientes', action: 'delete' });
  if (deny) return deny;

  try {
    const clienteId = params.id;
    
    const deleteResult = await db.query(
      'DELETE FROM clientes WHERE id = $1 RETURNING *',
      [clienteId]
    );

    if (deleteResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cliente eliminado correctamente',
    });
  } catch (error) {
    console.error('Error eliminando cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}`;
    
    fs.writeFileSync('src/app/api/clientes/[id]/route.ts', clientesIdContent, 'utf8');
    console.log('✅ Corregido: src/app/api/clientes/[id]/route.ts');
    
    console.log('🎉 ¡Todos los errores corregidos exitosamente!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixFinalErrors();
