const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

async function checkNavigationPermissions() {
  try {
    console.log('🔍 Verificando permisos de navegación para Tenant Admin...');
    
    // Buscar el rol Tenant Admin
    const rolQuery = `SELECT id, nombre, codigo FROM rbac_roles WHERE nombre = 'Tenant Admin' LIMIT 1`;
    const rolResult = await pool.query(rolQuery);
    
    if (rolResult.rows.length === 0) {
      console.log('❌ No se encontró el rol Tenant Admin');
      return;
    }
    
    const rol = rolResult.rows[0];
    console.log(`✅ Rol encontrado: ${rol.nombre} (ID: ${rol.id}, Código: ${rol.codigo})`);
    
    // Buscar permisos específicos de navegación
    const permisosQuery = `
      SELECT p.codigo, p.nombre, p.descripcion
      FROM rbac_permisos p
      INNER JOIN rbac_roles_permisos rp ON p.codigo = rp.permiso_cod
      WHERE rp.rol_codigo = $1
      AND p.codigo IN ('clientes.view', 'instalaciones.view', 'guardias.view', 'documentos.view')
      AND rp.granted = true
      ORDER BY p.codigo
    `;
    
    const permisosResult = await pool.query(permisosQuery, [rol.codigo]);
    
    console.log(`\n📋 Permisos de navegación encontrados (${permisosResult.rows.length}):`);
    permisosResult.rows.forEach(permiso => {
      console.log(`  ✅ ${permiso.codigo} - ${permiso.nombre}`);
    });
    
    // Verificar permisos faltantes
    const permisosRequeridos = ['clientes.view', 'instalaciones.view', 'guardias.view', 'documentos.view'];
    const permisosEncontrados = permisosResult.rows.map(p => p.codigo);
    const permisosFaltantes = permisosRequeridos.filter(p => !permisosEncontrados.includes(p));
    
    if (permisosFaltantes.length > 0) {
      console.log(`\n❌ Permisos faltantes:`);
      permisosFaltantes.forEach(permiso => {
        console.log(`  ❌ ${permiso}`);
      });
      
      // Buscar si estos permisos existen en la BD
      console.log(`\n🔍 Verificando si los permisos existen en la BD...`);
      const existQuery = `
        SELECT codigo, nombre 
        FROM rbac_permisos 
        WHERE codigo IN (${permisosFaltantes.map((_, i) => `$${i + 1}`).join(', ')})
        ORDER BY codigo
      `;
      const existResult = await pool.query(existQuery, permisosFaltantes);
      
      if (existResult.rows.length > 0) {
        console.log(`\n✅ Permisos que existen en BD pero no están asignados:`);
        existResult.rows.forEach(permiso => {
          console.log(`  📝 ${permiso.codigo} - ${permiso.nombre}`);
        });
      } else {
        console.log(`\n❌ Los permisos faltantes no existen en la BD`);
      }
    } else {
      console.log(`\n✅ Todos los permisos de navegación están presentes`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkNavigationPermissions();
