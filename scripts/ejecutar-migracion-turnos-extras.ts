import { query, closePool } from '../src/lib/database';
import fs from 'fs';
import path from 'path';

async function ejecutarMigracionTurnosExtras() {
  try {
    console.log('🚀 Iniciando migración de tabla pagos_turnos_extras...');

    // Leer y ejecutar el archivo SQL de la tabla
    const tablaSqlPath = path.join(__dirname, 'crear-tabla-pagos-turnos-extras.sql');
    const tablaSqlContent = fs.readFileSync(tablaSqlPath, 'utf8');

    console.log('📝 Creando tabla pagos_turnos_extras...');
    await query(tablaSqlContent.trim());

    // Leer y ejecutar el archivo SQL de los índices
    const indicesSqlPath = path.join(__dirname, 'crear-indices-pagos-turnos-extras.sql');
    const indicesSqlContent = fs.readFileSync(indicesSqlPath, 'utf8');

    console.log('📝 Creando índices...');
    const indexQueries = indicesSqlContent.split(';').filter(query => query.trim());
    
    for (const indexQuery of indexQueries) {
      if (indexQuery.trim()) {
        console.log('📝 Ejecutando índice:', indexQuery.trim().substring(0, 50) + '...');
        await query(indexQuery.trim());
      }
    }

    console.log('✅ Migración completada exitosamente');
    console.log('📊 Tabla pagos_turnos_extras creada con índices optimizados');

    // Verificar que la tabla existe
    const { rows } = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'pagos_turnos_extras'
    `);

    if (rows.length > 0) {
      console.log('✅ Verificación: Tabla pagos_turnos_extras existe');
      
      // Mostrar estructura de la tabla
      const { rows: columns } = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'pagos_turnos_extras'
        ORDER BY ordinal_position
      `);
      
      console.log('📋 Estructura de la tabla:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });
    } else {
      console.log('❌ Error: La tabla no se creó correctamente');
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await closePool();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  ejecutarMigracionTurnosExtras()
    .then(() => {
      console.log('🎉 Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

export { ejecutarMigracionTurnosExtras }; 