import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requirePlatformAdmin } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
  try {
    // Verificar permisos de administrador de plataforma
    const authResult = await requirePlatformAdmin(req);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: 'Acceso denegado. Se requieren permisos de Platform Admin.' },
        { status: authResult.status }
      );
    }

    console.log('🔧 Ejecutando correcciones críticas del sistema RBAC...');

    // ===============================================
    // 1. CREAR PERMISO RBAC.USUARIOS.WRITE
    // ===============================================
    console.log('🔐 1. Creando permiso rbac.usuarios.write...');
    
    const crearPermiso = await sql`
      INSERT INTO permisos (id, clave, descripcion, categoria)
      SELECT 
          gen_random_uuid(),
          'rbac.usuarios.write',
          'Crear y editar usuarios del sistema - Permite gestionar usuarios, asignar roles y modificar información de usuarios',
          'RBAC'
      WHERE NOT EXISTS (
          SELECT 1 FROM permisos WHERE clave = 'rbac.usuarios.write'
      )
      RETURNING id, clave
    `;

    const permisoCreado = crearPermiso.rows.length > 0;
    console.log(`   ${permisoCreado ? '✅' : 'ℹ️'} Permiso rbac.usuarios.write: ${permisoCreado ? 'Creado' : 'Ya existía'}`);

    // ===============================================
    // 2. ASIGNAR ROL "OPERADOR" A PEDRO
    // ===============================================
    console.log('👥 2. Asignando rol Operador a Pedro...');
    
    const asignarRolPedro = await sql`
      INSERT INTO usuarios_roles (usuario_id, rol_id)
      SELECT u.id, r.id 
      FROM usuarios u, roles r 
      WHERE u.email = 'guardia@gardops.com' 
      AND r.nombre = 'Operador'
      AND NOT EXISTS (
          SELECT 1 FROM usuarios_roles ur 
          WHERE ur.usuario_id = u.id AND ur.rol_id = r.id
      )
      RETURNING usuario_id, rol_id
    `;

    const rolPedroAsignado = asignarRolPedro.rows.length > 0;
    console.log(`   ${rolPedroAsignado ? '✅' : 'ℹ️'} Rol Operador a Pedro: ${rolPedroAsignado ? 'Asignado' : 'Ya tenía'}`);

    // ===============================================
    // 3. ASIGNAR ROL "SUPERVISOR" A JUAN
    // ===============================================
    console.log('👥 3. Asignando rol Supervisor a Juan...');
    
    const asignarRolJuan = await sql`
      INSERT INTO usuarios_roles (usuario_id, rol_id)
      SELECT u.id, r.id 
      FROM usuarios u, roles r 
      WHERE u.email = 'supervisor@gardops.com' 
      AND r.nombre = 'Supervisor'
      AND NOT EXISTS (
          SELECT 1 FROM usuarios_roles ur 
          WHERE ur.usuario_id = u.id AND ur.rol_id = r.id
      )
      RETURNING usuario_id, rol_id
    `;

    const rolJuanAsignado = asignarRolJuan.rows.length > 0;
    console.log(`   ${rolJuanAsignado ? '✅' : 'ℹ️'} Rol Supervisor a Juan: ${rolJuanAsignado ? 'Asignado' : 'Ya tenía'}`);

    // ===============================================
    // 4. ASIGNAR PERMISOS AL ROL PLATFORM ADMIN
    // ===============================================
    console.log('👑 4. Asignando permisos al rol Platform Admin...');
    
    // Asignar rbac.usuarios.write
    const asignarPermisoUsuarios = await sql`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      SELECT r.id, p.id
      FROM roles r, permisos p
      WHERE r.nombre = 'Platform Admin' 
      AND p.clave = 'rbac.usuarios.write'
      AND NOT EXISTS (
          SELECT 1 FROM roles_permisos rp 
          WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
      )
      RETURNING rol_id, permiso_id
    `;

    const permisoUsuariosAsignado = asignarPermisoUsuarios.rows.length > 0;
    console.log(`   ${permisoUsuariosAsignado ? '✅' : 'ℹ️'} Permiso rbac.usuarios.write: ${permisoUsuariosAsignado ? 'Asignado' : 'Ya tenía'}`);

    // Asignar rbac.platform_admin
    const asignarPermisoPlatform = await sql`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      SELECT r.id, p.id
      FROM roles r, permisos p
      WHERE r.nombre = 'Platform Admin' 
      AND p.clave = 'rbac.platform_admin'
      AND NOT EXISTS (
          SELECT 1 FROM roles_permisos rp 
          WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
      )
      RETURNING rol_id, permiso_id
    `;

    const permisoPlatformAsignado = asignarPermisoPlatform.rows.length > 0;
    console.log(`   ${permisoPlatformAsignado ? '✅' : 'ℹ️'} Permiso rbac.platform_admin: ${permisoPlatformAsignado ? 'Asignado' : 'Ya tenía'}`);

    // ===============================================
    // 5. VERIFICACIÓN FINAL
    // ===============================================
    console.log('🔍 5. Verificando estado final...');
    
    const usuariosSinRoles = await sql`
      SELECT COUNT(*) as count
      FROM usuarios u
      WHERE u.activo = true
      AND NOT EXISTS (
          SELECT 1 FROM usuarios_roles ur WHERE ur.usuario_id = u.id
      )
    `;

    const permisoExiste = await sql`
      SELECT COUNT(*) as count
      FROM permisos 
      WHERE clave = 'rbac.usuarios.write'
    `;

    const platformAdminPermisos = await sql`
      SELECT COUNT(*) as count
      FROM roles r
      JOIN roles_permisos rp ON r.id = rp.rol_id
      WHERE r.nombre = 'Platform Admin'
    `;

    const usuariosSinRolesCount = usuariosSinRoles.rows[0].count;
    const permisoExisteCount = permisoExiste.rows[0].count;
    const platformAdminPermisosCount = platformAdminPermisos.rows[0].count;

    console.log(`   👥 Usuarios sin roles: ${usuariosSinRolesCount}`);
    console.log(`   🔐 Permiso rbac.usuarios.write existe: ${permisoExisteCount > 0 ? 'SÍ' : 'NO'}`);
    console.log(`   🔐 Permisos del Platform Admin: ${platformAdminPermisosCount}`);

    // ===============================================
    // 6. RESULTADO
    // ===============================================
    const exito = usuariosSinRolesCount === 0 && permisoExisteCount > 0;

    console.log('');
    if (exito) {
      console.log('🎉 ¡ÉXITO! TODAS LAS CORRECCIONES CRÍTICAS APLICADAS EXITOSAMENTE');
      console.log('🎯 El sistema RBAC está listo para producción');
      console.log('✅ FASE 1 COMPLETADA');
    } else {
      console.log('⚠️  ALGUNAS CORRECCIONES PENDIENTES');
      if (usuariosSinRolesCount > 0) {
        console.log(`   - Aún hay ${usuariosSinRolesCount} usuarios sin roles`);
      }
      if (permisoExisteCount === 0) {
        console.log('   - Falta crear el permiso rbac.usuarios.write');
      }
    }

    return NextResponse.json({
      success: true,
      message: exito ? 'Todas las correcciones críticas aplicadas exitosamente' : 'Algunas correcciones pendientes',
      data: {
        permisoCreado,
        rolPedroAsignado,
        rolJuanAsignado,
        permisoUsuariosAsignado,
        permisoPlatformAsignado,
        usuariosSinRoles: usuariosSinRolesCount,
        permisoExiste: permisoExisteCount > 0,
        platformAdminPermisos: platformAdminPermisosCount,
        exito
      }
    });

  } catch (error) {
    console.error('❌ Error ejecutando correcciones críticas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verificar permisos de administrador de plataforma
    const authResult = await requirePlatformAdmin(req);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: 'Acceso denegado. Se requieren permisos de Platform Admin.' },
        { status: authResult.status }
      );
    }

    // Verificar estado actual
    const usuariosSinRoles = await sql`
      SELECT COUNT(*) as count
      FROM usuarios u
      WHERE u.activo = true
      AND NOT EXISTS (
          SELECT 1 FROM usuarios_roles ur WHERE ur.usuario_id = u.id
      )
    `;

    const permisoExiste = await sql`
      SELECT COUNT(*) as count
      FROM permisos 
      WHERE clave = 'rbac.usuarios.write'
    `;

    const platformAdminExiste = await sql`
      SELECT COUNT(*) as count
      FROM roles 
      WHERE nombre = 'Platform Admin'
    `;

    return NextResponse.json({
      success: true,
      estado: {
        usuariosSinRoles: usuariosSinRoles.rows[0].count,
        permisoExiste: permisoExiste.rows[0].count > 0,
        platformAdminExiste: platformAdminExiste.rows[0].count > 0
      }
    });

  } catch (error) {
    console.error('❌ Error verificando estado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
