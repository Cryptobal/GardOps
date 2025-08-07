import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// PUT - Inactivar estructura de servicio independientemente
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { motivo, usuario_id, crear_nueva_automaticamente = true } = body;

    // Validar que la estructura existe
    const estructuraExiste = await query(`
      SELECT 
        es.*,
        rs.nombre as rol_nombre,
        rs.estado as rol_estado
      FROM sueldo_estructuras_roles es
      INNER JOIN as_turnos_roles_servicio rs ON es.rol_servicio_id = rs.id
      WHERE es.id = $1
    `, [id]);

    if (estructuraExiste.rows.length === 0) {
      return NextResponse.json(
        { error: 'Estructura de servicio no encontrada' },
        { status: 404 }
      );
    }

    const estructura = estructuraExiste.rows[0];
    
    if (!estructura.activo) {
      return NextResponse.json(
        { error: 'La estructura de servicio ya está inactiva' },
        { status: 400 }
      );
    }

    // Verificar que el rol esté activo para poder crear nueva estructura
    if (estructura.rol_estado !== 'Activo' && crear_nueva_automaticamente) {
      return NextResponse.json(
        { error: 'No se puede crear nueva estructura automáticamente porque el rol de servicio está inactivo' },
        { status: 400 }
      );
    }

    // Inactivar la estructura actual
    await query(`
      UPDATE sueldo_estructuras_roles
      SET 
        activo = false,
        fecha_inactivacion = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `, [id]);

    // Registrar en historial
    await query(`
      INSERT INTO historial_estructuras_servicio (
        rol_servicio_id,
        estructura_id,
        accion,
        fecha_accion,
        detalles,
        usuario_id,
        datos_anteriores,
        datos_nuevos
      ) VALUES (
        $1,
        $2,
        'INACTIVACION',
        NOW(),
        $3,
        $4,
        $5,
        $6
      )
    `, [
      estructura.rol_servicio_id,
      id,
      COALESCE(motivo, 'Estructura inactivada manualmente'),
      usuario_id || null,
      JSON.stringify(estructura),
      JSON.stringify({ ...estructura, activo: false, fecha_inactivacion: new Date() })
    ]);

    let nuevaEstructura = null;

    // Crear nueva estructura automáticamente si se solicita
    if (crear_nueva_automaticamente && estructura.rol_estado === 'Activo') {
      try {
        const resultadoNuevaEstructura = await query(`
          SELECT crear_nueva_estructura_servicio($1, $2, $3, $4, $5)
        `, [
          estructura.rol_servicio_id,
          estructura.sueldo_base,
          JSON.stringify({
            bono_asistencia: estructura.bono_asistencia,
            bono_responsabilidad: estructura.bono_responsabilidad,
            bono_noche: estructura.bono_noche,
            bono_feriado: estructura.bono_feriado,
            bono_riesgo: estructura.bono_riesgo,
            otros_bonos: estructura.otros_bonos || []
          }),
          'Nueva estructura creada automáticamente al inactivar la anterior',
          usuario_id || null
        ]);

        nuevaEstructura = resultadoNuevaEstructura.rows[0].crear_nueva_estructura_servicio;
      } catch (error) {
        console.error('Error creando nueva estructura automáticamente:', error);
        // No fallar la operación si no se puede crear la nueva estructura
      }
    }

    // Obtener información actualizada
    const estructuraActualizada = await query(`
      SELECT 
        es.*,
        rs.nombre as rol_nombre,
        rs.estado as rol_estado
      FROM sueldo_estructuras_roles es
      INNER JOIN as_turnos_roles_servicio rs ON es.rol_servicio_id = rs.id
      WHERE es.id = $1
    `, [id]);

    return NextResponse.json({
      success: true,
      message: 'Estructura de servicio inactivada exitosamente',
      estructura: estructuraActualizada.rows[0],
      nueva_estructura_creada: nuevaEstructura !== null,
      nueva_estructura: nuevaEstructura,
      fecha_inactivacion: new Date().toISOString(),
      motivo: motivo || 'Inactivación manual'
    });

  } catch (error: any) {
    console.error('Error inactivando estructura de servicio:', error);
    return NextResponse.json(
      { 
        error: 'Error al inactivar estructura de servicio',
        detalles: error.message 
      },
      { status: 500 }
    );
  }
}
