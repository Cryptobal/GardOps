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
    
    // Obtener la hora actual
    const horaActual = new Date().getHours();
    const horaInicio = horaActual;
    const horaFin = horaActual + 1;

    let query = `
      SELECT 
        cl.id,
        cl.instalacion_id,
        i.nombre as instalacion_nombre,
        i.telefono as instalacion_telefono,
        cl.guardia_id,
        cl.pauta_id,
        cl.puesto_id,
        cl.programado_para,
        cl.ejecutado_en,
        cl.canal,
        cl.estado,
        cl.contacto_tipo,
        cl.contacto_id,
        cl.contacto_nombre,
        cl.contacto_telefono,
        cl.observaciones,
        cl.sla_segundos,
        cl.operador_id,
        u.nombre as operador_nombre,
        g.nombre as guardia_nombre,
        g.telefono as guardia_telefono,
        rs.nombre as rol_nombre,
        po.nombre_puesto
      FROM central_llamados cl
      INNER JOIN instalaciones i ON cl.instalacion_id = i.id
      LEFT JOIN guardias g ON cl.guardia_id = g.id
      LEFT JOIN as_turnos_pauta_mensual pm ON cl.pauta_id = pm.id
      LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN usuarios u ON cl.operador_id = u.id
      WHERE DATE(cl.programado_para) = $1
        AND EXTRACT(HOUR FROM cl.programado_para) >= $2
        AND EXTRACT(HOUR FROM cl.programado_para) < $3
    `;

    const params: any[] = [fecha, horaInicio, horaFin];

    if (instalacionFilter) {
      query += ` AND cl.instalacion_id = $4`;
      params.push(instalacionFilter);
    }

    query += ` ORDER BY cl.programado_para ASC`;

    const result = await sql.query(query, params);

    // Agrupar por instalación
    const instalaciones = result.rows.reduce((acc: any, llamada: any) => {
      if (!acc[llamada.instalacion_id]) {
        acc[llamada.instalacion_id] = {
          instalacion_id: llamada.instalacion_id,
          instalacion_nombre: llamada.instalacion_nombre,
          instalacion_telefono: llamada.instalacion_telefono,
          llamadas: []
        };
      }
      
      acc[llamada.instalacion_id].llamadas.push({
        id: llamada.id,
        guardia_id: llamada.guardia_id,
        guardia_nombre: llamada.guardia_nombre,
        guardia_telefono: llamada.guardia_telefono,
        pauta_id: llamada.pauta_id,
        puesto_id: llamada.puesto_id,
        programado_para: llamada.programado_para,
        ejecutado_en: llamada.ejecutado_en,
        canal: llamada.canal,
        estado: llamada.estado,
        contacto_tipo: llamada.contacto_tipo,
        contacto_id: llamada.contacto_id,
        contacto_nombre: llamada.contacto_nombre,
        contacto_telefono: llamada.contacto_telefono,
        observaciones: llamada.observaciones,
        sla_segundos: llamada.sla_segundos,
        operador_id: llamada.operador_id,
        operador_nombre: llamada.operador_nombre,
        rol_nombre: llamada.rol_nombre,
        nombre_puesto: llamada.nombre_puesto
      });
      
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: Object.values(instalaciones),
      hora_actual: horaActual,
      ventana: { inicio: horaInicio, fin: horaFin }
    });

  } catch (error) {
    console.error('Error obteniendo llamadas actuales:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
