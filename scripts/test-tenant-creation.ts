import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function testTenantCreation() {
  try {
    console.log('🧪 Probando creación de tenant con administrador...\n');

    // Datos de prueba
    const testData = {
      nombre: 'Empresa Test',
      rut: '12.345.678-9',
      admin_email: 'admin@test.com',
      admin_nombre: 'Admin Test',
      admin_password: 'test123'
    };

    console.log('📋 Datos de prueba:', testData);

    // Simular la creación usando la misma lógica del endpoint
    console.log('\n🔧 Creando tenant con administrador...');

    const result = await sql`
      WITH new_tenant AS (
        INSERT INTO tenants (nombre, rut, activo)
        VALUES (${testData.nombre}, ${testData.rut}, true)
        RETURNING id, nombre, rut, activo, created_at
      ),
      new_admin_role AS (
        INSERT INTO roles (nombre, descripcion, tenant_id)
        SELECT 'Admin', 'Administrador del tenant', nt.id
        FROM new_tenant nt
        RETURNING id, nombre, tenant_id
      ),
      new_admin_user AS (
        INSERT INTO usuarios (tenant_id, email, password, nombre, apellido, rol, activo)
        SELECT 
          nt.id,
          lower(${testData.admin_email}),
          crypt(${testData.admin_password}, gen_salt('bf')),
          ${testData.admin_nombre},
          'Tenant',
          'admin',
          true
        FROM new_tenant nt
        RETURNING id, email, nombre, tenant_id
      ),
      assign_role AS (
        INSERT INTO usuarios_roles (usuario_id, rol_id)
        SELECT u.id, r.id
        FROM new_admin_user u
        JOIN new_admin_role r ON r.tenant_id = u.tenant_id
        RETURNING usuario_id, rol_id
      ),
      assign_permissions AS (
        INSERT INTO roles_permisos (rol_id, permiso_id)
        SELECT r.id, p.id
        FROM new_admin_role r
        CROSS JOIN permisos p
        WHERE p.clave IN (
          'turnos.*', 'turnos.view', 'turnos.edit',
          'payroll.*', 'payroll.view', 'payroll.edit',
          'maestros.*', 'maestros.view', 'maestros.edit',
          'usuarios.manage', 'documentos.manage', 'config.manage'
        )
        ON CONFLICT DO NOTHING
        RETURNING rol_id, permiso_id
      )
      SELECT 
        nt.id as tenant_id,
        nt.nombre as tenant_nombre,
        nt.rut as tenant_rut,
        nt.activo as tenant_activo,
        nt.created_at as tenant_created_at,
        u.id as admin_id,
        u.email as admin_email,
        u.nombre as admin_nombre,
        r.id as admin_role_id,
        r.nombre as admin_role_nombre
      FROM new_tenant nt
      JOIN new_admin_user u ON u.tenant_id = nt.id
      JOIN new_admin_role r ON r.tenant_id = nt.id
    `;

    const newTenant = result.rows[0];

    if (!newTenant) {
      console.log('❌ Error: No se pudo crear el tenant');
      return;
    }

    console.log('✅ Tenant creado exitosamente:');
    console.log(`   🏢 Tenant ID: ${newTenant.tenant_id}`);
    console.log(`   📝 Nombre: ${newTenant.tenant_nombre}`);
    console.log(`   🆔 RUT: ${newTenant.tenant_rut}`);
    console.log(`   ✅ Activo: ${newTenant.tenant_activo}`);

    console.log('\n👤 Administrador creado:');
    console.log(`   🆔 Admin ID: ${newTenant.admin_id}`);
    console.log(`   📧 Email: ${newTenant.admin_email}`);
    console.log(`   👤 Nombre: ${newTenant.admin_nombre}`);
    console.log(`   🛡️ Rol ID: ${newTenant.admin_role_id}`);
    console.log(`   🏷️ Rol: ${newTenant.admin_role_nombre}`);

    // Verificar permisos asignados
    console.log('\n🔍 Verificando permisos asignados...');
    const permissions = await sql`
      SELECT p.clave, p.descripcion
      FROM roles_permisos rp
      JOIN permisos p ON p.id = rp.permiso_id
      WHERE rp.rol_id = ${newTenant.admin_role_id}
      ORDER BY p.clave
    `;

    console.log(`   📋 Permisos asignados (${permissions.rows.length}):`);
    permissions.rows.forEach((perm: any) => {
      console.log(`      ✅ ${perm.clave} - ${perm.descripcion}`);
    });

    // Verificar que el usuario puede hacer login
    console.log('\n🔐 Verificando autenticación...');
    const authCheck = await sql`
      SELECT 
        u.id,
        u.email,
        u.nombre,
        u.activo,
        crypt(${testData.admin_password}, u.password) = u.password as password_valid
      FROM usuarios u
      WHERE u.id = ${newTenant.admin_id}
    `;

    const authResult = authCheck.rows[0];
    if (authResult) {
      console.log(`   ✅ Usuario activo: ${authResult.activo}`);
      console.log(`   🔑 Contraseña válida: ${authResult.password_valid}`);
    }

    console.log('\n🎉 Prueba completada exitosamente!');
    console.log('\n📝 Resumen:');
    console.log(`   🏢 Tenant: ${newTenant.tenant_nombre} (${newTenant.tenant_rut})`);
    console.log(`   👤 Admin: ${newTenant.admin_email} / ${testData.admin_password}`);
    console.log(`   🛡️ Rol: ${newTenant.admin_role_nombre} con ${permissions.rows.length} permisos`);

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

testTenantCreation().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
