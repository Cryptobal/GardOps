require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkAdminPermissions() {
  const email = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
  console.log('🔍 Verificando permisos de admin para:', email);

  try {
    // 1. Verificar si el usuario existe y es admin
    const { rows: userRows } = await sql`
      SELECT id, email, nombre, rol, tenant_id 
      FROM public.usuarios 
      WHERE lower(email) = lower(${email})
      LIMIT 1
    `;
    
    if (userRows.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    const user = userRows[0];
    console.log('✅ Usuario encontrado:', user);

    if (user.rol !== 'admin') {
      console.log('❌ Usuario no es admin');
      return;
    }

    // 2. Verificar la función de permisos directamente
    console.log('\n🔍 Probando función de permisos directamente...');
    
    const { rows: funcRows } = await sql`
      SELECT public.fn_usuario_tiene_permiso(${user.id}, 'guardias.view') as allowed
    `;
    console.log('Resultado directo:', funcRows[0]);

    // 3. Verificar si hay roles asignados al usuario
    console.log('\n🔍 Verificando roles asignados...');
    const { rows: roleRows } = await sql`
      SELECT * FROM public.usuarios_roles WHERE usuario_id = ${user.id}
    `;
    console.log('Roles asignados:', roleRows);

    // 4. Verificar si hay permisos asignados a roles
    console.log('\n🔍 Verificando permisos de roles...');
    const { rows: permRows } = await sql`
      SELECT rp.*, r.nombre as rol_nombre, p.nombre as permiso_nombre
      FROM public.roles_permisos rp
      JOIN public.roles r ON r.id = rp.rol_id
      JOIN public.permisos p ON p.id = rp.permiso_id
      WHERE rp.rol_id IN (
        SELECT rol_id FROM public.usuarios_roles WHERE usuario_id = ${user.id}
      )
    `;
    console.log('Permisos de roles:', permRows);

    // 5. Verificar si el admin tiene bypass automático
    console.log('\n🔍 Verificando bypass de admin...');
    const { rows: adminRows } = await sql`
      SELECT 
        CASE WHEN ${user.rol} = 'admin' THEN true ELSE false END as is_admin,
        CASE WHEN ${user.rol} = 'admin' THEN 'BYPASS' ELSE 'CHECK_PERMISSIONS' END as auth_method
    `;
    console.log('Bypass de admin:', adminRows[0]);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAdminPermissions();
