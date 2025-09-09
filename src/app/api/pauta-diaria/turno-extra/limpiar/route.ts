import { query } from '@/lib/database';
import { NextResponse } from 'next/server';
import { logCRUD } from '@/lib/logging';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(req: Request) {
  try {
    const { turno_original_id, usuario } = await req.json();

    // Validar parámetros requeridos
    if (!turno_original_id) {
      return NextResponse.json(
        { error: 'Se requiere turno_original_id' },
        { status: 400 }
      );
    }

    // Buscar turnos extras relacionados con el turno original
    const { rows: turnosExtras } = await query(
      `SELECT id, guardia_id, instalacion_id, puesto_id, fecha, estado, valor, 
              pagado, preservado, turno_original_id, created_at
       FROM te_turnos_extras 
       WHERE turno_original_id = $1`,
      [turno_original_id]
    );

    if (turnosExtras.length === 0) {
      return NextResponse.json({
        ok: true,
        mensaje: 'No se encontraron turnos extras relacionados',
        eliminados: 0,
        preservados: 0
      });
    }

    // Separar turnos preservados y no preservados
    const turnosPreservados = turnosExtras.filter((turno: any) => turno.preservado);
    const turnosNoPreservados = turnosExtras.filter((turno: any) => !turno.preservado);

    let eliminados = 0;
    let preservados = turnosPreservados.length;

          // Eliminar solo los turnos no preservados
      if (turnosNoPreservados.length > 0) {
        const turnoIds = turnosNoPreservados.map((turno: any) => turno.id);
        
        const { rowCount } = await query(
          `DELETE FROM te_turnos_extras 
           WHERE id = ANY($1) AND preservado = false`,
          [turnoIds]
        );
      
      eliminados = rowCount;

      // Log de la operación para cada turno eliminado
      for (const turno of turnosNoPreservados) {
        await logCRUD(
          'turnos_extras',
          turno.id,
          'DELETE',
          usuario || 'admin@test.com',
          {
            guardia_id: turno.guardia_id,
            instalacion_id: turno.instalacion_id,
            puesto_id: turno.puesto_id,
            fecha: turno.fecha,
            estado: turno.estado,
            valor: turno.valor,
            pagado: turno.pagado,
            preservado: turno.preservado,
            turno_original_id: turno.turno_original_id,
            created_at: turno.created_at
          },
          null,
          'accebf8a-bacc-41fa-9601-ed39cb320a52'
        );
      }
    }

    // Log de la operación general
    await logCRUD(
      'turnos_extras',
      'limpieza_masiva',
      'DELETE',
      usuario || 'admin@test.com',
      {
        turno_original_id,
        total_turnos_encontrados: turnosExtras.length,
        turnos_preservados: preservados,
        turnos_eliminados: eliminados
      },
      null,
      'accebf8a-bacc-41fa-9601-ed39cb320a52'
    );

    return NextResponse.json({
      ok: true,
      mensaje: `Limpieza completada: ${eliminados} turnos eliminados, ${preservados} preservados`,
      detalles: {
        turno_original_id,
        total_encontrados: turnosExtras.length,
        eliminados,
        preservados,
        turnos_preservados: turnosPreservados.map((t: any) => ({
          id: t.id,
          guardia_id: t.guardia_id,
          fecha: t.fecha,
          estado: t.estado,
          valor: t.valor,
          pagado: t.pagado
        }))
      }
    });

  } catch (error) {
    logger.error('Error al limpiar turnos extras::', error);
    
    await logCRUD(
      'turnos_extras',
      'error',
      'DELETE',
      'admin@test.com',
      null,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: '/api/pauta-diaria/turno-extra/limpiar',
        method: 'POST'
      },
      'accebf8a-bacc-41fa-9601-ed39cb320a52'
    );
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET - Obtener información de turnos extras relacionados con un turno original
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const turno_original_id = searchParams.get('turno_original_id');

    if (!turno_original_id) {
      return NextResponse.json(
        { error: 'Se requiere turno_original_id' },
        { status: 400 }
      );
    }

    const { rows: turnosExtras } = await query(
      `SELECT te.id, te.guardia_id, te.instalacion_id, te.puesto_id, te.fecha, 
              te.estado, te.valor, te.pagado, te.preservado, te.turno_original_id,
              te.created_at, te.fecha_pago, te.usuario_pago, te.observaciones_pago,
              g.nombre as guardia_nombre, g.apellido_paterno as guardia_apellido,
              i.nombre as instalacion_nombre,
              po.nombre_puesto
       FROM te_turnos_extras te
       JOIN guardias g ON g.id = te.guardia_id
       JOIN instalaciones i ON i.id = te.instalacion_id
       JOIN as_turnos_puestos_operativos po ON po.id = te.puesto_id
       WHERE te.turno_original_id = $1
       ORDER BY te.created_at DESC`,
      [turno_original_id]
    );

    const turnosPreservados = turnosExtras.filter((turno: any) => turno.preservado);
    const turnosNoPreservados = turnosExtras.filter((turno: any) => !turno.preservado);

    return NextResponse.json({
      ok: true,
      turno_original_id,
      total_turnos: turnosExtras.length,
      turnos_preservados: turnosPreservados.length,
      turnos_no_preservados: turnosNoPreservados.length,
      turnos_extras: turnosExtras.map((turno: any) => ({
        id: turno.id,
        guardia_id: turno.guardia_id,
        guardia_nombre: `${turno.guardia_nombre} ${turno.guardia_apellido}`,
        instalacion_id: turno.instalacion_id,
        instalacion_nombre: turno.instalacion_nombre,
        puesto_id: turno.puesto_id,
        puesto_nombre: turno.nombre_puesto,
        fecha: turno.fecha,
        estado: turno.estado,
        valor: turno.valor,
        pagado: turno.pagado,
        preservado: turno.preservado,
        turno_original_id: turno.turno_original_id,
        created_at: turno.created_at,
        fecha_pago: turno.fecha_pago,
        usuario_pago: turno.usuario_pago,
        observaciones_pago: turno.observaciones_pago
      }))
    });

  } catch (error) {
    logger.error('Error al obtener turnos extras relacionados::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
