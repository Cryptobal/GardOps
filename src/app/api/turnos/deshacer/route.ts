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
      // Usa fn_revertir_a_plan si existe; si no, fallback de UPDATE + log
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'fn_revertir_a_plan' AND pronamespace = 'as_turnos'::regnamespace
          ) THEN
            PERFORM as_turnos.fn_revertir_a_plan($1::bigint, $2::text);
          ELSE
            UPDATE public.as_turnos_pauta_mensual
              SET estado='planificado', meta = '{}'::jsonb
            WHERE id = $1::bigint;

            INSERT INTO public.as_turnos_logs(actor_ref, action, pauta_id, before_state, after_state)
            VALUES ($2::text, 'revertir_asistencia', $1::bigint, NULL, 'planificado');
          END IF;
        END $$;`,
        [pauta_id, actor]
      );
      return new Response(null, { status: 204 });
    } finally {
      client.release?.();
    }
  } catch (err:any) {
    console.error('[deshacer] error', err);
    return new Response(err?.message ?? 'error', { status: 500 });
  }
});