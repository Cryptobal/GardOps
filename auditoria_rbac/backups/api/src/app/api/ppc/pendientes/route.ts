import { NextResponse } from "next/server";
import { query } from "@/lib/database";

export async function GET() {
  try {
    // Obtener puestos operativos (PPC) sin asignar
    const ppcs = await query(`
      SELECT 
        po.id,
        po.es_ppc,
        po.creado_en,
        rs.nombre as rol_nombre,
        rs.dias_trabajo,
        rs.dias_descanso,
        rs.horas_turno,
        rs.hora_inicio,
        rs.hora_termino,
        i.nombre as instalacion_nombre,
        i.id as instalacion_id
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE po.es_ppc = true AND po.guardia_id IS NULL AND po.activo = true
      ORDER BY i.nombre, rs.nombre, po.creado_en DESC
    `);

    const result = ppcs.rows.map((ppc: any) => {
      // Crear descripción del patrón basada en los datos disponibles
      const patron = `${ppc.dias_trabajo}x${ppc.dias_descanso}`;
      const horario = `${ppc.hora_inicio} - ${ppc.hora_termino}`;
      const jornada = `${ppc.horas_turno}h`;
      
      return {
        id: ppc.id,
        instalacion: ppc.instalacion_nombre,
        instalacion_id: ppc.instalacion_id,
        rol: ppc.rol_nombre,
        jornada: jornada,
        patron: patron,
        horario: horario,
        faltantes: 1, // Cada puesto operativo representa 1 faltante
        guardias_requeridos: 1,
        creado: ppc.creado_en,
        estado: 'Pendiente'
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