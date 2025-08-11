import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener información del puesto
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; puestoId: string } }
) {
  try {
    const { puestoId } = params;

    const result = await query(`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.instalacion_id,
        po.rol_id,
        po.guardia_id,
        po.es_ppc,
        rs.nombre as rol_nombre,
        g.nombre as guardia_nombre,
        g.apellido_paterno as guardia_apellido
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.id = $1 AND po.activo = true
    `, [puestoId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Puesto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo puesto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar nombre del puesto
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; puestoId: string } }
) {
  try {
    const { puestoId } = params;
    const body = await request.json();
    const { nombre_puesto } = body;

    if (!nombre_puesto || nombre_puesto.trim().length === 0) {
      return NextResponse.json(
        { error: 'El nombre del puesto es requerido' },
        { status: 400 }
      );
    }

    // Validar que el nombre no sea muy largo
    if (nombre_puesto.length > 255) {
      return NextResponse.json(
        { error: 'El nombre del puesto no puede exceder 255 caracteres' },
        { status: 400 }
      );
    }

    // Verificar que el puesto existe
    const checkResult = await query(
      'SELECT id FROM as_turnos_puestos_operativos WHERE id = $1 AND activo = true',
      [puestoId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Puesto no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar el nombre del puesto
    const updateResult = await query(`
      UPDATE as_turnos_puestos_operativos 
      SET 
        nombre_puesto = $1,
        actualizado_en = NOW()
      WHERE id = $2
      RETURNING id, nombre_puesto
    `, [nombre_puesto.trim(), puestoId]);

    console.log(`✅ Nombre del puesto ${puestoId} actualizado a: ${nombre_puesto}`);

    return NextResponse.json({
      success: true,
      message: 'Nombre del puesto actualizado exitosamente',
      data: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Error actualizando nombre del puesto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
