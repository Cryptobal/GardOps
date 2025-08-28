import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { sql } from '@/lib/db';

// GET /api/guardias - Obtener lista de guardias
export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'guardias', action: 'read:list' });
  if (deny) return deny;

  try {
    const result = await sql`SELECT * FROM guardias WHERE activo = true ORDER BY apellido_paterno, apellido_materno, nombre`;

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error obteniendo guardias:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/guardias - Crear nuevo guardia
export async function POST(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'guardias', action: 'create' });
  if (deny) return deny;

  try {
    const body = await request.json();
    const ctx = (request as any).ctx as { tenantId?: string; selectedTenantId?: string; isPlatformAdmin?: boolean } | undefined;
    // Solo usar selectedTenantId si es Platform Admin, sino usar el tenantId del usuario
    const tenantId = ctx?.isPlatformAdmin ? (ctx?.selectedTenantId || ctx?.tenantId) : ctx?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'TENANT_REQUIRED', code: 'TENANT_REQUIRED' }, { status: 400 });
    }

    const {
      nombre,
      apellido_paterno,
      apellido_materno,
      rut,
      email,
      telefono,
      direccion,
      ciudad,
      comuna,
      region,
      latitud,
      longitud,
      nacionalidad,
      sexo,
      fecha_os10,
      tipo_guardia,
      activo,
      instalacion_id,
      banco,
      tipo_cuenta,
      numero_cuenta
    } = body;

    // Validar campos obligatorios
    if (!nombre || !apellido_paterno || !rut || !email || !telefono) {
      return NextResponse.json(
        { success: false, error: 'Los campos nombre, apellido paterno, RUT, email y teléfono son obligatorios' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un guardia con el mismo RUT en el mismo tenant
    const existingRut = await sql`
      SELECT id FROM guardias WHERE rut = ${rut} AND tenant_id = ${tenantId}
    `;
    if (existingRut.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un guardia con ese RUT en este tenant' },
        { status: 409 }
      );
    }

    // Verificar si ya existe un guardia con el mismo email en el mismo tenant
    const existingEmail = await sql`
      SELECT id FROM guardias WHERE email = ${email} AND tenant_id = ${tenantId}
    `;
    if (existingEmail.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un guardia con ese email en este tenant' },
        { status: 409 }
      );
    }

    // Validar que tipo_cuenta tenga un valor válido según la restricción de la base de datos
    const tiposCuentaValidos = ['CCT', 'CTE', 'CTA', 'RUT'];
    const tipoCuentaValidado = tipo_cuenta && tiposCuentaValidos.includes(tipo_cuenta) ? tipo_cuenta : null;

    const result = await sql`
      INSERT INTO guardias (
        tenant_id, nombre, apellido_paterno, apellido_materno, rut, email, telefono,
        direccion, ciudad, comuna, region, latitud, longitud, nacionalidad, sexo,
        fecha_os10, tipo_guardia, instalacion_id, banco, tipo_cuenta, numero_cuenta,
        activo, created_at, updated_at
      ) VALUES (
        ${tenantId}, ${nombre}, ${apellido_paterno || ''}, ${apellido_materno || ''}, ${rut}, ${email}, ${telefono},
        ${direccion || null}, ${ciudad || null}, ${comuna || null}, ${region || null}, 
        ${latitud || null}, ${longitud || null}, ${nacionalidad || null}, ${sexo || null},
        ${fecha_os10 || null}, ${tipo_guardia || 'contratado'}, ${instalacion_id || null}, 
        ${banco || null}, ${tipoCuentaValidado}, ${numero_cuenta || null},
        ${activo !== false}, NOW(), NOW()
      ) RETURNING *
    `;

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creando guardia:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}