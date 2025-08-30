require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkUserPermissions() {
  const email = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
  console.log('🔍 Verificando permisos para:', email);

  try {
    // 1. Verificar si el usuario existe
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

    // 2. Verificar permisos específicos
    const permissions = ['guardias.view', 'instalaciones.view', 'clientes.view'];
    
    for (const permission of permissions) {
      try {
        const { rows: permRows } = await sql`
          SELECT public.fn_usuario_tiene_permiso(${user.id}, ${permission}) as allowed
        `;
        console.log(`🔍 ${permission}:`, permRows[0]?.allowed ? '✅ Permitido' : '❌ Denegado');
      } catch (error) {
        console.log(`❌ Error verificando ${permission}:`, error.message);
      }
    }

    // 3. Verificar si es admin
    console.log('🔍 Rol del usuario:', user.rol);
    console.log('🔍 Es admin:', user.rol === 'admin' ? '✅ Sí' : '❌ No');

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

checkUserPermissions();
