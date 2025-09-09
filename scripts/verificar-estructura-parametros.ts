// Script para verificar la estructura de la tabla sueldo_parametros_generales
// Ejecutar con: npx tsx scripts/verificar-estructura-parametros.ts

import { query } from '../src/lib/database';

async function verificarEstructura() {
  console.log('🔍 Verificando estructura de sueldo_parametros_generales...\n');
  
  try {
    // Verificar si la tabla existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sueldo_parametros_generales'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('❌ La tabla sueldo_parametros_generales no existe');
      return;
    }

    // Obtener estructura de la tabla
    const structure = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'sueldo_parametros_generales'
      ORDER BY ordinal_position;
    `);

    console.log('📊 Estructura actual de la tabla:');
    structure.rows.forEach((col: any) => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // Verificar si tiene la columna descripcion
    const hasDescripcion = structure.rows.some((col: any) => col.column_name === 'descripcion');
    console.log(`\n📝 ¿Tiene columna 'descripcion'? ${hasDescripcion ? '✅ Sí' : '❌ No'}`);

    // Mostrar algunos registros de ejemplo
    const sampleData = await query(`
      SELECT * FROM sueldo_parametros_generales 
      LIMIT 3
    `);

    console.log('\n📋 Datos de ejemplo:');
    sampleData.rows.forEach((row: any, index: number) => {
      console.log(`   Registro ${index + 1}:`, row);
    });

  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verificarEstructura()
    .then(() => {
      console.log('\n✅ Verificación completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en verificación:', error);
      process.exit(1);
    });
}

export { verificarEstructura };
