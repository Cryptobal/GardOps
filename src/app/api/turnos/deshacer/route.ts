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
      // Primero verificar si existe la función fn_revertir_a_plan
      const { rows: funcCheck } = await client.query(`
        SELECT COUNT(*) as count 
        FROM pg_proc 
        WHERE proname = 'fn_revertir_a_plan' 
        AND pronamespace = 'as_turnos'::regnamespace
      `);
      
      const functionExists = parseInt(funcCheck[0].count) > 0;
      
      if (functionExists) {
        // Usar la función si existe
        await client.query(
          `SELECT as_turnos.fn_revertir_a_plan($1::bigint, $2::text)`,
          [pauta_id, actor]
        );
      } else {
        // Fallback: actualizar directamente - establecer estado_ui a 'plan'
        await client.query(
          `UPDATE public.as_turnos_pauta_mensual
           SET estado = 'planificado', 
               estado_ui = 'plan',  -- Establecer a 'plan' para que sea consistente con la vista
               meta = NULL  -- Limpiar completamente el meta
           WHERE id = $1::bigint`,
          [pauta_id]
        );
        
        // Intentar insertar log si la tabla existe
        try {
          await client.query(
            `INSERT INTO public.as_turnos_logs(actor_ref, action, pauta_id, before_state, after_state, created_at)
             VALUES ($1, 'revertir_asistencia', $2, NULL, 'planificado', NOW())`,
            [actor, pauta_id]
          );
        } catch (logErr) {
          // No fallar si el log no se puede insertar (tabla puede no existir)
        }
      }
      
      return new Response(null, { status: 204 });
    } finally {
      client.release?.();
    }
  } catch (err:any) {
    console.error('[deshacer] error completo:', err);
    console.error('[deshacer] stack:', err?.stack);
    return new Response(err?.message ?? 'error', { status: 500 });
  }
});