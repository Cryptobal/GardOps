import { NextResponse } from "next/server";
import { query } from "@/lib/database";

export async function GET() {
  try {
    // Obtener instalaciones que tienen PPC activos
    const instalaciones = await query(`
      SELECT DISTINCT
        i.id,
        i.nombre as instalacion_nombre,
        i.direccion,
        i.ciudad,
        i.comuna
      FROM instalaciones i
      INNER JOIN as_turnos_requisitos tr ON i.id = tr.instalacion_id
      INNER JOIN as_turnos_ppc ppc ON tr.id = ppc.requisito_puesto_id
      WHERE ppc.estado = 'Pendiente'
      ORDER BY i.nombre
    `);

    return NextResponse.json(instalaciones.rows);
  } catch (error) {
    console.error('Error obteniendo instalaciones con PPC activos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 