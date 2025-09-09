import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(req: NextRequest) {
  try {
    logger.debug('🔧 Arreglando permiso de clientes...');

    // Obtener email del usuario
    const h = req.headers;
    const fromHeader = h.get('x-user-email') || null;
    const isDev = process.env.NODE_ENV !== 'production';
    const dev = isDev ? process.env.NEXT_PUBLIC_DEV_USER_EMAIL : undefined;
    const email = fromHeader || dev || null;

    if (!email) {
      return NextResponse.json({ 
        success: false, 
        error: 'No se pudo obtener email del usuario'
      }, { status: 401 });
    }

    logger.debug('📧 Email del usuario:', email);

    // 1. Verificar si el usuario existe
    const userCheck = await sql`
      SELECT id, email, rol, tenant_id 
      FROM public.usuarios 
      WHERE lower(email) = lower(${email}) 
      LIMIT 1
    `;

    if (userCheck.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Usuario no encontrado en BD',
        suggestion: 'Crear el usuario primero'
      }, { status: 404 });
    }

    const user = userCheck.rows[0];
    devLogger.success(' Usuario encontrado:', user);

    // 2. Verificar si existe el permiso clientes.view
    const permCheck = await sql`
      SELECT id, nombre, clave 
      FROM public.permisos 
      WHERE clave = 'clientes.view' 
      LIMIT 1
    `;

    let permisoId: string;
    if (permCheck.rows.length === 0) {
      logger.debug('📝 Creando permiso clientes.view...');
      const newPerm = await sql`
        INSERT INTO public.permisos (id, nombre, clave, descripcion, activo, creado_en)
        VALUES (gen_random_uuid(), 'Ver Clientes', 'clientes.view', 'Permite ver la lista de clientes', true, now())
        RETURNING id
      `;
      permisoId = newPerm.rows[0].id;
      devLogger.success(' Permiso creado:', permisoId);
    } else {
      permisoId = permCheck.rows[0].id;
      devLogger.success(' Permiso ya existe:', permisoId);
    }

    // 3. Verificar si existe un rol básico para clientes
    const rolCheck = await sql`
      SELECT id, nombre, clave 
      FROM public.roles 
      WHERE clave = 'clientes_basic' 
      LIMIT 1
    `;

    let rolId: string;
    if (rolCheck.rows.length === 0) {
      logger.debug('👑 Creando rol clientes_basic...');
      const newRol = await sql`
        INSERT INTO public.roles (id, nombre, clave, descripcion, activo, creado_en)
        VALUES (gen_random_uuid(), 'Acceso Básico Clientes', 'clientes_basic', 'Rol básico para acceso a clientes', true, now())
        RETURNING id
      `;
      rolId = newRol.rows[0].id;
      devLogger.success(' Rol creado:', rolId);
    } else {
      rolId = rolCheck.rows[0].id;
      devLogger.success(' Rol ya existe:', rolId);
    }

    // 4. Asignar permiso al rol
    const rolPermCheck = await sql`
      SELECT id 
      FROM public.roles_permisos 
      WHERE rol_id = ${rolId} AND permiso_id = ${permisoId}
      LIMIT 1
    `;

    if (rolPermCheck.rows.length === 0) {
      logger.debug('🔗 Asignando permiso al rol...');
      await sql`
        INSERT INTO public.roles_permisos (id, rol_id, permiso_id, creado_en)
        VALUES (gen_random_uuid(), ${rolId}, ${permisoId}, now())
      `;
      logger.debug('✅ Permiso asignado al rol');
    } else {
      logger.debug('✅ Permiso ya está asignado al rol');
    }

    // 5. Asignar rol al usuario
    const userRolCheck = await sql`
      SELECT id 
      FROM public.usuarios_roles 
      WHERE usuario_id = ${user.id} AND rol_id = ${rolId}
      LIMIT 1
    `;

    if (userRolCheck.rows.length === 0) {
      logger.debug('👤 Asignando rol al usuario...');
      await sql`
        INSERT INTO public.usuarios_roles (id, usuario_id, rol_id, creado_en)
        VALUES (gen_random_uuid(), ${user.id}, ${rolId}, now())
      `;
      logger.debug('✅ Rol asignado al usuario');
    } else {
      logger.debug('✅ Usuario ya tiene el rol asignado');
    }

    // 6. Verificar que ahora funciona
    try {
      const finalCheck = await sql`
        SELECT public.fn_usuario_tiene_permiso(${email}, 'clientes.view') as allowed
      `;
      const hasPermission = finalCheck.rows?.[0]?.allowed === true;
      devLogger.search(' Verificación final del permiso:', hasPermission);

      return NextResponse.json({
        success: true,
        message: 'Permiso de clientes arreglado correctamente',
        user: {
          id: user.id,
          email: user.email,
          rol: user.rol
        },
        permission: {
          id: permisoId,
          clave: 'clientes.view'
        },
        role: {
          id: rolId,
          clave: 'clientes_basic'
        },
        final_check: hasPermission
      });
    } catch (error) {
      console.error('❌ Error en verificación final:', error);
      return NextResponse.json({
        success: false,
        error: 'Error en verificación final',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error arreglando permiso:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
