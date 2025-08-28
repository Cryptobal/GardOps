import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/guardias/[id] - Obtener guardia por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'guardias', action: 'read:detail' });
  if (deny) return deny;

  try {
    const ctx = (request as any).ctx as { tenantId: string; selectedTenantId?: string; isPlatformAdmin?: boolean } | undefined;
    // Solo usar selectedTenantId si es Platform Admin, sino usar el tenantId del usuario
    const tenantId = ctx?.isPlatformAdmin ? (ctx?.selectedTenantId || ctx?.tenantId) : ctx?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'TENANT_REQUIRED', code: 'TENANT_REQUIRED' }, { status: 400 });
    }

    const guardiaId = params.id;
    const result = await sql`
      SELECT * FROM guardias 
      WHERE id = ${guardiaId} AND tenant_id = ${tenantId}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error obteniendo guardia:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/guardias/[id] - Actualizar guardia
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'guardias', action: 'edit' });
  if (deny) return deny;

  try {
    const ctx = (request as any).ctx as { tenantId: string; selectedTenantId?: string; isPlatformAdmin?: boolean } | undefined;
    // Solo usar selectedTenantId si es Platform Admin, sino usar el tenantId del usuario
    const tenantId = ctx?.isPlatformAdmin ? (ctx?.selectedTenantId || ctx?.tenantId) : ctx?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'TENANT_REQUIRED', code: 'TENANT_REQUIRED' }, { status: 400 });
    }

    const guardiaId = params.id;
    const body = await request.json();
    
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

    // Verificar si ya existe otro guardia con el mismo RUT en el mismo tenant
    const existingRut = await sql`
      SELECT id FROM guardias WHERE rut = ${rut} AND tenant_id = ${tenantId} AND id != ${guardiaId}
    `;
    if (existingRut.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Ya existe otro guardia con ese RUT en este tenant' },
        { status: 409 }
      );
    }

    // Verificar si ya existe otro guardia con el mismo email en el mismo tenant
    const existingEmail = await sql`
      SELECT id FROM guardias WHERE email = ${email} AND tenant_id = ${tenantId} AND id != ${guardiaId}
    `;
    if (existingEmail.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Ya existe otro guardia con ese email en este tenant' },
        { status: 409 }
      );
    }

    // Validar que tipo_cuenta tenga un valor válido según la restricción de la base de datos
    const tiposCuentaValidos = ['CCT', 'CTE', 'CTA', 'RUT'];
    const tipoCuentaValidado = tipo_cuenta && tiposCuentaValidos.includes(tipo_cuenta) ? tipo_cuenta : null;
    
    const result = await sql`
      UPDATE guardias 
      SET 
        nombre = ${nombre},
        apellido_paterno = ${apellido_paterno || ''},
        apellido_materno = ${apellido_materno || ''},
        rut = ${rut},
        email = ${email},
        telefono = ${telefono},
        direccion = ${direccion || null},
        ciudad = ${ciudad || null},
        comuna = ${comuna || null},
        region = ${region || null},
        latitud = ${latitud || null},
        longitud = ${longitud || null},
        nacionalidad = ${nacionalidad || null},
        sexo = ${sexo || null},
        fecha_os10 = ${fecha_os10 || null},
        tipo_guardia = ${tipo_guardia || 'contratado'},
        activo = ${activo !== false},
        instalacion_id = ${instalacion_id || null},
        banco = ${banco || null},
        tipo_cuenta = ${tipoCuentaValidado},
        numero_cuenta = ${numero_cuenta || null},
        updated_at = NOW()
      WHERE id = ${guardiaId} AND tenant_id = ${tenantId} 
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error actualizando guardia:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/guardias/[id] - Eliminar guardia
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'guardias', action: 'delete' });
  if (deny) return deny;

  try {
    const ctx = (request as any).ctx as { tenantId: string; selectedTenantId?: string; isPlatformAdmin?: boolean } | undefined;
    // Solo usar selectedTenantId si es Platform Admin, sino usar el tenantId del usuario
    const tenantId = ctx?.isPlatformAdmin ? (ctx?.selectedTenantId || ctx?.tenantId) : ctx?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'TENANT_REQUIRED', code: 'TENANT_REQUIRED' }, { status: 400 });
    }

    const guardiaId = params.id;
    const result = await sql`
      DELETE FROM guardias 
      WHERE id = ${guardiaId} AND tenant_id = ${tenantId} 
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error eliminando guardia:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}