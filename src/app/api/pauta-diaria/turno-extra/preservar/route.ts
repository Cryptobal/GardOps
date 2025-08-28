import { query } from '@/lib/database';
import { NextResponse } from 'next/server';
import { logCRUD } from '@/lib/logging';

export async function POST(req: Request) {
  try {
    const { turno_extra_id, usuario_pago, observaciones_pago } = await req.json();

    // Validar parámetros requeridos
    if (!turno_extra_id) {
      return NextResponse.json(
        { error: 'Se requiere turno_extra_id' },
        { status: 400 }
      );
    }

    // Verificar que el turno extra existe y no está preservado
    const { rows: turnoRows } = await query(
      `SELECT id, guardia_id, instalacion_id, puesto_id, fecha, estado, valor, pagado, preservado, turno_original_id
       FROM te_turnos_extras 
       WHERE id = $1`,
      [turno_extra_id]
    );

    if (turnoRows.length === 0) {
      return NextResponse.json(
        { error: 'Turno extra no encontrado' },
        { status: 404 }
      );
    }

    const turno = turnoRows[0];

    if (turno.preservado) {
      return NextResponse.json(
        { error: 'El turno extra ya está preservado' },
        { status: 400 }
      );
    }

    // Marcar como preservado y actualizar información de pago
    const { rows: updateRows } = await query(
      `UPDATE te_turnos_extras 
       SET preservado = true,
           pagado = true,
           fecha_pago = CURRENT_DATE,
           usuario_pago = $1,
           observaciones_pago = $2,
           desacoplado_en = NOW(),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, preservado, pagado, fecha_pago`,
      [usuario_pago || 'admin@test.com', observaciones_pago, turno_extra_id]
    );

    // Log de la operación
    await logCRUD(
      'turnos_extras',
      turno_extra_id,
      'UPDATE',
      usuario_pago || 'admin@test.com',
      {
        pagado: turno.pagado,
        preservado: turno.preservado
      },
      {
        pagado: true,
        preservado: true,
        fecha_pago: updateRows[0].fecha_pago,
        usuario_pago: usuario_pago || 'admin@test.com',
        observaciones_pago,
        desacoplado_en: new Date()
      },
      'accebf8a-bacc-41fa-9601-ed39cb320a52'
    );

    return NextResponse.json({
      ok: true,
      mensaje: 'Turno extra marcado como preservado y pagado',
      turno_extra_id,
      preservado: true,
      pagado: true,
      fecha_pago: updateRows[0].fecha_pago
    });

  } catch (error) {
    console.error('Error al preservar turno extra:', error);
    
    await logCRUD(
      'turnos_extras',
      'error',
      'UPDATE',
      'admin@test.com',
      null,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: '/api/pauta-diaria/turno-extra/preservar',
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

// GET - Obtener información de preservación de un turno extra
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const turno_extra_id = searchParams.get('turno_extra_id');

    if (!turno_extra_id) {
      return NextResponse.json(
        { error: 'Se requiere turno_extra_id' },
        { status: 400 }
      );
    }

    const { rows: turnoRows } = await query(
      `SELECT id, guardia_id, instalacion_id, puesto_id, fecha, estado, valor, 
              pagado, preservado, turno_original_id, desacoplado_en,
              fecha_pago, usuario_pago, observaciones_pago
       FROM te_turnos_extras 
       WHERE id = $1`,
      [turno_extra_id]
    );

    if (turnoRows.length === 0) {
      return NextResponse.json(
        { error: 'Turno extra no encontrado' },
        { status: 404 }
      );
    }

    const turno = turnoRows[0];

    return NextResponse.json({
      ok: true,
      turno_extra: {
        id: turno.id,
        guardia_id: turno.guardia_id,
        instalacion_id: turno.instalacion_id,
        puesto_id: turno.puesto_id,
        fecha: turno.fecha,
        estado: turno.estado,
        valor: turno.valor,
        pagado: turno.pagado,
        preservado: turno.preservado,
        turno_original_id: turno.turno_original_id,
        desacoplado_en: turno.desacoplado_en,
        fecha_pago: turno.fecha_pago,
        usuario_pago: turno.usuario_pago,
        observaciones_pago: turno.observaciones_pago
      }
    });

  } catch (error) {
    console.error('Error al obtener información de preservación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
