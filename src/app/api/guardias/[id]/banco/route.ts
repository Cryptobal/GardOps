import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logCRUD } from '@/lib/logging';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guardiaId = params.id;
    
    const result = await query(`
      SELECT 
        g.id,
        g.banco,
        g.tipo_cuenta,
        g.numero_cuenta,
        b.nombre as banco_nombre
      FROM guardias g
      LEFT JOIN bancos b ON g.banco = b.id
      WHERE g.id = $1
    `, [guardiaId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    logger.error('Error obteniendo datos bancarios::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { banco_id, tipo_cuenta, numero_cuenta } = await request.json();

    // Por ahora usar un tenant_id fijo para testing
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';
    const usuario = 'admin@test.com';

    // Validar datos
    if (!numero_cuenta) {
      return NextResponse.json(
        { error: 'El número de cuenta es requerido' },
        { status: 400 }
      );
    }

    if (!tipo_cuenta) {
      return NextResponse.json(
        { error: 'El tipo de cuenta es requerido' },
        { status: 400 }
      );
    }

    // Obtener datos anteriores para el log
    const oldDataResult = await query(`
      SELECT banco, tipo_cuenta, numero_cuenta FROM guardias WHERE id = $1
    `, [guardiaId]);

    if (oldDataResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    const datosAnteriores = oldDataResult.rows[0];

    // Actualizar datos bancarios
    const result = await query(`
      UPDATE guardias 
      SET 
        banco = $1,
        tipo_cuenta = $2,
        numero_cuenta = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, banco, tipo_cuenta, numero_cuenta
    `, [banco_id || null, tipo_cuenta, numero_cuenta, guardiaId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    const datosNuevos = result.rows[0];

    // Registrar log de actualización
    await logCRUD(
      'guardias',
      guardiaId,
      'UPDATE',
      usuario,
      datosAnteriores,
      datosNuevos,
      tenantId,
      'api',
      {
        contexto: 'Actualización de datos bancarios',
        campos_modificados: {
          banco: banco_id || null,
          tipo_cuenta,
          numero_cuenta
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Datos bancarios actualizados correctamente',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error actualizando datos bancarios::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 