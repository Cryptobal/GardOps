import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// POST - Crear nueva estructura de servicio para un rol
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { 
      sueldo_base = 680000,
      bono_asistencia = 0,
      bono_responsabilidad = 0,
      bono_noche = 0,
      bono_feriado = 0,
      bono_riesgo = 0,
      otros_bonos = [],
      motivo,
      usuario_id 
    } = body;

    // Validar que el rol existe y está activo
    const rolExiste = await query(`
      SELECT id, nombre, estado 
      FROM as_turnos_roles_servicio 
      WHERE id = $1
    `, [id]);

    if (rolExiste.rows.length === 0) {
      return NextResponse.json(
        { error: 'Rol de servicio no encontrado' },
        { status: 404 }
      );
    }

    const rol = rolExiste.rows[0];
    
    if (rol.estado !== 'Activo') {
      return NextResponse.json(
        { error: 'Solo se pueden crear nuevas estructuras para roles activos' },
        { status: 400 }
      );
    }

    // Obtener estructura actual antes de crear la nueva
    const estructuraActual = await query(`
      SELECT 
        es.*,
        rs.nombre as rol_nombre
      FROM sueldo_estructuras_roles es
      INNER JOIN as_turnos_roles_servicio rs ON es.rol_servicio_id = rs.id
      WHERE es.rol_servicio_id = $1 AND es.activo = true
    `, [id]);

    // Preparar datos de bonos para la función
    const bonosData = {
      bono_asistencia,
      bono_responsabilidad,
      bono_noche,
      bono_feriado,
      bono_riesgo,
      otros_bonos
    };

    // Ejecutar función para crear nueva estructura
    const resultado = await query(`
      SELECT crear_nueva_estructura_servicio($1, $2, $3, $4, $5)
    `, [
      id, 
      sueldo_base, 
      JSON.stringify(bonosData), 
      motivo || null, 
      usuario_id || null
    ]);

    const resultadoData = resultado.rows[0].crear_nueva_estructura_servicio;

    // Obtener la nueva estructura creada
    const nuevaEstructura = await query(`
      SELECT 
        es.*,
        rs.nombre as rol_nombre,
        rs.estado as rol_estado
      FROM sueldo_estructuras_roles es
      INNER JOIN as_turnos_roles_servicio rs ON es.rol_servicio_id = rs.id
      WHERE es.id = $1
    `, [resultadoData.estructura_id]);

    return NextResponse.json({
      success: true,
      message: 'Nueva estructura de servicio creada exitosamente',
      estructura: nuevaEstructura.rows[0],
      estructura_id: resultadoData.estructura_id,
      fecha_creacion: resultadoData.fecha_creacion,
      estructura_anterior_inactivada: resultadoData.estructura_anterior_inactivada,
      motivo: resultadoData.motivo,
      estructura_anterior: estructuraActual.rows[0] || null
    });

  } catch (error: any) {
    console.error('Error creando nueva estructura:', error);
    return NextResponse.json(
      { 
        error: 'Error al crear nueva estructura de servicio',
        detalles: error.message 
      },
      { status: 500 }
    );
  }
}

// GET - Obtener historial de estructuras de un rol
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Obtener todas las estructuras del rol (activas e inactivas)
    const estructuras = await query(`
      SELECT 
        es.*,
        rs.nombre as rol_nombre,
        rs.estado as rol_estado,
        CASE 
          WHEN es.activo = true THEN 'Activa'
          ELSE 'Inactiva'
        END as estado_estructura
      FROM sueldo_estructuras_roles es
      INNER JOIN as_turnos_roles_servicio rs ON es.rol_servicio_id = rs.id
      WHERE es.rol_servicio_id = $1
      ORDER BY es.created_at DESC
    `, [id]);

    // Obtener historial de cambios
    const historial = await query(`
      SELECT 
        hes.*,
        rs.nombre as rol_nombre
      FROM historial_estructuras_servicio hes
      INNER JOIN as_turnos_roles_servicio rs ON hes.rol_servicio_id = rs.id
      WHERE hes.rol_servicio_id = $1
      ORDER BY hes.fecha_accion DESC
      LIMIT 10
    `, [id]);

    return NextResponse.json({
      success: true,
      estructuras: estructuras.rows,
      historial: historial.rows,
      total_estructuras: estructuras.rows.length,
      estructura_activa: estructuras.rows.find((e: any) => e.activo) || null
    });

  } catch (error: any) {
    console.error('Error obteniendo estructuras:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener estructuras de servicio',
        detalles: error.message 
      },
      { status: 500 }
    );
  }
}
