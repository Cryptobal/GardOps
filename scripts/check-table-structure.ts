import { query } from '@/lib/database';

async function main() {
  try {
    console.log('🔍 Verificando estructura de tablas RBAC...\n');

    // Verificar estructura de usuarios
    console.log('📋 Estructura de tabla usuarios:');
    const userColumns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' 
      ORDER BY ordinal_position
    `);
    if (userColumns.rows && Array.isArray(userColumns.rows)) {
      userColumns.rows.forEach(col => console.log(`   ${col.column_name}: ${col.data_type}`));
    } else {
      console.log('   Error: respuesta no es array');
    }

    // Verificar estructura de roles
    console.log('\n📋 Estructura de tabla roles:');
    const roleColumns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'roles' 
      ORDER BY ordinal_position
    `);
    if (roleColumns.rows && Array.isArray(roleColumns.rows)) {
      roleColumns.rows.forEach(col => console.log(`   ${col.column_name}: ${col.data_type}`));
    } else {
      console.log('   Error: respuesta no es array');
    }

    // Verificar estructura de permisos
    console.log('\n📋 Estructura de tabla permisos:');
    const permColumns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'permisos' 
      ORDER BY ordinal_position
    `);
    if (permColumns.rows && Array.isArray(permColumns.rows)) {
      permColumns.rows.forEach(col => console.log(`   ${col.column_name}: ${col.data_type}`));
    } else {
      console.log('   Error: respuesta no es array');
    }

    // Verificar estructura de usuarios_roles
    console.log('\n📋 Estructura de tabla usuarios_roles:');
    const userRoleColumns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'usuarios_roles' 
      ORDER BY ordinal_position
    `);
    if (userRoleColumns.rows && Array.isArray(userRoleColumns.rows)) {
      userRoleColumns.rows.forEach(col => console.log(`   ${col.column_name}: ${col.data_type}`));
    } else {
      console.log('   Error: respuesta no es array');
    }

    // Verificar estructura de roles_permisos
    console.log('\n📋 Estructura de tabla roles_permisos:');
    const rolePermColumns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'roles_permisos' 
      ORDER BY ordinal_position
    `);
    if (rolePermColumns.rows && Array.isArray(rolePermColumns.rows)) {
      rolePermColumns.rows.forEach(col => console.log(`   ${col.column_name}: ${col.data_type}`));
    } else {
      console.log('   Error: respuesta no es array');
    }

    // Verificar datos de ejemplo
    console.log('\n📊 Datos de ejemplo:');
    
    const userCount = await query('SELECT COUNT(*) as count FROM usuarios');
    console.log(`   Usuarios: ${userCount.rows[0]?.count || 'Error'}`);
    
    const roleCount = await query('SELECT COUNT(*) as count FROM roles');
    console.log(`   Roles: ${roleCount.rows[0]?.count || 'Error'}`);
    
    const permCount = await query('SELECT COUNT(*) as count FROM permisos');
    console.log(`   Permisos: ${permCount.rows[0]?.count || 'Error'}`);

    // Verificar usuario específico
    console.log('\n👤 Usuario carlos.irigoyen@gard.cl:');
    const user = await query(`
      SELECT * FROM usuarios WHERE lower(email) = lower('carlos.irigoyen@gard.cl')
    `);
    if (user.rows && user.rows.length > 0) {
      console.log('   Encontrado:', user.rows[0]);
    } else {
      console.log('   ❌ No encontrado');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main(); 