import { query, checkConnection } from '../src/lib/database';

async function actualizarTablaTurnosExtras() {
  console.log('🚀 Iniciando actualización de tabla turnos_extras...\n');
  
  try {
    // 1. Verificar conexión
    console.log('🔍 Verificando conexión a la base de datos...');
    const connected = await checkConnection();
    if (!connected) {
      console.error('❌ Error: No se pudo conectar a la base de datos');
      console.error('   Verifica que DATABASE_URL esté configurado correctamente');
      return;
    }
    console.log('✅ Conexión establecida\n');

    // 2. Verificar si la tabla turnos_extras existe
    console.log('📋 Verificando si la tabla turnos_extras existe...');
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'turnos_extras'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.error('❌ Error: La tabla turnos_extras no existe');
      console.error('   Ejecuta primero el script de creación de la tabla');
      return;
    }
    console.log('✅ Tabla turnos_extras existe\n');

    // 3. Verificar qué columnas ya existen
    console.log('🔍 Verificando columnas existentes...');
    const { rows: columns } = await query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'turnos_extras'
    `);
    
    const columnNames = columns.map((col: any) => col.column_name);
    console.log('📋 Columnas actuales:', columnNames.join(', '));

    // 4. Agregar columnas faltantes una por una
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

    for (const column of columnsToAdd) {
      if (!columnNames.includes(column.name)) {
        console.log(`📝 Agregando columna: ${column.name}...`);
        await query(`
          ALTER TABLE turnos_extras 
          ADD COLUMN ${column.name} ${column.definition}
        `);
        console.log(`✅ Columna ${column.name} agregada: ${column.description}`);
      } else {
        console.log(`⚠️ Columna ${column.name} ya existe, saltando...`);
      }
    }

    // 5. Crear índices para optimización
    console.log('\n📋 Creando índices para optimización...');
    
    const indices = [
      {
        name: 'idx_turnos_extras_pagado',
        definition: 'CREATE INDEX IF NOT EXISTS idx_turnos_extras_pagado ON turnos_extras(pagado)',
        description: 'Índice para filtrar por estado de pago'
      },
      {
        name: 'idx_turnos_extras_fecha_pago',
        definition: 'CREATE INDEX IF NOT EXISTS idx_turnos_extras_fecha_pago ON turnos_extras(fecha_pago)',
        description: 'Índice para filtrar por fecha de pago'
      },
      {
        name: 'idx_turnos_extras_fecha_pagado',
        definition: 'CREATE INDEX IF NOT EXISTS idx_turnos_extras_fecha_pagado ON turnos_extras(fecha, pagado)',
        description: 'Índice compuesto para consultas frecuentes'
      }
    ];

    for (const index of indices) {
      await query(index.definition);
      console.log(`✅ ${index.description}`);
    }

    // 6. Verificar estructura final
    console.log('\n📋 Verificando estructura final de la tabla...');
    const { rows: finalColumns } = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'turnos_extras'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estructura actualizada de turnos_extras:');
    finalColumns.forEach((col: any) => {
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

  } catch (error) {
    console.error('❌ Error durante la actualización:', error);
  }
}

// Ejecutar la función
actualizarTablaTurnosExtras();