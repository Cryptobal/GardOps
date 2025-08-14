import { requireAuthz } from '@/lib/authz-api'
import { NextRequest } from 'next/server';
import { withPermission } from '@/app/api/_middleware/withPermission';
import { getClient } from '@/lib/database';
import { getCurrentUserRef } from '@/lib/auth';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export const POST = withPermission('turnos.marcar_asistencia', async (req: NextRequest) => {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'turnos', action: 'create' });
if (deny) return deny;

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
        const { rows } = await client.query(
          `select pm.id, make_date(pm.anio, pm.mes, pm.dia) as fecha, pm.estado, pm.meta
           from as_turnos.fn_marcar_asistencia(
             $1,'sin_cobertura',
             jsonb_build_object('origen','ppc'),
             $2
           ) x
           join public.as_turnos_pauta_mensual pm on pm.id = $1`,
          [pauta_id, actor]
        );
        return Response.json(rows[0] ?? null);
      } else {
        // Fallback: actualizar directamente
        await client.query(
          `UPDATE public.as_turnos_pauta_mensual
           SET estado = 'sin_cobertura',
               meta = jsonb_build_object(
                 'actor_ref', $2,
                 'timestamp', NOW()::text,
                 'action', 'sin_cobertura',
                 'origen', 'ppc'
               )
           WHERE id = $1`,
          [pauta_id, actor]
        );
        
        const { rows } = await client.query(
          `SELECT id, make_date(anio, mes, dia) as fecha, estado, meta
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