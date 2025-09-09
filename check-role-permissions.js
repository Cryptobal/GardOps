require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkRolePermissions() {
  const email = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
  console.log('🔍 Verificando permisos del rol para:', email);

  try {
    // 1. Obtener el rol del usuario
    const { rows: userRows } = await sql`
      SELECT ur.rol_id, r.nombre as rol_nombre, r.descripcion as rol_descripcion
      FROM public.usuarios_roles ur
      JOIN public.roles r ON r.id = ur.rol_id
      JOIN public.usuarios u ON u.id = ur.usuario_id
      WHERE lower(u.email) = lower(${email})
    `;
    
    if (userRows.length === 0) {
      console.log('❌ No se encontraron roles asignados');
      return;
    }
    
    const userRole = userRows[0];
    console.log('✅ Rol asignado:', userRole);

    // 2. Verificar permisos del rol
    const { rows: permRows } = await sql`
      SELECT p.clave, p.descripcion, p.categoria
      FROM public.roles_permisos rp
      JOIN public.permisos p ON p.id = rp.permiso_id
      WHERE rp.rol_id = ${userRole.rol_id}
      ORDER BY p.categoria, p.clave
    `;
    
    console.log('\n🔍 Permisos del rol:');
    if (permRows.length === 0) {
      console.log('❌ No tiene permisos asignados');
    } else {
      permRows.forEach((perm, index) => {
        console.log(`${index + 1}. ${perm.clave} - ${perm.descripcion} (${perm.categoria})`);
      });
    }

    // 3. Verificar si el rol es de central de monitoreo
    if (userRole.rol_nombre === 'central_monitoring.operator') {
      console.log('\n⚠️  El usuario tiene rol de central de monitoreo, no admin general');
      console.log('💡 Para desarrollo, debería tener rol de Super Admin');
    }

    // 4. Verificar si hay permisos básicos faltantes
    const basicPermissions = ['guardias.view', 'instalaciones.view', 'clientes.view'];
    console.log('\n🔍 Verificando permisos básicos faltantes:');
    
    for (const perm of basicPermissions) {
      const hasPermission = permRows.some(p => p.clave === perm);
      console.log(`${perm}: ${hasPermission ? '✅' : '❌'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkRolePermissions();
