#!/usr/bin/env ts-node

import { Pool } from 'pg';

async function verificarEstructuraGuardias(): Promise<void> {
  console.log('🔍 Verificando estructura de la tabla guardias...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  try {
    // Verificar si la tabla existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'guardias'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ La tabla guardias no existe');
      return;
    }
    
    // Obtener estructura de columnas
    const columns = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 ESTRUCTURA DE LA TABLA GUARDIAS:');
    console.log('='.repeat(80));
    
    columns.rows.forEach((col: any) => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultValue = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`• ${col.column_name.padEnd(25)} (${col.data_type.padEnd(20)}) ${nullable}${defaultValue}`);
    });
    
    console.log('='.repeat(80));
    console.log(`Total de columnas: ${columns.rows.length}`);
    
    // Verificar si existen columnas críticas
    const columnNames = columns.rows.map((col: any) => col.column_name);
    
    const columnasCriticas = [
      'tenant_id', 'nombre', 'apellido', 'email', 'telefono', 'activo',
      'latitud', 'longitud', 'ciudad', 'comuna', 'region'
    ];
    
    console.log('\n🔍 VERIFICACIÓN DE COLUMNAS CRÍTICAS:');
    columnasCriticas.forEach(col => {
      const existe = columnNames.includes(col);
      console.log(`${existe ? '✅' : '❌'} ${col.padEnd(20)} ${existe ? 'PRESENTE' : 'FALTA'}`);
    });
    
    // Verificar si hay datos
    const count = await pool.query('SELECT COUNT(*) FROM guardias');
    console.log(`\n📊 Total de registros en la tabla: ${count.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  verificarEstructuraGuardias()
    .then(() => {
      console.log('\n✅ Verificación completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { verificarEstructuraGuardias }; 