import { query, closePool, checkTableExists } from '../src/lib/database';

async function crearTablaTurnosExtras() {
  try {
    console.log('🔍 Verificando si la tabla turnos_extras existe...');
    
    const tablaExiste = await checkTableExists('turnos_extras');
    
    if (tablaExiste) {
      console.log('✅ La tabla turnos_extras ya existe');
    } else {
      console.log('📝 Creando tabla turnos_extras...');
      
      const createTableQuery = `
        CREATE TABLE turnos_extras (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          guardia_id UUID NOT NULL REFERENCES guardias(id),
          instalacion_id UUID NOT NULL REFERENCES instalaciones(id),
          puesto_id UUID NOT NULL REFERENCES as_turnos_puestos_operativos(id),
          pauta_id INTEGER NOT NULL REFERENCES as_turnos_pauta_mensual(id),
          fecha DATE NOT NULL,
          estado TEXT CHECK (estado IN ('reemplazo', 'ppc')),
          valor NUMERIC NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await query(createTableQuery);
      console.log('✅ Tabla turnos_extras creada exitosamente');
    }

    // Verificar estructura de la tabla
    console.log('📋 Verificando estructura de la tabla...');
    const { rows: columns } = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'turnos_extras'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estructura de la tabla turnos_extras:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    // Crear índices
    console.log('📝 Creando índices...');
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_turnos_extras_guardia_id ON turnos_extras(guardia_id)',
      'CREATE INDEX IF NOT EXISTS idx_turnos_extras_instalacion_id ON turnos_extras(instalacion_id)',
      'CREATE INDEX IF NOT EXISTS idx_turnos_extras_fecha ON turnos_extras(fecha)',
      'CREATE INDEX IF NOT EXISTS idx_turnos_extras_estado ON turnos_extras(estado)',
      'CREATE INDEX IF NOT EXISTS idx_turnos_extras_puesto_id ON turnos_extras(puesto_id)',
      'CREATE INDEX IF NOT EXISTS idx_turnos_extras_pauta_id ON turnos_extras(pauta_id)'
    ];

    for (const indexQuery of indices) {
      try {
        await query(indexQuery);
        console.log(`✅ Índice creado: ${indexQuery.substring(0, 50)}...`);
      } catch (error) {
        console.log(`⚠️  Índice ya existe o error: ${indexQuery.substring(0, 50)}...`);
      }
    }

    console.log('🎉 Proceso completado exitosamente');

  } catch (error) {
    console.error('❌ Error durante el proceso:', error);
    throw error;
  } finally {
    await closePool();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  crearTablaTurnosExtras()
    .then(() => {
      console.log('🎉 Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

export { crearTablaTurnosExtras }; 