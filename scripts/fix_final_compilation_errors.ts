import fs from 'fs';
import { execSync } from 'child_process';

function fixFinalCompilationErrors() {
  console.log('🔧 Arreglando errores finales de compilación...');
  
  try {
    // 1. Eliminar authz-ui.ts si existe y recrear authz-ui.tsx
    console.log('🔧 Recreando authz-ui.tsx...');
    if (fs.existsSync('src/lib/authz-ui.ts')) {
      fs.unlinkSync('src/lib/authz-ui.ts');
      console.log('✅ Eliminado: src/lib/authz-ui.ts');
    }
    
    const authzUiContent = `import React from 'react';

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
    
    fs.writeFileSync('src/lib/authz-ui.tsx', authzUiContent, 'utf8');
    console.log('✅ Creado: src/lib/authz-ui.tsx');
    
    // 2. Arreglar directiva 'use client' en todos los archivos .tsx
    console.log('🔧 Arreglando directiva "use client"...');
    const findCmd = "find src -name '*.tsx' -exec grep -l \"'use client'\" {} \\;";
    const files = execSync(findCmd, { encoding: 'utf8' }).trim().split('\\n').filter(f => f);
    
    console.log(`📝 Encontrados ${files.length} archivos con 'use client'`);
    
    for (const file of files) {
      console.log(`🔧 Verificando ${file}`);
      
      let content = fs.readFileSync(file, 'utf8');
      
      if (content.includes("import") && content.indexOf("'use client'") > content.indexOf("import")) {
        console.log(`🔧 Corrigiendo ${file}`);
        content = content.replace(/'use client';\s*\\n?/g, '');
        content = "'use client';\\n\\n" + content;
        fs.writeFileSync(file, content, 'utf8');
      }
    }
    
    // 3. Actualizar importaciones de authz-ui
    console.log('🔧 Actualizando importaciones de authz-ui...');
    const importFiles = execSync("find src -name '*.tsx' -o -name '*.ts' | xargs grep -l '@/lib/authz-ui'", { encoding: 'utf8' }).trim().split('\\n').filter(f => f);
    
    for (const file of importFiles) {
      console.log(`🔧 Actualizando ${file}`);
      let content = fs.readFileSync(file, 'utf8');
      content = content.replace(
        /from ['"]@\/lib\/authz-ui['"]/g,
        "from '@/lib/authz-ui.tsx'"
      );
      fs.writeFileSync(file, content, 'utf8');
    }
    
    // 4. Arreglar errores de variables duplicadas en API routes
    console.log('🔧 Arreglando errores de variables duplicadas...');
    const apiFiles = execSync("find src/app/api -name '*.ts' -o -name '*.tsx'", { encoding: 'utf8' }).trim().split('\\n').filter(f => f);
    
    for (const file of apiFiles) {
      console.log(`🔧 Verificando ${file}`);
      
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;
      
      // Eliminar variables duplicadas __req y deny
      const duplicatePattern = /const __req = \\(typeof req!== 'undefined' \\? req : \\(typeof request !== 'undefined' \\? request : \\(arguments as any\\)\\[0\\]\\)\\);\\s*const deny = await requireAuthz\\(__req as any, \\{ resource: '[^']+', action: '[^']+' \\}\\);\\s*if \\(deny\\) return deny;\\s*\\(?:const __req = \\(typeof req!== 'undefined' \\? req : \\(typeof request !== 'undefined' \\? request : \\(arguments as any\\)\\[0\\]\\)\\);\\s*const deny = await requireAuthz\\(__req as any, \\{ resource: '[^']+', action: '[^']+' \\}\\);\\s*if \\(deny\\) return deny;\\s*\\)+/g;
      content = content.replace(duplicatePattern, (match) => {
        const firstGate = match.match(/const __req = \\(typeof req!== 'undefined' \\? req : \\(typeof request !== 'undefined' \\? request : \\(arguments as any\\)\\[0\\]\\)\\);\\s*const deny = await requireAuthz\\(__req as any, \\{ resource: '([^']+)', action: '([^']+)' \\}\\);\\s*if \\(deny\\) return deny;\\s*/);
        if (firstGate) {
          modified = true;
          return `  const deny = await requireAuthz(request, { resource: '${firstGate[1]}', action: '${firstGate[2]}' });
  if (deny) return deny;

`;
        }
        return match;
      });
      
      // Corregir requireAuthz(req, ...) a requireAuthz(request, ...)
      content = content.replace(
        /const deny = await requireAuthz\\(req, \\{ resource: '([^']+)', action: '([^']+)' \\}\\);/g,
        (match, resource, action) => {
          modified = true;
          return `const deny = await requireAuthz(request, { resource: '${resource}', action: '${action}' });`;
        }
      );
      
      if (modified) {
        fs.writeFileSync(file, content, 'utf8');
      }
    }
    
    // 5. Arreglar archivos específicos problemáticos
    console.log('🔧 Arreglando archivos específicos...');
    
    // Arreglar src/app/api/clientes/route.ts
    const clientesContent = `import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { sql } from '@/lib/db';

// GET /api/clientes - Obtener lista de clientes
export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'clientes', action: 'read:list' });
  if (deny) return deny;

  try {
    const result = await sql\`SELECT * FROM clientes ORDER BY nombre ASC\`;

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/clientes - Crear nuevo cliente
export async function POST(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'clientes', action: 'create' });
  if (deny) return deny;

  try {
    const body = await request.json();
    const { nombre, email, telefono, direccion, activo } = body;
    
    const result = await sql\`INSERT INTO clientes (nombre, email, telefono, direccion, activo) VALUES (\${nombre}, \${email}, \${telefono}, \${direccion}, \${activo}) RETURNING *\`;

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creando cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/clientes - Actualizar cliente
export async function PUT(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'clientes', action: 'update' });
  if (deny) return deny;

  try {
    const body = await request.json();
    const { id, nombre, email, telefono, direccion, activo } = body;
    
    const result = await sql\`UPDATE clientes SET nombre = \${nombre}, email = \${email}, telefono = \${telefono}, direccion = \${direccion}, activo = \${activo} WHERE id = \${id} RETURNING *\`;

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/clientes - Eliminar cliente
export async function DELETE(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'clientes', action: 'delete' });
  if (deny) return deny;

  try {
    const body = await request.json();
    const { id } = body;
    
    const result = await sql\`DELETE FROM clientes WHERE id = \${id} RETURNING *\`;

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error eliminando cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}`;
    
    fs.writeFileSync('src/app/api/clientes/route.ts', clientesContent, 'utf8');
    console.log('✅ Corregido: src/app/api/clientes/route.ts');
    
    // Arreglar src/app/api/pauta-diaria/turno-extra/route.ts
    const turnoExtraContent = `import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { sql } from '@/lib/db';

// GET /api/pauta-diaria/turno-extra - Obtener turnos extras
export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'pauta_diaria', action: 'read:list' });
  if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const soloPagados = searchParams.get('solo_pagados');
    
    let query = \`SELECT * FROM turnos_extras\`;
    if (soloPagados === 'true') {
      query += \` WHERE pagado = true\`;
    }
    query += \` ORDER BY fecha DESC\`;
    
    const result = await sql\`\${query}\`;

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error obteniendo turnos extras:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/pauta-diaria/turno-extra - Crear turno extra
export async function POST(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'pauta_diaria', action: 'create' });
  if (deny) return deny;

  try {
    const body = await request.json();
    const { guardia_id, instalacion_id, fecha, horas, motivo, pagado } = body;
    
    const result = await sql\`INSERT INTO turnos_extras (guardia_id, instalacion_id, fecha, horas, motivo, pagado) VALUES (\${guardia_id}, \${instalacion_id}, \${fecha}, \${horas}, \${motivo}, \${pagado}) RETURNING *\`;

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creando turno extra:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}`;
    
    fs.writeFileSync('src/app/api/pauta-diaria/turno-extra/route.ts', turnoExtraContent, 'utf8');
    console.log('✅ Corregido: src/app/api/pauta-diaria/turno-extra/route.ts');
    
    // Arreglar src/app/api/clientes/[id]/route.ts
    const clientesIdContent = `import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { sql } from '@/lib/db';

// GET /api/clientes/[id] - Obtener cliente por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'clientes', action: 'read:detail' });
  if (deny) return deny;

  try {
    const clienteId = params.id;
    const result = await sql\`SELECT * FROM clientes WHERE id = \${clienteId}\`;

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

// PUT /api/clientes/[id] - Actualizar cliente por ID
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
    
    const updateResult = await sql\`UPDATE clientes SET nombre = \${nombre}, email = \${email}, telefono = \${telefono}, direccion = \${direccion}, activo = \${activo} WHERE id = \${clienteId} RETURNING *\`;

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

// DELETE /api/clientes/[id] - Eliminar cliente por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'clientes', action: 'delete' });
  if (deny) return deny;

  try {
    const clienteId = params.id;
    const result = await sql\`DELETE FROM clientes WHERE id = \${clienteId} RETURNING *\`;

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
    console.error('Error eliminando cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}`;
    
    fs.writeFileSync('src/app/api/clientes/[id]/route.ts', clientesIdContent, 'utf8');
    console.log('✅ Corregido: src/app/api/clientes/[id]/route.ts');
    
    console.log('✅ Corrección final completada');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixFinalCompilationErrors();
