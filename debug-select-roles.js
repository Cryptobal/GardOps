require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function debugSelectRoles() {
  try {
    console.log('🔍 DEBUG: SELECT DE ROLES');
    console.log('=========================');
    
    // 1. Verificar roles disponibles
    console.log('\n📊 1. ROLES DISPONIBLES:');
    console.log('=======================');
    
    const roles = await pool.query(`
      SELECT r.id, r.nombre, r.descripcion, r.activo, t.nombre as tenant_nombre
      FROM roles r
      LEFT JOIN tenants t ON r.tenant_id = t.id
      ORDER BY t.nombre, r.nombre
    `);
    
    console.log(`📋 Total roles: ${roles.rows.length}`);
    roles.rows.forEach(role => {
      const estado = role.activo ? '✅' : '❌';
      console.log(`   ${estado} ${role.nombre} (${role.tenant_nombre}) - ID: ${role.id}`);
      if (role.descripcion) {
        console.log(`      📝 ${role.descripcion}`);
      }
    });
    
    // 2. Verificar roles por tenant
    console.log('\n🏢 2. ROLES POR TENANT:');
    console.log('======================');
    
    const rolesPorTenant = await pool.query(`
      SELECT t.nombre as tenant_nombre, COUNT(r.id) as total_roles
      FROM tenants t
      LEFT JOIN roles r ON t.id = r.tenant_id
      GROUP BY t.id, t.nombre
      ORDER BY t.nombre
    `);
    
    rolesPorTenant.rows.forEach(row => {
      console.log(`   🏢 ${row.tenant_nombre}: ${row.total_roles} roles`);
    });
    
    // 3. Verificar roles activos vs inactivos
    console.log('\n✅ 3. ESTADO DE ROLES:');
    console.log('=====================');
    
    const estadoRoles = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN activo = true THEN 1 END) as activos,
        COUNT(CASE WHEN activo = false THEN 1 END) as inactivos,
        COUNT(CASE WHEN activo IS NULL THEN 1 END) as sin_estado
      FROM roles
    `);
    
    const stats = estadoRoles.rows[0];
    console.log(`📊 Total: ${stats.total}`);
    console.log(`✅ Activos: ${stats.activos}`);
    console.log(`❌ Inactivos: ${stats.inactivos}`);
    console.log(`❓ Sin estado: ${stats.sin_estado}`);
    
    // 4. Verificar si hay roles duplicados
    console.log('\n🔄 4. ROLES DUPLICADOS:');
    console.log('======================');
    
    const duplicados = await pool.query(`
      SELECT nombre, COUNT(*) as cantidad
      FROM roles
      GROUP BY nombre
      HAVING COUNT(*) > 1
      ORDER BY cantidad DESC
    `);
    
    if (duplicados.rows.length > 0) {
      console.log(`⚠️  Roles duplicados encontrados: ${duplicados.rows.length}`);
      duplicados.rows.forEach(dup => {
        console.log(`   🔄 ${dup.nombre}: ${dup.cantidad} copias`);
      });
    } else {
      console.log(`✅ No hay roles duplicados por nombre`);
    }
    
    // 5. Verificar roles asignados a usuarios
    console.log('\n👥 5. ROLES ASIGNADOS A USUARIOS:');
    console.log('=================================');
    
    const rolesAsignados = await pool.query(`
      SELECT 
        u.email,
        r.nombre as rol_nombre,
        t.nombre as tenant_nombre,
        r.activo as rol_activo
      FROM usuarios u
      JOIN usuarios_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      JOIN tenants t ON u.tenant_id = t.id
      ORDER BY u.email
    `);
    
    console.log(`👥 Usuarios con roles asignados: ${rolesAsignados.rows.length}`);
    rolesAsignados.rows.forEach(assign => {
      const estadoRol = assign.rol_activo ? '✅' : '❌';
      console.log(`   👤 ${assign.email} → ${estadoRol} ${assign.rol_nombre} (${assign.tenant_nombre})`);
    });
    
    // 6. Verificar roles sin usuarios asignados
    console.log('\n🚫 6. ROLES SIN USUARIOS:');
    console.log('=========================');
    
    const rolesSinUsuarios = await pool.query(`
      SELECT r.nombre, t.nombre as tenant_nombre, r.activo
      FROM roles r
      LEFT JOIN usuarios_roles ur ON r.id = ur.rol_id
      JOIN tenants t ON r.tenant_id = t.id
      WHERE ur.rol_id IS NULL
      ORDER BY t.nombre, r.nombre
    `);
    
    console.log(`📋 Roles sin usuarios: ${rolesSinUsuarios.rows.length}`);
    rolesSinUsuarios.rows.forEach(role => {
      const estado = role.activo ? '✅' : '❌';
      console.log(`   ${estado} ${role.nombre} (${role.tenant_nombre})`);
    });
    
    // 7. Generar datos para el frontend
    console.log('\n💻 7. DATOS PARA FRONTEND:');
    console.log('==========================');
    
    const rolesParaFrontend = await pool.query(`
      SELECT r.id, r.nombre, r.activo, t.nombre as tenant_nombre
      FROM roles r
      JOIN tenants t ON r.tenant_id = t.id
      WHERE r.activo = true
      ORDER BY t.nombre, r.nombre
    `);
    
    console.log(`📊 Roles activos para frontend: ${rolesParaFrontend.rows.length}`);
    console.log('\n📋 JSON para el frontend:');
    const rolesJSON = rolesParaFrontend.rows.map(role => ({
      id: role.id,
      nombre: role.nombre,
      tenant: role.tenant_nombre,
      activo: role.activo
    }));
    console.log(JSON.stringify(rolesJSON, null, 2));
    
    console.log('\n🎉 DEBUG COMPLETADO');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugSelectRoles();
