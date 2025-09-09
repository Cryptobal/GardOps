import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verificarRutEspecifico() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 VERIFICANDO RUT ESPECÍFICO');
    console.log('================================\n');

    const rutABuscar = '12983018-2';
    const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337';

    console.log(`1️⃣ Buscando RUT: ${rutABuscar}`);
    console.log(`   Tenant ID: ${tenantId}`);
    console.log('');

    // 1. Verificar si el tenant existe
    console.log('2️⃣ Verificando si el tenant existe...');
    const tenantCheck = await client.query(`
      SELECT id, nombre, activo 
      FROM tenants 
      WHERE id = $1;
    `, [tenantId]);
    
    if (tenantCheck.rows.length === 0) {
      console.log('❌ El tenant NO existe en la base de datos');
      return;
    } else {
      console.log('✅ Tenant encontrado:', tenantCheck.rows[0]);
    }
    console.log('');

    // 2. Buscar el RUT específico en guardias
    console.log('3️⃣ Buscando el RUT en la tabla guardias...');
    const rutCheck = await client.query(`
      SELECT 
        id, rut, nombre, apellido_paterno, email, tenant_id, activo, created_at
      FROM guardias 
      WHERE rut = $1;
    `, [rutABuscar]);
    
    if (rutCheck.rows.length === 0) {
      console.log('✅ El RUT NO existe en la tabla guardias');
    } else {
      console.log('❌ El RUT SÍ existe en guardias:');
      rutCheck.rows.forEach(row => {
        console.log(`   - ID: ${row.id}`);
        console.log(`   - Nombre: ${row.nombre} ${row.apellido_paterno}`);
        console.log(`   - Email: ${row.email}`);
        console.log(`   - Tenant ID: ${row.tenant_id}`);
        console.log(`   - Activo: ${row.activo}`);
        console.log(`   - Creado: ${row.created_at}`);
      });
    }
    console.log('');

    // 3. Buscar el RUT en el tenant específico
    console.log('4️⃣ Buscando el RUT en el tenant específico...');
    const rutEnTenant = await client.query(`
      SELECT 
        id, rut, nombre, apellido_paterno, email, tenant_id, activo, created_at
      FROM guardias 
      WHERE rut = $1 AND tenant_id = $2;
    `, [rutABuscar, tenantId]);
    
    if (rutEnTenant.rows.length === 0) {
      console.log('✅ El RUT NO existe en este tenant específico');
    } else {
      console.log('❌ El RUT SÍ existe en este tenant:');
      rutEnTenant.rows.forEach(row => {
        console.log(`   - ID: ${row.id}`);
        console.log(`   - Nombre: ${row.nombre} ${row.apellido_paterno}`);
        console.log(`   - Email: ${row.email}`);
        console.log(`   - Activo: ${row.activo}`);
        console.log(`   - Creado: ${row.created_at}`);
      });
    }
    console.log('');

    // 4. Verificar la consulta exacta que usa la API
    console.log('5️⃣ Verificando la consulta exacta de la API...');
    const consultaAPI = await client.query(`
      SELECT 
        id, rut, nombre, apellido_paterno, email, tenant_id, activo
      FROM guardias 
      WHERE rut = $1 AND tenant_id = $2 AND activo = true;
    `, [rutABuscar, tenantId]);
    
    console.log('Resultado de la consulta de la API:');
    if (consultaAPI.rows.length === 0) {
      console.log('✅ La consulta de la API NO encuentra el RUT');
    } else {
      console.log('❌ La consulta de la API SÍ encuentra el RUT:');
      consultaAPI.rows.forEach(row => {
        console.log(`   - ID: ${row.id}`);
        console.log(`   - Nombre: ${row.nombre} ${row.apellido_paterno}`);
        console.log(`   - Email: ${row.email}`);
        console.log(`   - Activo: ${row.activo}`);
      });
    }
    console.log('');

    // 5. Verificar si hay algún trigger o regla que pueda estar interfiriendo
    console.log('6️⃣ Verificando triggers y reglas en la tabla guardias...');
    const triggers = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_statement
      FROM information_schema.triggers 
      WHERE event_object_table = 'guardias';
    `);
    
    console.log('Triggers encontrados:', triggers.rows.length);
    triggers.rows.forEach(trigger => {
      console.log(`   - ${trigger.trigger_name}: ${trigger.event_manipulation}`);
    });

  } catch (error: any) {
    console.error('❌ Error durante la verificación:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

verificarRutEspecifico().catch(console.error);
