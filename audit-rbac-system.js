#!/usr/bin/env node

/**
 * Script de auditoría profunda del sistema RBAC
 * Analiza todas las tablas relacionadas con usuarios, roles y permisos
 */

require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function auditRBAC() {
  console.log('🔍 AUDITORÍA PROFUNDA DEL SISTEMA RBAC');
  console.log('=====================================\n');
  
  try {
    // 1. ANÁLISIS DE TABLAS DE USUARIOS
    console.log('📊 1. TABLAS DE USUARIOS');
    console.log('------------------------');
    
    // Tabla usuarios
    const usuarios = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN activo = true THEN 1 END) as activos,
        COUNT(CASE WHEN rol IS NOT NULL THEN 1 END) as con_rol_campo
      FROM usuarios
    `;
    console.log('✓ Tabla usuarios:', usuarios.rows[0]);
    
    // Usuarios con detalles
    const usuariosDetalle = await sql`
      SELECT id, email, nombre, apellido, rol, activo, tenant_id
      FROM usuarios
      ORDER BY id DESC
    `;
    console.log('\nUsuarios en sistema:');
    usuariosDetalle.rows.forEach(u => {
      console.log(`  - ${u.email}: activo=${u.activo}, rol_campo=${u.rol || 'NULL'}, tenant_id=${u.tenant_id || 'NULL'}`);
    });
    
    // 2. ANÁLISIS DE TABLAS DE ROLES
    console.log('\n📊 2. TABLAS DE ROLES');
    console.log('----------------------');
    
    // Tabla roles (nueva/RBAC)
    const rolesNuevos = await sql`
      SELECT 
        r.id, r.nombre, r.descripcion, r.activo,
        t.nombre as tenant_nombre,
        COUNT(DISTINCT rp.permiso_id) as num_permisos
      FROM roles r
      LEFT JOIN tenants t ON r.tenant_id = t.id
      LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
      GROUP BY r.id, r.nombre, r.descripcion, r.activo, t.nombre
      ORDER BY r.nombre
    `;
    console.log('\n✓ Tabla roles (RBAC nueva - 6 roles visibles en frontend):');
    rolesNuevos.rows.forEach(r => {
      console.log(`  - ${r.nombre} (tenant: ${r.tenant_nombre || 'NULL'}): activo=${r.activo}, permisos=${r.num_permisos}`);
    });
    
    // Verificar vistas RBAC
    console.log('\n✓ Verificando vistas RBAC:');
    try {
      const rbacRolesCount = await sql`SELECT COUNT(*) as total FROM rbac_roles`;
      console.log(`  - Vista rbac_roles: ${rbacRolesCount.rows[0].total} registros`);
    } catch (e) {
      console.log('  - Vista rbac_roles: no existe o error');
    }
    
    // Tablas legacy de roles
    console.log('\n✓ Tablas legacy de roles:');
    try {
      const rolesServicio = await sql`SELECT COUNT(*) as total FROM roles_servicio`;
      console.log(`  - roles_servicio: ${rolesServicio.rows[0].total} registros (LEGACY - considerar eliminar)`);
    } catch (e) {
      console.log('  - roles_servicio: no existe');
    }
    
    try {
      const asTurnosRoles = await sql`SELECT COUNT(*) as total FROM as_turnos_roles_servicio`;
      console.log(`  - as_turnos_roles_servicio: ${asTurnosRoles.rows[0].total} registros (LEGACY - considerar eliminar)`);
    } catch (e) {
      console.log('  - as_turnos_roles_servicio: no existe');
    }
    
    // 3. ANÁLISIS DE ASIGNACIONES USUARIO-ROL
    console.log('\n📊 3. ASIGNACIONES USUARIO-ROL');
    console.log('-------------------------------');
    
    // Contar total de asignaciones
    const totalAsignaciones = await sql`SELECT COUNT(*) as total FROM usuarios_roles`;
    console.log(`\nTotal asignaciones en usuarios_roles: ${totalAsignaciones.rows[0].total} (26 filas mencionadas)`);
    
    // Tabla usuarios_roles con detalles
    const usuariosRoles = await sql`
      SELECT 
        ur.usuario_id,
        u.email,
        r.nombre as rol_nombre,
        t.nombre as tenant_nombre,
        u.activo as usuario_activo,
        r.activo as rol_activo
      FROM usuarios_roles ur
      JOIN usuarios u ON ur.usuario_id = u.id
      JOIN roles r ON ur.rol_id = r.id
      LEFT JOIN tenants t ON r.tenant_id = t.id
      ORDER BY u.email, r.nombre
    `;
    
    console.log('\n✓ Asignaciones detalladas:');
    const userRoleMap = {};
    usuariosRoles.rows.forEach(ur => {
      const key = ur.email;
      if (!userRoleMap[key]) {
        userRoleMap[key] = {
          activo: ur.usuario_activo,
          roles: []
        };
      }
      userRoleMap[key].roles.push({
        nombre: ur.rol_nombre,
        tenant: ur.tenant_nombre || 'sin tenant',
        rol_activo: ur.rol_activo
      });
    });
    
    Object.entries(userRoleMap).forEach(([email, data]) => {
      const rolesStr = data.roles.map(r => 
        `${r.nombre} (${r.tenant}, activo=${r.rol_activo})`
      ).join(', ');
      console.log(`  - ${email} [usuario_activo=${data.activo}]: ${rolesStr}`);
    });
    
    // Explicar discrepancia
    console.log('\n⚠️  EXPLICACIÓN: 26 filas en usuarios_roles vs 6 roles en pantalla');
    console.log('  - Las 26 filas pueden incluir:');
    console.log('    • Múltiples asignaciones del mismo rol a diferentes usuarios');
    console.log('    • Asignaciones históricas de usuarios/roles inactivos');
    console.log('    • Duplicados o asignaciones múltiples');
    
    // 4. ANÁLISIS DE PERMISOS
    console.log('\n📊 4. TABLAS DE PERMISOS');
    console.log('------------------------');
    
    // Tabla permisos
    const permisos = await sql`
      SELECT COUNT(*) as total, COUNT(DISTINCT categoria) as categorias
      FROM permisos
    `;
    console.log(`✓ Tabla permisos: ${permisos.rows[0].total} permisos en ${permisos.rows[0].categorias} categorías`);
    
    // Verificar vistas de permisos
    try {
      const rbacPermisos = await sql`SELECT COUNT(*) as total FROM rbac_permisos`;
      console.log(`✓ Vista rbac_permisos: ${rbacPermisos.rows[0].total} registros`);
    } catch (e) {
      console.log('✓ Vista rbac_permisos: no existe');
    }
    
    // Tabla roles_permisos
    const rolesPermisos = await sql`
      SELECT 
        r.nombre as rol,
        COUNT(rp.permiso_id) as num_permisos
      FROM roles r
      LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
      WHERE r.activo = true
      GROUP BY r.nombre
      ORDER BY num_permisos DESC
    `;
    console.log('\n✓ Permisos por rol activo:');
    rolesPermisos.rows.forEach(rp => {
      console.log(`  - ${rp.rol}: ${rp.num_permisos} permisos`);
    });
    
    // Verificar vista rbac_roles_permisos
    try {
      const rbacRolesPermisos = await sql`SELECT COUNT(*) as total FROM rbac_roles_permisos`;
      console.log(`\n✓ Vista rbac_roles_permisos: ${rbacRolesPermisos.rows[0].total} registros`);
    } catch (e) {
      console.log('\n✓ Vista rbac_roles_permisos: no existe');
    }
    
    // Tabla usuarios_permisos (permisos directos)
    const usuariosPermisos = await sql`
      SELECT COUNT(*) as total FROM usuarios_permisos
    `;
    console.log(`✓ Tabla usuarios_permisos (permisos directos): ${usuariosPermisos.rows[0].total} registros`);
    
    if (usuariosPermisos.rows[0].total > 0) {
      const permisosDirectos = await sql`
        SELECT u.email, COUNT(up.permiso_id) as num_permisos
        FROM usuarios_permisos up
        JOIN usuarios u ON up.usuario_id = u.id
        GROUP BY u.email
      `;
      console.log('  Usuarios con permisos directos:');
      permisosDirectos.rows.forEach(pd => {
        console.log(`    - ${pd.email}: ${pd.num_permisos} permisos directos`);
      });
    }
    
    // 5. ANÁLISIS DE INCONSISTENCIAS
    console.log('\n⚠️  5. INCONSISTENCIAS DETECTADAS');
    console.log('----------------------------------');
    
    // Usuarios sin roles asignados
    const usuariosSinRol = await sql`
      SELECT u.email, u.activo
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id
      WHERE ur.usuario_id IS NULL
    `;
    if (usuariosSinRol.rows.length > 0) {
      console.log('\n❌ Usuarios sin rol asignado:');
      usuariosSinRol.rows.forEach(u => {
        console.log(`  - ${u.email} (activo=${u.activo})`);
      });
    } else {
      console.log('\n✅ Todos los usuarios tienen al menos un rol asignado');
    }
    
    // Roles sin permisos
    const rolesSinPermisos = await sql`
      SELECT r.nombre, r.activo
      FROM roles r
      LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
      WHERE rp.rol_id IS NULL
    `;
    if (rolesSinPermisos.rows.length > 0) {
      console.log('\n❌ Roles sin permisos asignados:');
      rolesSinPermisos.rows.forEach(r => {
        console.log(`  - ${r.nombre} (activo=${r.activo})`);
      });
    } else {
      console.log('\n✅ Todos los roles tienen permisos asignados');
    }
    
    // Verificar duplicados en usuarios_roles
    const duplicados = await sql`
      SELECT u.email, r.nombre, COUNT(*) as veces
      FROM usuarios_roles ur
      JOIN usuarios u ON ur.usuario_id = u.id
      JOIN roles r ON ur.rol_id = r.id
      GROUP BY u.email, r.nombre
      HAVING COUNT(*) > 1
    `;
    if (duplicados.rows.length > 0) {
      console.log('\n❌ Asignaciones duplicadas usuario-rol:');
      duplicados.rows.forEach(d => {
        console.log(`  - ${d.email} tiene el rol ${d.nombre} asignado ${d.veces} veces`);
      });
    }
    
    // 6. TABLAS HISTÓRICAS/LEGACY
    console.log('\n📦 6. TABLAS HISTÓRICAS/LEGACY');
    console.log('-------------------------------');
    
    const historicalTables = [
      { name: 'sueldo_historial_roles', type: 'LEGACY - Nómina' },
      { name: 'historial_roles_servicio', type: 'LEGACY - Turnos' },
      { name: 'logs_usuarios', type: 'Auditoría' },
      { name: 'documentos_usuarios', type: 'Documentos' }
    ];
    
    for (const table of historicalTables) {
      try {
        const result = await sql`SELECT COUNT(*) as total FROM ${sql.identifier([table.name])}`;
        console.log(`✓ ${table.name} (${table.type}): ${result.rows[0].total} registros`);
      } catch (e) {
        console.log(`✗ ${table.name}: no existe o error`);
      }
    }
    
    // 7. RECOMENDACIONES
    console.log('\n💡 7. RECOMENDACIONES');
    console.log('---------------------');
    
    console.log('\n📌 TABLAS ACTIVAS (mantener):');
    console.log('  • usuarios - Tabla principal de usuarios');
    console.log('  • roles - Tabla principal de roles RBAC');
    console.log('  • permisos - Catálogo de permisos');
    console.log('  • usuarios_roles - Asignación usuario-rol');
    console.log('  • roles_permisos - Asignación rol-permisos');
    console.log('  • usuarios_permisos - Permisos directos (opcional)');
    console.log('  • tenants - Multi-tenancy');
    
    console.log('\n🗑️  TABLAS PARA EVALUAR ELIMINACIÓN:');
    console.log('  • roles_servicio - LEGACY, reemplazada por roles');
    console.log('  • as_turnos_roles_servicio - LEGACY, relacionada con roles_servicio');
    console.log('  • sueldo_historial_roles - Si no se usa para nómina');
    console.log('  • historial_roles_servicio - Si no se necesita historial');
    
    console.log('\n👁️  VISTAS (probablemente generadas, mantener):');
    console.log('  • rbac_roles - Vista de roles');
    console.log('  • rbac_permisos - Vista de permisos');
    console.log('  • rbac_roles_permisos - Vista de relación');
    
    console.log('\n✅ ACCIONES RECOMENDADAS:');
    console.log('  1. Limpiar asignaciones duplicadas en usuarios_roles');
    console.log('  2. Asignar roles a usuarios sin rol');
    console.log('  3. Revisar y eliminar tablas legacy si no se usan');
    console.log('  4. Documentar el propósito de cada tabla');
    
    console.log('\n🔍 AUDITORÍA COMPLETADA');
    
  } catch (error) {
    console.error('❌ Error en auditoría:', error);
  } finally {
    await sql.end();
  }
}

// Ejecutar auditoría
auditRBAC().catch(console.error);
