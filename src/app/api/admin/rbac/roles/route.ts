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

    // Obtener todos los roles con sus permisos
    const roles = await sql`
      WITH rol_permisos AS (
        SELECT 
          rp.rol_codigo,
          COALESCE(
            json_agg(
              json_build_object(
                'id', p.id,
                'codigo', p.codigo,
                'nombre', p.nombre,
                'descripcion', p.descripcion,
                'categoria', 'General'
              ) ORDER BY p.codigo
            ) FILTER (WHERE p.codigo IS NOT NULL),
            '[]'::json
          ) as permisos
        FROM rbac_roles_permisos rp
        LEFT JOIN rbac_permisos p ON rp.permiso_cod = p.codigo
        WHERE rp.granted = true
        GROUP BY rp.rol_codigo
      )
      SELECT 
        r.id,
        r.codigo,
        r.nombre,
        r.descripcion,
        false as es_sistema,
        true as activo,
        r.created_at,
        r.updated_at,
        COALESCE(rp.permisos, '[]'::json) as permisos,
        (SELECT COUNT(*) FROM rbac_usuarios_roles ur WHERE ur.rol_codigo = r.codigo) as usuarios_count
      FROM rbac_roles r
      LEFT JOIN rol_permisos rp ON r.codigo = rp.rol_codigo
      ORDER BY r.nombre
    `;

    return NextResponse.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Error obteniendo roles:', error);
    return NextResponse.json(
      { error: 'Error al obtener roles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const { nombre, descripcion, permisos } = await request.json();

    if (!nombre) {
      return NextResponse.json({ error: 'Nombre del rol requerido' }, { status: 400 });
    }

    // Iniciar transacción
    await sql`BEGIN`;

    try {
      // Crear el rol
      const [nuevoRol] = await sql`
        INSERT INTO rbac_roles (nombre, descripcion, es_sistema, activo)
        VALUES (${nombre}, ${descripcion}, false, true)
        RETURNING id
      `;

      // Asignar permisos si se proporcionan
      if (permisos && Array.isArray(permisos) && permisos.length > 0) {
        const values = permisos.map(permisoId => ({ 
          rol_id: nuevoRol.id, 
          permiso_id: permisoId 
        }));
        
        await sql`
          INSERT INTO rbac_rol_permiso (rol_id, permiso_id)
          SELECT * FROM ${sql(values)}
        `;
      }

      await sql`COMMIT`;

      return NextResponse.json({
        success: true,
        message: 'Rol creado exitosamente',
        data: { id: nuevoRol.id }
      });
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  } catch (error) {
    console.error('Error creando rol:', error);
    return NextResponse.json(
      { error: 'Error al crear rol' },
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

    const { id, nombre, descripcion, permisos } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID del rol requerido' }, { status: 400 });
    }

    // Verificar que no sea un rol del sistema
    const [rol] = await sql`
      SELECT es_sistema FROM rbac_roles WHERE id = ${id}
    `;

    if (rol?.es_sistema) {
      return NextResponse.json({ error: 'No se pueden modificar roles del sistema' }, { status: 403 });
    }

    // Iniciar transacción
    await sql`BEGIN`;

    try {
      // Actualizar el rol
      await sql`
        UPDATE rbac_roles 
        SET 
          nombre = COALESCE(${nombre}, nombre),
          descripcion = COALESCE(${descripcion}, descripcion),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;

      // Actualizar permisos si se proporcionan
      if (permisos !== undefined && Array.isArray(permisos)) {
        // Eliminar permisos existentes
        await sql`
          DELETE FROM rbac_rol_permiso 
          WHERE rol_id = ${id}
        `;

        // Insertar nuevos permisos
        if (permisos.length > 0) {
          const values = permisos.map(permisoId => ({ 
            rol_id: id, 
            permiso_id: permisoId 
          }));
          
          await sql`
            INSERT INTO rbac_rol_permiso (rol_id, permiso_id)
            SELECT * FROM ${sql(values)}
          `;
        }
      }

      await sql`COMMIT`;

      return NextResponse.json({
        success: true,
        message: 'Rol actualizado exitosamente'
      });
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  } catch (error) {
    console.error('Error actualizando rol:', error);
    return NextResponse.json(
      { error: 'Error al actualizar rol' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID del rol requerido' }, { status: 400 });
    }

    // Verificar que no sea un rol del sistema
    const [rol] = await sql`
      SELECT es_sistema FROM rbac_roles WHERE id = ${id}
    `;

    if (rol?.es_sistema) {
      return NextResponse.json({ error: 'No se pueden eliminar roles del sistema' }, { status: 403 });
    }

    // Marcar como inactivo en lugar de eliminar
    await sql`
      UPDATE rbac_roles 
      SET activo = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Rol eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando rol:', error);
    return NextResponse.json(
      { error: 'Error al eliminar rol' },
      { status: 500 }
    );
  }
}
