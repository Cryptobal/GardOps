import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * GET /api/roles-servicio/[id]/series
 * Obtiene las series de días de un rol de servicio específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rolId = params.id;

    // Verificar que el rol existe
    const rolExists = await sql.query(`
      SELECT id, nombre, tiene_horarios_variables
      FROM as_turnos_roles_servicio 
      WHERE id = $1
    `, [rolId]);

    if (rolExists.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Rol de servicio no encontrado' },
        { status: 404 }
      );
    }

    const rol = rolExists.rows[0];

    // Si no tiene horarios variables, devolver array vacío
    if (!rol.tiene_horarios_variables) {
      return NextResponse.json({
        success: true,
        data: {
          rol_id: rolId,
          rol_nombre: rol.nombre,
          tiene_horarios_variables: false,
          series_dias: []
        }
      });
    }

    // Obtener series de días
    const seriesResult = await sql.query(`
      SELECT 
        id,
        posicion_en_ciclo,
        es_dia_trabajo,
        hora_inicio,
        hora_termino,
        horas_turno,
        observaciones,
        created_at,
        updated_at
      FROM as_turnos_series_dias
      WHERE rol_servicio_id = $1
      ORDER BY posicion_en_ciclo
    `, [rolId]);

    return NextResponse.json({
      success: true,
      data: {
        rol_id: rolId,
        rol_nombre: rol.nombre,
        tiene_horarios_variables: true,
        series_dias: seriesResult.rows
      }
    });

  } catch (error) {
    console.error('Error obteniendo series del rol:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/roles-servicio/[id]/series
 * Actualiza las series de días de un rol de servicio
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rolId = params.id;
    const body = await request.json();
    const { series_dias } = body;

    if (!Array.isArray(series_dias)) {
      return NextResponse.json(
        { success: false, error: 'series_dias debe ser un array' },
        { status: 400 }
      );
    }

    // Verificar que el rol existe
    const rolExists = await sql.query(`
      SELECT id, nombre, dias_trabajo, dias_descanso, tiene_horarios_variables
      FROM as_turnos_roles_servicio 
      WHERE id = $1
    `, [rolId]);

    if (rolExists.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Rol de servicio no encontrado' },
        { status: 404 }
      );
    }

    const rol = rolExists.rows[0];

    // Validar series
    const { validarSerieDias } = await import('@/lib/utils/roles-servicio-series');
    const validacion = validarSerieDias(series_dias, rol.dias_trabajo, rol.dias_descanso);
    
    if (!validacion.esValida) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Serie de días inválida', 
          detalles: validacion.errores 
        },
        { status: 400 }
      );
    }

    // Iniciar transacción
    await sql.query('BEGIN');

    try {
      // Eliminar series existentes
      await sql.query(`
        DELETE FROM as_turnos_series_dias 
        WHERE rol_servicio_id = $1
      `, [rolId]);

      // Insertar nuevas series
      for (const dia of series_dias) {
        await sql.query(`
          INSERT INTO as_turnos_series_dias (
            rol_servicio_id, posicion_en_ciclo, es_dia_trabajo,
            hora_inicio, hora_termino, observaciones, tenant_id
          ) VALUES ($1, $2, $3, $4, $5, $6, (
            SELECT tenant_id FROM as_turnos_roles_servicio WHERE id = $1
          ))
        `, [
          rolId,
          dia.posicion_en_ciclo,
          dia.es_dia_trabajo,
          dia.hora_inicio || null,
          dia.hora_termino || null,
          dia.observaciones || null
        ]);
      }

      // Actualizar rol para indicar que tiene horarios variables
      await sql.query(`
        UPDATE as_turnos_roles_servicio 
        SET 
          tiene_horarios_variables = true,
          duracion_ciclo_dias = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [rol.dias_trabajo + rol.dias_descanso, rolId]);

      await sql.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Series actualizadas exitosamente',
        data: {
          rol_id: rolId,
          series_actualizadas: series_dias.length
        }
      });

    } catch (error) {
      await sql.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error actualizando series del rol:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/roles-servicio/[id]/series
 * Elimina las series de días de un rol (lo convierte a horarios fijos)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rolId = params.id;

    // Verificar que el rol existe
    const rolExists = await sql.query(`
      SELECT id, nombre, tiene_horarios_variables
      FROM as_turnos_roles_servicio 
      WHERE id = $1
    `, [rolId]);

    if (rolExists.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Rol de servicio no encontrado' },
        { status: 404 }
      );
    }

    const rol = rolExists.rows[0];

    if (!rol.tiene_horarios_variables) {
      return NextResponse.json(
        { success: false, error: 'El rol no tiene series configuradas' },
        { status: 400 }
      );
    }

    // Iniciar transacción
    await sql.query('BEGIN');

    try {
      // Eliminar series
      await sql.query(`
        DELETE FROM as_turnos_series_dias 
        WHERE rol_servicio_id = $1
      `, [rolId]);

      // Actualizar rol para indicar que no tiene horarios variables
      await sql.query(`
        UPDATE as_turnos_roles_servicio 
        SET 
          tiene_horarios_variables = false,
          duracion_ciclo_dias = NULL,
          horas_turno_promedio = horas_turno,
          updated_at = NOW()
        WHERE id = $1
      `, [rolId]);

      await sql.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Series eliminadas exitosamente. El rol ahora usa horarios fijos.',
        data: {
          rol_id: rolId,
          rol_nombre: rol.nombre
        }
      });

    } catch (error) {
      await sql.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error eliminando series del rol:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
