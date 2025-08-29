import { requireAuthz } from '@/lib/authz-api';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'central_monitoring', action: 'configure' });
  if (deny) return deny;

  try {
    const body = await req.json().catch(() => ({}));
    const { instalacion_ids, fecha } = body || {};
    const ids = Array.isArray(instalacion_ids) ? instalacion_ids : null;
    const targetDate = fecha ? new Date(fecha) : new Date();

    console.log('🔄 Generando agenda de monitoreo para:', targetDate.toISOString().split('T')[0]);

    // Llamar a la función de PostgreSQL para generar agenda
    const result = await sql`
      SELECT * FROM central_fn_generar_agenda(${targetDate.toISOString().split('T')[0]}::date, ${ids})
    `;

    const agendaGenerada = result.rows;
    console.log(`✅ Agenda generada: ${agendaGenerada.length} llamados programados`);

    return NextResponse.json({ 
      success: true, 
      fecha: targetDate.toISOString().split('T')[0],
      llamados_generados: agendaGenerada.length,
      data: agendaGenerada
    });
  } catch (error) {
    console.error('Error generando agenda de monitoreo:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
