#!/usr/bin/env tsx

import { sql } from '@vercel/postgres';

async function auditRolesPermisos() {
  try {
    console.log('🔍 AUDITORÍA DE ROLES Y PERMISOS');
    console.log('================================\n');

    // 1. Verificar qué tablas RBAC existen
    console.log('📋 1. TABLAS RBAC EXISTENTES:');
    const tables = await sql`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%rol%' OR table_name LIKE '%perm%' OR table_name LIKE '%rbac%'
      ORDER BY table_name
    `;
    
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name} (${row.table_type})`);
    });
    console.log('');

    // 2. Listar todos los tenants
    console.log('🏢 2. TENANTS EXISTENTES:');
    const tenants = await sql`
      SELECT id, nombre, slug, activo
      FROM tenants
      ORDER BY nombre
    `;
    
    tenants.rows.forEach(tenant => {
      console.log(`   - ${tenant.nombre} (${tenant.slug}) - ${tenant.activo ? 'Activo' : 'Inactivo'} - ID: ${tenant.id}`);
    });
    console.log('');

    // 3. Listar todos los roles por tenant
    console.log('👥 3. ROLES POR TENANT:');
    const roles = await sql`
      SELECT r.id, r.nombre, r.descripcion, r.tenant_id, t.nombre as tenant_nombre
      FROM roles r
      LEFT JOIN tenants t ON r.tenant_id = t.id
      ORDER BY t.nombre NULLS FIRST, r.nombre
    `;
    
    let currentTenant = null;
    roles.rows.forEach(role => {
      const tenantName = role.tenant_nombre || 'GLOBAL (sin tenant)';
      if (currentTenant !== tenantName) {
        currentTenant = tenantName;
        console.log(`   📁 ${tenantName}:`);
      }
      console.log(`      - ${role.nombre}${role.descripcion ? ` (${role.descripcion})` : ''} - ID: ${role.id}`);
    });
    console.log('');

    // 4. Listar todos los permisos
    console.log('🔐 4. PERMISOS DISPONIBLES:');
    const permisos = await sql`
      SELECT id, clave, descripcion, categoria
      FROM permisos
      ORDER BY categoria NULLS FIRST, clave
    `;
    
    let currentCategory = null;
    permisos.rows.forEach(permiso => {
      if (currentCategory !== permiso.categoria) {
        currentCategory = permiso.categoria;
        console.log(`   📂 ${permiso.categoria || 'Sin categoría'}:`);
      }
      console.log(`      - ${permiso.clave}${permiso.descripcion ? ` (${permiso.descripcion})` : ''}`);
    });
    console.log('');

    // 5. Mostrar permisos por rol
    console.log('🎯 5. PERMISOS POR ROL:');
    const rolesConPermisos = await sql`
      SELECT 
        r.id as rol_id,
        r.nombre as rol_nombre,
        r.tenant_id,
        t.nombre as tenant_nombre,
        p.clave as permiso_clave,
        p.descripcion as permiso_descripcion
      FROM roles r
      LEFT JOIN tenants t ON r.tenant_id = t.id
      LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
      LEFT JOIN permisos p ON rp.permiso_id = p.id
      ORDER BY t.nombre NULLS FIRST, r.nombre, p.clave
    `;
    
    let currentRol = null;
    rolesConPermisos.rows.forEach(row => {
      const tenantName = row.tenant_nombre || 'GLOBAL';
      const rolKey = `${tenantName}:${row.rol_nombre}`;
      
      if (currentRol !== rolKey) {
        currentRol = rolKey;
        console.log(`   👤 ${row.rol_nombre} (${tenantName}):`);
      }
      
      if (row.permiso_clave) {
        console.log(`      - ${row.permiso_clave}${row.permiso_descripcion ? ` (${row.permiso_descripcion})` : ''}`);
      } else {
        console.log(`      - Sin permisos asignados`);
      }
    });
    console.log('');

    // 6. Verificar usuarios y sus roles
    console.log('👤 6. USUARIOS Y SUS ROLES:');
    const usuariosConRoles = await sql`
      SELECT 
        u.id,
        u.email,
        u.nombre,
        u.tenant_id,
        t.nombre as tenant_nombre,
        r.nombre as rol_nombre
      FROM usuarios u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id
      LEFT JOIN roles r ON ur.rol_id = r.id
      WHERE u.activo = true
      ORDER BY t.nombre NULLS FIRST, u.email
    `;
    
    let currentUser = null;
    usuariosConRoles.rows.forEach(row => {
      const tenantName = row.tenant_nombre || 'Sin tenant';
      const userKey = `${row.email}`;
      
      if (currentUser !== userKey) {
        currentUser = userKey;
        console.log(`   📧 ${row.email} (${row.nombre || 'Sin nombre'}) - ${tenantName}:`);
      }
      
      if (row.rol_nombre) {
        console.log(`      - Rol: ${row.rol_nombre}`);
      } else {
        console.log(`      - Sin roles asignados`);
      }
    });
    console.log('');

    // 7. Resumen estadístico
    console.log('📊 7. RESUMEN ESTADÍSTICO:');
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM tenants) as total_tenants,
        (SELECT COUNT(*) FROM roles) as total_roles,
        (SELECT COUNT(*) FROM permisos) as total_permisos,
        (SELECT COUNT(*) FROM usuarios WHERE activo = true) as total_usuarios_activos,
        (SELECT COUNT(*) FROM usuarios_roles) as total_asignaciones_roles,
        (SELECT COUNT(*) FROM roles_permisos) as total_asignaciones_permisos
    `;
    
    const stat = stats.rows[0];
    console.log(`   - Tenants: ${stat.total_tenants}`);
    console.log(`   - Roles: ${stat.total_roles}`);
    console.log(`   - Permisos: ${stat.total_permisos}`);
    console.log(`   - Usuarios activos: ${stat.total_usuarios_activos}`);
    console.log(`   - Asignaciones usuario-rol: ${stat.total_asignaciones_roles}`);
    console.log(`   - Asignaciones rol-permiso: ${stat.total_asignaciones_permisos}`);
    console.log('');

    // 8. Verificar si hay roles solo en Gard
    console.log('🔍 8. VERIFICACIÓN DE ROLES POR TENANT:');
    const rolesPorTenant = await sql`
      SELECT 
        t.nombre as tenant_nombre,
        COUNT(r.id) as total_roles
      FROM tenants t
      LEFT JOIN roles r ON t.id = r.tenant_id
      GROUP BY t.id, t.nombre
      ORDER BY t.nombre
    `;
    
    rolesPorTenant.rows.forEach(row => {
      console.log(`   - ${row.tenant_nombre}: ${row.total_roles} roles`);
    });
    
    const rolesGlobales = await sql`
      SELECT COUNT(*) as total
      FROM roles
      WHERE tenant_id IS NULL
    `;
    console.log(`   - Roles globales (sin tenant): ${rolesGlobales.rows[0].total}`);
    console.log('');

    console.log('✅ Auditoría completada');

  } catch (error: any) {
    console.error('❌ Error en auditoría:', error.message);
    process.exit(1);
  }
}

auditRolesPermisos();
