import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const { guardia_id, ppc_id } = await request.json();

    if (!guardia_id || !ppc_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: guardia_id y ppc_id' },
        { status: 400 }
      );
    }

    // Verificar que el PPC existe y está pendiente
    const ppcCheck = await query(`
      SELECT 
        ppc.id,
        ppc.requisito_puesto_id,
        ppc.cantidad_faltante,
        ppc.estado
      FROM as_turnos_ppc ppc
      WHERE ppc.id = $1 AND ppc.estado = 'Pendiente'
    `, [ppc_id]);

    if (ppcCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'PPC no encontrado o no está pendiente' },
        { status: 404 }
      );
    }

    const ppc = ppcCheck.rows[0];

    if (ppc.cantidad_faltante <= 0) {
      return NextResponse.json(
        { error: 'No hay cupos disponibles en este PPC' },
        { status: 400 }
      );
    }

    // Verificar que el guardia existe
    const guardiaCheck = await query(
      'SELECT id FROM guardias WHERE id = $1',
      [guardia_id]
    );

    if (guardiaCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    // Crear registro en as_turnos_asignaciones
    const asignacion = await query(`
      INSERT INTO as_turnos_asignaciones (
        guardia_id,
        requisito_puesto_id,
        tipo_asignacion,
        fecha_inicio,
        estado,
        observaciones
      ) VALUES ($1, $2, 'PPC', CURRENT_DATE, 'Activa', 'Asignación automática desde PPC')
      RETURNING *
    `, [guardia_id, ppc.requisito_puesto_id]);

    // Actualizar cantidad faltante en el PPC
    await query(`
      UPDATE as_turnos_ppc 
      SET cantidad_faltante = cantidad_faltante - 1
      WHERE id = $1
    `, [ppc_id]);

    // Si ya no hay cupos disponibles, actualizar estado del PPC a 'Asignado'
    if (ppc.cantidad_faltante <= 1) {
      await query(`
        UPDATE as_turnos_ppc 
        SET estado = 'Asignado',
            fecha_asignacion = NOW(),
            guardia_asignado_id = $1
        WHERE id = $2
      `, [guardia_id, ppc_id]);
    }

    return NextResponse.json({
      success: true,
      message: 'Guardia asignado correctamente al PPC',
      asignacion: asignacion.rows[0]
    });

  } catch (error) {
    console.error('Error asignando guardia al PPC:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 