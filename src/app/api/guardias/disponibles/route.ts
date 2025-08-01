import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Obtener guardias que NO tienen asignación activa
    const result = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo,
        g.rut,
        g.email,
        g.telefono,
        g.activo,
        g.comuna,
        g.region
      FROM guardias g
      WHERE g.activo = true
        AND g.id NOT IN (
          SELECT DISTINCT ta.guardia_id 
          FROM as_turnos_asignaciones ta 
          WHERE ta.estado = 'Activa'
        )
      ORDER BY g.apellido_paterno, g.apellido_materno, g.nombre
    `);

    return NextResponse.json({ 
      success: true, 
      guardias: result.rows 
    });
  } catch (error) {
    console.error('Error obteniendo guardias disponibles:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 