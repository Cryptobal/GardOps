import { NextRequest } from 'next/server';
import { withPermission } from '@/app/api/_middleware/withPermission';
import { getClient } from '@/lib/database';
import { getCurrentUserRef } from '@/lib/auth';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export const POST = withPermission('turnos.marcar_asistencia', async (req: NextRequest) => {
  noStore();
  try {
    const { pauta_id } = await req.json();
    if (!pauta_id) return new Response('pauta_id requerido', { status: 400 });
    const actor = await getCurrentUserRef();

    const client = await getClient();
    try {
      // Verificar si la función existe
      const { rows: funcCheck } = await client.query(`
        SELECT COUNT(*) as count 
        FROM pg_proc 
        WHERE proname = 'fn_marcar_asistencia' 
        AND pronamespace = 'as_turnos'::regnamespace
      `);
      
      const functionExists = parseInt(funcCheck[0].count) > 0;
      
      if (functionExists) {
        await client.query(
          `SELECT as_turnos.fn_marcar_sin_cobertura($1, $2)`,
          [pauta_id, actor]
        );
        
        const { rows } = await client.query(
          `SELECT id, make_date(anio, mes, dia) as fecha, tipo_turno, estado_puesto, estado_guardia, tipo_cobertura, meta
           FROM public.as_turnos_pauta_mensual
           WHERE id = $1`,
          [pauta_id]
        );
        return Response.json(rows[0] ?? null);
      } else {
        // Fallback: actualizar directamente con nueva estructura
        await client.query(
          `UPDATE public.as_turnos_pauta_mensual
           SET tipo_turno = 'planificado', estado_puesto = 'ppc', estado_guardia = NULL, tipo_cobertura = 'sin_cobertura',
               tipo_turno = 'planificado',
               estado_puesto = 'ppc',
               estado_guardia = 'falta',
               tipo_cobertura = 'sin_cobertura',
               meta = jsonb_build_object(
                 'action', 'marcar_sin_cobertura',
                 'origen', 'ppc',
                 'marcado_ts', NOW()::text,
                 'marcado_por', $2
               )
           WHERE id = $1`,
          [pauta_id, actor]
        );
        
        const { rows } = await client.query(
          `SELECT id, make_date(anio, mes, dia) as fecha, tipo_turno, estado_puesto, estado_guardia, tipo_cobertura, meta
           FROM public.as_turnos_pauta_mensual
           WHERE id = $1`,
          [pauta_id]
        );
        return Response.json(rows[0] ?? null);
      }
    } finally {
      client.release?.();
    }
  } catch (err:any) {
    console.error('[ppc/sin-cobertura] error completo:', err);
    console.error('[ppc/sin-cobertura] stack:', err?.stack);
    return new Response(err?.message ?? 'error', { status: 500 });
  }
});