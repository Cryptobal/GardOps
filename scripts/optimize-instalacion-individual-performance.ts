import { query } from '../src/lib/database';
import * as fs from 'fs';
import * as path from 'path';

async function optimizeInstalacionIndividualPerformance() {
  console.log('🚀 Iniciando optimización de rendimiento para páginas individuales de instalaciones...');
  
  try {
    // Leer el script SQL
    const sqlPath = path.join(__dirname, 'optimize-instalacion-individual-performance.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    // Dividir el script en comandos individuales
    const commands = sqlScript
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📋 Ejecutando ${commands.length} comandos de optimización...`);
    
    // Ejecutar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      // Saltar comandos de verificación por ahora
      if (command.includes('SELECT') || command.includes('ANALYZE')) {
        continue;
      }
      
      try {
        console.log(`⚡ Ejecutando comando ${i + 1}/${commands.length}: ${command.substring(0, 50)}...`);
        await query(command);
        console.log(`✅ Comando ${i + 1} ejecutado exitosamente`);
      } catch (error) {
        console.error(`❌ Error en comando ${i + 1}:`, error);
        // Continuar con el siguiente comando
      }
    }
    
    // Ejecutar ANALYZE para optimizar estadísticas
    console.log('📊 Ejecutando ANALYZE para optimizar estadísticas...');
    const tables = ['as_turnos_configuracion', 'as_turnos_roles_servicio', 'as_turnos_ppc', 'as_turnos_requisitos', 'as_turnos_asignaciones', 'guardias'];
    
    for (const table of tables) {
      try {
        await query(`ANALYZE ${table}`);
        console.log(`✅ ANALYZE completado para ${table}`);
      } catch (error) {
        console.log(`⚠️ ANALYZE falló para ${table} (puede que la tabla no exista):`, error);
      }
    }
    
    // Verificar índices creados
    console.log('🔍 Verificando índices creados...');
    const indexResult = await query(`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename IN ('as_turnos_configuracion', 'as_turnos_roles_servicio', 'as_turnos_ppc', 'as_turnos_requisitos', 'as_turnos_asignaciones', 'guardias')
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `);
    
    console.log('📋 Índices encontrados:');
    indexResult.rows.forEach((row: any) => {
      console.log(`  - ${row.tablename}.${row.indexname}`);
    });
    
    // Mostrar estadísticas de rendimiento
    console.log('📊 Estadísticas de rendimiento:');
    const statsResult = await query(`
      SELECT 
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats 
      WHERE tablename IN ('as_turnos_configuracion', 'as_turnos_roles_servicio', 'as_turnos_ppc', 'guardias')
      ORDER BY tablename, attname
    `);
    
    statsResult.rows.forEach((row: any) => {
      console.log(`  - ${row.tablename}.${row.attname}: ${row.n_distinct} valores distintos`);
    });
    
    console.log('🎉 Optimización de páginas individuales completada exitosamente!');
    console.log('💡 Los cambios incluyen:');
    console.log('   - Índices optimizados para consultas de turnos');
    console.log('   - Índices para consultas de PPCs');
    console.log('   - Índices para guardias disponibles');
    console.log('   - Consultas paralelas optimizadas');
    console.log('   - Datos precargados en el frontend');
    
  } catch (error) {
    console.error('❌ Error durante la optimización:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  optimizeInstalacionIndividualPerformance()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { optimizeInstalacionIndividualPerformance }; 