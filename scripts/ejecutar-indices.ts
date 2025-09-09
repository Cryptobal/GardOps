import { query } from '../src/lib/database';
import * as fs from 'fs';

async function ejecutarIndices() {
  try {
    console.log('🚀 Ejecutando optimización de índices...');
    
    // Crear índices uno por uno para mejor control
    const indices = [
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pauta_mensual_instalacion_anio_mes 
       ON as_turnos_pauta_mensual(instalacion_id, anio, mes)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pauta_mensual_guardia_dia 
       ON as_turnos_pauta_mensual(guardia_id, dia)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asignaciones_guardia_estado 
       ON as_turnos_asignaciones(guardia_id, estado)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asignaciones_requisito_estado 
       ON as_turnos_asignaciones(requisito_puesto_id, estado)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requisitos_instalacion_rol 
       ON as_turnos_requisitos(instalacion_id, rol_servicio_id)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ppc_requisito_estado 
       ON as_turnos_ppc(requisito_puesto_id, estado)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guardias_activo 
       ON guardias(activo)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_turnos_config_instalacion 
       ON as_turnos_configuracion(instalacion_id)`
    ];
    
    for (let i = 0; i < indices.length; i++) {
      console.log(`📊 Creando índice ${i + 1}/${indices.length}`);
      try {
        await query(indices[i]);
        console.log(`✅ Índice ${i + 1} creado`);
      } catch (error) {
        console.log(`⚠️ Índice ${i + 1} ya existe o error:`, error instanceof Error ? error.message : 'Error desconocido');
      }
    }
    
    // Actualizar estadísticas
    console.log('📈 Actualizando estadísticas...');
    const tablas = [
      'as_turnos_pauta_mensual',
      'as_turnos_asignaciones', 
      'as_turnos_requisitos',
      'as_turnos_ppc',
      'guardias',
      'as_turnos_configuracion'
    ];
    
    for (const tabla of tablas) {
      await query(`ANALYZE ${tabla}`);
    }
    
    console.log('✅ Optimización de índices completada');
  } catch (error) {
    console.error('❌ Error en optimización:', error);
  }
}

ejecutarIndices();