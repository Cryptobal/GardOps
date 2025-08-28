import { query } from '../src/lib/database';

async function verificarPermisosPayroll() {
  console.log('🔍 Verificando permisos de payroll...');

  try {
    // Verificar si existe el permiso payroll.view
    const permisoQuery = `
      SELECT id, clave, descripcion 
      FROM permisos 
      WHERE clave = 'payroll.view'
    `;
    
    const permisoResult = await query(permisoQuery);
    console.log('Permiso payroll.view:', permisoResult.rows[0] || 'No encontrado');

    // Verificar roles que tienen este permiso
    const rolesQuery = `
      SELECT r.id, r.nombre, rp.permiso_id
      FROM roles r
      INNER JOIN roles_permisos rp ON r.id = rp.rol_id
      INNER JOIN permisos p ON rp.permiso_id = p.id
      WHERE p.clave = 'payroll.view'
    `;
    
    const rolesResult = await query(rolesQuery);
    console.log('Roles con permiso payroll.view:', rolesResult.rows);

    // Verificar usuarios con este permiso
    const usuariosQuery = `
      SELECT u.id, u.email, u.nombre, r.nombre as rol_nombre
      FROM usuarios u
      INNER JOIN usuarios_roles ur ON u.id = ur.usuario_id
      INNER JOIN roles r ON ur.rol_id = r.id
      INNER JOIN roles_permisos rp ON r.id = rp.rol_id
      INNER JOIN permisos p ON rp.permiso_id = p.id
      WHERE p.clave = 'payroll.view'
    `;
    
    const usuariosResult = await query(usuariosQuery);
    console.log('Usuarios con permiso payroll.view:', usuariosResult.rows);

    // Verificar todos los permisos de payroll
    const todosPermisosQuery = `
      SELECT id, clave, descripcion 
      FROM permisos 
      WHERE clave LIKE 'payroll.%'
      ORDER BY clave
    `;
    
    const todosPermisosResult = await query(todosPermisosQuery);
    console.log('Todos los permisos de payroll:', todosPermisosResult.rows);

  } catch (error) {
    console.error('Error verificando permisos:', error);
  }
}

verificarPermisosPayroll()
  .then(() => {
    console.log('✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

