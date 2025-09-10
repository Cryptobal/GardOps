import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    logger.debug('🔍 Investigando guardias fantasma en Pauta Diaria');

    // Buscar los guardias específicos que aparecen en la imagen
    const guardias = [
      'Cayo Jaña, Evelyn del Carmen',
      'Oportus Zambrano, William Omar'
    ];

    const resultados = [];

    for (const nombreGuardia of guardias) {
      logger.debug(`🔍 Investigando: ${nombreGuardia}`);
      
      // Buscar el guardia por nombre
      const guardiaResult = await query(`
        SELECT id, nombre, apellido_paterno, apellido_materno,
               CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) as nombre_completo
        FROM guardias 
        WHERE CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) ILIKE $1
      `, [`%${nombreGuardia}%`]);
      
      if (guardiaResult.rows.length === 0) {
        resultados.push({
          nombre: nombreGuardia,
          encontrado: false,
          error: 'Guardia no encontrado'
        });
        continue;
      }
      
      const guardia = guardiaResult.rows[0];
      
      // Verificar asignaciones activas en as_turnos_puestos_operativos
      const puestosActivos = await query(`
        SELECT po.id, po.nombre_puesto, po.guardia_id, po.es_ppc, po.instalacion_id,
               i.nombre as instalacion_nombre
        FROM as_turnos_puestos_operativos po
        LEFT JOIN instalaciones i ON po.instalacion_id = i.id
        WHERE po.guardia_id = $1 AND po.activo = true
      `, [guardia.id]);
      
      // Verificar registros en as_turnos_pauta_mensual para hoy
      const pautaHoy = await query(`
        SELECT pm.id, pm.puesto_id, pm.guardia_id, pm.estado, pm.estado_ui, pm.anio, pm.mes, pm.dia,
               po.nombre_puesto, i.nombre as instalacion_nombre
        FROM as_turnos_pauta_mensual pm
        LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
        LEFT JOIN instalaciones i ON po.instalacion_id = i.id
        WHERE pm.guardia_id = $1 AND pm.anio = 2025 AND pm.mes = 9 AND pm.dia = 10
      `, [guardia.id]);
      
      // Verificar historial de asignaciones
      const historial = await query(`
        SELECT ha.id, ha.guardia_id, ha.puesto_operativo_id, ha.fecha_inicio, ha.fecha_termino,
               ha.estado, ha.motivo_inicio, ha.motivo_termino,
               po.nombre_puesto, i.nombre as instalacion_nombre
        FROM historial_asignaciones_guardias ha
        LEFT JOIN as_turnos_puestos_operativos po ON ha.puesto_operativo_id = po.id
        LEFT JOIN instalaciones i ON po.instalacion_id = i.id
        WHERE ha.guardia_id = $1
        ORDER BY ha.fecha_inicio DESC
        LIMIT 5
      `, [guardia.id]);
      
      resultados.push({
        nombre: nombreGuardia,
        encontrado: true,
        guardia: {
          id: guardia.id,
          nombre_completo: guardia.nombre_completo
        },
        puestos_activos: puestosActivos.rows,
        pauta_hoy: pautaHoy.rows,
        historial: historial.rows
      });
    }
    
    logger.debug('✅ Investigación completada');

    return NextResponse.json({
      success: true,
      data: resultados
    });

  } catch (error) {
    logger.error('❌ Error en investigación:', error);
    return NextResponse.json(
      { error: 'Error en investigación', details: error.message },
      { status: 500 }
    );
  }
}
