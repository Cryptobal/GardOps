import { query } from '@/lib/database';

async function main() {
  try {
    console.log('🔍 Verificando estructura de tablas RBAC...\n');

    // 1. Verificar estructura de la tabla permisos
    console.log('📋 Estructura de tabla permisos:');
    try {
      const permisosStructure = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'permisos' 
        ORDER BY ordinal_position
      `);
      
      permisosStructure.rows.forEach((col: any) => {
        console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    } catch (error) {
      console.log('   ❌ Error obteniendo estructura de permisos:', error);
    }

    // 2. Verificar estructura de la tabla roles
    console.log('\n📋 Estructura de tabla roles:');
    try {
      const rolesStructure = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'roles' 
        ORDER BY ordinal_position
      `);
      
      rolesStructure.rows.forEach((col: any) => {
        console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    } catch (error) {
      console.log('   ❌ Error obteniendo estructura de roles:', error);
    }

    // 3. Verificar estructura de la tabla usuarios_roles
    console.log('\n📋 Estructura de tabla usuarios_roles:');
    try {
      const usuariosRolesStructure = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'usuarios_roles' 
        ORDER BY ordinal_position
      `);
      
      usuariosRolesStructure.rows.forEach((col: any) => {
        console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    } catch (error) {
      console.log('   ❌ Error obteniendo estructura de usuarios_roles:', error);
    }

    // 4. Verificar estructura de la tabla roles_permisos
    console.log('\n📋 Estructura de tabla roles_permisos:');
    try {
      const rolesPermisosStructure = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'roles_permisos' 
        ORDER BY ordinal_position
      `);
      
      rolesPermisosStructure.rows.forEach((col: any) => {
        console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    } catch (error) {
      console.log('   ❌ Error obteniendo estructura de roles_permisos:', error);
    }

    // 5. Verificar datos existentes
    console.log('\n📊 Datos existentes:');
    
    try {
      const permisosCount = await query(`SELECT COUNT(*) as count FROM permisos`);
      console.log(`   Permisos: ${permisosCount.rows[0].count}`);
      
      const rolesCount = await query(`SELECT COUNT(*) as count FROM roles`);
      console.log(`   Roles: ${rolesCount.rows[0].count}`);
      
      const usuariosRolesCount = await query(`SELECT COUNT(*) as count FROM usuarios_roles`);
      console.log(`   Usuarios-Roles: ${usuariosRolesCount.rows[0].count}`);
      
      const rolesPermisosCount = await query(`SELECT COUNT(*) as count FROM roles_permisos`);
      console.log(`   Roles-Permisos: ${rolesPermisosCount.rows[0].count}`);
    } catch (error) {
      console.log('   ❌ Error contando datos:', error);
    }

    // 6. Verificar si la función existe
    console.log('\n🔧 Verificando función fn_usuario_tiene_permiso:');
    try {
      const functionExists = await query(`
        SELECT routine_name, routine_type, data_type
        FROM information_schema.routines 
        WHERE routine_name = 'fn_usuario_tiene_permiso'
      `);
      
      if (functionExists.rows.length > 0) {
        console.log('   ✅ Función existe:', functionExists.rows[0]);
      } else {
        console.log('   ❌ Función no encontrada');
      }
    } catch (error) {
      console.log('   ❌ Error verificando función:', error);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
    process.exit(1);
  }
}

main();
