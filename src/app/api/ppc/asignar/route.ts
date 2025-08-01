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
        rs.guardias_requeridos,
        COALESCE(asignaciones_count.count, 0) as asignaciones_count
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      LEFT JOIN (
        SELECT 
          tr_inner.rol_servicio_id,
          COUNT(*) as count
        FROM as_turnos_asignaciones ta
        INNER JOIN as_turnos_requisitos tr_inner ON ta.requisito_puesto_id = tr_inner.id
        WHERE ta.estado = 'Activa'
        GROUP BY tr_inner.rol_servicio_id
      ) asignaciones_count ON asignaciones_count.rol_servicio_id = rs.id
      WHERE ppc.id = $1 AND ppc.estado = 'Pendiente'
    `, [ppc_id]);

    if (ppcCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'PPC no encontrado o no está pendiente' },
        { status: 404 }
      );
    }

    const ppc = ppcCheck.rows[0];
    const faltantes = ppc.guardias_requeridos - ppc.asignaciones_count;

    if (faltantes <= 0) {
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
        ppc_id,
        tipo_asignacion,
        fecha_inicio,
        estado,
        observaciones
      ) VALUES ($1, $2, $3, 'PPC', CURRENT_DATE, 'Activa', 'Asignación automática desde PPC')
      RETURNING *
    `, [guardia_id, ppc.requisito_puesto_id, ppc_id]);

    // Verificar si el PPC ya queda completo
    const nuevasAsignaciones = await query(`
      SELECT COUNT(*) as count
      FROM as_turnos_asignaciones ta
      WHERE ta.requisito_puesto_id = $1 AND ta.estado = 'Activa'
    `, [ppc.requisito_puesto_id]);

    const totalAsignaciones = parseInt(nuevasAsignaciones.rows[0].count);
    
    // Si ya no hay cupos disponibles, actualizar estado del PPC
    if (totalAsignaciones >= ppc.guardias_requeridos) {
      await query(`
        UPDATE as_turnos_ppc 
        SET estado = 'Asignado',
            guardia_asignado_id = $1,
            fecha_asignacion = NOW()
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