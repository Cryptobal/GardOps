require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function testAuthFunction() {
  try {
    console.log('🔍 Probando función de autenticación...\n');

    const devEmail = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
    console.log('Email de desarrollo:', devEmail);

    // 1. Obtener usuario
    const user = await sql`
      SELECT id, email, nombre, tenant_id, rol
      FROM usuarios 
      WHERE lower(email) = lower(${devEmail})
      LIMIT 1;
    `;
    
    if (user.rows.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log('Usuario:', user.rows[0]);

    // 2. Probar función de permisos
    console.log('\n2. Probando función de permisos...');
    try {
      const hasViewPerm = await sql`
        SELECT public.fn_usuario_tiene_permiso(${user.rows[0].id}::uuid, 'central_monitoring.view') as has_view;
      `;
      console.log('   Tiene permiso central_monitoring.view:', hasViewPerm.rows[0]?.has_view);
    } catch (error) {
      console.log('   ❌ Error probando permiso view:', error.message);
    }

    try {
      const hasRecordPerm = await sql`
        SELECT public.fn_usuario_tiene_permiso(${user.rows[0].id}::uuid, 'central_monitoring.record') as has_record;
      `;
      console.log('   Tiene permiso central_monitoring.record:', hasRecordPerm.rows[0]?.has_record);
    } catch (error) {
      console.log('   ❌ Error probando permiso record:', error.message);
    }

    try {
      const hasAdminPerm = await sql`
        SELECT public.fn_usuario_tiene_permiso(${user.rows[0].id}::uuid, 'rbac.platform_admin') as has_admin;
      `;
      console.log('   Tiene permiso rbac.platform_admin:', hasAdminPerm.rows[0]?.has_admin);
    } catch (error) {
      console.log('   ❌ Error probando permiso admin:', error.message);
    }

    // 3. Verificar si la función existe
    console.log('\n3. Verificando si la función existe...');
    try {
      const functionExists = await sql`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'fn_usuario_tiene_permiso';
      `;
      console.log('   Función existe:', functionExists.rows.length > 0);
    } catch (error) {
      console.log('   ❌ Error verificando función:', error.message);
    }

    console.log('\n✅ Pruebas completadas');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAuthFunction();
