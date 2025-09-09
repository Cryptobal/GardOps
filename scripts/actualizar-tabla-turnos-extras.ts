import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';
import { checkConnection } from '../src/lib/database';

async function actualizarTablaTurnosExtras() {
  console.log('🚀 Iniciando actualización de tabla turnos_extras...\n');
  
  try {
    // 1. Verificar conexión
    console.log('🔍 Verificando conexión a la base de datos...');
    const connected = await checkConnection();
    if (!connected) {
      console.error('❌ Error: No se pudo conectar a la base de datos');
      console.error('   Verifica que DATABASE_URL esté configurado correctamente');
      process.exit(1);
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
      console.log('❌ Error: La tabla turnos_extras no existe');
      console.log('   Ejecuta primero el script de creación de la tabla');
      process.exit(1);
    }
    console.log('✅ Tabla turnos_extras existe\n');

    // 3. Verificar campos existentes
    console.log('📋 Verificando campos existentes...');
    const { rows: columns } = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'turnos_extras'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Campos actuales en turnos_extras:');
    columns.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    // 4. Agregar campos faltantes
    console.log('\n📝 Agregando campos faltantes...');
    
    const camposAAgregar = [
      {
        nombre: 'pagado',
        tipo: 'BOOLEAN DEFAULT FALSE',
        descripcion: 'Indica si el turno extra ha sido pagado'
      },
      {
        nombre: 'fecha_pago',
        tipo: 'DATE',
        descripcion: 'Fecha en que se realizó el pago'
      },
      {
        nombre: 'observaciones_pago',
        tipo: 'TEXT',
        descripcion: 'Observaciones adicionales sobre el pago'
      },
      {
        nombre: 'usuario_pago',
        tipo: 'TEXT',
        descripcion: 'Usuario que marcó como pagado'
      }
    ];

    for (const campo of camposAAgregar) {
      const campoExiste = columns.some((col: any) => col.column_name === campo.nombre);
      
      if (!campoExiste) {
        console.log(`  ➕ Agregando campo: ${campo.nombre} (${campo.tipo})`);
        await query(`ALTER TABLE turnos_extras ADD COLUMN ${campo.nombre} ${campo.tipo}`);
        console.log(`  ✅ Campo ${campo.nombre} agregado exitosamente`);
      } else {
        console.log(`  ℹ️  Campo ${campo.nombre} ya existe, omitiendo...`);
      }
    }

    // 5. Crear índices adicionales para optimización
    console.log('\n📝 Creando índices adicionales...');
    
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_turnos_extras_pagado ON turnos_extras(pagado)',
      'CREATE INDEX IF NOT EXISTS idx_turnos_extras_fecha_pago ON turnos_extras(fecha_pago)',
      'CREATE INDEX IF NOT EXISTS idx_turnos_extras_fecha_pagado ON turnos_extras(fecha, pagado)',
      'CREATE INDEX IF NOT EXISTS idx_turnos_extras_guardia_pagado ON turnos_extras(guardia_id, pagado)'
    ];

    for (const indice of indices) {
      try {
        await query(indice);
        console.log(`  ✅ Índice creado: ${indice.split(' ')[5]}`);
      } catch (error) {
        console.log(`  ℹ️  Índice ya existe: ${indice.split(' ')[5]}`);
      }
    }

    // 6. Verificar estructura final
    console.log('\n📋 Verificando estructura final...');
    const { rows: finalColumns } = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'turnos_extras'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estructura final de la tabla turnos_extras:');
    finalColumns.forEach((col: any) => {
      const defaultValue = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}${defaultValue}`);
    });

    console.log('\n✅ Actualización de tabla turnos_extras completada exitosamente!');
    console.log('\n📊 Campos agregados:');
    console.log('  - pagado: Para marcar turnos extras como pagados');
    console.log('  - fecha_pago: Para registrar cuándo se pagó');
    console.log('  - observaciones_pago: Para notas adicionales');
    console.log('  - usuario_pago: Para auditoría de quién marcó como pagado');
    console.log('\n🚀 La tabla está lista para el sistema de gestión de pagos!');

  } catch (error) {
    console.error('❌ Error durante la actualización:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Ejecutar el script
actualizarTablaTurnosExtras(); 