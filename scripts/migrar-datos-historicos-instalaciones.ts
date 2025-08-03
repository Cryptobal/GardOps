import { query } from '../src/lib/database';

async function migrarDatosHistoricos() {
  console.log('🔄 Iniciando migración de datos históricos...');
  
  try {
    // Paso 1: Migrar asignaciones activas a puestos operativos
    console.log('📊 Migrando asignaciones activas...');
    
    const migracionAsignaciones = await query(`
      INSERT INTO as_turnos_puestos_operativos (instalacion_id, rol_id, guardia_id, es_ppc, nombre_puesto, creado_en)
      SELECT 
        tr.instalacion_id, 
        tr.rol_servicio_id, 
        ta.guardia_id, 
        false as es_ppc,
        CONCAT(rs.nombre, ' - Puesto ', ROW_NUMBER() OVER (PARTITION BY tr.instalacion_id, tr.rol_servicio_id ORDER BY ta.id)) as nombre_puesto,
        ta.created_at as creado_en
      FROM as_turnos_asignaciones ta
      INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      WHERE ta.estado = 'Activa'
    `);
    
    console.log(`✅ Migradas ${migracionAsignaciones.rowCount} asignaciones activas`);

    // Paso 2: Crear PPCs para puestos sin asignación
    console.log('📊 Creando PPCs para puestos sin asignación...');
    
    const migracionPPCs = await query(`
      INSERT INTO as_turnos_puestos_operativos (instalacion_id, rol_id, guardia_id, es_ppc, nombre_puesto, creado_en)
      SELECT 
        tr.instalacion_id, 
        tr.rol_servicio_id, 
        NULL as guardia_id, 
        true as es_ppc,
        CONCAT(rs.nombre, ' - PPC ', ROW_NUMBER() OVER (PARTITION BY tr.instalacion_id, tr.rol_servicio_id ORDER BY tr.id)) as nombre_puesto,
        NOW() as creado_en
      FROM as_turnos_requisitos tr
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      WHERE NOT EXISTS (
        SELECT 1 FROM as_turnos_puestos_operativos po 
        WHERE po.instalacion_id = tr.instalacion_id 
        AND po.rol_id = tr.rol_servicio_id
      )
    `);
    
    console.log(`✅ Creados ${migracionPPCs.rowCount} PPCs`);

    // Paso 3: Verificar integridad de la migración
    console.log('🔍 Verificando integridad de la migración...');
    
    const estadisticas = await query(`
      SELECT 
        COUNT(*) as total_puestos_operativos,
        COUNT(CASE WHEN guardia_id IS NOT NULL THEN 1 END) as puestos_asignados,
        COUNT(CASE WHEN es_ppc = true THEN 1 END) as ppcs_creados
      FROM as_turnos_puestos_operativos
    `);
    
    const stats = estadisticas.rows[0];
    console.log('📊 Estadísticas finales:');
    console.log(`   - Total puestos operativos: ${stats.total_puestos_operativos}`);
    console.log(`   - Puestos asignados: ${stats.puestos_asignados}`);
    console.log(`   - PPCs creados: ${stats.ppcs_creados}`);

    // Paso 4: Limpiar datos duplicados o inconsistentes
    console.log('🧹 Limpiando datos duplicados...');
    
    const limpieza = await query(`
      DELETE FROM as_turnos_puestos_operativos 
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY instalacion_id, rol_id, guardia_id 
            ORDER BY creado_en DESC
          ) as rn
          FROM as_turnos_puestos_operativos
        ) t WHERE t.rn > 1
      )
    `);
    
    console.log(`✅ Eliminados ${limpieza.rowCount} registros duplicados`);

    console.log('✅ Migración de datos históricos completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  migrarDatosHistoricos()
    .then(() => {
      console.log('🎉 Migración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en migración:', error);
      process.exit(1);
    });
}

export { migrarDatosHistoricos }; 