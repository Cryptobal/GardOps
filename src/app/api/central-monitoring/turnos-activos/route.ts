import { requireAuthz } from '@/lib/authz-api';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'central_monitoring', action: 'view' });
  if (deny) return deny;

  try {
    const { searchParams } = new URL(req.url);

                // Obtener turnos activos solo para instalaciones con monitoreo habilitado
            const result = await sql`
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
                pm.estado as estado_pauta,
                pm.anio,
                pm.mes,
                pm.dia
              FROM instalaciones i
              INNER JOIN as_turnos_puestos_operativos po ON po.instalacion_id = i.id
              INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
              LEFT JOIN as_turnos_pauta_mensual pm ON pm.puesto_id = po.id
              LEFT JOIN guardias g ON pm.guardia_id = g.id
              INNER JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
              WHERE po.activo = true
                AND i.telefono IS NOT NULL
                AND cci.habilitado = true
              ORDER BY i.nombre ASC, rs.hora_inicio ASC
            `;

    // Agrupar por instalación
    const turnosPorInstalacion = result.rows.reduce((acc, row) => {
      const instalacionId = row.instalacion_id;
      if (!acc[instalacionId]) {
        acc[instalacionId] = {
          instalacion_id: row.instalacion_id,
          instalacion_nombre: row.instalacion_nombre,
          instalacion_telefono: row.instalacion_telefono,
          guardias: []
        };
      }
      
      if (row.rol_nombre) { // Solo agregar si hay rol
        acc[instalacionId].guardias.push({
          guardia_id: row.guardia_id,
          guardia_nombre: row.guardia_nombre,
          guardia_telefono: row.guardia_telefono,
          rol_nombre: row.rol_nombre,
          hora_inicio: row.hora_inicio,
          hora_termino: row.hora_termino,
          nombre_puesto: row.nombre_puesto,
          estado_pauta: row.estado_pauta
        });
      }
      
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({ 
      success: true, 
      fecha: new Date().toISOString().split('T')[0],
      data: Object.values(turnosPorInstalacion)
    });
  } catch (error) {
    console.error('Error obteniendo turnos activos:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

