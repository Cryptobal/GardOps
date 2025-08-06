// Script para verificar y corregir la estructura de la tabla sueldo_parametros_generales
// Ejecutar con: npx tsx scripts/fix-sueldo-parametros-table.ts

import { query } from '../src/lib/database';

async function fixParametrosTable() {
  console.log('🔧 Verificando y corrigiendo tabla sueldo_parametros_generales...\n');
  
  try {
    // 1. Verificar si la tabla existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sueldo_parametros_generales'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('❌ La tabla sueldo_parametros_generales no existe');
      console.log('📝 Creando tabla con estructura correcta...');
      
      await query(`
        CREATE TABLE sueldo_parametros_generales (
          id SERIAL PRIMARY KEY,
          parametro VARCHAR(100) NOT NULL UNIQUE,
          valor DECIMAL(15,2) NOT NULL
        )
      `);
      
      console.log('✅ Tabla creada exitosamente');
      return;
    }

    // 2. Verificar la estructura actual
    console.log('📊 Verificando estructura actual...');
    const structure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'sueldo_parametros_generales'
      ORDER BY ordinal_position;
    `);

    console.log('Columnas actuales:');
    structure.rows.forEach((col: any) => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

    // 3. Verificar si existe la columna 'nombre'
    const hasNombre = structure.rows.some((col: any) => col.column_name === 'nombre');
    const hasParametro = structure.rows.some((col: any) => col.column_name === 'parametro');

    if (hasNombre && !hasParametro) {
      console.log('\n🔄 Migrando de columna "nombre" a "parametro"...');
      
      // Crear tabla temporal con estructura correcta
      await query(`
        CREATE TABLE sueldo_parametros_generales_new (
          id SERIAL PRIMARY KEY,
          parametro VARCHAR(100) NOT NULL UNIQUE,
          valor DECIMAL(15,2) NOT NULL
        )
      `);

      // Copiar datos de la tabla antigua a la nueva
      await query(`
        INSERT INTO sueldo_parametros_generales_new (id, parametro, valor)
        SELECT id, nombre, valor
        FROM sueldo_parametros_generales
      `);

      // Eliminar tabla antigua
      await query(`DROP TABLE sueldo_parametros_generales`);

      // Renombrar tabla nueva
      await query(`ALTER TABLE sueldo_parametros_generales_new RENAME TO sueldo_parametros_generales`);

      console.log('✅ Migración completada exitosamente');
    } else if (hasParametro) {
      console.log('✅ La tabla ya tiene la estructura correcta');
    } else {
      console.log('❌ La tabla no tiene ni "nombre" ni "parametro"');
      console.log('📝 Recreando tabla...');
      
      await query(`DROP TABLE IF EXISTS sueldo_parametros_generales`);
      
      await query(`
        CREATE TABLE sueldo_parametros_generales (
          id SERIAL PRIMARY KEY,
          parametro VARCHAR(100) NOT NULL UNIQUE,
          valor DECIMAL(15,2) NOT NULL
        )
      `);
      
      console.log('✅ Tabla recreada exitosamente');
    }

    // 4. Insertar datos de ejemplo si la tabla está vacía
    const count = await query(`SELECT COUNT(*) as count FROM sueldo_parametros_generales`);
    
    if (count.rows[0].count === '0') {
      console.log('\n📝 Insertando datos de ejemplo...');
      
      const parametros = [
        ['UF_TOPE_IMPONIBLE', 87.80, 'Tope imponible en UF para cotizaciones previsionales'],
        ['INGRESO_MINIMO', 529000.00, 'Ingreso mínimo mensual'],
        ['TOPE_GRATIFICACION_ANUAL', 2512750.00, 'Tope anual gratificación (4.75 ingresos mínimos)'],
        ['TOPE_GRATIFICACION_MENSUAL', 209396.00, 'Tope mensual gratificación (4.75 IM / 12)'],
        ['TASA_FONASA', 7.00, 'Tasa de cotización FONASA (%)'],
        ['TASA_AFC_INDEFINIDO_TRABAJADOR', 0.60, 'Tasa AFC trabajador contrato indefinido (%)'],
        ['TASA_AFC_INDEFINIDO_EMPLEADOR', 2.40, 'Tasa AFC empleador contrato indefinido (%)'],
        ['TASA_AFC_PLAZO_FIJO_EMPLEADOR', 3.00, 'Tasa AFC empleador contrato plazo fijo (%)'],
        ['TASA_SIS_EMPLEADOR', 1.88, 'Tasa SIS pagada por empleador (%)'],
        ['TASA_REFORMA_PREVISIONAL', 1.00, 'Tasa reforma previsional empleador (%)'],
        ['TASA_SANNA', 0.03, 'Tasa SANNA empleador (%)']
      ];
      
      for (const [parametro, valor, descripcion] of parametros) {
        await query(
          `INSERT INTO sueldo_parametros_generales (parametro, valor) 
           VALUES ($1, $2) 
           ON CONFLICT (parametro) DO UPDATE SET 
           valor = $2`,
          [parametro, valor]
        );
      }
      
      console.log('✅ Datos de ejemplo insertados');
    }

    // 5. Verificar resultado final
    console.log('\n📊 Verificando resultado final...');
    const finalStructure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'sueldo_parametros_generales'
      ORDER BY ordinal_position;
    `);

    console.log('Estructura final:');
    finalStructure.rows.forEach((col: any) => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

    const finalCount = await query(`SELECT COUNT(*) as count FROM sueldo_parametros_generales`);
    console.log(`\n📊 Total de registros: ${finalCount.rows[0].count}`);

    console.log('\n✅ Proceso completado exitosamente');
    
  } catch (error) {
    console.error('\n❌ Error durante el proceso:');
    console.error(error);
    process.exit(1);
  }
}

fixParametrosTable().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
