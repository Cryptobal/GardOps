import { requireAuthz } from '@/lib/authz-api'
import { NextResponse } from "next/server";
import { query } from "@/lib/database";

export async function GET() {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'instalaciones_con_ppc_activos', action: 'read:list' });
if (deny) return deny;

  try {
    // Obtener instalaciones que tienen puestos operativos (PPC) sin asignar
    const instalaciones = await query(`
      SELECT DISTINCT
        i.id,
        i.nombre as instalacion_nombre,
        i.direccion,
        i.ciudad,
        i.comuna
      FROM instalaciones i
      INNER JOIN as_turnos_puestos_operativos po ON i.id = po.instalacion_id
      WHERE po.es_ppc = true AND po.guardia_id IS NULL
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