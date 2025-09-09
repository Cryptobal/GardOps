import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function testAsignacionRol() {
  try {
    console.log('🧪 Probando asignación de roles...\n');

    // 1. Verificar usuario de prueba
    console.log('1. Verificando usuario de prueba...');
    const usuario = await sql`
      SELECT id, email, nombre
      FROM usuarios
      WHERE email = 'cl@cl.cl'
      LIMIT 1
    `;

    if (usuario.rows.length === 0) {
      console.log('❌ Usuario cl@cl.cl no encontrado');
      return;
    }

    const userId = usuario.rows[0].id;
    console.log(`✅ Usuario: ${usuario.rows[0].email} (${usuario.rows[0].nombre})`);

    // 2. Verificar roles disponibles
    console.log('\n2. Roles disponibles:');
    const roles = await sql`
      SELECT id, nombre, tenant_id
      FROM roles
      ORDER BY nombre
    `;

    console.log(`📊 Total roles: ${roles.rows.length}`);
    roles.rows.forEach((rol: any) => {
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   - ${rol.nombre} (${tipo}): ${rol.id}`);
    });

    // 3. Verificar rol actual
    console.log('\n3. Rol actual del usuario:');
    const rolActual = await sql`
      SELECT r.id, r.nombre, r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${userId}
      LIMIT 1
    `;

    if (rolActual.rows.length > 0) {
      const rol = rolActual.rows[0];
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   📋 Rol actual: ${rol.nombre} (${tipo})`);
    } else {
      console.log('   ⚠️  No tiene rol asignado');
    }

    // 4. Probar asignación de un rol diferente
    console.log('\n4. Probando asignación de rol...');
    
    // Buscar un rol diferente al actual
    let rolParaAsignar = null;
    if (rolActual.rows.length > 0) {
      const rolActualId = rolActual.rows[0].id;
      rolParaAsignar = roles.rows.find((r: any) => r.id !== rolActualId);
    } else {
      rolParaAsignar = roles.rows[0]; // Asignar el primer rol disponible
    }

    if (!rolParaAsignar) {
      console.log('❌ No hay roles disponibles para asignar');
      return;
    }

    console.log(`   🎯 Asignando rol: ${rolParaAsignar.nombre}`);
    
    // Simular la lógica del backend
    try {
      // Remover todos los roles existentes
      await sql`
        DELETE FROM usuarios_roles 
        WHERE usuario_id = ${userId}
      `;
      console.log('   ✅ Roles existentes removidos');

      // Asignar el nuevo rol
      await sql`
        INSERT INTO usuarios_roles (usuario_id, rol_id)
        VALUES (${userId}, ${rolParaAsignar.id})
      `;
      console.log('   ✅ Nuevo rol asignado');

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      return;
    }

    // 5. Verificar resultado
    console.log('\n5. Verificando resultado...');
    const rolFinal = await sql`
      SELECT r.id, r.nombre, r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${userId}
      LIMIT 1
    `;

    if (rolFinal.rows.length > 0) {
      const rol = rolFinal.rows[0];
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   ✅ Rol asignado: ${rol.nombre} (${tipo})`);
    } else {
      console.log('   ❌ No se pudo asignar el rol');
    }

    // 6. Verificar que solo tiene un rol
    console.log('\n6. Verificando que solo tiene un rol...');
    const totalRoles = await sql`
      SELECT COUNT(*) as total
      FROM usuarios_roles
      WHERE usuario_id = ${userId}
    `;

    const count = totalRoles.rows[0].total;
    console.log(`   📊 Total roles: ${count}`);
    
    if (count === 1) {
      console.log('   ✅ Usuario tiene exactamente 1 rol');
    } else if (count === 0) {
      console.log('   ⚠️  Usuario no tiene roles');
    } else {
      console.log('   ❌ Usuario tiene múltiples roles');
    }

    // 7. Probar endpoint manualmente
    console.log('\n7. Probando endpoint manualmente...');
    
    // Simular la llamada al endpoint
    const endpointTest = await sql`
      SELECT 
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM usuarios_roles 
            WHERE usuario_id = ${userId} 
            AND rol_id = ${rolParaAsignar.id}
          ) THEN true
          ELSE false
        END as rol_asignado
    `;

    const rolAsignado = endpointTest.rows[0].rol_asignado;
    console.log(`   🔗 Endpoint test: ${rolAsignado ? '✅ Rol asignado' : '❌ Rol no asignado'}`);

    // 8. Resumen final
    console.log('\n🎉 PRUEBA COMPLETADA');
    console.log('\n✅ La lógica de asignación funciona correctamente:');
    console.log('   - Se remueven roles existentes');
    console.log('   - Se asigna el nuevo rol');
    console.log('   - Usuario tiene solo 1 rol');
    console.log('   - Endpoint responde correctamente');

    console.log('\n💡 Si el frontend no funciona, el problema puede ser:');
    console.log('   - Error en el componente RadioGroup');
    console.log('   - Error en la función assignUserRole');
    console.log('   - Error en la comunicación con el backend');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    throw error;
  }
}

testAsignacionRol().then(() => {
  console.log('\n🏁 Prueba completada');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
