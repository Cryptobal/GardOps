import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    // Obtener guardias con conflictos (múltiples asignaciones activas)
    const conflictos = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        COUNT(ag.id) as asignaciones_activas,
        STRING_AGG(DISTINCT i.nombre, ', ') as instalaciones_asignadas
      FROM guardias g
      INNER JOIN as_turnos_asignaciones ag ON g.id = ag.guardia_id
      INNER JOIN as_turnos_requisitos req ON ag.requisito_puesto_id = req.id
      INNER JOIN instalaciones i ON req.instalacion_id = i.id
      WHERE ag.estado = 'Activa'
        AND ag.fecha_termino IS NULL
        AND g.estado = 'Activo'
      GROUP BY g.id, g.nombre, g.apellido_paterno, g.apellido_materno
      HAVING COUNT(ag.id) > 1
      ORDER BY asignaciones_activas DESC, g.nombre
    `);

    return NextResponse.json(conflictos.rows);

  } catch (error) {
    console.error('Error obteniendo conflictos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 