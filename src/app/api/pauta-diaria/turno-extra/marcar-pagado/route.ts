import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logCRUD } from '@/lib/logging';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    const { turno_ids, observaciones } = await request.json();

    // Validar parámetros requeridos
    if (!turno_ids || !Array.isArray(turno_ids) || turno_ids.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos un turno_id válido' },
        { status: 400 }
      );
    }

    // Por ahora usar un tenant_id fijo para testing
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';
    const usuario = 'admin@test.com'; // En producción, obtener del token de autenticación

    // Verificar que todos los turnos existan y no estén pagados
    const { rows: turnosExistentes } = await query(`
      SELECT id, pagado, preservado, valor, guardia_id, instalacion_id, puesto_id, fecha, estado
      FROM turnos_extras 
      WHERE id = ANY($1)
    `, [turno_ids]);

    if (turnosExistentes.length !== turno_ids.length) {
      return NextResponse.json(
        { error: 'Algunos turnos no existen' },
        { status: 404 }
      );
    }

    const turnosYaPagados = turnosExistentes.filter(t => t.pagado);
    if (turnosYaPagados.length > 0) {
      return NextResponse.json(
        { error: `Los siguientes turnos ya están pagados: ${turnosYaPagados.map(t => t.id).join(', ')}` },
        { status: 400 }
      );
    }

    // Marcar turnos como pagados y preservarlos
    const fechaPago = new Date().toISOString().split('T')[0];
    
    const { rows: turnosActualizados } = await query(`
      UPDATE turnos_extras 
      SET 
        pagado = true,
        preservado = true,
        fecha_pago = $1,
        observaciones_pago = $2,
        usuario_pago = $3,
        desacoplado_en = NOW(),
        updated_at = NOW()
      WHERE id = ANY($4)
      RETURNING *
    `, [fechaPago, observaciones || null, usuario, turno_ids]);

    // Log de la operación
    for (const turno of turnosActualizados) {
      await logCRUD(
        'turnos_extras',
        turno.id,
        'UPDATE',
        usuario,
        { pagado: false, fecha_pago: null, observaciones_pago: null, usuario_pago: null },
        { 
          pagado: true, 
          fecha_pago: fechaPago, 
          observaciones_pago: observaciones || null, 
          usuario_pago: usuario 
        },
        tenantId
      );
    }

    const montoTotal = turnosActualizados.reduce((sum, t) => sum + Number(t.valor), 0);

    logger.debug(`✅ ${turnosActualizados.length} turnos marcados como pagados. Monto total: $${montoTotal}`);

    return NextResponse.json({
      ok: true,
      mensaje: `${turnosActualizados.length} turno(s) marcado(s) como pagado(s)`,
      monto_total: montoTotal,
      fecha_pago: fechaPago,
      turnos_procesados: turnosActualizados.length
    });

  } catch (error) {
    logger.error('Error al marcar turnos como pagados::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 