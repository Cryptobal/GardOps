import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    // Obtener PPCs pendientes con información completa
    const ppcsPendientes = await query(`
      SELECT 
        ppc.id,
        ppc.fecha,
        ppc.turno,
        ppc.estado,
        i.nombre as instalacion_nombre,
        c.nombre as cliente_nombre,
        rs.nombre as rol_servicio,
        req.cantidad_guardias
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos req ON ppc.requisito_puesto_id = req.id
      INNER JOIN instalaciones i ON req.instalacion_id = i.id
      INNER JOIN clientes c ON i.cliente_id = c.id
      INNER JOIN as_turnos_roles_servicio rs ON req.rol_servicio_id = rs.id
      WHERE ppc.estado = 'Pendiente'
      ORDER BY ppc.fecha, i.nombre
    `);

    return NextResponse.json(ppcsPendientes.rows);

  } catch (error) {
    console.error('Error obteniendo PPCs pendientes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 