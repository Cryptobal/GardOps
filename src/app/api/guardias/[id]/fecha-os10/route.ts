import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../../lib/database';
import { logCRUD } from '@/lib/logging';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';

// PUT /api/guardias/[id]/fecha-os10 - Actualizar fecha de OS10
export async function PUT(
  request: NextRequest,
  {

 params }: { params: { id: string } }
) {
  console.log('🔍 API Guardias - Actualizando fecha OS10:', params.id);
  
  try {
    // Permisos: admin o guardias.edit / rbac.platform_admin
    const email = await getUserEmail(request);
    if (!email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const userId = await getUserIdByEmail(email);
    if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    let allowed = false;
    try {
      const { getCurrentUserServer } = await import('@/lib/auth');
      const u = getCurrentUserServer(request as any);
      allowed = u?.rol === 'admin';
    } catch {}
    if (!allowed) {
      allowed = (await userHasPerm(userId, 'guardias.edit')) || (await userHasPerm(userId, 'rbac.platform_admin'));
    }
    if (!allowed) return NextResponse.json({ error: 'forbidden', perm: 'guardias.edit' }, { status: 403 });

    const guardiaId = params.id;
    const body = await request.json();
    
    // Por ahora usar un tenant_id fijo para testing
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';
    const usuario = 'admin@test.com';
    
    console.log('✅ API Guardias - Actualizando fecha OS10 con datos:', body);

    // Verificar que se proporcione la fecha
    if (!body.fecha_os10) {
      return NextResponse.json(
        { error: 'Fecha de OS10 requerida' },
        { status: 400 }
      );
    }

    // Obtener datos anteriores para el log
    const oldDataResult = await query(`
      SELECT * FROM guardias WHERE id = $1 AND tenant_id = $2
    `, [guardiaId, tenantId]);

    if (oldDataResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    const datosAnteriores = oldDataResult.rows[0];

    // Query para actualizar la fecha de OS10
    const result = await query(`
      UPDATE guardias 
      SET 
        fecha_os10 = $1,
        updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `, [body.fecha_os10, guardiaId, tenantId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    const guardiaActualizado = result.rows[0];
    console.log('✅ Fecha de OS10 actualizada exitosamente');

    // Log de actualización
    await logCRUD(
      'guardias',
      guardiaId,
      'UPDATE',
      usuario,
      datosAnteriores,
      guardiaActualizado,
      tenantId
    );

    // Formatear la respuesta
    const guardiaFormateado = {
      id: guardiaActualizado.id,
      nombre: guardiaActualizado.nombre,
      apellidos: `${guardiaActualizado.apellido_paterno} ${guardiaActualizado.apellido_materno}`.trim(),
      fecha_os10: guardiaActualizado.fecha_os10,
      updated_at: guardiaActualizado.updated_at
    };

    return NextResponse.json({
      guardia: guardiaFormateado,
      success: true
    });

  } catch (error) {
    console.error('❌ Error actualizando fecha de OS10:', error);
    
    // Log del error
    await logCRUD(
      'guardias',
      params.id,
      'UPDATE',
      'admin@test.com',
      null,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: '/api/guardias/[id]/fecha-os10',
        method: 'PUT'
      },
      'accebf8a-bacc-41fa-9601-ed39cb320a52'
    );
    
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
