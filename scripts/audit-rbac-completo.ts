import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
import { writeFileSync } from 'fs';

dotenv.config({ path: '.env.local' });

async function auditarSistemaRBAC() {
  console.log('🔍 AUDITORÍA COMPLETA DEL SISTEMA RBAC - GARDOPS\n');
  console.log('=' . repeat(80));
  
  const informe: string[] = [];
  
  try {
    // 1. ANÁLISIS DE USUARIOS CON MÚLTIPLES ROLES
    console.log('\n📊 1. ANÁLISIS DE USUARIOS CON MÚLTIPLES ROLES');
    console.log('-'.repeat(50));
    
    const usuariosMultiplesRoles = await sql`
      SELECT 
        u.email,
        u.nombre,
        u.activo,
        COUNT(ur.rol_id) as num_roles,
        STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
      LEFT JOIN roles r ON r.id = ur.rol_id
      GROUP BY u.id, u.email, u.nombre, u.activo
      HAVING COUNT(ur.rol_id) > 1
      ORDER BY num_roles DESC
    `;
    
    if (usuariosMultiplesRoles.rows.length > 0) {
      console.log('⚠️ PROBLEMA DETECTADO: Usuarios con múltiples roles');
      informe.push('\n## ⚠️ PROBLEMA: USUARIOS CON MÚLTIPLES ROLES');
      informe.push('Esto puede causar conflictos de permisos y pérdida de accesos.\n');
      
      usuariosMultiplesRoles.rows.forEach(user => {
        console.log(`   • ${user.email}: ${user.num_roles} roles (${user.roles})`);
        informe.push(`- **${user.email}**: ${user.num_roles} roles (${user.roles})`);
      });
    } else {
      console.log('✅ No hay usuarios con múltiples roles');
      informe.push('\n## ✅ USUARIOS CON MÚLTIPLES ROLES: No detectados');
    }
    
    // 2. ANÁLISIS DE USUARIOS SIN ROLES
    console.log('\n📊 2. ANÁLISIS DE USUARIOS SIN ROLES');
    console.log('-'.repeat(50));
    
    const usuariosSinRoles = await sql`
      SELECT 
        u.email,
        u.nombre,
        u.activo,
        u.tenant_id
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
      WHERE ur.usuario_id IS NULL
      AND u.activo = true
      ORDER BY u.email
    `;
    
    if (usuariosSinRoles.rows.length > 0) {
      console.log('⚠️ PROBLEMA DETECTADO: Usuarios activos sin roles');
      informe.push('\n## ⚠️ PROBLEMA: USUARIOS ACTIVOS SIN ROLES');
      informe.push('Estos usuarios no pueden acceder al sistema.\n');
      
      usuariosSinRoles.rows.forEach(user => {
        console.log(`   • ${user.email} (${user.nombre || 'Sin nombre'})`);
        informe.push(`- **${user.email}** (${user.nombre || 'Sin nombre'})`);
      });
    } else {
      console.log('✅ Todos los usuarios activos tienen roles asignados');
      informe.push('\n## ✅ USUARIOS SIN ROLES: No detectados');
    }
    
    // 3. ANÁLISIS DE PERMISOS DUPLICADOS
    console.log('\n📊 3. ANÁLISIS DE PERMISOS DUPLICADOS O CONFLICTIVOS');
    console.log('-'.repeat(50));
    
    const permisosDuplicados = await sql`
      SELECT 
        clave,
        COUNT(*) as cantidad
      FROM permisos
      GROUP BY clave
      HAVING COUNT(*) > 1
    `;
    
    if (permisosDuplicados.rows.length > 0) {
      console.log('⚠️ PROBLEMA DETECTADO: Permisos duplicados');
      informe.push('\n## ⚠️ PROBLEMA: PERMISOS DUPLICADOS');
      
      permisosDuplicados.rows.forEach(perm => {
        console.log(`   • ${perm.clave}: ${perm.cantidad} duplicados`);
        informe.push(`- **${perm.clave}**: ${perm.cantidad} duplicados`);
      });
    } else {
      console.log('✅ No hay permisos duplicados');
      informe.push('\n## ✅ PERMISOS DUPLICADOS: No detectados');
    }
    
    // 4. ANÁLISIS DE ROLES SIN PERMISOS
    console.log('\n📊 4. ANÁLISIS DE ROLES SIN PERMISOS');
    console.log('-'.repeat(50));
    
    const rolesSinPermisos = await sql`
      SELECT 
        r.nombre,
        r.descripcion,
        r.tenant_id
      FROM roles r
      LEFT JOIN roles_permisos rp ON rp.rol_id = r.id
      WHERE rp.rol_id IS NULL
      ORDER BY r.nombre
    `;
    
    if (rolesSinPermisos.rows.length > 0) {
      console.log('⚠️ PROBLEMA DETECTADO: Roles sin permisos asignados');
      informe.push('\n## ⚠️ PROBLEMA: ROLES SIN PERMISOS');
      
      rolesSinPermisos.rows.forEach(role => {
        console.log(`   • ${role.nombre}: ${role.descripcion || 'Sin descripción'}`);
        informe.push(`- **${role.nombre}**: ${role.descripcion || 'Sin descripción'}`);
      });
    } else {
      console.log('✅ Todos los roles tienen permisos asignados');
      informe.push('\n## ✅ ROLES SIN PERMISOS: No detectados');
    }
    
    // 5. ANÁLISIS DE INCONSISTENCIAS EN TABLAS
    console.log('\n📊 5. ANÁLISIS DE INCONSISTENCIAS EN ESTRUCTURA DE TABLAS');
    console.log('-'.repeat(50));
    
    const tablasRBAC = await sql`
      SELECT 
        tablename as tabla,
        schemaname as esquema
      FROM pg_tables
      WHERE schemaname = 'public'
      AND (
        tablename LIKE '%usuario%' OR
        tablename LIKE '%role%' OR
        tablename LIKE '%permiso%' OR
        tablename LIKE '%rbac%'
      )
      ORDER BY tablename
    `;
    
    console.log('Tablas relacionadas con RBAC encontradas:');
    informe.push('\n## 📋 ESTRUCTURA DE TABLAS RBAC\n');
    
    let inconsistencias = false;
    tablasRBAC.rows.forEach(tabla => {
      console.log(`   • ${tabla.tabla}`);
      informe.push(`- ${tabla.tabla}`);
      
      // Detectar inconsistencias de nomenclatura
      if (tabla.tabla.includes('rbac_') && 
          (tabla.tabla.includes('usuarios') || tabla.tabla.includes('roles') || tabla.tabla.includes('permisos'))) {
        inconsistencias = true;
      }
    });
    
    if (inconsistencias) {
      console.log('\n⚠️ PROBLEMA: Inconsistencia en nomenclatura (tablas con y sin prefijo rbac_)');
      informe.push('\n⚠️ **Inconsistencia detectada**: Hay tablas con prefijo rbac_ y sin él');
    }
    
    // 6. ANÁLISIS ESPECÍFICO DE CARLOS
    console.log('\n📊 6. ANÁLISIS DEL USUARIO CARLOS.IRIGOYEN@GARD.CL');
    console.log('-'.repeat(50));
    
    const carlosAnalisis = await sql`
      SELECT 
        u.id,
        u.email,
        u.nombre,
        u.activo,
        u.rol as rol_campo,
        u.tenant_id,
        COUNT(DISTINCT ur.rol_id) as num_roles,
        STRING_AGG(DISTINCT r.nombre, ', ' ORDER BY r.nombre) as roles_asignados,
        COUNT(DISTINCT p.id) as total_permisos
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
      LEFT JOIN roles r ON r.id = ur.rol_id
      LEFT JOIN roles_permisos rp ON rp.rol_id = r.id
      LEFT JOIN permisos p ON p.id = rp.permiso_id
      WHERE LOWER(u.email) = 'carlos.irigoyen@gard.cl'
      GROUP BY u.id, u.email, u.nombre, u.activo, u.rol, u.tenant_id
    `;
    
    if (carlosAnalisis.rows.length > 0) {
      const carlos = carlosAnalisis.rows[0];
      console.log(`   Email: ${carlos.email}`);
      console.log(`   Activo: ${carlos.activo ? 'Sí' : 'No'}`);
      console.log(`   Rol en campo 'rol': ${carlos.rol_campo || 'No definido'}`);
      console.log(`   Tenant ID: ${carlos.tenant_id || 'NULL (Global)'}`);
      console.log(`   Número de roles: ${carlos.num_roles}`);
      console.log(`   Roles asignados: ${carlos.roles_asignados || 'NINGUNO'}`);
      console.log(`   Total permisos: ${carlos.total_permisos}`);
      
      informe.push('\n## 👤 ANÁLISIS DE CARLOS.IRIGOYEN@GARD.CL\n');
      informe.push(`- **Email**: ${carlos.email}`);
      informe.push(`- **Activo**: ${carlos.activo ? 'Sí' : 'No'}`);
      informe.push(`- **Rol (campo)**: ${carlos.rol_campo || 'No definido'}`);
      informe.push(`- **Tenant**: ${carlos.tenant_id || 'NULL (Global)'}`);
      informe.push(`- **Número de roles**: ${carlos.num_roles}`);
      informe.push(`- **Roles**: ${carlos.roles_asignados || 'NINGUNO'}`);
      informe.push(`- **Total permisos**: ${carlos.total_permisos}`);
      
      if (carlos.num_roles > 1) {
        console.log('\n   ⚠️ PROBLEMA: Usuario con múltiples roles - puede causar conflictos');
        informe.push('\n⚠️ **PROBLEMA**: Usuario con múltiples roles - puede causar conflictos');
      }
      
      if (carlos.num_roles === 0) {
        console.log('\n   🔴 PROBLEMA CRÍTICO: Usuario sin roles asignados');
        informe.push('\n🔴 **PROBLEMA CRÍTICO**: Usuario sin roles asignados');
      }
    } else {
      console.log('❌ Usuario carlos.irigoyen@gard.cl no encontrado');
      informe.push('\n## ❌ Usuario carlos.irigoyen@gard.cl NO ENCONTRADO');
    }
    
    // 7. ESTADÍSTICAS GENERALES
    console.log('\n📊 7. ESTADÍSTICAS GENERALES DEL SISTEMA');
    console.log('-'.repeat(50));
    
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM usuarios WHERE activo = true) as usuarios_activos,
        (SELECT COUNT(*) FROM usuarios WHERE activo = false) as usuarios_inactivos,
        (SELECT COUNT(*) FROM roles) as total_roles,
        (SELECT COUNT(*) FROM permisos) as total_permisos,
        (SELECT COUNT(DISTINCT usuario_id) FROM usuarios_roles) as usuarios_con_roles,
        (SELECT COUNT(DISTINCT tenant_id) FROM usuarios WHERE tenant_id IS NOT NULL) as total_tenants
    `;
    
    const stat = stats.rows[0];
    console.log(`   Usuarios activos: ${stat.usuarios_activos}`);
    console.log(`   Usuarios inactivos: ${stat.usuarios_inactivos}`);
    console.log(`   Total de roles: ${stat.total_roles}`);
    console.log(`   Total de permisos: ${stat.total_permisos}`);
    console.log(`   Usuarios con roles: ${stat.usuarios_con_roles}`);
    console.log(`   Total de tenants: ${stat.total_tenants}`);
    
    informe.push('\n## 📈 ESTADÍSTICAS GENERALES\n');
    informe.push(`- **Usuarios activos**: ${stat.usuarios_activos}`);
    informe.push(`- **Usuarios inactivos**: ${stat.usuarios_inactivos}`);
    informe.push(`- **Total de roles**: ${stat.total_roles}`);
    informe.push(`- **Total de permisos**: ${stat.total_permisos}`);
    informe.push(`- **Usuarios con roles**: ${stat.usuarios_con_roles}`);
    informe.push(`- **Total de tenants**: ${stat.total_tenants}`);
    
    // RECOMENDACIONES
    console.log('\n' + '='.repeat(80));
    console.log('💡 RECOMENDACIONES');
    console.log('='.repeat(80));
    
    informe.push('\n# 💡 RECOMENDACIONES PARA SOLUCIONAR LOS PROBLEMAS\n');
    
    const recomendaciones = [
      '1. **IMPLEMENTAR UN ROL POR USUARIO**: Limitar a un solo rol por usuario para evitar conflictos',
      '2. **LIMPIAR CACHÉ DE PERMISOS**: Implementar invalidación de caché cuando se modifican permisos',
      '3. **ESTANDARIZAR NOMENCLATURA**: Usar consistentemente tablas sin prefijo rbac_',
      '4. **ASIGNAR ROLES FALTANTES**: Asignar roles a todos los usuarios activos',
      '5. **ELIMINAR DUPLICADOS**: Limpiar permisos y roles duplicados',
      '6. **IMPLEMENTAR AUDITORÍA**: Registrar todos los cambios de permisos',
      '7. **SIMPLIFICAR PERMISOS**: Considerar permisos directos en lugar de roles múltiples'
    ];
    
    recomendaciones.forEach(rec => {
      console.log(`\n${rec}`);
      informe.push(rec);
    });
    
    // Guardar informe
    const fecha = new Date().toISOString().split('T')[0];
    const archivo = `INFORME_AUDITORIA_RBAC_${fecha}.md`;
    writeFileSync(archivo, informe.join('\n'));
    
    console.log('\n' + '='.repeat(80));
    console.log(`✅ Auditoría completada. Informe guardado en: ${archivo}`);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error durante la auditoría:', error);
  }
}

auditarSistemaRBAC().catch(console.error);
