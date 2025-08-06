import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // Verificar turnos extras con valores incorrectos
    const { rows: turnosIncorrectos } = await query(`
      SELECT 
        te.id,
        te.guardia_id,
        g.nombre || ' ' || g.apellido_paterno as guardia_nombre,
        te.instalacion_id,
        i.nombre as instalacion_nombre,
        i.valor_turno_extra as valor_instalacion,
        te.valor as valor_actual_turno,
        te.estado,
        te.pagado,
        te.created_at
      FROM turnos_extras te
      JOIN guardias g ON g.id = te.guardia_id
      JOIN instalaciones i ON i.id = te.instalacion_id
      WHERE te.valor = 0 OR te.valor IS NULL
      ORDER BY te.created_at DESC
    `);

    console.log('🔍 Turnos extras con valores incorrectos:', turnosIncorrectos.length);

    // Actualizar turnos extras con valores correctos de sus instalaciones
    const { rows: turnosActualizados } = await query(`
      UPDATE turnos_extras 
      SET 
        valor = i.valor_turno_extra,
        updated_at = NOW()
      FROM instalaciones i
      WHERE turnos_extras.instalacion_id = i.id 
        AND (turnos_extras.valor = 0 OR turnos_extras.valor IS NULL)
        AND i.valor_turno_extra IS NOT NULL 
        AND i.valor_turno_extra > 0
      RETURNING turnos_extras.*
    `);

    console.log('✅ Turnos extras actualizados:', turnosActualizados.length);

    // Verificar instalaciones con valores de turno extra
    const { rows: instalacionesConValores } = await query(`
      SELECT 
        id,
        nombre,
        valor_turno_extra,
        updated_at
      FROM instalaciones 
      WHERE valor_turno_extra IS NOT NULL AND valor_turno_extra > 0
      ORDER BY nombre
    `);

    // Resumen de turnos extras por instalación
    const { rows: resumenPorInstalacion } = await query(`
      SELECT 
        i.nombre as instalacion_nombre,
        i.valor_turno_extra as valor_instalacion,
        COUNT(te.id) as total_turnos,
        SUM(te.valor) as monto_total,
        AVG(te.valor) as promedio_valor
      FROM instalaciones i
      LEFT JOIN turnos_extras te ON i.id = te.instalacion_id
      WHERE i.valor_turno_extra IS NOT NULL AND i.valor_turno_extra > 0
      GROUP BY i.id, i.nombre, i.valor_turno_extra
      ORDER BY i.nombre
    `);

    return NextResponse.json({
      ok: true,
      mensaje: `✅ ${turnosActualizados.length} turnos extras actualizados`,
      turnos_incorrectos_encontrados: turnosIncorrectos.length,
      turnos_actualizados: turnosActualizados.length,
      instalaciones_con_valores: instalacionesConValores.length,
      resumen_por_instalacion: resumenPorInstalacion,
      detalles_turnos_actualizados: turnosActualizados.map(t => ({
        id: t.id,
        guardia_id: t.guardia_id,
        instalacion_id: t.instalacion_id,
        valor_anterior: 0,
        valor_nuevo: t.valor,
        estado: t.estado,
        pagado: t.pagado
      }))
    });

  } catch (error) {
    console.error('Error al actualizar turnos extras:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 