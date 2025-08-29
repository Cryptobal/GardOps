import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'central_monitoring', action: 'view' });
  if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const instalacionFilter = searchParams.get('instalacion');
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];

    let query = `
      SELECT 
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        i.telefono as instalacion_telefono,
        g.id as guardia_id,
        COALESCE(CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre), 'Sin asignar') as guardia_nombre,
        g.telefono as guardia_telefono,
        rs.nombre as rol_nombre,
        rs.hora_inicio,
        rs.hora_termino,
        po.nombre_puesto,
        po.id as puesto_id,
        pm.estado as estado_pauta,
        pm.anio,
        pm.mes,
        pm.dia,
        pm.id as pauta_id,
        cci.habilitado as monitoreo_habilitado,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin,
        cci.modo,
        cci.mensaje_template
      FROM instalaciones i
      INNER JOIN as_turnos_puestos_operativos po ON po.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN as_turnos_pauta_mensual pm ON pm.puesto_id = po.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      INNER JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE po.activo = true
        AND pm.estado = 'Activo'
        AND cci.habilitado = true
        AND pm.anio = EXTRACT(YEAR FROM $1::date)
        AND pm.mes = EXTRACT(MONTH FROM $1::date)
        AND pm.dia = EXTRACT(DAY FROM $1::date)
    `;

    const params: any[] = [fecha];

    if (instalacionFilter) {
      query += ` AND i.id = $2`;
      params.push(instalacionFilter);
    }

    query += ` ORDER BY i.nombre ASC, rs.hora_inicio ASC`;

    const result = await sql.query(query, params);

    // Agrupar por instalación
    const instalaciones = result.rows.reduce((acc: any, turno: any) => {
      if (!acc[turno.instalacion_id]) {
        acc[turno.instalacion_id] = {
          instalacion_id: turno.instalacion_id,
          instalacion_nombre: turno.instalacion_nombre,
          instalacion_telefono: turno.instalacion_telefono,
          monitoreo_habilitado: turno.monitoreo_habilitado,
          intervalo_minutos: turno.intervalo_minutos,
          ventana_inicio: turno.ventana_inicio,
          ventana_fin: turno.ventana_fin,
          modo: turno.modo,
          mensaje_template: turno.mensaje_template,
          turnos: []
        };
      }
      
      acc[turno.instalacion_id].turnos.push({
        guardia_id: turno.guardia_id,
        guardia_nombre: turno.guardia_nombre,
        guardia_telefono: turno.guardia_telefono,
        rol_nombre: turno.rol_nombre,
        hora_inicio: turno.hora_inicio,
        hora_termino: turno.hora_termino,
        nombre_puesto: turno.nombre_puesto,
        puesto_id: turno.puesto_id,
        pauta_id: turno.pauta_id
      });
      
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: Object.values(instalaciones)
    });

  } catch (error) {
    console.error('Error obteniendo turnos activos:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
