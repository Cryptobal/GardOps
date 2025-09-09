import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    const perms = [
      // Home y configuración
      { clave: 'home.view', descripcion: 'Ver página de inicio', categoria: 'Navegación' },
      { clave: 'config.view', descripcion: 'Ver sección Configuración', categoria: 'Configuración' },
      { clave: 'config.tipos_documentos.view', descripcion: 'Ver Tipos de Documentos', categoria: 'Configuración' },
      { clave: 'config.roles_servicio.view', descripcion: 'Ver Roles de Servicio', categoria: 'Configuración' },
      { clave: 'config.tipos_puesto.view', descripcion: 'Ver Tipos de Puesto', categoria: 'Configuración' },
      { clave: 'config.estructuras_servicio.view', descripcion: 'Ver Estructuras de Servicio', categoria: 'Configuración' },
      { clave: 'config.variables.view', descripcion: 'Ver Variables del Sistema', categoria: 'Configuración' },
    ];

    for (const p of perms) {
      await sql`
        INSERT INTO permisos (clave, descripcion, categoria)
        VALUES (${p.clave}, ${p.descripcion}, ${p.categoria})
        ON CONFLICT (clave) DO NOTHING
      `;
    }

    const all = await sql`SELECT clave FROM permisos WHERE clave = ANY(${perms.map(p => p.clave)}) ORDER BY clave`;

    return NextResponse.json({ ok: true, createdOrExists: all.rows.map(r => r.clave) });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error:'internal', detail:String(err?.message ?? err) }, { status: 500 });
  }
}


