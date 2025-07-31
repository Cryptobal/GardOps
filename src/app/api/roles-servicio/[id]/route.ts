import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { nombre, dias_trabajo, dias_descanso, horas_turno, hora_inicio, hora_termino, estado } = body;

    // Validaciones
    if (!nombre || !dias_trabajo || !dias_descanso || !horas_turno || !hora_inicio || !hora_termino || !estado) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que no existe otro rol con el mismo nombre (excluyendo el actual)
    const existingRole = await query(
      'SELECT id FROM roles_servicio WHERE nombre = $1 AND id != $2',
      [nombre, id]
    );

    if (existingRole.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un rol de servicio con este nombre' },
        { status: 409 }
      );
    }

    // Actualizar el rol
    const result = await query(`
      UPDATE roles_servicio 
      SET nombre = $1, dias_trabajo = $2, dias_descanso = $3, horas_turno = $4, 
          hora_inicio = $5, hora_termino = $6, estado = $7, updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [nombre, dias_trabajo, dias_descanso, horas_turno, hora_inicio, hora_termino, estado, id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Rol de servicio no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando rol de servicio:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Obtener todos los turnos que usan este rol
    const turnosResult = await query(`
      SELECT id FROM turnos_instalacion 
      WHERE rol_servicio_id = $1
    `, [id]);

    const turnosIds = turnosResult.rows.map(t => t.id);

    // Iniciar transacción para eliminar todo en orden
    await query('BEGIN');

    try {
      if (turnosIds.length > 0) {
        // 1. Eliminar asignaciones de guardias para todos los turnos
        await query(`
          DELETE FROM asignaciones_guardias 
          WHERE requisito_puesto_id IN (
            SELECT id FROM requisitos_puesto 
            WHERE turno_instalacion_id = ANY($1)
          )
        `, [turnosIds]);

        // 2. Obtener requisitos_puesto asociados a estos turnos
        const requisitosResult = await query(`
          SELECT id FROM requisitos_puesto 
          WHERE rol_servicio_id = $1
        `, [id]);

        const requisitosIds = requisitosResult.rows.map(r => r.id);

        if (requisitosIds.length > 0) {
          // 3. Eliminar puestos_por_cubrir asociados a estos requisitos
          await query(`
            DELETE FROM puestos_por_cubrir 
            WHERE requisito_puesto_id = ANY($1)
          `, [requisitosIds]);

          // 4. Eliminar requisitos_puesto
          await query(`
            DELETE FROM requisitos_puesto 
            WHERE id = ANY($1)
          `, [requisitosIds]);
        }

        // 5. Eliminar todos los turnos que usan este rol
        await query(`
          DELETE FROM turnos_instalacion 
          WHERE id = ANY($1)
        `, [turnosIds]);
      }

      // 6. Finalmente eliminar el rol de servicio
      const result = await query(`
        DELETE FROM roles_servicio 
        WHERE id = $1
      `, [id]);

      await query('COMMIT');

      if (result.rowCount === 0) {
        return NextResponse.json(
          { error: 'Rol de servicio no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Rol de servicio eliminado correctamente${turnosIds.length > 0 ? ` junto con ${turnosIds.length} turno${turnosIds.length > 1 ? 's' : ''} asociado${turnosIds.length > 1 ? 's' : ''}` : ''}`
      });

    } catch (error) {
      await query('ROLLBACK');
      console.error('Error eliminando rol de servicio:', error);
      return NextResponse.json(
        { error: error.message || 'Error interno del servidor' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error eliminando rol de servicio:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 