import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Obteniendo instalaciones con turnos extras...');

    // Obtener instalaciones que tienen turnos extras (asignados o pagados)
    const result = await query(`
      SELECT DISTINCT
        i.id,
        i.nombre,
        i.direccion,
        i.ciudad,
        i.comuna,
        i.estado,
        i.valor_turno_extra,
        COUNT(te.id) as total_turnos_extras,
        COUNT(CASE WHEN te.pagado = true THEN 1 END) as turnos_pagados,
        COUNT(CASE WHEN te.pagado = false THEN 1 END) as turnos_no_pagados
      FROM instalaciones i
      INNER JOIN TE_turnos_extras te ON i.id = te.instalacion_id
      WHERE i.estado = 'Activo'
      GROUP BY i.id, i.nombre, i.direccion, i.ciudad, i.comuna, i.estado, i.valor_turno_extra
      ORDER BY i.nombre
    `);

    const instalaciones = result.rows.map((row: any) => ({
      id: row.id,
      nombre: row.nombre,
      direccion: row.direccion || '',
      ciudad: row.ciudad || '',
      comuna: row.comuna || '',
      estado: row.estado || 'Activo',
      valor_turno_extra: parseFloat(row.valor_turno_extra) || 0,
      total_turnos_extras: parseInt(row.total_turnos_extras) || 0,
      turnos_pagados: parseInt(row.turnos_pagados) || 0,
      turnos_no_pagados: parseInt(row.turnos_no_pagados) || 0
    }));

    console.log(`✅ Instalaciones con turnos extras encontradas: ${instalaciones.length}`);

    return NextResponse.json({
      success: true,
      instalaciones
    });

  } catch (error) {
    console.error('❌ Error obteniendo instalaciones con turnos extras:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 