import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const { guardia_id, puesto_operativo_id, confirmar_reasignacion = false } = await request.json();

    if (!guardia_id || !puesto_operativo_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: guardia_id y puesto_operativo_id' },
        { status: 400 }
      );
    }

    // Verificar que el puesto operativo existe y está disponible como PPC
    const puestoCheck = await query(`
      SELECT 
        po.id,
        po.instalacion_id,
        po.rol_id,
        po.es_ppc,
        po.guardia_id
      FROM as_turnos_puestos_operativos po
      WHERE po.id = $1 AND po.es_ppc = true
    `, [puesto_operativo_id]);

    if (puestoCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Puesto operativo no encontrado o no está disponible como PPC' },
        { status: 404 }
      );
    }

    const puesto = puestoCheck.rows[0];

    if (puesto.guardia_id) {
      return NextResponse.json(
        { error: 'El puesto ya tiene un guardia asignado' },
        { status: 400 }
      );
    }

    // Verificar que el guardia existe
    const guardiaCheck = await query(
      'SELECT id FROM guardias WHERE id = $1',
      [guardia_id]
    );

    if (guardiaCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el guardia ya tiene una asignación activa
    const asignacionExistente = await query(`
      SELECT 
        po.id, 
        po.instalacion_id, 
        po.rol_id,
        po.nombre_puesto,
        i.nombre as instalacion_nombre,
        rs.nombre as rol_servicio_nombre,
        rs.hora_inicio,
        rs.hora_termino
      FROM as_turnos_puestos_operativos po
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.guardia_id = $1 AND po.es_ppc = false
    `, [guardia_id]);

    // Si tiene asignación activa y no se confirma la reasignación, devolver error
    if (asignacionExistente.rows.length > 0 && !confirmar_reasignacion) {
      return NextResponse.json(
        { 
          error: 'El guardia ya tiene una asignación activa',
          requiere_confirmacion: true,
          asignacion_actual: asignacionExistente.rows[0]
        },
        { status: 409 }
      );
    }

    // Si tiene asignación activa y se confirma la reasignación, liberar el puesto actual
    if (asignacionExistente.rows.length > 0 && confirmar_reasignacion) {
      const asignacionActual = asignacionExistente.rows[0];
      console.log(`🔄 Liberando asignación actual del guardia ${guardia_id} en puesto ${asignacionActual.id}`);
      
      await query(`
        UPDATE as_turnos_puestos_operativos 
        SET es_ppc = true,
            guardia_id = NULL
        WHERE id = $1
      `, [asignacionActual.id]);
    }

    // Asignar el guardia al nuevo puesto
    await query(`
      UPDATE as_turnos_puestos_operativos 
      SET es_ppc = false,
          guardia_id = $1
      WHERE id = $2
    `, [guardia_id, puesto_operativo_id]);

    console.log(`✅ Guardia ${guardia_id} asignado al puesto ${puesto_operativo_id}`);

    return NextResponse.json({
      success: true,
      message: 'Guardia asignado correctamente al puesto',
      asignacion_anterior: asignacionExistente.rows[0] || null,
      nueva_asignacion: {
        guardia_id,
        puesto_operativo_id,
        instalacion_id: puesto.instalacion_id,
        rol_id: puesto.rol_id
      }
    });

  } catch (error) {
    console.error('Error asignando guardia al puesto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 