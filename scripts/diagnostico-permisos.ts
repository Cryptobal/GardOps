import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function diagnosticoPermisos() {
  try {
    console.log('🔍 DIAGNÓSTICO DE PERMISOS\n');

    // ===============================================
    // 1. VERIFICAR USUARIO ADMIN
    // ===============================================
    console.log('1️⃣ Verificando usuario admin@gard.cl...');
    
    const usuario = await sql`
      SELECT id, email, nombre, tenant_id
      FROM usuarios
      WHERE email = 'admin@gard.cl'
    `;

    if (usuario.rows.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    const userId = usuario.rows[0].id;
    const tenantId = usuario.rows[0].tenant_id;
    console.log(`✅ Usuario: ${usuario.rows[0].email} (ID: ${userId}, Tenant: ${tenantId})`);

    // ===============================================
    // 2. VERIFICAR ROL ASIGNADO
    // ===============================================
    console.log('\n2️⃣ Verificando rol asignado...');
    
    const rolAsignado = await sql`
      SELECT r.id, r.nombre, r.descripcion, r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${userId}
    `;

    if (rolAsignado.rows.length === 0) {
      console.log('❌ No tiene rol asignado');
      return;
    }

    const rol = rolAsignado.rows[0];
    console.log(`✅ Rol asignado: ${rol.nombre} (ID: ${rol.id})`);
    console.log(`   Descripción: ${rol.descripcion}`);
    console.log(`   Tenant: ${rol.tenant_id}`);

    // ===============================================
    // 3. VERIFICAR PERMISOS DEL ROL
    // ===============================================
    console.log('\n3️⃣ Verificando permisos del rol...');
    
    const permisosRol = await sql`
      SELECT p.id, p.clave, p.descripcion
      FROM roles_permisos rp
      JOIN permisos p ON p.id = rp.permiso_id
      WHERE rp.rol_id = ${rol.id}
      ORDER BY p.clave
    `;

    console.log(`📊 Permisos del rol ${rol.nombre}:`);
    if (permisosRol.rows.length > 0) {
      permisosRol.rows.forEach((permiso: any) => {
        console.log(`   ✅ ${permiso.clave}: ${permiso.descripcion}`);
      });
    } else {
      console.log('   ⚠️  Sin permisos asignados');
    }

    // ===============================================
    // 4. VERIFICAR FUNCIÓN HELPER
    // ===============================================
    console.log('\n4️⃣ Verificando función helper...');
    
    try {
      const resultado = await sql`
        SELECT public.fn_usuario_tiene_permiso(${userId}, 'usuarios.manage') as tiene_permiso
      `;
      console.log(`✅ Función helper funciona: ${resultado.rows[0].tiene_permiso}`);
    } catch (error) {
      console.log(`❌ Error en función helper: ${error}`);
    }

    // ===============================================
    // 5. VERIFICAR MANUALMENTE
    // ===============================================
    console.log('\n5️⃣ Verificación manual de permisos...');
    
    const verificacionManual = await sql`
      SELECT 
        u.id as usuario_id,
        r.id as rol_id,
        p.clave as permiso_clave,
        true as tiene_permiso
      FROM usuarios u
      JOIN usuarios_roles ur ON ur.usuario_id = u.id
      JOIN roles r ON r.id = ur.rol_id
      JOIN roles_permisos rp ON rp.rol_id = r.id
      JOIN permisos p ON p.id = rp.permiso_id
      WHERE u.id = ${userId}
      AND p.clave = 'usuarios.manage'
    `;

    if (verificacionManual.rows.length > 0) {
      console.log('✅ Verificación manual: SÍ tiene el permiso usuarios.manage');
      console.log(`   Usuario ID: ${verificacionManual.rows[0].usuario_id}`);
      console.log(`   Rol ID: ${verificacionManual.rows[0].rol_id}`);
      console.log(`   Permiso: ${verificacionManual.rows[0].permiso_clave}`);
    } else {
      console.log('❌ Verificación manual: NO tiene el permiso usuarios.manage');
    }

    // ===============================================
    // 6. PROBAR DIFERENTES PERMISOS
    // ===============================================
    console.log('\n6️⃣ Probando diferentes permisos...');
    
    const permisosPrueba = [
      'usuarios.manage',
      'turnos.view',
      'turnos.edit',
      'payroll.view',
      'maestros.view',
      'documentos.manage',
      'config.manage'
    ];

    for (const permiso of permisosPrueba) {
      const resultado = await sql`
        SELECT 
          COUNT(*) as tiene_permiso
        FROM usuarios u
        JOIN usuarios_roles ur ON ur.usuario_id = u.id
        JOIN roles r ON r.id = ur.rol_id
        JOIN roles_permisos rp ON rp.rol_id = r.id
        JOIN permisos p ON p.id = rp.permiso_id
        WHERE u.id = ${userId}
        AND p.clave = ${permiso}
      `;
      
      const tienePermiso = parseInt(resultado.rows[0].tiene_permiso) > 0;
      const icono = tienePermiso ? '✅' : '❌';
      console.log(`   ${icono} ${permiso}: ${tienePermiso ? 'SÍ' : 'NO'}`);
    }

    // ===============================================
    // 7. VERIFICAR VISTA DE PERMISOS
    // ===============================================
    console.log('\n7️⃣ Verificando vista de permisos...');
    
    const vistaPermisos = await sql`
      SELECT 
        usuario_id,
        rol_nombre,
        permiso_clave
      FROM v_usuarios_permisos
      WHERE usuario_id = ${userId}
      ORDER BY permiso_clave
    `;

    console.log('📊 Permisos desde vista:');
    if (vistaPermisos.rows.length > 0) {
      vistaPermisos.rows.forEach((permiso: any) => {
        console.log(`   ✅ ${permiso.permiso_clave} (Rol: ${permiso.rol_nombre})`);
      });
    } else {
      console.log('   ⚠️  Sin permisos en la vista');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

diagnosticoPermisos().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
});
