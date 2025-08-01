import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function checkRequisitosStructure() {
  console.log('🔍 Verificando estructura de as_turnos_requisitos...\n');

  try {
    // Obtener estructura de columnas
    const columns = await query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns
      WHERE table_name = 'as_turnos_requisitos'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('📋 ESTRUCTURA DE LA TABLA as_turnos_requisitos:');
    console.log('='.repeat(80));

    columns.rows.forEach((col: any) => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultValue = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`• ${col.column_name.padEnd(25)} (${col.data_type.padEnd(20)}) ${nullable}${defaultValue}`);
    });

    // Verificar datos existentes
    const dataCount = await query(`
      SELECT COUNT(*) as total FROM as_turnos_requisitos
    `);

    console.log('\n📊 DATOS EXISTENTES:');
    console.log('='.repeat(80));
    console.log(`Total de registros: ${dataCount.rows[0].total}`);

    if (dataCount.rows[0].total > 0) {
      const sampleData = await query(`
        SELECT 
          tr.id,
          tr.rol_servicio_id,
          tr.instalacion_id,
          tr.cantidad_guardias,
          rs.nombre as rol_nombre,
          i.nombre as instalacion_nombre
        FROM as_turnos_requisitos tr
        INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
        INNER JOIN instalaciones i ON tr.instalacion_id = i.id
        LIMIT 5
      `);

      console.log('\n📋 MUESTRA DE DATOS:');
      sampleData.rows.forEach((row: any, index: number) => {
        console.log(`Registro ${index + 1}:`);
        console.log(`  ID: ${row.id}`);
        console.log(`  Rol: ${row.rol_nombre}`);
        console.log(`  Instalación: ${row.instalacion_nombre}`);
        console.log(`  Cantidad guardias: ${row.cantidad_guardias}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error verificando tabla:', error);
  }
}

// Ejecutar la verificación
checkRequisitosStructure()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });