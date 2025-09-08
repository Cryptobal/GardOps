import { NextResponse } from "next/server";
import { query } from "@/lib/database";

export async function GET() {
  try {
    // Consulta de prueba para ver qué PPCs existen
    const ppcs = await query(`
      SELECT 
        po.id,
        po.es_ppc,
        po.activo,
        po.guardia_id,
        po.instalacion_id,
        i.nombre as instalacion_nombre,
        rs.nombre as rol_nombre
      FROM as_turnos_puestos_operativos po
      LEFT JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.es_ppc = true
      ORDER BY po.creado_en DESC
      LIMIT 10
    `);

    return NextResponse.json({
      total: ppcs.rows.length,
      ppcs: ppcs.rows
    });
  } catch (error) {
    console.error('Error en debug PPC:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
