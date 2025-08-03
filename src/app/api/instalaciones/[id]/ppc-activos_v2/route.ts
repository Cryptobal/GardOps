import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/database";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("🔁 Endpoint activo: /api/instalaciones/[id]/ppc-activos_v2");
  
  try {
    const instalacionId = params.id;

    // Obtener PPCs activos usando exclusivamente as_turnos_puestos_operativos
    const ppcs = await query(`
      SELECT 
        po.id,
        po.instalacion_id,
        po.rol_id,
        po.nombre_puesto,
        po.es_ppc,
        po.creado_en as created_at,
        po.observaciones,
        rs.nombre as rol_nombre,
        rs.hora_inicio,
        rs.hora_termino,
        i.nombre as instalacion_nombre
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE po.instalacion_id = $1 AND po.es_ppc = true
      ORDER BY rs.nombre, po.creado_en DESC
    `, [instalacionId]);

    const result = ppcs.rows.map((ppc: any) => {
      return {
        id: ppc.id,
        instalacion: ppc.instalacion_nombre,
        instalacion_id: ppc.instalacion_id,
        rol: ppc.rol_nombre,
        jornada: `${ppc.hora_inicio} - ${ppc.hora_termino}` || 'No especificada',
        patron: 'Puesto Operativo',
        horario: ppc.hora_inicio && ppc.hora_termino 
          ? `${ppc.hora_inicio} - ${ppc.hora_termino}`
          : 'No especificado',
        faltantes: 1,
        guardias_requeridos: 1,
        creado: ppc.created_at,
        estado: 'Pendiente',
        nombre_puesto: ppc.nombre_puesto,
        observaciones: ppc.observaciones
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error obteniendo PPC activos v2:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 