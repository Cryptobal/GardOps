import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { sincronizarPautasPostAsignacion } from '@/lib/sync-pautas';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    logger.debug('🧹 Iniciando limpieza de guardias fantasma');

    // Buscar registros en as_turnos_pauta_mensual para hoy que tengan guardia_id
    // pero el guardia no esté asignado en as_turnos_puestos_operativos
    const registrosFantasma = await query(`
      SELECT pm.id, pm.puesto_id, pm.guardia_id, pm.estado, pm.estado_ui, pm.anio, pm.mes, pm.dia,
             po.nombre_puesto, po.guardia_id as puesto_guardia_id, po.es_ppc, po.instalacion_id,
             i.nombre as instalacion_nombre,
             CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre) as guardia_nombre
      FROM as_turnos_pauta_mensual pm
      LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      WHERE pm.anio = 2025 AND pm.mes = 9 AND pm.dia = 10
        AND pm.guardia_id IS NOT NULL
        AND (po.guardia_id IS NULL OR po.guardia_id != pm.guardia_id OR po.es_ppc = true)
    `);
    
    logger.debug(`📊 Registros fantasma encontrados: ${registrosFantasma.rows.length}`);
    
    if (registrosFantasma.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No se encontraron registros fantasma',
        data: []
      });
    }
    
    const resultados = [];
    
    // Limpiar los registros fantasma
    for (const registro of registrosFantasma.rows) {
      logger.debug(`🧹 Limpiando: ${registro.guardia_nombre} en ${registro.instalacion_nombre}`);
      
      try {
        // Usar la función de sincronización para limpiar correctamente
        const resultadoSync = await sincronizarPautasPostAsignacion(
          registro.puesto_id,
          null, // guardiaId = null para desasignación
          registro.instalacion_id,
          'unknown' // rolId (no crítico para limpieza)
        );
        
        if (resultadoSync.success) {
          resultados.push({
            guardia: registro.guardia_nombre,
            instalacion: registro.instalacion_nombre,
            puesto: registro.nombre_puesto,
            status: 'limpiado',
            message: 'Registro fantasma eliminado correctamente'
          });
          logger.debug(`✅ Limpiado correctamente: ${registro.guardia_nombre}`);
        } else {
          resultados.push({
            guardia: registro.guardia_nombre,
            instalacion: registro.instalacion_nombre,
            puesto: registro.nombre_puesto,
            status: 'error',
            message: resultadoSync.error
          });
          logger.debug(`❌ Error limpiando: ${registro.guardia_nombre} - ${resultadoSync.error}`);
        }
      } catch (error) {
        resultados.push({
          guardia: registro.guardia_nombre,
          instalacion: registro.instalacion_nombre,
          puesto: registro.nombre_puesto,
          status: 'error',
          message: error.message
        });
        logger.error(`❌ Error limpiando: ${registro.guardia_nombre}`, error);
      }
    }
    
    logger.debug('✅ Limpieza completada');

    return NextResponse.json({
      success: true,
      message: `Limpieza completada. ${resultados.filter(r => r.status === 'limpiado').length} registros limpiados`,
      data: resultados
    });

  } catch (error) {
    logger.error('❌ Error en limpieza:', error);
    return NextResponse.json(
      { error: 'Error en limpieza', details: error.message },
      { status: 500 }
    );
  }
}
