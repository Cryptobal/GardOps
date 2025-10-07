#!/usr/bin/env node

/**
 * Script para corregir completamente el RBAC del usuario central@gard.cl
 * Ejecutar con: node fix-rbac-central-user.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixRbacCentralUser() {
  const email = 'central@gard.cl';
  console.log('\n🔧 CORRECCIÓN COMPLETA RBAC:', email);
  console.log('='.repeat(80));

  try {
    // 1. AUDITORÍA INICIAL
    console.log('\n📌 PASO 1: Auditoría inicial del usuario');
    const user = await pool.query(`
      SELECT id, email, nombre, activo, tenant_id
      FROM usuarios WHERE lower(email) = lower($1)
    `, [email]);

    if (user.rows.length === 0) {
      console.log('❌ Usuario NO encontrado');
      return;
    }

    const userId = user.rows[0].id;
    console.log('✅ Usuario encontrado:', user.rows[0].email);
    console.log('   ID:', userId);

    // 2. VERIFICAR ROL ACTUAL
    console.log('\n📌 PASO 2: Verificar rol actual');
    const currentRole = await pool.query(`
      SELECT r.id, r.nombre, r.descripcion
      FROM usuarios_roles ur
      JOIN roles r ON ur.rol_id = r.id
      WHERE ur.usuario_id = $1
    `, [userId]);

    console.log(`   Roles asignados: ${currentRole.rows.length}`);
    if (currentRole.rows.length > 0) {
      currentRole.rows.forEach((rol, idx) => {
        console.log(`   ${idx + 1}. ${rol.nombre} - ID: ${rol.id}`);
      });
    }

    // 3. VERIFICAR PERMISOS ACTUALES
    console.log('\n📌 PASO 3: Verificar permisos actuales del rol');
    if (currentRole.rows.length > 0) {
      const rolId = currentRole.rows[0].id;
      const permisos = await pool.query(`
        SELECT DISTINCT p.clave, p.descripcion
        FROM roles_permisos rp
        JOIN permisos p ON rp.permiso_id = p.id
        WHERE rp.rol_id = $1
        ORDER BY p.clave
      `, [rolId]);

      console.log(`   Permisos actuales: ${permisos.rows.length}`);
      permisos.rows.forEach(p => console.log(`   - ${p.clave}: ${p.descripcion}`));
    }

    // 4. DEFINIR PERMISOS CORRECTOS PARA OPERADOR
    console.log('\n📌 PASO 4: Definir permisos correctos para rol Operador');
    const permisosOperador = [
      'pautas.view',
      'pautas.edit',
      'turnos.view',
      'turnos.edit',
      'central_monitoring.view'
    ];

    console.log('   Permisos que debe tener un Operador:');
    permisosOperador.forEach(p => console.log(`   - ${p}`));

    // 5. OBTENER IDS DE PERMISOS
    console.log('\n📌 PASO 5: Obtener IDs de permisos requeridos');
    const permisosIds = [];
    for (const permClave of permisosOperador) {
      const perm = await pool.query(`
        SELECT id, clave FROM permisos WHERE clave = $1
      `, [permClave]);
      
      if (perm.rows.length > 0) {
        permisosIds.push(perm.rows[0].id);
        console.log(`   ✅ ${permClave} → ID: ${perm.rows[0].id}`);
      } else {
        console.log(`   ❌ ${permClave} → NO EXISTE en la BD`);
      }
    }

    // 6. CREAR PERMISOS FALTANTES
    console.log('\n📌 PASO 6: Crear permisos faltantes');
    const permisosFaltantes = permisosOperador.filter(p => 
      !permisosIds.some(id => permisosIds.includes(id))
    );

    if (permisosFaltantes.length > 0) {
      console.log('   Creando permisos faltantes...');
      for (const permClave of permisosFaltantes) {
        const result = await pool.query(`
          INSERT INTO permisos (clave, descripcion)
          VALUES ($1, $2)
          ON CONFLICT (clave) DO NOTHING
          RETURNING id
        `, [permClave, permClave.replace('.', ' ').replace('_', ' ')]);
        
        if (result.rows.length > 0) {
          permisosIds.push(result.rows[0].id);
          console.log(`   ✅ Creado: ${permClave} → ID: ${result.rows[0].id}`);
        }
      }
    }

    // 7. ACTUALIZAR PERMISOS DEL ROL
    if (currentRole.rows.length > 0) {
      const rolId = currentRole.rows[0].id;
      console.log('\n📌 PASO 7: Actualizar permisos del rol');
      
      // Eliminar todos los permisos actuales
      await pool.query(`
        DELETE FROM roles_permisos WHERE rol_id = $1
      `, [rolId]);
      console.log('   ✅ Permisos anteriores eliminados');

      // Agregar los permisos correctos
      for (const permId of permisosIds) {
        await pool.query(`
          INSERT INTO roles_permisos (rol_id, permiso_id)
          VALUES ($1, $2)
          ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `, [rolId, permId]);
      }
      console.log(`   ✅ ${permisosIds.length} permisos asignados al rol`);
    }

    // 8. VERIFICAR RESULTADO FINAL
    console.log('\n📌 PASO 8: Verificar resultado final');
    if (currentRole.rows.length > 0) {
      const rolId = currentRole.rows[0].id;
      const permisosFinales = await pool.query(`
        SELECT DISTINCT p.clave, p.descripcion
        FROM roles_permisos rp
        JOIN permisos p ON rp.permiso_id = p.id
        WHERE rp.rol_id = $1
        ORDER BY p.clave
      `, [rolId]);

      console.log(`   Permisos finales del rol: ${permisosFinales.rows.length}`);
      permisosFinales.rows.forEach(p => console.log(`   - ${p.clave}: ${p.descripcion}`));
    }

    // 9. PROBAR FUNCIÓN RBAC
    console.log('\n📌 PASO 9: Probar función fn_usuario_tiene_permiso');
    const testPerms = [
      'pautas.view',
      'pautas.edit', 
      'turnos.view',
      'central_monitoring.view',
      'clientes.view',  // Debe ser FALSE
      'configuracion.view'  // Debe ser FALSE
    ];

    for (const perm of testPerms) {
      try {
        const result = await pool.query(
          `SELECT fn_usuario_tiene_permiso($1::text, $2::text) as tiene`,
          [email, perm]
        );
        const tiene = result.rows[0]?.tiene;
        console.log(`   ${tiene ? '✅' : '❌'} ${perm}: ${tiene}`);
      } catch (err) {
        console.log(`   ⚠️  ${perm}: ERROR - ${err.message}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ CORRECCIÓN COMPLETADA');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. El usuario central@gard.cl debe cerrar sesión y volver a iniciar sesión');
    console.log('2. Esto generará un JWT nuevo con el rol correcto');
    console.log('3. Los permisos ahora deberían funcionar correctamente');
    console.log('\n⚠️  IMPORTANTE: Si el problema persiste, revisar los bypasses en el frontend');

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  } finally {
    await pool.end();
  }
}

fixRbacCentralUser();
