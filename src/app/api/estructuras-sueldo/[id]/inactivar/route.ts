import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// PUT - Inactivar estructura de servicio independientemente
export async function PUT(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'estructuras_sueldo', action: 'update' });
if (deny) return deny;
 params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { motivo = '', usuario_id = null, crear_nueva_automaticamente = false } = body;

    // Validar que la estructura existe y obtener datos actuales
    const estructuraExiste = await query(`
      SELECT 
        es.*,
        rs.nombre as rol_nombre,
        rs.estado as rol_estado,
        i.nombre as instalacion_nombre
      FROM sueldo_estructuras_servicio es
      INNER JOIN as_turnos_roles_servicio rs ON es.rol_servicio_id = rs.id
      INNER JOIN instalaciones i ON es.instalacion_id = i.id
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
      UPDATE sueldo_estructuras_servicio
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
        $1, $2, 'INACTIVACION', NOW(), $3, $4, $5, $6
      )
    `, [
      estructura.rol_servicio_id,
      id,
      motivo || 'Estructura inactivada manualmente',
      usuario_id,
      JSON.stringify(estructura),
      JSON.stringify({ ...estructura, activo: false, fecha_inactivacion: new Date() })
    ]);

    let nuevaEstructura = null;

    // Crear nueva estructura automáticamente si se solicita
    if (crear_nueva_automaticamente && estructura.rol_estado === 'Activo') {
      const resultadoNuevaEstructura = await query(`
        INSERT INTO sueldo_estructuras_servicio (
          instalacion_id,
          rol_servicio_id,
          sueldo_base,
          bono_id,
          monto,
          activo
        )
        SELECT 
          instalacion_id,
          rol_servicio_id,
          sueldo_base,
          bono_id,
          monto,
          true
        FROM sueldo_estructuras_servicio
        WHERE id = $1
        RETURNING *
      `, [id]);

      if (resultadoNuevaEstructura.rows.length > 0) {
        nuevaEstructura = resultadoNuevaEstructura.rows[0];
        
        // Registrar creación en historial
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
            $1, $2, 'CREACION', NOW(), $3, $4, NULL, $5
          )
        `, [
          estructura.rol_servicio_id,
          nuevaEstructura.id,
          'Nueva estructura creada automáticamente al inactivar la anterior',
          usuario_id,
          JSON.stringify(nuevaEstructura)
        ]);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Estructura de servicio inactivada exitosamente',
      estructura: {
        ...estructura,
        activo: false,
        fecha_inactivacion: new Date().toISOString()
      },
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