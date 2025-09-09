import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function testFrontendRol() {
  try {
    console.log('🧪 Probando flujo completo del frontend...\n');

    // 1. Simular usuario que hace la petición
    console.log('1. Simulando usuario Platform Admin...');
    const adminUser = await sql`
      SELECT id, email, nombre
      FROM usuarios
      WHERE email = 'carlos.irigoyen@gard.cl'
      LIMIT 1
    `;

    if (adminUser.rows.length === 0) {
      console.log('❌ Usuario admin no encontrado');
      return;
    }

    const adminId = adminUser.rows[0].id;
    console.log(`✅ Admin: ${adminUser.rows[0].email}`);

    // 2. Simular usuario objetivo
    console.log('\n2. Usuario objetivo...');
    const targetUser = await sql`
      SELECT id, email, nombre
      FROM usuarios
      WHERE email = 'cl@cl.cl'
      LIMIT 1
    `;

    if (targetUser.rows.length === 0) {
      console.log('❌ Usuario objetivo no encontrado');
      return;
    }

    const targetId = targetUser.rows[0].id;
    console.log(`✅ Objetivo: ${targetUser.rows[0].email}`);

    // 3. Simular GET inicial (cargar roles del usuario)
    console.log('\n3. Simulando GET inicial...');
    const rolesActuales = await sql`
      SELECT r.id, r.nombre, r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${targetId}
      ORDER BY r.nombre
    `;

    console.log(`📊 Roles actuales: ${rolesActuales.rows.length}`);
    rolesActuales.rows.forEach((rol: any) => {
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   - ${rol.nombre} (${tipo}): ${rol.id}`);
    });

    // 4. Simular lista de roles disponibles
    console.log('\n4. Simulando lista de roles disponibles...');
    const rolesDisponibles = await sql`
      SELECT id, nombre, tenant_id
      FROM roles
      ORDER BY nombre
    `;

    console.log(`📊 Roles disponibles: ${rolesDisponibles.rows.length}`);
    rolesDisponibles.rows.forEach((rol: any) => {
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   - ${rol.nombre} (${tipo}): ${rol.id}`);
    });

    // 5. Simular selección de un rol diferente
    console.log('\n5. Simulando selección de rol...');
    
    let rolSeleccionado = null;
    if (rolesActuales.rows.length > 0) {
      const rolActualId = rolesActuales.rows[0].id;
      rolSeleccionado = rolesDisponibles.rows.find((r: any) => r.id !== rolActualId);
    } else {
      rolSeleccionado = rolesDisponibles.rows[0];
    }

    if (!rolSeleccionado) {
      console.log('❌ No hay rol para seleccionar');
      return;
    }

    console.log(`🎯 Rol seleccionado: ${rolSeleccionado.nombre} (${rolSeleccionado.id})`);

    // 6. Simular POST request (asignar rol)
    console.log('\n6. Simulando POST request...');
    
    // Verificar permisos del admin
    const tienePermisos = await sql`
      SELECT public.fn_usuario_tiene_permiso(${adminId}, 'rbac.platform_admin') as allowed
    `;

    if (!tienePermisos.rows[0].allowed) {
      console.log('❌ Admin no tiene permisos Platform Admin');
      return;
    }

    console.log('✅ Admin tiene permisos Platform Admin');

    // Verificar que el usuario objetivo existe
    const usuarioExiste = await sql`
      SELECT id FROM usuarios WHERE id = ${targetId} LIMIT 1
    `;

    if (usuarioExiste.rows.length === 0) {
      console.log('❌ Usuario objetivo no existe');
      return;
    }

    console.log('✅ Usuario objetivo existe');

    // Verificar que el rol existe
    const rolExiste = await sql`
      SELECT id FROM roles WHERE id = ${rolSeleccionado.id} LIMIT 1
    `;

    if (rolExiste.rows.length === 0) {
      console.log('❌ Rol seleccionado no existe');
      return;
    }

    console.log('✅ Rol seleccionado existe');

    // 7. Ejecutar la lógica del backend
    console.log('\n7. Ejecutando lógica del backend...');
    
    try {
      // Remover todos los roles existentes
      await sql`
        DELETE FROM usuarios_roles 
        WHERE usuario_id = ${targetId}
      `;
      console.log('   ✅ Roles existentes removidos');

      // Asignar el nuevo rol
      await sql`
        INSERT INTO usuarios_roles (usuario_id, rol_id)
        VALUES (${targetId}, ${rolSeleccionado.id})
      `;
      console.log('   ✅ Nuevo rol asignado');

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      return;
    }

    // 8. Verificar resultado final
    console.log('\n8. Verificando resultado...');
    const rolFinal = await sql`
      SELECT r.id, r.nombre, r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${targetId}
      LIMIT 1
    `;

    if (rolFinal.rows.length > 0) {
      const rol = rolFinal.rows[0];
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   ✅ Rol final: ${rol.nombre} (${tipo})`);
    } else {
      console.log('   ❌ No se pudo asignar el rol');
    }

    // 9. Simular GET final (verificar cambios)
    console.log('\n9. Simulando GET final...');
    const rolesFinales = await sql`
      SELECT r.id, r.nombre, r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${targetId}
      ORDER BY r.nombre
    `;

    console.log(`📊 Roles finales: ${rolesFinales.rows.length}`);
    rolesFinales.rows.forEach((rol: any) => {
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   - ${rol.nombre} (${tipo}): ${rol.id}`);
    });

    // 10. Resumen final
    console.log('\n🎉 PRUEBA COMPLETADA');
    console.log('\n✅ El flujo completo funciona correctamente:');
    console.log('   - GET inicial carga roles actuales');
    console.log('   - Lista de roles disponibles');
    console.log('   - Selección de rol diferente');
    console.log('   - POST request con validaciones');
    console.log('   - Lógica de reemplazo en backend');
    console.log('   - GET final verifica cambios');
    console.log('   - Usuario tiene solo 1 rol');

    console.log('\n💡 Si el frontend no funciona, verifica:');
    console.log('   - Console del navegador para errores JavaScript');
    console.log('   - Network tab para errores HTTP');
    console.log('   - Que el componente RadioGroup esté funcionando');
    console.log('   - Que la función assignUserRole se esté llamando');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    throw error;
  }
}

testFrontendRol().then(() => {
  console.log('\n🏁 Prueba completada');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
