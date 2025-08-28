import { requireAuthz } from '@/lib/authz-api';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'central_monitoring', action: 'view' });
  if (deny) return deny;

  try {
    const { searchParams } = new URL(req.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];

    // 1. Obtener instalaciones con monitoreo habilitado
    const instalacionesQuery = await sql`
      SELECT 
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        i.telefono as instalacion_telefono,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin
      FROM instalaciones i
      INNER JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE cci.habilitado = true
      ORDER BY i.nombre ASC
    `;

    const contactos: any[] = [];

    // 2. Para cada instalación, obtener contactos disponibles
    for (const instalacion of instalacionesQuery.rows) {
      const instalacionId = instalacion.instalacion_id;
      
      // 2a. Si la instalación tiene teléfono, agregar como contacto principal
      if (instalacion.instalacion_telefono) {
        contactos.push({
          tipo: 'instalacion',
          id: `inst_${instalacionId}`,
          nombre: instalacion.instalacion_nombre,
          telefono: instalacion.instalacion_telefono,
          instalacion_id: instalacionId,
          instalacion_nombre: instalacion.instalacion_nombre,
          puesto_nombre: 'Recepción',
          rol_nombre: 'Monitoreo',
          hora_inicio: instalacion.ventana_inicio,
          hora_termino: instalacion.ventana_fin,
          intervalo_minutos: instalacion.intervalo_minutos,
          es_turno_extra: false
        });
      }

      // 2b. Obtener guardias asignados en turnos regulares
      const guardiasQuery = await sql`
        SELECT 
          g.id as guardia_id,
          CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre) as guardia_nombre,
          g.telefono as guardia_telefono,
          rs.nombre as rol_nombre,
          rs.hora_inicio,
          rs.hora_termino,
          po.nombre_puesto,
          pm.estado as estado_pauta
        FROM as_turnos_puestos_operativos po
        INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
        INNER JOIN as_turnos_pauta_mensual pm ON pm.puesto_id = po.id
        LEFT JOIN guardias g ON pm.guardia_id = g.id
        WHERE po.instalacion_id = ${instalacionId}
          AND po.activo = true
          AND pm.anio = EXTRACT(YEAR FROM ${fecha}::date)::int
          AND pm.mes = EXTRACT(MONTH FROM ${fecha}::date)::int
          AND pm.dia = EXTRACT(DAY FROM ${fecha}::date)::int
          AND pm.estado IN ('trabajado', 'T', 'reemplazo', 'cubierto')
          AND g.telefono IS NOT NULL
          AND g.telefono != ''
        ORDER BY rs.hora_inicio ASC
      `;

      // Agregar guardias regulares
      for (const guardia of guardiasQuery.rows) {
        contactos.push({
          tipo: 'guardia',
          id: `guardia_${guardia.guardia_id}`,
          nombre: guardia.guardia_nombre,
          telefono: guardia.guardia_telefono,
          instalacion_id: instalacionId,
          instalacion_nombre: instalacion.instalacion_nombre,
          puesto_nombre: guardia.nombre_puesto,
          rol_nombre: guardia.rol_nombre,
          hora_inicio: guardia.hora_inicio,
          hora_termino: guardia.hora_termino,
          guardia_id: guardia.guardia_id,
          es_turno_extra: false
        });
      }

      // 2c. Obtener turnos extras para esta instalación
      const turnosExtrasQuery = await sql`
        SELECT 
          te.guardia_id,
          CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre) as guardia_nombre,
          g.telefono as guardia_telefono,
          rs.nombre as rol_nombre,
          rs.hora_inicio,
          rs.hora_termino,
          po.nombre_puesto,
          te.estado as tipo_turno_extra
        FROM TE_turnos_extras te
        LEFT JOIN guardias g ON te.guardia_id = g.id
        LEFT JOIN as_turnos_puestos_operativos po ON te.puesto_id = po.id
        LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
        WHERE te.instalacion_id = ${instalacionId}
          AND te.fecha = ${fecha}::date
          AND g.telefono IS NOT NULL
          AND g.telefono != ''
        ORDER BY rs.hora_inicio ASC
      `;

      // Agregar turnos extras
      for (const turnoExtra of turnosExtrasQuery.rows) {
        contactos.push({
          tipo: 'turno_extra',
          id: `extra_${turnoExtra.guardia_id}_${instalacionId}`,
          nombre: `${turnoExtra.guardia_nombre} (Extra)`,
          telefono: turnoExtra.guardia_telefono,
          instalacion_id: instalacionId,
          instalacion_nombre: instalacion.instalacion_nombre,
          puesto_nombre: turnoExtra.nombre_puesto,
          rol_nombre: `${turnoExtra.rol_nombre} - ${turnoExtra.tipo_turno_extra}`,
          hora_inicio: turnoExtra.hora_inicio,
          hora_termino: turnoExtra.hora_termino,
          guardia_id: turnoExtra.guardia_id,
          es_turno_extra: true,
          tipo_turno_extra: turnoExtra.tipo_turno_extra
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      fecha: fecha,
      data: contactos
    });
  } catch (error) {
    console.error('Error obteniendo contactos disponibles:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
