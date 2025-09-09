import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function verificarPermisosUsuarios() {
  try {
    console.log('🔐 VERIFICANDO PERMISOS DE USUARIOS DE PRUEBA\n');

    // ===============================================
    // 1. OBTENER USUARIOS DE PRUEBA
    // ===============================================
    console.log('1️⃣ Obteniendo usuarios de prueba...');
    
    const usuarios = await sql`
      SELECT 
        u.id,
        u.email,
        u.nombre,
        u.rol,
        r.nombre as rol_rbac,
        r.descripcion as rol_descripcion
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
      LEFT JOIN roles r ON r.id = ur.rol_id AND r.activo = true
      WHERE u.email LIKE '%@gard.cl'
      ORDER BY u.email
    `;

    console.log('📊 Usuarios de prueba:');
    usuarios.rows.forEach((usuario: any) => {
      console.log(`   👤 ${usuario.email} (${usuario.nombre})`);
      console.log(`      📝 Rol tabla: ${usuario.rol}`);
      console.log(`      🔐 Rol RBAC: ${usuario.rol_rbac || 'Sin rol RBAC'}`);
      if (usuario.rol_descripcion) {
        console.log(`      📋 Descripción: ${usuario.rol_descripcion}`);
      }
      console.log('');
    });

    // ===============================================
    // 2. VERIFICAR PERMISOS DE CADA USUARIO
    // ===============================================
    console.log('2️⃣ Verificando permisos específicos...');
    
    const permisosAVerificar = [
      'rbac.platform_admin',
      'usuarios.manage',
      'roles.manage',
      'permisos.read',
      'turnos.view',
      'turnos.edit',
      'payroll.view',
      'payroll.edit',
      'maestros.view',
      'maestros.edit',
      'documentos.manage',
      'config.manage'
    ];

    for (const usuario of usuarios.rows) {
      console.log(`\n🔍 Verificando permisos de ${usuario.email}:`);
      
      // Verificar permisos usando la función helper
      for (const permiso of permisosAVerificar) {
        try {
          const resultado = await sql`
            SELECT public.fn_usuario_tiene_permiso(${usuario.id}, ${permiso}) as tiene_permiso
          `;
          
          const tienePermiso = resultado.rows[0].tiene_permiso;
          const icono = tienePermiso ? '✅' : '❌';
          console.log(`   ${icono} ${permiso}: ${tienePermiso ? 'SÍ' : 'NO'}`);
        } catch (error) {
          console.log(`   ⚠️  ${permiso}: Error al verificar`);
        }
      }
    }

    // ===============================================
    // 3. MOSTRAR RESUMEN DE PERMISOS POR ROL
    // ===============================================
    console.log('\n3️⃣ Resumen de permisos por rol:');
    
    const roles = await sql`
      SELECT DISTINCT r.nombre, r.descripcion
      FROM roles r
      WHERE r.activo = true
      ORDER BY r.nombre
    `;

    for (const rol of roles.rows) {
      console.log(`\n👑 ${rol.nombre}:`);
      console.log(`   📝 ${rol.descripcion}`);
      
      // Obtener permisos del rol
      const permisosRol = await sql`
        SELECT p.clave, p.descripcion
        FROM roles_permisos rp
        JOIN permisos p ON p.id = rp.permiso_id
        JOIN roles r2 ON r2.id = rp.rol_id
        WHERE r2.nombre = ${rol.nombre}
        ORDER BY p.clave
      `;

      if (permisosRol.rows.length > 0) {
        console.log('   🔐 Permisos:');
        permisosRol.rows.forEach((permiso: any) => {
          console.log(`      ✅ ${permiso.clave}: ${permiso.descripcion}`);
        });
      } else {
        console.log('   ⚠️  Sin permisos asignados');
      }
    }

    // ===============================================
    // 4. INSTRUCCIONES PARA PRUEBAS
    // ===============================================
    console.log('\n4️⃣ Instrucciones para pruebas:');
    console.log('🎯 Para probar diferentes niveles de acceso:');
    console.log('');
    console.log('1. Ve a la aplicación y haz logout');
    console.log('2. Usa las siguientes credenciales:');
    console.log('');
    console.log('   👤 Platform Admin (acceso total):');
    console.log('      📧 carlos.irigoyen@gard.cl');
    console.log('      🔑 (tu password actual)');
    console.log('');
    console.log('   👤 Admin Tenant (acceso a su organización):');
    console.log('      📧 admin@gard.cl');
    console.log('      🔑 admin123');
    console.log('');
    console.log('   👤 Supervisor (gestión operativa):');
    console.log('      📧 supervisor@gard.cl');
    console.log('      🔑 supervisor123');
    console.log('');
    console.log('   👤 Operador (solo visualización):');
    console.log('      📧 guardia@gard.cl');
    console.log('      🔑 guardia123');
    console.log('');
    console.log('3. Navega por las diferentes secciones y verifica qué puedes ver/editar');
    console.log('4. Prueba acceder a la administración de seguridad con cada usuario');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verificarPermisosUsuarios().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
});
