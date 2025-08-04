import { query, closePool, checkTableExists } from '../src/lib/database';

async function verificarYCrearTablaTurnosExtras() {
  try {
    console.log('🔍 Verificando si la tabla pagos_turnos_extras existe...');
    
    const tablaExiste = await checkTableExists('pagos_turnos_extras');
    
    if (tablaExiste) {
      console.log('✅ La tabla pagos_turnos_extras ya existe');
    } else {
      console.log('📝 Creando tabla pagos_turnos_extras...');
      
      const createTableQuery = `
        CREATE TABLE pagos_turnos_extras (
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
      console.log('✅ Tabla pagos_turnos_extras creada exitosamente');
    }

    // Verificar estructura de la tabla
    console.log('📋 Verificando estructura de la tabla...');
    const { rows: columns } = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'pagos_turnos_extras'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estructura de la tabla pagos_turnos_extras:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    // Crear índices si no existen
    console.log('📝 Creando índices...');
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_pagos_turnos_extras_guardia_id ON pagos_turnos_extras(guardia_id)',
      'CREATE INDEX IF NOT EXISTS idx_pagos_turnos_extras_instalacion_id ON pagos_turnos_extras(instalacion_id)',
      'CREATE INDEX IF NOT EXISTS idx_pagos_turnos_extras_fecha ON pagos_turnos_extras(fecha)',
      'CREATE INDEX IF NOT EXISTS idx_pagos_turnos_extras_estado ON pagos_turnos_extras(estado)',
      'CREATE INDEX IF NOT EXISTS idx_pagos_turnos_extras_puesto_id ON pagos_turnos_extras(puesto_id)',
      'CREATE INDEX IF NOT EXISTS idx_pagos_turnos_extras_pauta_id ON pagos_turnos_extras(pauta_id)'
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
  verificarYCrearTablaTurnosExtras()
    .then(() => {
      console.log('🎉 Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

export { verificarYCrearTablaTurnosExtras }; 