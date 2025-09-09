#!/usr/bin/env tsx

import { sql } from '@vercel/postgres';

async function createAdminRole() {
  try {
    console.log('🔧 Creando rol de Administrador...');

    // 1. Crear el rol de administrador
    const rolResult = await sql`
      INSERT INTO rbac_roles (tenant_id, code, name, description, is_system)
      VALUES (NULL, 'admin', 'Administrador', 'Rol con acceso completo a todos los módulos del sistema', true)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_system = EXCLUDED.is_system
      RETURNING id, code, name
    `;

    const rol = rolResult.rows[0];
    console.log('✅ Rol creado:', rol);

    // 2. Obtener todos los permisos disponibles
    const permisosResult = await sql`
      SELECT id, clave, descripcion
      FROM permisos
      ORDER BY clave
    `;

    const permisos = permisosResult.rows;
    console.log(`📋 Encontrados ${permisos.length} permisos`);

    // 3. Asignar todos los permisos al rol de admin
    const valoresPermisos = permisos.map(p => `('${rol.id}', '${p.id}')`).join(', ');
    
    if (valoresPermisos) {
      await sql`
        INSERT INTO rbac_roles_permisos (role_id, permission_id)
        VALUES ${sql.unsafe(valoresPermisos)}
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `;
    }

    console.log(`✅ Asignados ${permisos.length} permisos al rol de administrador`);

    // 4. Verificar la asignación
    const asignadosResult = await sql`
      SELECT COUNT(*) as total
      FROM rbac_roles_permisos rp
      WHERE rp.role_id = ${rol.id}
    `;

    const totalAsignados = asignadosResult.rows[0].total;
    console.log(`📊 Total de permisos asignados: ${totalAsignados}`);

    // 5. Mostrar resumen
    console.log('\n🎉 ROL DE ADMINISTRADOR CREADO EXITOSAMENTE');
    console.log('==========================================');
    console.log(`ID: ${rol.id}`);
    console.log(`Código: ${rol.code}`);
    console.log(`Nombre: ${rol.name}`);
    console.log(`Permisos asignados: ${totalAsignados}`);
    console.log('\n💡 Ahora puedes asignar este rol a usuarios desde la interfaz de usuarios');

  } catch (error) {
    console.error('❌ Error creando rol de administrador:', error);
    process.exit(1);
  }
}

// Ejecutar el script
createAdminRole().then(() => {
  console.log('\n✅ Script completado');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
});
