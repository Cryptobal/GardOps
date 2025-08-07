import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { estructuraId, motivo = 'Inactivación manual', nuevaEstructura = {} } = body;

    if (!estructuraId) {
      return NextResponse.json(
        { success: false, error: 'El estructuraId es requerido' },
        { status: 400 }
      );
    }

    // Iniciar transacción
    const client = await sql.connect();

    try {
      await client.query('BEGIN');

      // 1. Obtener la estructura actual antes de inactivarla
      const estructuraActual = await client.query(`
        SELECT * FROM sueldo_estructuras_roles 
        WHERE id = $1
      `, [estructuraId]);

      if (estructuraActual.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Estructura de sueldo no encontrada' },
          { status: 404 }
        );
      }

      const estructura = estructuraActual.rows[0];

      // 2. Inactivar la estructura actual
      const resultInactivacion = await client.query(`
        UPDATE sueldo_estructuras_roles 
        SET activo = false, fecha_inactivacion = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING id, rol_servicio_id, sueldo_base, activo, fecha_inactivacion
      `, [estructuraId]);

      // 3. Crear nueva estructura automáticamente
      const nuevaEstructuraData = {
        rol_servicio_id: estructura.rol_servicio_id,
        sueldo_base: nuevaEstructura.sueldo_base || estructura.sueldo_base,
        bono_asistencia: nuevaEstructura.bono_asistencia || estructura.bono_asistencia,
        bono_responsabilidad: nuevaEstructura.bono_responsabilidad || estructura.bono_responsabilidad,
        bono_noche: nuevaEstructura.bono_noche || estructura.bono_noche,
        bono_feriado: nuevaEstructura.bono_feriado || estructura.bono_feriado,
        bono_riesgo: nuevaEstructura.bono_riesgo || estructura.bono_riesgo,
        otros_bonos: nuevaEstructura.otros_bonos || estructura.otros_bonos,
        activo: true
      };

      const resultNuevaEstructura = await client.query(`
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
        nuevaEstructuraData.rol_servicio_id,
        nuevaEstructuraData.sueldo_base,
        nuevaEstructuraData.bono_asistencia,
        nuevaEstructuraData.bono_responsabilidad,
        nuevaEstructuraData.bono_noche,
        nuevaEstructuraData.bono_feriado,
        nuevaEstructuraData.bono_riesgo,
        JSON.stringify(nuevaEstructuraData.otros_bonos),
        nuevaEstructuraData.activo
      ]);

      // 4. Crear registro en historial
      await client.query(`
        INSERT INTO historial_estructuras_servicio (
          estructura_anterior_id,
          estructura_nueva_id,
          rol_servicio_id,
          accion,
          motivo,
          fecha_accion,
          datos_anteriores,
          datos_nuevos
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
      `, [
        estructuraId,
        resultNuevaEstructura.rows[0].id,
        estructura.rol_servicio_id,
        'REEMPLAZO',
        motivo,
        JSON.stringify(estructura),
        JSON.stringify(resultNuevaEstructura.rows[0])
      ]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Estructura inactivada y nueva estructura creada exitosamente',
        data: {
          estructuraInactivada: resultInactivacion.rows[0],
          nuevaEstructura: resultNuevaEstructura.rows[0],
          historial: {
            accion: 'REEMPLAZO',
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
    console.error('Error al inactivar estructura de sueldo:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
