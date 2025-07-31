import { query, checkConnection, checkTableExists, hasData } from '../src/lib/database';

async function checkDatabaseStatus() {
  console.log('🔍 Verificando estado de la base de datos...\n');

  try {
    // 1. Verificar conexión
    console.log('1️⃣ Verificando conexión a la base de datos...');
    const isConnected = await checkConnection();
    if (isConnected) {
      console.log('✅ Conexión exitosa a la base de datos');
    } else {
      console.log('❌ No se pudo conectar a la base de datos');
      return;
    }

    // 2. Verificar si existe la tabla usuarios
    console.log('\n2️⃣ Verificando tabla usuarios...');
    const usuariosTableExists = await checkTableExists('usuarios');
    if (usuariosTableExists) {
      console.log('✅ Tabla usuarios existe');
    } else {
      console.log('❌ Tabla usuarios no existe');
      return;
    }

    // 3. Verificar si existe la tabla tenants
    console.log('\n3️⃣ Verificando tabla tenants...');
    const tenantsTableExists = await checkTableExists('tenants');
    if (tenantsTableExists) {
      console.log('✅ Tabla tenants existe');
    } else {
      console.log('❌ Tabla tenants no existe');
      return;
    }

    // 4. Verificar si hay datos en usuarios
    console.log('\n4️⃣ Verificando datos en tabla usuarios...');
    const hasUsers = await hasData('usuarios');
    if (hasUsers) {
      console.log('✅ Hay usuarios en la base de datos');
    } else {
      console.log('❌ No hay usuarios en la base de datos');
    }

    // 5. Verificar si hay datos en tenants
    console.log('\n5️⃣ Verificando datos en tabla tenants...');
    const hasTenants = await hasData('tenants');
    if (hasTenants) {
      console.log('✅ Hay tenants en la base de datos');
    } else {
      console.log('❌ No hay tenants en la base de datos');
    }

    // 6. Listar usuarios existentes
    console.log('\n6️⃣ Listando usuarios existentes...');
    try {
      const usersResult = await query(`
        SELECT id, email, nombre, apellido, rol, activo, tenant_id, fecha_creacion
        FROM usuarios 
        ORDER BY fecha_creacion DESC
      `);

      if (usersResult.rows.length > 0) {
        console.log(`✅ Se encontraron ${usersResult.rows.length} usuarios:`);
        usersResult.rows.forEach((user: any, index: number) => {
          console.log(`   ${index + 1}. ${user.email} (${user.nombre} ${user.apellido}) - Rol: ${user.rol} - Activo: ${user.activo}`);
        });
      } else {
        console.log('❌ No se encontraron usuarios');
      }
    } catch (error) {
      console.error('❌ Error listando usuarios:', error);
    }

    // 7. Listar tenants existentes
    console.log('\n7️⃣ Listando tenants existentes...');
    try {
      const tenantsResult = await query(`
        SELECT id, nombre, descripcion, activo, fecha_creacion
        FROM tenants 
        ORDER BY fecha_creacion DESC
      `);

      if (tenantsResult.rows.length > 0) {
        console.log(`✅ Se encontraron ${tenantsResult.rows.length} tenants:`);
        tenantsResult.rows.forEach((tenant: any, index: number) => {
          console.log(`   ${index + 1}. ${tenant.nombre} - Activo: ${tenant.activo}`);
        });
      } else {
        console.log('❌ No se encontraron tenants');
      }
    } catch (error) {
      console.error('❌ Error listando tenants:', error);
    }

    console.log('\n📋 RESUMEN:');
    console.log(`- Conexión: ${isConnected ? '✅' : '❌'}`);
    console.log(`- Tabla usuarios: ${usuariosTableExists ? '✅' : '❌'}`);
    console.log(`- Tabla tenants: ${tenantsTableExists ? '✅' : '❌'}`);
    console.log(`- Usuarios existentes: ${hasUsers ? '✅' : '❌'}`);
    console.log(`- Tenants existentes: ${hasTenants ? '✅' : '❌'}`);

    if (!hasUsers) {
      console.log('\n🚀 Para crear usuarios por defecto, ejecuta:');
      console.log('curl -X POST http://localhost:3000/api/init-users');
    }

  } catch (error) {
    console.error('❌ Error verificando estado de la base de datos:', error);
  }
}

// Ejecutar el script
checkDatabaseStatus().catch(console.error); 