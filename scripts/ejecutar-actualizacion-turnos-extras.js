// Script para ejecutar actualización de tabla turnos_extras
require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');
const fs = require('fs');

async function ejecutarActualizacionTurnosExtras() {
  console.log('🚀 Ejecutando actualización de tabla turnos_extras...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // 1. Verificar que la tabla turnos_extras existe
    console.log('🔍 Verificando si la tabla turnos_extras existe...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'turnos_extras'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.error('❌ Error: La tabla turnos_extras no existe');
      console.error('   Ejecuta primero el script de creación de la tabla');
      return;
    }
    console.log('✅ Tabla turnos_extras existe\n');

    // 2. Verificar columnas existentes
    console.log('📋 Verificando columnas existentes...');
    const columnsResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'turnos_extras'
    `);
    
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    console.log('📋 Columnas actuales:', existingColumns.join(', '));

    // 3. Definir columnas a agregar
    const columnsToAdd = [
      {
        name: 'pagado',
        definition: 'BOOLEAN DEFAULT FALSE',
        description: 'Estado de pago del turno extra'
      },
      {
        name: 'fecha_pago',
        definition: 'DATE',
        description: 'Fecha en que se realizó el pago'
      },
      {
        name: 'observaciones_pago',
        definition: 'TEXT',
        description: 'Observaciones sobre el pago'
      },
      {
        name: 'usuario_pago',
        definition: 'VARCHAR(255)',
        description: 'Usuario que marcó como pagado'
      }
    ];

    // 4. Agregar columnas faltantes
    console.log('\n📝 Agregando columnas faltantes...');
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        try {
          console.log(`  📝 Agregando columna: ${column.name}...`);
          await pool.query(`
            ALTER TABLE turnos_extras 
            ADD COLUMN ${column.name} ${column.definition}
          `);
          console.log(`  ✅ Columna ${column.name} agregada: ${column.description}`);
        } catch (error) {
          console.error(`  ❌ Error agregando columna ${column.name}:`, error.message);
        }
      } else {
        console.log(`  ⚠️ Columna ${column.name} ya existe, saltando...`);
      }
    }

    // 5. Crear índices para optimización
    console.log('\n📋 Creando índices para optimización...');
    
    const indices = [
      {
        name: 'idx_turnos_extras_pagado',
        sql: 'CREATE INDEX IF NOT EXISTS idx_turnos_extras_pagado ON turnos_extras(pagado)',
        description: 'Índice para filtrar por estado de pago'
      },
      {
        name: 'idx_turnos_extras_fecha_pago',
        sql: 'CREATE INDEX IF NOT EXISTS idx_turnos_extras_fecha_pago ON turnos_extras(fecha_pago)',
        description: 'Índice para filtrar por fecha de pago'
      },
      {
        name: 'idx_turnos_extras_fecha_pagado',
        sql: 'CREATE INDEX IF NOT EXISTS idx_turnos_extras_fecha_pagado ON turnos_extras(fecha, pagado)',
        description: 'Índice compuesto para consultas frecuentes'
      }
    ];

    for (const index of indices) {
      try {
        await pool.query(index.sql);
        console.log(`  ✅ ${index.description}`);
      } catch (error) {
        console.error(`  ❌ Error creando índice ${index.name}:`, error.message);
      }
    }

    // 6. Agregar comentarios a las columnas
    console.log('\n📝 Agregando comentarios a las columnas...');
    const comments = [
      "COMMENT ON COLUMN turnos_extras.pagado IS 'Indica si el turno extra ha sido pagado'",
      "COMMENT ON COLUMN turnos_extras.fecha_pago IS 'Fecha en que se realizó el pago del turno extra'",
      "COMMENT ON COLUMN turnos_extras.observaciones_pago IS 'Observaciones o notas sobre el pago'",
      "COMMENT ON COLUMN turnos_extras.usuario_pago IS 'Usuario que marcó el turno extra como pagado'"
    ];

    for (const comment of comments) {
      try {
        await pool.query(comment);
      } catch (error) {
        console.error(`  ⚠️ Error agregando comentario:`, error.message);
      }
    }

    // 7. Verificar estructura final
    console.log('\n📋 Verificando estructura final de la tabla...');
    const finalStructure = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'turnos_extras'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estructura actualizada de turnos_extras:');
    finalStructure.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultValue = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`  - ${col.column_name}: ${col.data_type} (${nullable})${defaultValue}`);
    });

    console.log('\n🎉 ¡Actualización completada exitosamente!');
    console.log('\n📝 Cambios realizados:');
    console.log('   ✅ Campo pagado: Para marcar si el turno extra está pagado');
    console.log('   ✅ Campo fecha_pago: Para registrar cuándo se pagó');
    console.log('   ✅ Campo observaciones_pago: Para notas sobre el pago');
    console.log('   ✅ Campo usuario_pago: Para auditoría de quién marcó como pagado');
    console.log('   ✅ Índices optimizados para consultas rápidas');
    console.log('\n✨ La tabla turnos_extras está lista para el control de pagos!');

  } catch (error) {
    console.error('❌ Error durante la actualización:', error);
  } finally {
    await pool.end();
  }
}

ejecutarActualizacionTurnosExtras();