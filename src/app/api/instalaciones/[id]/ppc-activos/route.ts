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
    const ppcs = await query(`
      SELECT 
        ppc.id,
        ppc.estado,
        ppc.created_at,
        ppc.cantidad_faltante,
        ppc.patron_turnos,
        ppc.horario_inicio,
        ppc.horario_fin,
        rs.nombre as rol_nombre,
        rs.guardias_requeridos,
        rs.jornada,
        i.nombre as instalacion_nombre,
        i.id as instalacion_id
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      INNER JOIN instalaciones i ON tr.instalacion_id = i.id
      WHERE i.id = $1 AND ppc.estado = 'Pendiente'
      ORDER BY rs.nombre, ppc.created_at DESC
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