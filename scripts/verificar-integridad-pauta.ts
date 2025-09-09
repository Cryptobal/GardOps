import { query } from '../src/lib/database';

/**
 * Script para verificar la integridad de los datos de la pauta mensual
 * Verifica que los datos estén correctamente guardados y no haya inconsistencias
 */

interface VerificacionResultado {
  instalacion_id: string;
  anio: number;
  mes: number;
  total_registros: number;
  guardias_unicos: number;
  dias_unicos: number;
  estados_validos: number;
  inconsistencias: string[];
  timestamp: string;
}

async function verificarIntegridadPauta(instalacion_id?: string, anio?: number, mes?: number): Promise<VerificacionResultado[]> {
  console.log('🔍 Iniciando verificación de integridad de pauta mensual...');
  
  try {
    // Construir la consulta base
    let sql = `
      SELECT 
        instalacion_id,
        anio,
        mes,
        COUNT(*) as total_registros,
        COUNT(DISTINCT guardia_id) as guardias_unicos,
        COUNT(DISTINCT dia) as dias_unicos,
        COUNT(CASE WHEN estado IN ('trabajado', 'libre', 'permiso') THEN 1 END) as estados_validos,
        COUNT(CASE WHEN estado NOT IN ('trabajado', 'libre', 'permiso') THEN 1 END) as estados_invalidos
      FROM as_turnos_pauta_mensual
    `;
    
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (instalacion_id) {
      conditions.push('instalacion_id = $' + (params.length + 1));
      params.push(instalacion_id);
    }
    
    if (anio) {
      conditions.push('anio = $' + (params.length + 1));
      params.push(anio);
    }
    
    if (mes) {
      conditions.push('mes = $' + (params.length + 1));
      params.push(mes);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += `
      GROUP BY instalacion_id, anio, mes
      ORDER BY instalacion_id, anio, mes
    `;
    
    const result = await query(sql, params);
    
    const resultados: VerificacionResultado[] = [];
    
    for (const row of result.rows) {
      const inconsistencias: string[] = [];
      
      // Verificar que hay registros
      if (row.total_registros === 0) {
        inconsistencias.push('No hay registros para esta instalación/mes/año');
      }
      
      // Verificar que hay guardias
      if (row.guardias_unicos === 0) {
        inconsistencias.push('No hay guardias asignados');
      }
      
      // Verificar que hay días
      if (row.dias_unicos === 0) {
        inconsistencias.push('No hay días registrados');
      }
      
      // Verificar estados válidos
      if (row.estados_invalidos > 0) {
        inconsistencias.push(`${row.estados_invalidos} registros con estados inválidos`);
      }
      
      // Verificar duplicados
      const duplicadosResult = await query(`
        SELECT guardia_id, dia, COUNT(*) as count
        FROM as_turnos_pauta_mensual
        WHERE instalacion_id = $1 AND anio = $2 AND mes = $3
        GROUP BY guardia_id, dia
        HAVING COUNT(*) > 1
      `, [row.instalacion_id, row.anio, row.mes]);
      
      if (duplicadosResult.rows.length > 0) {
        inconsistencias.push(`${duplicadosResult.rows.length} combinaciones guardia-día duplicadas`);
      }
      
      resultados.push({
        instalacion_id: row.instalacion_id,
        anio: row.anio,
        mes: row.mes,
        total_registros: parseInt(row.total_registros),
        guardias_unicos: parseInt(row.guardias_unicos),
        dias_unicos: parseInt(row.dias_unicos),
        estados_validos: parseInt(row.estados_validos),
        inconsistencias,
        timestamp: new Date().toISOString()
      });
    }
    
    return resultados;
    
  } catch (error) {
    console.error('❌ Error verificando integridad:', error);
    throw error;
  }
}

async function generarReporteIntegridad() {
  console.log('📊 Generando reporte de integridad...');
  
  try {
    // Verificar todas las pautas
    const resultados = await verificarIntegridadPauta();
    
    console.log('\n📋 REPORTE DE INTEGRIDAD DE PAUTA MENSUAL');
    console.log('=' .repeat(60));
    
    let totalInconsistencias = 0;
    let totalRegistros = 0;
    
    for (const resultado of resultados) {
      console.log(`\n🏢 Instalación: ${resultado.instalacion_id}`);
      console.log(`📅 Período: ${resultado.mes}/${resultado.anio}`);
      console.log(`📊 Estadísticas:`);
      console.log(`   - Total registros: ${resultado.total_registros}`);
      console.log(`   - Guardias únicos: ${resultado.guardias_unicos}`);
      console.log(`   - Días únicos: ${resultado.dias_unicos}`);
      console.log(`   - Estados válidos: ${resultado.estados_validos}`);
      
      if (resultado.inconsistencias.length > 0) {
        console.log(`❌ Inconsistencias encontradas:`);
        resultado.inconsistencias.forEach(inc => console.log(`   - ${inc}`));
        totalInconsistencias += resultado.inconsistencias.length;
      } else {
        console.log(`✅ Sin inconsistencias`);
      }
      
      totalRegistros += resultado.total_registros;
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log(`📈 RESUMEN:`);
    console.log(`   - Total instalaciones verificadas: ${resultados.length}`);
    console.log(`   - Total registros: ${totalRegistros}`);
    console.log(`   - Total inconsistencias: ${totalInconsistencias}`);
    
    if (totalInconsistencias === 0) {
      console.log(`🎉 ¡Todas las pautas están en buen estado!`);
    } else {
      console.log(`⚠️ Se encontraron ${totalInconsistencias} inconsistencias que requieren atención.`);
    }
    
    return resultados;
    
  } catch (error) {
    console.error('❌ Error generando reporte:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generarReporteIntegridad()
    .then(() => {
      console.log('\n✅ Verificación completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en verificación:', error);
      process.exit(1);
    });
}

export { verificarIntegridadPauta, generarReporteIntegridad }; 