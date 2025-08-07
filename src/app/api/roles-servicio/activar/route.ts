import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rolId, motivo = 'Activación manual' } = body;

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

      // 1. Activar el rol de servicio
      const resultRol = await client.query(`
        UPDATE as_turnos_roles_servicio 
        SET estado = 'Activo', updated_at = NOW()
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

      // 2. Activar la estructura de sueldo asociada (si existe)
      const resultEstructura = await client.query(`
        UPDATE sueldo_estructuras_roles 
        SET activo = true, fecha_inactivacion = NULL, updated_at = NOW()
        WHERE rol_servicio_id = $1
        RETURNING id, rol_servicio_id, sueldo_base, activo
      `, [rolId]);

      // 3. Si no hay estructura activa, crear una nueva
      let estructuraCreada = null;
      if (resultEstructura.rowCount === 0) {
        // Obtener datos del rol para crear estructura por defecto
        const rolData = await client.query(`
          SELECT * FROM as_turnos_roles_servicio WHERE id = $1
        `, [rolId]);

        if (rolData.rows.length > 0) {
          const nuevaEstructura = await client.query(`
            INSERT INTO sueldo_estructuras_roles (
              rol_servicio_id, 
              sueldo_base, 
              bono_asistencia, 
              bono_responsabilidad,
              bono_noche, 
              bono_feriado, 
              bono_riesgo, 
              otros_bonos, 
              activo, 
              created_at, 
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            RETURNING *
          `, [
            rolId,
            500000, // Sueldo base por defecto
            0, // Bono asistencia
            0, // Bono responsabilidad
            0, // Bono noche
            0, // Bono feriado
            0, // Bono riesgo
            JSON.stringify([]), // Otros bonos
            true // Activo
          ]);
          estructuraCreada = nuevaEstructura.rows[0];
        }
      }

      // 4. Crear registro en historial
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
        'ACTIVACION',
        motivo,
        JSON.stringify({
          rol: resultRol.rows[0],
          estructura: resultEstructura.rows[0] || estructuraCreada
        })
      ]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Rol de servicio activado exitosamente',
        data: {
          rol: resultRol.rows[0],
          estructura: resultEstructura.rows[0] || estructuraCreada,
          historial: {
            accion: 'ACTIVACION',
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
    console.error('Error al activar rol de servicio:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
