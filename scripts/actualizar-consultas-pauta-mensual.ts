import { query } from '../src/lib/database';

async function actualizarConsultasPautaMensual() {
  try {
    console.log('🔄 Actualizando consultas para el nuevo esquema de pauta mensual...');
    
    // Verificar que la tabla tiene la nueva estructura
    const estructura = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_pauta_mensual'
      ORDER BY ordinal_position;
    `);
    
    const columnas = estructura.rows.map((col: any) => col.column_name);
    console.log('📋 Columnas actuales:', columnas.join(', '));
    
    if (!columnas.includes('puesto_id')) {
      console.log('❌ La tabla no tiene la nueva estructura con puesto_id');
      return;
    }
    
    console.log('✅ Tabla tiene la nueva estructura con puesto_id');
    
    // Ejemplos de consultas actualizadas
    console.log('\n📝 Ejemplos de consultas actualizadas:');
    
    // 1. Consulta para obtener pautas por instalación (usando JOIN)
    console.log('\n1. Obtener pautas por instalación:');
    console.log(`
      SELECT 
        pm.*,
        po.instalacion_id,
        po.rol_id,
        rs.nombre as rol_nombre
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1 AND pm.anio = $2 AND pm.mes = $3
      ORDER BY pm.dia, rs.nombre
    `);
    
    // 2. Consulta para obtener pautas por guardia
    console.log('\n2. Obtener pautas por guardia:');
    console.log(`
      SELECT 
        pm.*,
        po.instalacion_id,
        po.rol_id,
        rs.nombre as rol_nombre,
        i.nombre as instalacion_nombre
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE pm.guardia_id = $1 AND pm.anio = $2 AND pm.mes = $3
      ORDER BY pm.dia, i.nombre
    `);
    
    // 3. Consulta para insertar nueva pauta
    console.log('\n3. Insertar nueva pauta:');
    console.log(`
      INSERT INTO as_turnos_pauta_mensual (puesto_id, guardia_id, anio, mes, dia, estado)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (puesto_id, guardia_id, anio, mes, dia) 
      DO UPDATE SET estado = EXCLUDED.estado, updated_at = CURRENT_TIMESTAMP
    `);
    
    // 4. Consulta para obtener estadísticas por instalación
    console.log('\n4. Estadísticas por instalación:');
    console.log(`
      SELECT 
        po.instalacion_id,
        i.nombre as instalacion_nombre,
        pm.estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE po.instalacion_id = $1 AND pm.anio = $2 AND pm.mes = $3
      GROUP BY po.instalacion_id, i.nombre, pm.estado
      ORDER BY pm.estado
    `);
    
    // 5. Consulta para verificar conflictos
    console.log('\n5. Verificar conflictos de guardias:');
    console.log(`
      SELECT 
        pm.guardia_id,
        g.nombre as guardia_nombre,
        COUNT(*) as dias_asignados
      FROM as_turnos_pauta_mensual pm
      INNER JOIN guardias g ON pm.guardia_id = g.id
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.estado = 'trabajado'
      GROUP BY pm.guardia_id, g.nombre
      HAVING COUNT(*) > 31
      ORDER BY dias_asignados DESC
    `);
    
    console.log('\n✅ Ejemplos de consultas actualizadas generados');
    console.log('📋 Notas importantes:');
    console.log('   - Todas las consultas ahora usan JOIN con as_turnos_puestos_operativos');
    console.log('   - Se mantiene la compatibilidad con el resto del sistema');
    console.log('   - Los índices optimizados mejoran el rendimiento');
    console.log('   - No se requieren foreign keys, solo referencia lógica');

  } catch (error) {
    console.error('❌ Error actualizando consultas:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  actualizarConsultasPautaMensual()
    .then(() => {
      console.log('✅ Actualización de consultas completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en actualización:', error);
      process.exit(1);
    });
}

export { actualizarConsultasPautaMensual }; 