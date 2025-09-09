require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function fixDevUserRole() {
  const email = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
  console.log('🔧 Asignando rol de Super Admin a:', email);

  try {
    // 1. Obtener el usuario
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

    // 2. Obtener el rol de Super Admin
    const { rows: adminRoleRows } = await sql`
      SELECT id, nombre, descripcion
      FROM public.roles 
      WHERE nombre = 'Super Admin'
      LIMIT 1
    `;
    
    if (adminRoleRows.length === 0) {
      console.log('❌ Rol Super Admin no encontrado');
      return;
    }
    
    const adminRole = adminRoleRows[0];
    console.log('✅ Rol Super Admin encontrado:', adminRole);

    // 3. Eliminar la asignación actual
    console.log('\n🗑️  Eliminando asignación actual...');
    const { rowCount: deletedCount } = await sql`
      DELETE FROM public.usuarios_roles 
      WHERE usuario_id = ${user.id}
    `;
    console.log(`✅ Eliminadas ${deletedCount} asignaciones anteriores`);

    // 4. Asignar el rol de Super Admin
    console.log('\n➕ Asignando rol de Super Admin...');
    const { rowCount: insertedCount } = await sql`
      INSERT INTO public.usuarios_roles (usuario_id, rol_id, created_at)
      VALUES (${user.id}, ${adminRole.id}, NOW())
    `;
    console.log(`✅ Asignado rol de Super Admin (${insertedCount} filas)`);

    // 5. Actualizar el rol en la tabla usuarios (sin updated_at)
    console.log('\n✏️  Actualizando rol en tabla usuarios...');
    const { rowCount: updatedCount } = await sql`
      UPDATE public.usuarios 
      SET rol = 'admin'
      WHERE id = ${user.id}
    `;
    console.log(`✅ Rol actualizado en tabla usuarios (${updatedCount} filas)`);

    console.log('\n✅ ¡Usuario de desarrollo configurado como Super Admin!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixDevUserRole();
