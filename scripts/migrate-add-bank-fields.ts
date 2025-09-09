#!/usr/bin/env ts-node
import { config } from 'dotenv';
import path from 'path';
import { query, checkConnection } from '../src/lib/database';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

async function migrateAddBankFields() {
  console.log('🚀 Iniciando migración para agregar campos bancarios a guardias...\n');
  
  try {
    // Verificar conexión
    await checkConnection();
    console.log('✅ Conexión a base de datos establecida');

    // Verificar si la tabla guardias existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'guardias'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.error('❌ La tabla guardias no existe');
      process.exit(1);
    }

    // Verificar si los campos ya existen
    const columnsExist = await query(`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
      AND column_name IN ('banco', 'tipo_cuenta', 'numero_cuenta')
      ORDER BY column_name;
    `);

    const existingColumns = columnsExist.rows.map((row: any) => row.column_name);
    console.log(`📋 Campos bancarios existentes: ${existingColumns.length > 0 ? existingColumns.join(', ') : 'ninguno'}`);

    // Agregar campos faltantes
    const fieldsToAdd = [];
    
    if (!existingColumns.includes('banco')) {
      fieldsToAdd.push('banco UUID REFERENCES bancos(id)');
    }
    
    if (!existingColumns.includes('tipo_cuenta')) {
      fieldsToAdd.push('tipo_cuenta TEXT CHECK (tipo_cuenta IN (\'CCT\', \'CTE\', \'CTA\', \'RUT\'))');
    }
    
    if (!existingColumns.includes('numero_cuenta')) {
      fieldsToAdd.push('numero_cuenta TEXT');
    }

    if (fieldsToAdd.length > 0) {
      console.log('📋 Agregando campos bancarios...');
      
      for (const field of fieldsToAdd) {
        const columnName = field.split(' ')[0];
        console.log(`  ➕ Agregando campo: ${columnName}`);
        
        await query(`ALTER TABLE guardias ADD COLUMN IF NOT EXISTS ${field}`);
      }

      // Crear índices para mejorar rendimiento
      console.log('📋 Creando índices...');
      await query('CREATE INDEX IF NOT EXISTS idx_guardias_banco ON guardias(banco)');
      await query('CREATE INDEX IF NOT EXISTS idx_guardias_tipo_cuenta ON guardias(tipo_cuenta)');
      await query('CREATE INDEX IF NOT EXISTS idx_guardias_numero_cuenta ON guardias(numero_cuenta)');

      console.log('✅ Campos bancarios agregados exitosamente');
    } else {
      console.log('✅ Todos los campos bancarios ya existen');
    }

    // Verificar que la tabla bancos existe
    const bancosExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'bancos'
      );
    `);

    if (!bancosExists.rows[0].exists) {
      console.log('📋 Creando tabla bancos...');
      await query(`
        CREATE TABLE bancos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nombre TEXT NOT NULL UNIQUE,
          codigo TEXT UNIQUE,
          activo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insertar bancos comunes de Chile
      console.log('📋 Insertando bancos comunes...');
      const bancosChile = [
        { nombre: 'Banco de Chile', codigo: '001' },
        { nombre: 'Banco Santander', codigo: '037' },
        { nombre: 'Banco de Crédito e Inversiones', codigo: '009' },
        { nombre: 'Banco Estado', codigo: '012' },
        { nombre: 'Banco BCI', codigo: '014' },
        { nombre: 'Banco Security', codigo: '049' },
        { nombre: 'Banco Falabella', codigo: '051' },
        { nombre: 'Banco Ripley', codigo: '053' },
        { nombre: 'Banco Consorcio', codigo: '055' },
        { nombre: 'Banco Paris', codigo: '056' },
        { nombre: 'Banco Itaú', codigo: '059' },
        { nombre: 'Banco BBVA', codigo: '018' },
        { nombre: 'Banco Scotiabank', codigo: '014' },
        { nombre: 'Banco Internacional', codigo: '016' },
        { nombre: 'Banco del Desarrollo', codigo: '037' }
      ];

      for (const banco of bancosChile) {
        await query(`
          INSERT INTO bancos (nombre, codigo)
          VALUES ($1, $2)
          ON CONFLICT (nombre) DO NOTHING
        `, [banco.nombre, banco.codigo]);
      }

      console.log('✅ Tabla bancos creada y poblada');
    } else {
      console.log('✅ Tabla bancos ya existe');
    }

    // Verificar estructura final
    console.log('\n📊 Verificando estructura final...');
    const finalStructure = await query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
      AND column_name IN ('banco', 'tipo_cuenta', 'numero_cuenta')
      ORDER BY column_name;
    `);

    console.log('📋 Campos bancarios en tabla guardias:');
    finalStructure.rows.forEach((row: any) => {
      console.log(`  • ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    console.log('\n✅ Migración completada exitosamente');
    console.log('🎯 Los campos bancarios están listos para usar en la aplicación');

  } catch (error) {
    console.error('\n❌ Error en migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrateAddBankFields()
  .then(() => {
    console.log('\n🎉 Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error ejecutando migración:', error);
    process.exit(1);
  }); 