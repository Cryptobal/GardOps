#!/usr/bin/env node

/**
 * Script para limpiar y corregir las asignaciones RBAC
 */

require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function fixRBACAssignments() {
  console.log('🔧 CORRIGIENDO SISTEMA RBAC');
  console.log('============================\n');
  
  try {
    // 1. LIMPIAR ASIGNACIONES HUÉRFANAS
    console.log('1️⃣ LIMPIANDO ASIGNACIONES HUÉRFANAS...');
    console.log('----------------------------------------');
    
    // Primero, ver cuántas hay
    const huerfanas = await sql`
      SELECT COUNT(*) as total
      FROM usuarios_roles ur
      LEFT JOIN usuarios u ON ur.usuario_id = u.id
      WHERE u.id IS NULL
    `;
    console.log(`  • Asignaciones huérfanas encontradas: ${huerfanas.rows[0].total}`);
    
    if (huerfanas.rows[0].total > 0) {
      // Eliminar asignaciones huérfanas
      const deleted = await sql`
        DELETE FROM usuarios_roles
        WHERE usuario_id NOT IN (SELECT id FROM usuarios)
      `;
      console.log(`  ✅ Eliminadas ${deleted.rowCount} asignaciones huérfanas`);
    }
    
    // 2. OBTENER IDs NECESARIOS
    console.log('\n2️⃣ OBTENIENDO IDs NECESARIOS...');
    console.log('----------------------------------');
    
    // Obtener tenant Gard
    const tenant = await sql`
      SELECT id, nombre FROM tenants WHERE nombre = 'Gard'
    `;
    const tenantId = tenant.rows[0]?.id;
    console.log(`  • Tenant Gard ID: ${tenantId?.substring(0, 8)}...`);
    
    // Obtener usuarios
    const usuarios = await sql`
      SELECT id, email FROM usuarios WHERE activo = true
    `;
    const carlosId = usuarios.rows.find(u => u.email === 'carlos.irigoyen@gard.cl')?.id;
    const supervisorId = usuarios.rows.find(u => u.email === 'supervisor@gardops.com')?.id;
    
    console.log(`  • Carlos ID: ${carlosId?.substring(0, 8)}...`);
    console.log(`  • Supervisor ID: ${supervisorId?.substring(0, 8)}...`);
    
    // Obtener roles
    const roles = await sql`
      SELECT id, nombre FROM roles 
      WHERE tenant_id = ${tenantId} AND activo = true
    `;
    
    const superAdminRole = roles.rows.find(r => r.nombre === 'Super Admin');
    const supervisorRole = roles.rows.find(r => r.nombre === 'Supervisor');
    
    console.log(`  • Rol Super Admin ID: ${superAdminRole?.id?.substring(0, 8)}...`);
    console.log(`  • Rol Supervisor ID: ${supervisorRole?.id?.substring(0, 8)}...`);
    
    // 3. ASIGNAR ROLES A USUARIOS EXISTENTES
    console.log('\n3️⃣ ASIGNANDO ROLES A USUARIOS...');
    console.log('-----------------------------------');
    
    if (carlosId && superAdminRole) {
      // Verificar si ya tiene el rol
      const existing = await sql`
        SELECT * FROM usuarios_roles 
        WHERE usuario_id = ${carlosId} AND rol_id = ${superAdminRole.id}
      `;
      
      if (existing.rows.length === 0) {
        await sql`
          INSERT INTO usuarios_roles (usuario_id, rol_id)
          VALUES (${carlosId}, ${superAdminRole.id})
        `;
        console.log('  ✅ Carlos asignado como Super Admin');
      } else {
        console.log('  ℹ️ Carlos ya tiene rol Super Admin');
      }
    }
    
    if (supervisorId && supervisorRole) {
      // Verificar si ya tiene el rol
      const existing = await sql`
        SELECT * FROM usuarios_roles 
        WHERE usuario_id = ${supervisorId} AND rol_id = ${supervisorRole.id}
      `;
      
      if (existing.rows.length === 0) {
        await sql`
          INSERT INTO usuarios_roles (usuario_id, rol_id)
          VALUES (${supervisorId}, ${supervisorRole.id})
        `;
        console.log('  ✅ Supervisor asignado con rol Supervisor');
      } else {
        console.log('  ℹ️ Supervisor ya tiene rol asignado');
      }
    }
    
    // 4. CREAR USUARIO AGENTE
    console.log('\n4️⃣ CREANDO USUARIO AGENTE...');
    console.log('-------------------------------');
    
    // Verificar si ya existe
    const agenteExiste = await sql`
      SELECT id FROM usuarios WHERE email = 'agente@gard.cl'
    `;
    
    if (agenteExiste.rows.length > 0) {
      console.log('  ℹ️ Usuario agente@gard.cl ya existe');
    } else {
      // Crear usuario agente
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('Gard2025!', 10);
      
      const newAgente = await sql`
        INSERT INTO usuarios (
          email, 
          password, 
          nombre, 
          apellido, 
          rol, 
          activo, 
          tenant_id
        )
        VALUES (
          'agente@gard.cl',
          ${hashedPassword},
          'Agente',
          'Operativo',
          'guardia',
          true,
          ${tenantId}
        )
        RETURNING id
      `;
      
      const agenteId = newAgente.rows[0].id;
      console.log(`  ✅ Usuario agente@gard.cl creado (ID: ${agenteId.substring(0, 8)}...)`);
      
      // Asignar rol Operador al agente
      const operadorRole = roles.rows.find(r => r.nombre === 'Operador');
      if (operadorRole) {
        await sql`
          INSERT INTO usuarios_roles (usuario_id, rol_id)
          VALUES (${agenteId}, ${operadorRole.id})
        `;
        console.log('  ✅ Rol Operador asignado a agente@gard.cl');
      }
      
      console.log('\n  📝 Credenciales del nuevo usuario:');
      console.log('     Email: agente@gard.cl');
      console.log('     Password: Gard2025!');
    }
    
    // 5. VERIFICACIÓN FINAL
    console.log('\n5️⃣ VERIFICACIÓN FINAL...');
    console.log('-------------------------');
    
    const verificacion = await sql`
      SELECT 
        u.email,
        r.nombre as rol_nombre,
        t.nombre as tenant_nombre
      FROM usuarios_roles ur
      JOIN usuarios u ON ur.usuario_id = u.id
      JOIN roles r ON ur.rol_id = r.id
      LEFT JOIN tenants t ON r.tenant_id = t.id
      WHERE u.activo = true
      ORDER BY u.email
    `;
    
    console.log('\n✅ ASIGNACIONES ACTUALES:');
    verificacion.rows.forEach(v => {
      console.log(`  • ${v.email}: ${v.rol_nombre} (${v.tenant_nombre || 'Global'})`);
    });
    
    // Contar totales
    const totales = await sql`
      SELECT 
        (SELECT COUNT(*) FROM usuarios WHERE activo = true) as usuarios_activos,
        (SELECT COUNT(*) FROM usuarios_roles ur 
         JOIN usuarios u ON ur.usuario_id = u.id 
         WHERE u.activo = true) as asignaciones_activas,
        (SELECT COUNT(DISTINCT usuario_id) FROM usuarios_roles ur
         JOIN usuarios u ON ur.usuario_id = u.id 
         WHERE u.activo = true) as usuarios_con_rol
    `;
    
    const stats = totales.rows[0];
    console.log('\n📊 ESTADÍSTICAS FINALES:');
    console.log(`  • Usuarios activos: ${stats.usuarios_activos}`);
    console.log(`  • Usuarios con rol: ${stats.usuarios_con_rol}`);
    console.log(`  • Total asignaciones: ${stats.asignaciones_activas}`);
    
    console.log('\n✅ SISTEMA RBAC CORREGIDO EXITOSAMENTE');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

fixRBACAssignments().catch(console.error);
