import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { clienteId: string } }
) {
  try {
    const { clienteId } = params;

    // Obtener roles de servicio asociados a instalaciones del cliente
    const result = await query(`
      SELECT DISTINCT 
        rs.*,
        i.nombre as instalacion_nombre,
        i.cliente_id
      FROM as_turnos_roles_servicio rs
      INNER JOIN as_turnos_puestos_operativos po ON rs.id = po.rol_id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE i.cliente_id = $1
      ORDER BY rs.nombre
    `, [clienteId]);

    return NextResponse.json({
      success: true,
      rows: result.rows,
      count: result.rowCount
    });
  } catch (error: any) {
    console.error('Error obteniendo roles de servicio del cliente:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener roles de servicio del cliente',
        detalles: error.message 
      },
      { status: 500 }
    );
  }
}
