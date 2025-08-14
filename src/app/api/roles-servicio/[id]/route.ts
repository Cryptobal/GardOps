import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(req, { resource: 'roles_servicio', action: 'delete' });
  if (deny) return deny;
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || '1';

    const query = 'SELECT * FROM get_rol_servicio_by_id($1, $2)';
    const result = await sql.query(query, [id, tenantId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Rol de servicio no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener rol de servicio:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(req, { resource: 'roles_servicio', action: 'delete' });
  if (deny) return deny;
  try {
    const { id } = params;
    const body = await request.json();
    const { nombre, descripcion, activo, tenantId = '1' } = body;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    const query = 'SELECT * FROM update_rol_servicio($1, $2, $3, $4, $5)';
    const result = await sql.query(query, [id, nombre, descripcion, activo, tenantId]);

    if (result.rows[0]?.error) {
      return NextResponse.json(
        { success: false, error: result.rows[0].error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Rol de servicio actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar rol de servicio:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(req, { resource: 'roles_servicio', action: 'delete' });
  if (deny) return deny;
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || '1';

    const queryText = 'SELECT * FROM delete_rol_servicio($1, $2)';
    const result = await query(queryText, [id, tenantId]);

    if (result.rows[0]?.error) {
      return NextResponse.json(
        { success: false, error: result.rows[0].error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Rol de servicio eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar rol de servicio:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Agregar nueva función para reactivar
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(req, { resource: 'roles_servicio', action: 'delete' });
  if (deny) return deny;
  try {
    const { id } = params;
    const body = await request.json();
    const { action } = body;

    if (action === 'reactivar') {
      const result = await query(`
        UPDATE as_turnos_roles_servicio 
        SET 
          estado = 'Activo',
          fecha_inactivacion = NULL,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Rol de servicio no encontrado' },
          { status: 404 }
        );
      }

      console.log(`✅ Rol de servicio reactivado: ${id}`);
      
      return NextResponse.json({ 
        success: true,
        message: 'Rol de servicio reactivado exitosamente',
        rol: result.rows[0]
      });
    }

    if (action === 'inactivar') {
      const result = await query(`
        UPDATE as_turnos_roles_servicio 
        SET 
          estado = 'Inactivo',
          fecha_inactivacion = NOW(),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Rol de servicio no encontrado' },
          { status: 404 }
        );
      }

      console.log(`✅ Rol de servicio inactivado: ${id}`);
      
      return NextResponse.json({ 
        success: true,
        message: 'Rol de servicio inactivado exitosamente',
        rol: result.rows[0]
      });
    }

    return NextResponse.json(
      { error: 'Acción no válida' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error en operación PATCH:', error);
    return NextResponse.json(
      { error: error.message || 'Error en la operación' },
      { status: 500 }
    );
  }
} 