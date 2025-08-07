import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { clienteId: string } }
) {
  try {
    const { clienteId } = params;

    // Obtener estructuras de sueldo asociadas a roles de servicio del cliente
    const result = await query(`
      SELECT DISTINCT 
        es.*,
        rs.nombre as rol_nombre,
        rs.estado as rol_estado,
        i.nombre as instalacion_nombre,
        i.cliente_id
      FROM sueldo_estructuras_roles es
      INNER JOIN as_turnos_roles_servicio rs ON es.rol_servicio_id = rs.id
      INNER JOIN as_turnos_puestos_operativos po ON rs.id = po.rol_id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE i.cliente_id = $1
      ORDER BY rs.nombre, es.created_at DESC
    `, [clienteId]);

    return NextResponse.json({
      success: true,
      rows: result.rows,
      count: result.rowCount
    });
  } catch (error: any) {
    console.error('Error obteniendo estructuras de sueldo del cliente:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener estructuras de sueldo del cliente',
        detalles: error.message 
      },
      { status: 500 }
    );
  }
}
