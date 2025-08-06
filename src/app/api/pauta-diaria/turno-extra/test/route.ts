import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Verificar si la tabla existe y tiene datos
    const { rows: countRows } = await query('SELECT COUNT(*) as total FROM turnos_extras');
    const totalTurnos = countRows[0]?.total || 0;

    // Obtener algunos registros de ejemplo
    const { rows: sampleRows } = await query(`
      SELECT 
        te.id,
        te.guardia_id,
        te.instalacion_id,
        te.puesto_id,
        te.fecha,
        te.estado,
        te.valor,
        te.pagado,
        te.planilla_id,
        te.created_at,
        g.nombre as guardia_nombre,
        g.apellido_paterno as guardia_apellido_paterno,
        i.nombre as instalacion_nombre
      FROM turnos_extras te
      LEFT JOIN guardias g ON te.guardia_id = g.id
      LEFT JOIN instalaciones i ON te.instalacion_id = i.id
      ORDER BY te.created_at DESC
      LIMIT 5
    `);

    // Verificar la estructura de la tabla
    const { rows: structureRows } = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'turnos_extras'
      ORDER BY ordinal_position
    `);

    return NextResponse.json({
      success: true,
      total_turnos: totalTurnos,
      muestra_datos: sampleRows,
      estructura_tabla: structureRows,
      mensaje: totalTurnos > 0 ? 'Hay datos disponibles' : 'No hay datos en la tabla'
    });

  } catch (error) {
    console.error('❌ Error en test de turnos extras:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al verificar datos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 