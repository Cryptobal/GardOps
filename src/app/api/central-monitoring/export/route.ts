import { requireAuthz } from '@/lib/authz-api';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

function formatDate(date: string | Date): string {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatTime(date: string | Date): string {
  const d = new Date(date);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export async function GET(req: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'central_monitoring', action: 'export' });
  if (deny) return deny;

  try {
    const { searchParams } = new URL(req.url);
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const instalacionIds = searchParams.get('instalacion_ids');

    if (!desde || !hasta) {
      return NextResponse.json(
        { success: false, error: 'Los parámetros desde y hasta son requeridos (formato DD-MM-YYYY)' },
        { status: 400 }
      );
    }

    const ids = instalacionIds ? instalacionIds.split(',').map(s => s.trim()).filter(Boolean) : null;
    const instalacionFilter = ids ? sql`AND cl.instalacion_id = ANY(${ids})` : sql``;

    const result = await sql`
      SELECT 
        cl.*,
        i.nombre as instalacion_nombre,
        i.telefono as instalacion_telefono,
        g.nombre as guardia_nombre,
        g.apellido_paterno as guardia_apellido_paterno,
        g.apellido_materno as guardia_apellido_materno,
        g.telefono as guardia_telefono,
        CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre) as guardia_nombre_completo,
        ci.tipo as incidente_tipo,
        ci.severidad as incidente_severidad
      FROM central_llamados cl
      JOIN instalaciones i ON i.id = cl.instalacion_id
      LEFT JOIN guardias g ON cl.guardia_id = g.id
      LEFT JOIN central_incidentes ci ON ci.llamado_id = cl.id
      WHERE cl.programado_para::date BETWEEN TO_DATE(${desde}, 'DD-MM-YYYY') AND TO_DATE(${hasta}, 'DD-MM-YYYY')
        ${instalacionFilter}
      ORDER BY cl.instalacion_id, cl.programado_para ASC
    `;

    // Generar CSV
    const headers = [
      'Instalación',
      'Teléfono Instalación', 
      'Programado (Fecha)',
      'Programado (Hora)',
      'Ejecutado (Fecha)',
      'Ejecutado (Hora)',
      'Estado',
      'Canal',
      'Tipo Contacto',
      'Contacto Nombre',
      'Contacto Teléfono',
      'Guardia Asignado',
      'Teléfono Guardia',
      'Observaciones',
      'Tipo Incidente',
      'Severidad Incidente'
    ];

    const csvRows = result.rows.map(row => [
      `"${row.instalacion_nombre || ''}"`,
      `"${row.instalacion_telefono || ''}"`,
      `"${formatDate(row.programado_para)}"`,
      `"${formatTime(row.programado_para)}"`,
      `"${row.ejecutado_en ? formatDate(row.ejecutado_en) : ''}"`,
      `"${row.ejecutado_en ? formatTime(row.ejecutado_en) : ''}"`,
      `"${row.estado || ''}"`,
      `"${row.canal || ''}"`,
      `"${row.contacto_tipo || ''}"`,
      `"${row.contacto_nombre || ''}"`,
      `"${row.contacto_telefono || ''}"`,
      `"${row.guardia_nombre_completo || ''}"`,
      `"${row.guardia_telefono || ''}"`,
      `"${(row.observaciones || '').replace(/"/g, '""')}"`,
      `"${row.incidente_tipo || ''}"`,
      `"${row.incidente_severidad || ''}"`
    ]);

    const csv = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="central_monitoreo_${desde}_a_${hasta}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exportando reporte:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
