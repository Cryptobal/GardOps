import { NextResponse } from "next/server";
import { query } from "@/lib/database";

export async function GET() {
  try {
    const ppcs = await query(`
      SELECT 
        ppc.id,
        ppc.estado,
        ppc.created_at,
        ppc.cantidad_faltante,
        rs.nombre as rol_nombre,
        i.nombre as instalacion_nombre,
        i.id as instalacion_id
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      INNER JOIN instalaciones i ON tr.instalacion_id = i.id
      WHERE ppc.estado = 'Pendiente'
      ORDER BY i.nombre, rs.nombre, ppc.created_at DESC
    `);

    const result = ppcs.rows.map((ppc: any) => {
      return {
        id: ppc.id,
        instalacion: ppc.instalacion_nombre,
        instalacion_id: ppc.instalacion_id,
        rol: ppc.rol_nombre,
        jornada: ppc.rol_nombre, // Usar el nombre del rol directamente
        faltantes: ppc.cantidad_faltante,
        creado: ppc.created_at
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error obteniendo PPCs pendientes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 