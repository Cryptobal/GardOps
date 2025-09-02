import { query } from '@/lib/database';

async function main() {
  try {
    console.log('🔧 Creando vistas RBAC faltantes...\n');

    // 1. Crear vista v_check_permiso
    console.log('📋 Creando vista v_check_permiso...');
    try {
      await query(`
        CREATE OR REPLACE VIEW v_check_permiso AS
        SELECT 
            u.email,
            p.clave AS permiso
        FROM usuarios u
        JOIN usuarios_roles ur ON ur.usuario_id = u.id
        JOIN roles r ON r.id = ur.rol_id
        JOIN roles_permisos rp ON rp.rol_id = r.id
        JOIN permisos p ON p.id = rp.permiso_id
        WHERE u.activo = TRUE OR u.activo IS NULL
      `);
      console.log('   ✅ Vista v_check_permiso creada/actualizada');
    } catch (error) {
      console.log('   ❌ Error creando vista v_check_permiso:', error);
    }

    // 2. Crear vista v_usuarios_permisos
    console.log('\n📋 Creando vista v_usuarios_permisos...');
    try {
      await query(`
        CREATE OR REPLACE VIEW v_usuarios_permisos AS
        SELECT 
            u.id AS usuario_id,
            u.email,
            u.nombre AS usuario_nombre,
            u.rol AS usuario_rol,
            u.activo AS usuario_activo,
            r.id AS rol_id,
            r.nombre AS rol_nombre,
            r.descripcion AS rol_descripcion,
            r.activo AS rol_activo,
            p.id AS permiso_id,
            p.clave AS permiso_clave,
            p.descripcion AS permiso_descripcion
        FROM usuarios u
        JOIN usuarios_roles ur ON ur.usuario_id = u.id
        JOIN roles r ON r.id = ur.rol_id
        JOIN roles_permisos rp ON rp.rol_id = r.id
        JOIN permisos p ON p.id = rp.permiso_id
        WHERE (u.activo = TRUE OR u.activo IS NULL)
        AND (r.activo = TRUE OR r.activo IS NULL)
      `);
      console.log('   ✅ Vista v_usuarios_permisos creada/actualizada');
    } catch (error) {
      console.log('   ❌ Error creando vista v_usuarios_permisos:', error);
    }

    // 3. Verificar que las vistas existen
    console.log('\n🔍 Verificando que las vistas existen...');
    
    try {
      const views = await query(`
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name IN ('v_check_permiso', 'v_usuarios_permisos')
        ORDER BY table_name
      `);
      
      views.rows.forEach((view: any) => {
        console.log(`   ✅ Vista existe: ${view.table_name}`);
      });
    } catch (error) {
      console.log('   ❌ Error verificando vistas:', error);
    }

    // 4. Probar la función de permisos
    console.log('\n🧪 Probando función de permisos...');
    
    const testEmail = 'carlos.irigoyen@gard.cl';
    const testPermissions = ['clientes.view', 'guardias.view', 'instalaciones.view'];
    
    for (const perm of testPermissions) {
      try {
        const result = await query(`
          SELECT public.fn_usuario_tiene_permiso($1, $2) as allowed
        `, [testEmail, perm]);
        
        const hasPermission = result.rows[0].allowed;
        console.log(`   ${hasPermission ? '✅' : '❌'} ${perm}: ${hasPermission ? 'SÍ' : 'NO'}`);
      } catch (error) {
        console.log(`   ❌ Error verificando ${perm}:`, error);
      }
    }

    console.log('\n🎉 ¡Vistas RBAC creadas exitosamente!');
    console.log('📌 Ahora la función de permisos debería funcionar correctamente');

  } catch (error) {
    console.error('❌ Error general:', error);
    process.exit(1);
  }
}

main();
