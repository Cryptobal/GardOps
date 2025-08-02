import { NextResponse } from "next/server";
import { query } from "@/lib/database";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const instalacion = searchParams.get('instalacion');
    const rol = searchParams.get('rol');
    const prioridad = searchParams.get('prioridad');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');

    let whereConditions = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (estado && estado !== 'all') {
      whereConditions.push(`ppc.estado = $${paramIndex}`);
      params.push(estado);
      paramIndex++;
    }

    if (instalacion && instalacion !== 'all') {
      whereConditions.push(`i.nombre = $${paramIndex}`);
      params.push(instalacion);
      paramIndex++;
    }

    if (rol && rol !== 'all') {
      whereConditions.push(`rs.nombre = $${paramIndex}`);
      params.push(rol);
      paramIndex++;
    }

    if (prioridad && prioridad !== 'all') {
      whereConditions.push(`ppc.prioridad = $${paramIndex}`);
      params.push(prioridad);
      paramIndex++;
    }

    if (fechaDesde) {
      whereConditions.push(`ppc.created_at >= $${paramIndex}`);
      params.push(fechaDesde);
      paramIndex++;
    }

    if (fechaHasta) {
      whereConditions.push(`ppc.created_at <= $${paramIndex}`);
      params.push(fechaHasta);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    const ppcs = await query(`
      SELECT 
        ppc.id,
        ppc.estado,
        ppc.created_at,
        ppc.cantidad_faltante,
        ppc.prioridad,
        ppc.guardia_asignado_id,
        rs.nombre as rol_nombre,
        rs.nombre as rol_nombre,
        rs.hora_inicio,
        rs.hora_termino,
        i.nombre as instalacion_nombre,
        i.id as instalacion_id,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as guardia_nombre,
        g.rut as guardia_rut
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      INNER JOIN instalaciones i ON tr.instalacion_id = i.id
      LEFT JOIN guardias g ON ppc.guardia_asignado_id = g.id
      ${whereClause}
      ORDER BY i.nombre, rs.nombre, ppc.created_at DESC
    `, params);

    const result = ppcs.rows.map((ppc: any) => {
      return {
        id: ppc.id,
        instalacion: ppc.instalacion_nombre,
        instalacion_id: ppc.instalacion_id,
        rol: ppc.rol_nombre,
        jornada: ppc.rol_nombre?.includes('Noche') ? 'N' : 'D',
        rol_tipo: ppc.rol_nombre || '4x4',
        horario: `${ppc.hora_inicio || '08:00'} - ${ppc.hora_termino || '20:00'}`,
        estado: ppc.estado,
        prioridad: ppc.prioridad || 'Media',
        faltantes: ppc.cantidad_faltante,
        creado: ppc.created_at,
        guardia_asignado: ppc.guardia_asignado_id ? {
          id: ppc.guardia_asignado_id,
          nombre: ppc.guardia_nombre,
          rut: ppc.guardia_rut
        } : null
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error obteniendo PPCs:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 