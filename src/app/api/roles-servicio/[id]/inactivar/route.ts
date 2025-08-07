import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// PUT - Inactivar rol de servicio completamente (con liberación de guardias)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { motivo, usuario_id } = body;

    // Validar que el rol existe
    const rolExiste = await sql.query(`
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
    
    if (rol.estado === 'Inactivo') {
      return NextResponse.json(
        { error: 'El rol de servicio ya está inactivo' },
        { status: 400 }
      );
    }

    // Obtener información de guardias asignados antes de inactivar
    const guardiasAsignados = await sql.query(`
      SELECT 
        po.id,
        po.guardia_id,
        g.nombre || ' ' || g.apellido_paterno as guardia_nombre,
        i.nombre as instalacion_nombre
      FROM as_turnos_puestos_operativos po
      LEFT JOIN guardias g ON po.guardia_id = g.id
      LEFT JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE po.rol_id = $1 
        AND po.guardia_id IS NOT NULL 
        AND po.es_ppc = false
    `, [id]);

    // Ejecutar función de inactivación completa
    const resultado = await sql.query(`
      SELECT inactivar_rol_servicio_completo($1, $2, $3)
    `, [id, motivo || null, usuario_id || null]);

    const resultadoData = resultado.rows[0].inactivar_rol_servicio_completo;

    // Obtener información actualizada del rol
    const rolActualizado = await sql.query(`
      SELECT 
        rs.*,
        es.activo as estructura_activa,
        es.fecha_inactivacion as estructura_fecha_inactivacion
      FROM as_turnos_roles_servicio rs
      LEFT JOIN sueldo_estructuras_roles es ON rs.id = es.rol_servicio_id
      WHERE rs.id = $1
    `, [id]);

    return NextResponse.json({
      success: true,
      message: 'Rol de servicio inactivado exitosamente',
      rol: rolActualizado.rows[0],
      guardias_liberados: resultadoData.guardias_liberados,
      estructura_inactivada: resultadoData.estructura_inactivada,
      fecha_inactivacion: resultadoData.fecha_inactivacion,
      motivo: resultadoData.motivo,
      guardias_afectados: guardiasAsignados.rows.map((g: any) => ({
        id: g.guardia_id,
        nombre: g.guardia_nombre,
        instalacion: g.instalacion_nombre
      }))
    });

  } catch (error: any) {
    console.error('Error inactivando rol de servicio:', error);
    return NextResponse.json(
      { 
        error: 'Error al inactivar rol de servicio',
        detalles: error.message 
      },
      { status: 500 }
    );
  }
}
