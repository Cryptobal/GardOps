import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde el directorio raíz
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function verificarRutProduccion() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🔌 Conectado a la base de datos de producción');

    const rut = '50488303-5';
    const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337';

    console.log(`🔍 Verificando RUT: ${rut} en tenant: ${tenantId}`);

    // 1. Verificar si el RUT existe
    const rutExiste = await client.query(
      'SELECT id, nombre, apellido_paterno, email, created_at FROM guardias WHERE rut = $1 AND tenant_id = $2',
      [rut, tenantId]
    );

    console.log('📊 Resultado de búsqueda por RUT:');
    console.log('   - Filas encontradas:', rutExiste.rows.length);
    if (rutExiste.rows.length > 0) {
      console.log('   - Datos encontrados:', rutExiste.rows[0]);
    }

    // 2. Verificar si existe en otros tenants
    const rutOtrosTenants = await client.query(
      'SELECT id, nombre, apellido_paterno, email, tenant_id, created_at FROM guardias WHERE rut = $1',
      [rut]
    );

    console.log('📊 RUT en otros tenants:');
    console.log('   - Total de ocurrencias:', rutOtrosTenants.rows.length);
    if (rutOtrosTenants.rows.length > 0) {
      rutOtrosTenants.rows.forEach((row, index) => {
        console.log(`   - ${index + 1}: Tenant ${row.tenant_id}, Nombre: ${row.nombre} ${row.apellido_paterno}, Email: ${row.email}, Creado: ${row.created_at}`);
      });
    }

    // 3. Verificar la query exacta que usa la API
    console.log('🔍 Ejecutando la query exacta de la API:');
    const queryAPI = await client.query(
      'SELECT id FROM guardias WHERE rut = $1 AND tenant_id = $2 LIMIT 1',
      [rut, tenantId]
    );

    console.log('📊 Query de la API:');
    console.log('   - Parámetros: rut =', rut, ', tenant_id =', tenantId);
    console.log('   - Filas encontradas:', queryAPI.rows.length);
    console.log('   - Resultado:', queryAPI.rows);

    // 4. Verificar si hay algún trigger o constraint que pueda estar interfiriendo
    console.log('🔍 Verificando estructura de la tabla:');
    const estructura = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
      ORDER BY ordinal_position
    `);

    console.log('📊 Estructura de la tabla guardias:');
    estructura.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // 5. Verificar constraints
    console.log('🔍 Verificando constraints:');
    const constraints = await client.query(`
      SELECT 
        constraint_name,
        constraint_type,
        table_name
      FROM information_schema.table_constraints 
      WHERE table_name = 'guardias'
    `);

    console.log('📊 Constraints de la tabla:');
    constraints.rows.forEach(constraint => {
      console.log(`   - ${constraint.constraint_name}: ${constraint.constraint_type}`);
    });

    // 6. Verificar si hay algún problema con el tenant
    console.log('🔍 Verificando si el tenant existe:');
    const tenantExiste = await client.query(
      'SELECT id, nombre, activo FROM tenants WHERE id = $1',
      [tenantId]
    );

    console.log('📊 Verificación del tenant:');
    console.log('   - Tenant encontrado:', tenantExiste.rows.length > 0);
    if (tenantExiste.rows.length > 0) {
      console.log('   - Datos del tenant:', tenantExiste.rows[0]);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

verificarRutProduccion().catch(console.error);
