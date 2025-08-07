import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rolId, motivo = 'Inactivación manual' } = body;

    if (!rolId) {
      return NextResponse.json(
        { success: false, error: 'El rolId es requerido' },
        { status: 400 }
      );
    }

    // Iniciar transacción
    const client = await sql.connect();

    try {
      await client.query('BEGIN');

      // 1. Inactivar el rol de servicio
      const resultRol = await client.query(`
        UPDATE as_turnos_roles_servicio 
        SET estado = 'Inactivo', updated_at = NOW()
        WHERE id = $1
        RETURNING id, nombre, estado
      `, [rolId]);

      if (resultRol.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Rol de servicio no encontrado' },
          { status: 404 }
        );
      }

      // 2. Inactivar la estructura de sueldo asociada
      const resultEstructura = await client.query(`
        UPDATE sueldo_estructuras_roles 
        SET activo = false, fecha_inactivacion = NOW(), updated_at = NOW()
        WHERE rol_servicio_id = $1
        RETURNING id, rol_servicio_id, sueldo_base
      `, [rolId]);

      // 3. Crear registro en historial
      await client.query(`
        INSERT INTO historial_roles_servicio (
          rol_servicio_id, 
          accion, 
          motivo, 
          fecha_accion, 
          datos_anteriores
        ) VALUES ($1, $2, $3, NOW(), $4)
      `, [
        rolId,
        'INACTIVACION',
        motivo,
        JSON.stringify({
          rol: resultRol.rows[0],
          estructura: resultEstructura.rows[0] || null
        })
      ]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Rol de servicio y estructura de sueldo inactivados exitosamente',
        data: {
          rol: resultRol.rows[0],
          estructura: resultEstructura.rows[0] || null,
          historial: {
            accion: 'INACTIVACION',
            motivo,
            fecha: new Date().toISOString()
          }
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error al inactivar rol de servicio:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
