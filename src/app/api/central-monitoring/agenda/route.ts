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

    // Obtener llamados programados para la fecha específica
    const result = await sql`
      SELECT 
        cl.id,
        cl.instalacion_id,
        i.nombre as instalacion_nombre,
        cl.programado_para,
        cl.contacto_tipo,
        cl.contacto_nombre,
        cl.contacto_telefono,
        cl.estado,
        cl.observaciones,
        cl.canal,
        cl.ejecutado_en,
        cl.guardia_id,
        cl.registrado_por_usuario_email,
        cl.registrado_en
      FROM central_llamados cl
      LEFT JOIN instalaciones i ON i.id = cl.instalacion_id
      WHERE cl.programado_para::date = ${fecha}::date
      ORDER BY cl.programado_para ASC, i.nombre ASC
    `;

    return NextResponse.json({ 
      success: true, 
      fecha: fecha,
      data: result.rows 
    });
  } catch (error) {
    console.error('Error obteniendo agenda de monitoreo:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

