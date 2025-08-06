import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUserServer } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Iniciando GET /api/pauta-diaria/turno-extra/planillas');
    
    const user = getCurrentUserServer(request);
    if (!user) {
      console.log('❌ Usuario no autorizado');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener todas las planillas con cálculos dinámicos
    const planillas = await query(`
      SELECT 
        p.id,
        p.fecha_generacion as fecha_creacion,
        COUNT(te.id) as cantidad_turnos,
        COALESCE(SUM(te.valor), 0) as monto_total,
        p.observaciones,
        u.nombre || ' ' || u.apellido as usuario_creador,
        p.estado,
        p.codigo,
        ARRAY_AGG(te.id) as turnos_ids
      FROM TE_planillas_turnos_extras p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN TE_turnos_extras te ON te.planilla_id = p.id
      GROUP BY p.id, p.fecha_generacion, p.observaciones, u.nombre, u.apellido, p.estado, p.codigo
      ORDER BY p.fecha_generacion DESC
    `);

    console.log('🔍 Planillas obtenidas:', planillas.rows.length);

    return NextResponse.json({
      success: true,
      planillas: planillas.rows
    });

  } catch (error) {
    console.error('Error obteniendo planillas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 