import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// PUT - Actualizar bono global
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bonoId = params.id;
    const body = await request.json();
    const { nombre, descripcion, imponible, activo } = body;

    // Verificar que el bono existe
    const checkExists = await query(
      'SELECT 1 FROM sueldo_bonos_globales WHERE id = $1',
      [bonoId]
    );

    if (!checkExists.rows || checkExists.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Bono no encontrado' },
        { status: 404 }
      );
    }

    // Si se está cambiando el nombre, verificar que no exista otro con el mismo nombre
    if (nombre) {
      const checkDuplicate = await query(
        'SELECT 1 FROM sueldo_bonos_globales WHERE nombre = $1 AND id != $2',
        [nombre, bonoId]
      );

      if (checkDuplicate.rows && checkDuplicate.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Ya existe un bono con ese nombre' },
          { status: 400 }
        );
      }
    }

    // Construir query de actualización dinámicamente
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (nombre !== undefined) {
      updateFields.push(`nombre = $${paramIndex}`);
      queryParams.push(nombre);
      paramIndex++;
    }

    if (descripcion !== undefined) {
      updateFields.push(`descripcion = $${paramIndex}`);
      queryParams.push(descripcion);
      paramIndex++;
    }

    if (imponible !== undefined) {
      updateFields.push(`imponible = $${paramIndex}`);
      queryParams.push(imponible);
      paramIndex++;
    }

    if (activo !== undefined) {
      updateFields.push(`activo = $${paramIndex}`);
      queryParams.push(activo);
      paramIndex++;
    }

    updateFields.push(`updated_at = NOW()`);
    queryParams.push(bonoId);

    const sqlQuery = `
      UPDATE sueldo_bonos_globales 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(sqlQuery, queryParams);
    const updatedBono = Array.isArray(result) ? result[0] : result.rows[0];

    return NextResponse.json({
      success: true,
      data: updatedBono,
      message: 'Bono global actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error actualizando bono global:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar bono global' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar bono global
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bonoId = params.id;

    // Verificar que el bono existe
    const checkExists = await query(
      'SELECT nombre FROM sueldo_bonos_globales WHERE id = $1',
      [bonoId]
    );

    if (!checkExists.rows || checkExists.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Bono no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el bono está siendo usado en alguna estructura
    const checkUsage = await query(
      'SELECT COUNT(*) as count FROM sueldo_estructuras_servicio WHERE bono_id = $1',
      [bonoId]
    );

    const usageCount = parseInt(checkUsage.rows[0].count);
    if (usageCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `No se puede eliminar el bono porque está siendo usado en ${usageCount} estructura(s) de servicio` 
        },
        { status: 400 }
      );
    }

    // Eliminar el bono
    await query(
      'DELETE FROM sueldo_bonos_globales WHERE id = $1',
      [bonoId]
    );

    return NextResponse.json({
      success: true,
      message: 'Bono global eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando bono global:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar bono global' },
      { status: 500 }
    );
  }
}
