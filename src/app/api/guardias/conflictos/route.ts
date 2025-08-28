import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    // Obtener guardias con conflictos (múltiples asignaciones activas)
    // Migrado al nuevo modelo as_turnos_puestos_operativos
    const conflictos = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        COUNT(po.id) as asignaciones_activas,
        STRING_AGG(DISTINCT i.nombre, ', ') as instalaciones_asignadas
      FROM guardias g
      INNER JOIN as_turnos_puestos_operativos po ON g.id = po.guardia_id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE po.es_ppc = false
        AND g.activo = true
      GROUP BY g.id, g.nombre, g.apellido_paterno, g.apellido_materno
      HAVING COUNT(po.id) > 1
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