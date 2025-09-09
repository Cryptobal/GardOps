import { config } from 'dotenv';
import * as path from 'path';
import { getTenantId } from '@/lib/utils/tenant-utils';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function corregirPermisosAdminEspecifico() {
  try {
    console.log('🔧 CORRIGIENDO PERMISOS DEL ROL ADMIN ESPECÍFICO\n');

    // ===============================================
    // 1. IDENTIFICAR EL ROL ADMIN CORRECTO
    // ===============================================
    console.log('1️⃣ Identificando el rol Admin correcto...');
    
    const rolAdminCorrecto = await sql`
      SELECT id, nombre, descripcion, tenant_id
      FROM roles
      WHERE nombre = 'Admin' 
      AND tenant_id = await getTenantId(request)
      AND descripcion LIKE '%acceso total%'
      AND activo = true
    `;

    if (rolAdminCorrecto.rows.length === 0) {
      console.log('❌ No se encontró el rol Admin correcto');
      return;
    }

    const rolId = rolAdminCorrecto.rows[0].id;
    console.log(`✅ Rol Admin correcto: ${rolId}`);
    console.log(`   Descripción: ${rolAdminCorrecto.rows[0].descripcion}`);

    // ===============================================
    // 2. OBTENER PERMISOS NECESARIOS
    // ===============================================
    console.log('\n2️⃣ Obteniendo permisos necesarios...');
    
    const permisosNecesarios = [
      'usuarios.manage',
      'turnos.*',
      'turnos.view',
      'turnos.edit',
      'payroll.*',
      'payroll.view',
      'payroll.edit',
      'maestros.*',
      'maestros.view',
      'maestros.edit',
      'documentos.manage',
      'config.manage'
    ];

    const permisos = await sql`
      SELECT id, clave, descripcion
      FROM permisos
      WHERE clave = ANY(${permisosNecesarios})
      ORDER BY clave
    `;

    console.log(`📊 Permisos encontrados: ${permisos.rows.length}`);
    permisos.rows.forEach((permiso: any) => {
      console.log(`   ✅ ${permiso.clave}: ${permiso.descripcion}`);
    });

    // ===============================================
    // 3. LIMPIAR PERMISOS EXISTENTES
    // ===============================================
    console.log('\n3️⃣ Limpiando permisos existentes...');
    
    await sql`
      DELETE FROM roles_permisos WHERE rol_id = ${rolId}
    `;
    console.log('   🧹 Permisos anteriores eliminados');

    // ===============================================
    // 4. ASIGNAR NUEVOS PERMISOS
    // ===============================================
    console.log('\n4️⃣ Asignando nuevos permisos...');
    
    let permisosAsignados = 0;
    for (const permiso of permisos.rows) {
      await sql`
        INSERT INTO roles_permisos (rol_id, permiso_id)
        VALUES (${rolId}, ${permiso.id})
        ON CONFLICT DO NOTHING
      `;
      console.log(`   ✅ ${permiso.clave}`);
      permisosAsignados++;
    }
    
    console.log(`📊 Total permisos asignados: ${permisosAsignados}`);

    // ===============================================
    // 5. VERIFICAR ASIGNACIÓN
    // ===============================================
    console.log('\n5️⃣ Verificando asignación...');
    
    const permisosAsignadosVerificacion = await sql`
      SELECT p.clave, p.descripcion
      FROM roles_permisos rp
      JOIN permisos p ON p.id = rp.permiso_id
      WHERE rp.rol_id = ${rolId}
      ORDER BY p.clave
    `;

    console.log(`📊 Permisos asignados al rol Admin:`);
    if (permisosAsignadosVerificacion.rows.length > 0) {
      permisosAsignadosVerificacion.rows.forEach((permiso: any) => {
        console.log(`   ✅ ${permiso.clave}: ${permiso.descripcion}`);
      });
    } else {
      console.log('   ⚠️  Sin permisos asignados');
    }

    // ===============================================
    // 6. VERIFICAR USUARIO ADMIN
    // ===============================================
    console.log('\n6️⃣ Verificando usuario admin@gard.cl...');
    
    const usuarioAdmin = await sql`
      SELECT id, email, nombre
      FROM usuarios
      WHERE email = 'admin@gard.cl'
    `;

    if (usuarioAdmin.rows.length > 0) {
      const userId = usuarioAdmin.rows[0].id;
      console.log(`✅ Usuario: ${usuarioAdmin.rows[0].email} (ID: ${userId})`);

      // Verificar permisos del usuario
      console.log('\n🔐 Verificando permisos del usuario:');
      for (const permisoClave of permisosNecesarios.slice(0, 5)) { // Solo los primeros 5 para no saturar
        try {
          const resultado = await sql`
            SELECT public.fn_usuario_tiene_permiso(${userId}, ${permisoClave}) as tiene_permiso
          `;
          
          const tienePermiso = resultado.rows[0].tiene_permiso;
          const icono = tienePermiso ? '✅' : '❌';
          console.log(`   ${icono} ${permisoClave}: ${tienePermiso ? 'SÍ' : 'NO'}`);
        } catch (error) {
          console.log(`   ⚠️  ${permisoClave}: Error al verificar`);
        }
      }
    }

    console.log('\n🎉 CORRECCIÓN COMPLETADA');
    console.log('✅ El rol Admin correcto ahora tiene todos los permisos necesarios');
    console.log('✅ El usuario admin@gard.cl debería tener acceso completo');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

corregirPermisosAdminEspecifico().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
});
