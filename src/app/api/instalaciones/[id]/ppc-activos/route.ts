import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/database";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("🔁 Endpoint activo: /api/instalaciones/[id]/ppc-activos");
  
  try {
    const instalacionId = params.id;

    // Obtener PPC pendientes de la instalación (versión simplificada)
    // Migrado al nuevo modelo as_turnos_puestos_operativos
    const ppcs = await query(`
      SELECT 
        po.id,
        po.estado,
        po.creado_en as created_at,
        po.cantidad_faltante,
        po.patron_turnos,
        po.horario_inicio,
        po.horario_fin,
        rs.nombre as rol_nombre,
        rs.guardias_requeridos,
        rs.jornada,
        i.nombre as instalacion_nombre,
        i.id as instalacion_id
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE i.id = $1 AND po.es_ppc = true AND po.estado = 'Pendiente'
      ORDER BY rs.nombre, po.creado_en DESC
    `, [instalacionId]);

    const result = ppcs.rows.map((ppc: any) => {
      return {
        id: ppc.id,
        instalacion: ppc.instalacion_nombre,
        instalacion_id: ppc.instalacion_id,
        rol: ppc.rol_nombre,
        jornada: ppc.jornada || 'No especificada',
        patron: ppc.patron_turnos || 'No especificado',
        horario: ppc.horario_inicio && ppc.horario_fin 
          ? `${ppc.horario_inicio} - ${ppc.horario_fin}`
          : 'No especificado',
        faltantes: ppc.cantidad_faltante || 0,
        guardias_requeridos: ppc.guardias_requeridos || 0,
        creado: ppc.created_at,
        estado: ppc.estado
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error obteniendo PPC pendientes de la instalación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 