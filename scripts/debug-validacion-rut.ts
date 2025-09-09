import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function debugValidacionRut() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 DEBUGGEANDO VALIDACIÓN DE RUT');
    console.log('==================================\n');

    const rutABuscar = '12983018-2';
    const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337';

    console.log(`1️⃣ Parámetros de búsqueda:`);
    console.log(`   RUT: ${rutABuscar}`);
    console.log(`   Tenant ID: ${tenantId}`);
    console.log('');

    // 1. Ejecutar exactamente la misma consulta de la API
    console.log('2️⃣ Ejecutando la consulta exacta de la API...');
    const consultaAPI = await client.query(
      'SELECT id FROM guardias WHERE rut = $1 AND tenant_id = $2 LIMIT 1',
      [rutABuscar, tenantId]
    );
    
    console.log('Resultado de la consulta:');
    console.log(`   Filas encontradas: ${consultaAPI.rows.length}`);
    if (consultaAPI.rows.length > 0) {
      console.log('   Datos encontrados:', consultaAPI.rows[0]);
    }
    console.log('');

    // 2. Verificar si hay algún problema con el RUT (espacios, caracteres especiales)
    console.log('3️⃣ Verificando el RUT sin limpiar...');
    const rutSinLimpiar = await client.query(
      'SELECT id FROM guardias WHERE rut = $1 AND tenant_id = $2 LIMIT 1',
      [rutABuscar, tenantId]
    );
    
    console.log('RUT sin limpiar:');
    console.log(`   Filas encontradas: ${rutSinLimpiar.rows.length}`);
    console.log('');

    // 3. Verificar si hay algún problema con el tenant_id
    console.log('4️⃣ Verificando solo por RUT (sin tenant)...');
    const soloRut = await client.query(
      'SELECT id, tenant_id FROM guardias WHERE rut = $1 LIMIT 5',
      [rutABuscar]
    );
    
    console.log('Solo por RUT:');
    console.log(`   Filas encontradas: ${soloRut.rows.length}`);
    if (soloRut.rows.length > 0) {
      soloRut.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ID: ${row.id}, Tenant: ${row.tenant_id}`);
      });
    }
    console.log('');

    // 4. Verificar si hay algún problema con el tenant_id
    console.log('5️⃣ Verificando solo por tenant_id...');
    const soloTenant = await client.query(
      'SELECT id, rut FROM guardias WHERE tenant_id = $1 LIMIT 5',
      [tenantId]
    );
    
    console.log('Solo por tenant_id:');
    console.log(`   Filas encontradas: ${soloTenant.rows.length}`);
    if (soloTenant.rows.length > 0) {
      soloTenant.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ID: ${row.id}, RUT: ${row.rut}`);
      });
    }
    console.log('');

    // 5. Verificar si hay algún problema con la tabla guardias
    console.log('6️⃣ Verificando estructura de la tabla guardias...');
    const estructura = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
      AND column_name IN ('id', 'rut', 'tenant_id')
      ORDER BY ordinal_position;
    `);
    
    console.log('Estructura de columnas relevantes:');
    estructura.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

  } catch (error: any) {
    console.error('❌ Error durante el debug:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

debugValidacionRut().catch(console.error);
