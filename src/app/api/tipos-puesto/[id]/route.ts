import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener un tipo de puesto específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(req, { resource: 'tipos_puesto', action: 'delete' });
  if (deny) return deny;
  try {
    const { id } = params;

    const result = await query(`
      SELECT 
        tp.*,
        contar_puestos_por_tipo(tp.id) as cantidad_puestos_usando,
        puede_eliminar_tipo_puesto(tp.id) as puede_eliminar
      FROM cat_tipos_puesto tp
      WHERE tp.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tipo de puesto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result.rows[0],
        cantidad_puestos_usando: parseInt(result.rows[0].cantidad_puestos_usando) || 0,
        puede_eliminar: result.rows[0].puede_eliminar
      }
    });
  } catch (error) {
    console.error('Error obteniendo tipo de puesto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar tipo de puesto
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(req, { resource: 'tipos_puesto', action: 'delete' });
  if (deny) return deny;
  try {
    const { id } = params;
    const body = await request.json();
    const { nombre, descripcion, emoji, color, orden, activo } = body;

    // Verificar que el tipo existe
    const checkResult = await query(
      'SELECT id FROM cat_tipos_puesto WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tipo de puesto no encontrado' },
        { status: 404 }
      );
    }

    // Si se está cambiando el nombre, verificar que no exista otro con el mismo nombre
    if (nombre) {
      const duplicateCheck = await query(
        'SELECT id FROM cat_tipos_puesto WHERE LOWER(nombre) = LOWER($1) AND id != $2 AND activo = true',
        [nombre.trim(), id]
      );

      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'Ya existe otro tipo de puesto con ese nombre' },
          { status: 409 }
        );
      }
    }

    // Construir la query de actualización dinámicamente
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (nombre !== undefined) {
      updates.push(`nombre = $${paramCount}`);
      values.push(nombre.trim());
      paramCount++;
    }
    if (descripcion !== undefined) {
      updates.push(`descripcion = $${paramCount}`);
      values.push(descripcion?.trim() || null);
      paramCount++;
    }
    if (emoji !== undefined) {
      updates.push(`emoji = $${paramCount}`);
      values.push(emoji || '📍');
      paramCount++;
    }
    if (color !== undefined) {
      updates.push(`color = $${paramCount}`);
      values.push(color || 'gray');
      paramCount++;
    }
    if (orden !== undefined) {
      updates.push(`orden = $${paramCount}`);
      values.push(orden);
      paramCount++;
    }
    if (activo !== undefined) {
      updates.push(`activo = $${paramCount}`);
      values.push(activo);
      paramCount++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No hay campos para actualizar' },
        { status: 400 }
      );
    }

    values.push(id);
    const updateQuery = `
      UPDATE cat_tipos_puesto 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const updateResult = await query(updateQuery, values);

    console.log(`✅ Tipo de puesto ${id} actualizado`);

    return NextResponse.json({
      success: true,
      message: 'Tipo de puesto actualizado exitosamente',
      data: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Error actualizando tipo de puesto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar tipo de puesto (solo si no está en uso)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(req, { resource: 'tipos_puesto', action: 'delete' });
  if (deny) return deny;
  try {
    const { id } = params;

    // Verificar que el tipo existe
    const checkResult = await query(
      'SELECT id, nombre FROM cat_tipos_puesto WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tipo de puesto no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si puede ser eliminado (no está en uso)
    const puedeEliminarResult = await query(
      'SELECT puede_eliminar_tipo_puesto($1) as puede_eliminar',
      [id]
    );

    if (!puedeEliminarResult.rows[0].puede_eliminar) {
      // Si no se puede eliminar, contar cuántos puestos lo están usando
      const countResult = await query(
        'SELECT contar_puestos_por_tipo($1) as cantidad',
        [id]
      );

      return NextResponse.json(
        { 
          error: `No se puede eliminar el tipo "${checkResult.rows[0].nombre}" porque está siendo usado por ${countResult.rows[0].cantidad} puesto(s). Puedes inactivarlo en su lugar.`,
          cantidad_en_uso: parseInt(countResult.rows[0].cantidad)
        },
        { status: 409 }
      );
    }

    // Eliminar el tipo
    await query('DELETE FROM cat_tipos_puesto WHERE id = $1', [id]);

    console.log(`✅ Tipo de puesto ${id} eliminado`);

    return NextResponse.json({
      success: true,
      message: 'Tipo de puesto eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando tipo de puesto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
