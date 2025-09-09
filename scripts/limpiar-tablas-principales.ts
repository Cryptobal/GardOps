import { query } from '../src/lib/database';

async function limpiarTablas() {
  try {
    console.log('🧹 Iniciando limpieza de tablas principales...');
    
    // Verificar estado actual
    console.log('\n📊 Estado actual de las tablas:');
    const estadoActual = await query(`
      SELECT 
        'clientes' as tabla, COUNT(*) as registros FROM clientes
      UNION ALL
      SELECT 
        'instalaciones' as tabla, COUNT(*) as registros FROM instalaciones  
      UNION ALL
      SELECT 
        'guardias' as tabla, COUNT(*) as registros FROM guardias
    `);
    
    estadoActual.rows.forEach((row: any) => {
      console.log(`  ${row.tabla}: ${row.registros} registros`);
    });
    
    // Confirmar limpieza
    const totalRegistros = estadoActual.rows.reduce((sum: number, row: any) => sum + parseInt(row.registros), 0);
    
    if (totalRegistros === 0) {
      console.log('\n✅ Las tablas ya están vacías. No hay nada que limpiar.');
      return;
    }
    
    console.log(`\n⚠️  Se eliminarán ${totalRegistros} registros en total.`);
    console.log('🗑️  Iniciando limpieza...');
    
    // Eliminar en orden correcto (respetando foreign keys)
    console.log('  - Eliminando logs de guardias...');
    await query('DELETE FROM logs_guardias');
    
    console.log('  - Eliminando logs de instalaciones...');
    await query('DELETE FROM logs_instalaciones');
    
    console.log('  - Eliminando logs de clientes...');
    await query('DELETE FROM logs_clientes');
    
    console.log('  - Eliminando guardias...');
    await query('DELETE FROM guardias');
    
    console.log('  - Eliminando instalaciones...');
    await query('DELETE FROM instalaciones');
    
    console.log('  - Eliminando clientes...');
    await query('DELETE FROM clientes');
    
    // Verificar estado final
    console.log('\n📊 Estado final de las tablas:');
    const estadoFinal = await query(`
      SELECT 
        'clientes' as tabla, COUNT(*) as registros FROM clientes
      UNION ALL
      SELECT 
        'instalaciones' as tabla, COUNT(*) as registros FROM instalaciones  
      UNION ALL
      SELECT 
        'guardias' as tabla, COUNT(*) as registros FROM guardias
    `);
    
    estadoFinal.rows.forEach((row: any) => {
      console.log(`  ${row.tabla}: ${row.registros} registros`);
    });
    
    console.log('\n✅ Limpieza completada exitosamente.');
    console.log('📥 Las tablas están listas para reimportación.');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  limpiarTablas()
    .then(() => {
      console.log('\n🎉 Proceso completado.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

export { limpiarTablas };
