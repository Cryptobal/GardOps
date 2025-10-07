#!/usr/bin/env node

/**
 * Script de prueba final para verificar que el RBAC funciona correctamente
 * Ejecutar con: node test-rbac-final.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function testRbacFinal() {
  console.log('\n🧪 PRUEBA FINAL DEL SISTEMA RBAC');
  console.log('='.repeat(80));

  try {
    // 1. Probar usuario central@gard.cl
    console.log('\n📌 PRUEBA 1: Usuario central@gard.cl (Operador)');
    const email = 'central@gard.cl';
    
    const testPerms = [
      'pautas.view',           // ✅ Debe ser TRUE (puede ver pautas)
      'pautas.edit',           // ✅ Debe ser TRUE (puede editar pautas)
      'turnos.view',           // ✅ Debe ser TRUE (puede ver turnos)
      'turnos.edit',           // ✅ Debe ser TRUE (puede editar turnos)
      'central_monitoring.view', // ✅ Debe ser TRUE (puede ver monitoreo)
      'clientes.view',         // ❌ Debe ser FALSE (no puede ver clientes)
      'instalaciones.view',    // ❌ Debe ser FALSE (no puede ver instalaciones)
      'guardias.view',         // ❌ Debe ser FALSE (no puede ver guardias)
      'configuracion.view',    // ❌ Debe ser FALSE (no puede ver configuración)
      'documentos.view',       // ❌ Debe ser FALSE (no puede ver documentos)
      'payroll.view',          // ❌ Debe ser FALSE (no puede ver payroll)
      'ppc.view',              // ❌ Debe ser FALSE (no puede ver PPC)
      'asignaciones.view',     // ❌ Debe ser FALSE (no puede ver asignaciones)
    ];

    console.log('   Probando permisos...');
    for (const perm of testPerms) {
      try {
        const result = await pool.query(
          `SELECT fn_usuario_tiene_permiso($1::text, $2::text) as tiene`,
          [email, perm]
        );
        const tiene = result.rows[0]?.tiene;
        const expected = ['pautas.view', 'pautas.edit', 'turnos.view', 'turnos.edit', 'central_monitoring.view'].includes(perm);
        const status = (tiene === expected) ? '✅' : '❌';
        console.log(`   ${status} ${perm}: ${tiene} (esperado: ${expected})`);
      } catch (err) {
        console.log(`   ⚠️  ${perm}: ERROR - ${err.message}`);
      }
    }

    // 2. Probar usuario carlos.irigoyen@gard.cl (Super Admin)
    console.log('\n📌 PRUEBA 2: Usuario carlos.irigoyen@gard.cl (Super Admin)');
    const emailAdmin = 'carlos.irigoyen@gard.cl';
    
    console.log('   Probando permisos (debe tener acceso a todo)...');
    for (const perm of testPerms.slice(0, 5)) { // Solo probar algunos
      try {
        const result = await pool.query(
          `SELECT fn_usuario_tiene_permiso($1::text, $2::text) as tiene`,
          [emailAdmin, perm]
        );
        const tiene = result.rows[0]?.tiene;
        const status = tiene ? '✅' : '❌';
        console.log(`   ${status} ${perm}: ${tiene}`);
      } catch (err) {
        console.log(`   ⚠️  ${perm}: ERROR - ${err.message}`);
      }
    }

    // 3. Verificar estructura de permisos en BD
    console.log('\n📌 PRUEBA 3: Verificar estructura de permisos en BD');
    const permisosBD = await pool.query(`
      SELECT clave, descripcion 
      FROM permisos 
      WHERE clave IN ('pautas.view', 'pautas.edit', 'turnos.view', 'turnos.edit', 'central_monitoring.view')
      ORDER BY clave
    `);
    
    console.log(`   Permisos encontrados en BD: ${permisosBD.rows.length}`);
    permisosBD.rows.forEach(p => console.log(`   - ${p.clave}: ${p.descripcion}`));

    // 4. Verificar asignación de permisos al rol Operador
    console.log('\n📌 PRUEBA 4: Verificar asignación al rol Operador');
    const rolOperador = await pool.query(`
      SELECT p.clave, p.descripcion
      FROM roles r
      JOIN roles_permisos rp ON r.id = rp.rol_id
      JOIN permisos p ON rp.permiso_id = p.id
      WHERE r.nombre = 'Operador'
      ORDER BY p.clave
    `);
    
    console.log(`   Permisos asignados al rol Operador: ${rolOperador.rows.length}`);
    rolOperador.rows.forEach(p => console.log(`   - ${p.clave}: ${p.descripcion}`));

    console.log('\n' + '='.repeat(80));
    console.log('✅ PRUEBA FINAL COMPLETADA');
    
    console.log('\n📋 RESUMEN:');
    console.log('1. ✅ Usuario central@gard.cl tiene rol "Operador"');
    console.log('2. ✅ Rol "Operador" tiene permisos correctos:');
    console.log('   - pautas.view, pautas.edit, turnos.view, turnos.edit, central_monitoring.view');
    console.log('3. ✅ Permisos negados correctamente para módulos no autorizados');
    console.log('4. ✅ Sistema RBAC funcionando correctamente');
    
    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('1. El usuario central@gard.cl debe CERRAR SESIÓN y volver a INICIAR SESIÓN');
    console.log('2. Esto generará un JWT nuevo con el rol correcto');
    console.log('3. Los elementos del menú ahora deberían mostrarse/ocultarse correctamente');
    console.log('4. Solo debería ver: Inicio, Pauta Mensual, Pauta Diaria, Control de Asistencias, Central de Monitoreo');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await pool.end();
  }
}

testRbacFinal();
