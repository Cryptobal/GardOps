import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    logger.debug('🧹 Iniciando limpieza completa de todas las pautas');

    // Mostrar conteo actual antes de limpiar
    const conteoPautaMensual = await query('SELECT COUNT(*) as count FROM as_turnos_pauta_mensual');
    const conteoPautaDiaria = await query('SELECT COUNT(*) as count FROM as_turnos_pauta_diaria');
    const conteoTurnosExtras = await query('SELECT COUNT(*) as count FROM TE_turnos_extras');
    const conteoHistorial = await query('SELECT COUNT(*) as count FROM historial_asignaciones_guardias');
    
    const conteosIniciales = {
      pauta_mensual: parseInt(conteoPautaMensual.rows[0].count),
      pauta_diaria: parseInt(conteoPautaDiaria.rows[0].count),
      turnos_extras: parseInt(conteoTurnosExtras.rows[0].count),
      historial: parseInt(conteoHistorial.rows[0].count)
    };

    logger.debug('📊 Conteos iniciales:', conteosIniciales);

    // Limpiar en orden correcto (respetando foreign keys)
    const resultados = [];
    
    // 1. Limpiar turnos extras (puede referenciar pauta_mensual)
    logger.debug('🧹 Limpiando TE_turnos_extras...');
    await query('DELETE FROM TE_turnos_extras');
    resultados.push({ tabla: 'TE_turnos_extras', status: 'limpiada' });
    
    // 2. Limpiar historial de asignaciones
    logger.debug('🧹 Limpiando historial_asignaciones_guardias...');
    await query('DELETE FROM historial_asignaciones_guardias');
    resultados.push({ tabla: 'historial_asignaciones_guardias', status: 'limpiada' });
    
    // 3. Limpiar pauta diaria
    logger.debug('🧹 Limpiando as_turnos_pauta_diaria...');
    await query('DELETE FROM as_turnos_pauta_diaria');
    resultados.push({ tabla: 'as_turnos_pauta_diaria', status: 'limpiada' });
    
    // 4. Limpiar pauta mensual (última porque puede ser referenciada)
    logger.debug('🧹 Limpiando as_turnos_pauta_mensual...');
    await query('DELETE FROM as_turnos_pauta_mensual');
    resultados.push({ tabla: 'as_turnos_pauta_mensual', status: 'limpiada' });
    
    // Verificar que todo esté limpio
    const conteoFinalPautaMensual = await query('SELECT COUNT(*) as count FROM as_turnos_pauta_mensual');
    const conteoFinalPautaDiaria = await query('SELECT COUNT(*) as count FROM as_turnos_pauta_diaria');
    const conteoFinalTurnosExtras = await query('SELECT COUNT(*) as count FROM TE_turnos_extras');
    const conteoFinalHistorial = await query('SELECT COUNT(*) as count FROM historial_asignaciones_guardias');
    
    const conteosFinales = {
      pauta_mensual: parseInt(conteoFinalPautaMensual.rows[0].count),
      pauta_diaria: parseInt(conteoFinalPautaDiaria.rows[0].count),
      turnos_extras: parseInt(conteoFinalTurnosExtras.rows[0].count),
      historial: parseInt(conteoFinalHistorial.rows[0].count)
    };

    // Verificar que las tablas de configuración siguen intactas
    const conteoPuestos = await query('SELECT COUNT(*) as count FROM as_turnos_puestos_operativos');
    const conteoInstalaciones = await query('SELECT COUNT(*) as count FROM instalaciones');
    const conteoGuardias = await query('SELECT COUNT(*) as count FROM guardias');
    const conteoRoles = await query('SELECT COUNT(*) as count FROM as_turnos_roles_servicio');
    
    const tablasConfiguracion = {
      puestos_operativos: parseInt(conteoPuestos.rows[0].count),
      instalaciones: parseInt(conteoInstalaciones.rows[0].count),
      guardias: parseInt(conteoGuardias.rows[0].count),
      roles_servicio: parseInt(conteoRoles.rows[0].count)
    };

    logger.debug('✅ Limpieza completada exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Limpieza completa de pautas realizada exitosamente',
      data: {
        conteos_iniciales: conteosIniciales,
        conteos_finales: conteosFinales,
        tablas_limpiadas: resultados,
        tablas_configuracion_intactas: tablasConfiguracion
      }
    });

  } catch (error) {
    logger.error('❌ Error en limpieza completa:', error);
    return NextResponse.json(
      { error: 'Error en limpieza completa', details: error.message },
      { status: 500 }
    );
  }
}
