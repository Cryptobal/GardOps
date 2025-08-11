import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUserRef } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userRef = await getCurrentUserRef();
    if (!userRef) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permiso de admin RBAC
    const canAdminRbac = await sql`
      SELECT fn_usuario_tiene_permiso(${userRef}, 'rbac.admin') as puede
    `;
    
    if (!canAdminRbac[0]?.puede) {
      return NextResponse.json({ error: 'Sin permisos para administrar seguridad' }, { status: 403 });
    }

    // Obtener parámetros de búsqueda
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Consultar usuarios con sus roles
    const usuarios = await sql`
      WITH usuario_roles AS (
        SELECT 
          ur.usuario_ref::uuid as usuario_id,
          COALESCE(
            json_agg(
              json_build_object(
                'id', r.id,
                'codigo', r.codigo,
                'nombre', r.nombre,
                'descripcion', r.descripcion
              ) ORDER BY r.nombre
            ) FILTER (WHERE r.codigo IS NOT NULL),
            '[]'::json
          ) as roles
        FROM rbac_usuarios_roles ur
        LEFT JOIN rbac_roles r ON ur.rol_codigo = r.codigo
        GROUP BY ur.usuario_ref
      )
      SELECT 
        u.id,
        u.email,
        u.nombre,
        u.apellido,
        u.rol as rol_legacy,
        u.activo,
        u.ultimo_acceso,
        u.created_at,
        COALESCE(ur.roles, '[]'::json) as roles_rbac,
        COUNT(*) OVER() as total_count
      FROM usuarios u
      LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id
      WHERE 
        (${q}::text IS NULL OR ${q} = '' OR 
         u.email ILIKE '%' || ${q} || '%' OR
         u.nombre ILIKE '%' || ${q} || '%' OR
         u.apellido ILIKE '%' || ${q} || '%')
      ORDER BY u.nombre, u.apellido
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const totalCount = usuarios[0]?.total_count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: usuarios.map(u => ({
        ...u,
        total_count: undefined
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userRef = await getCurrentUserRef();
    if (!userRef) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permiso de admin RBAC
    const canAdminRbac = await sql`
      SELECT fn_usuario_tiene_permiso(${userRef}, 'rbac.admin') as puede
    `;
    
    if (!canAdminRbac[0]?.puede) {
      return NextResponse.json({ error: 'Sin permisos para administrar seguridad' }, { status: 403 });
    }

    const { id, activo, roles } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    // Iniciar transacción
    await sql`BEGIN`;

    try {
      // Actualizar estado activo si se proporciona
      if (activo !== undefined) {
        await sql`
          UPDATE usuarios 
          SET activo = ${activo}
          WHERE id = ${id}
        `;
      }

      // Actualizar roles si se proporcionan
      if (roles !== undefined && Array.isArray(roles)) {
        // Eliminar roles existentes
        await sql`
          DELETE FROM rbac_usuarios_roles 
          WHERE usuario_ref = ${id}
        `;

        // Insertar nuevos roles
        if (roles.length > 0) {
          // Los roles vienen como IDs, necesitamos obtener los códigos
          const rolesCodigos = await sql`
            SELECT codigo FROM rbac_roles WHERE id = ANY(${roles}::int[])
          `;
          
          for (const rol of rolesCodigos.rows) {
            await sql`
              INSERT INTO rbac_usuarios_roles (usuario_ref, rol_codigo)
              VALUES (${id}, ${rol.codigo})
            `;
          }
        }
      }

      await sql`COMMIT`;

      return NextResponse.json({
        success: true,
        message: 'Usuario actualizado exitosamente'
      });
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}
