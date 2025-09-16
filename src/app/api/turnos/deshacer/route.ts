import { NextRequest } from 'next/server';
import { withPermission } from '@/app/api/_middleware/withPermission';
import { getClient } from '@/lib/database';
import { getCurrentUserRef } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const POST = withPermission('turnos.marcar_asistencia', async (req: NextRequest) => {
  try {
    const { pauta_id } = await req.json();
    if (!pauta_id) return new Response('pauta_id requerido', { status: 400 });
    const actor = await getCurrentUserRef();

    const client = await getClient();
    try {
      // Primero verificar si existe la función fn_deshacer
      const { rows: funcCheck } = await client.query(`
        SELECT COUNT(*) as count 
        FROM pg_proc 
        WHERE proname = 'fn_deshacer' 
        AND pronamespace = 'as_turnos'::regnamespace
      `);
      
      const functionExists = parseInt(funcCheck[0].count) > 0;
      
      if (functionExists) {
        // Usar la función fn_deshacer que limpia correctamente meta y turnos extra
        await client.query(
          `SELECT as_turnos.fn_deshacer($1::bigint, $2::text)`,
          [pauta_id, actor]
        );
      } else {
        // Fallback: actualizar directamente - limpiar meta y eliminar turnos extra
        await client.query(
          `UPDATE public.as_turnos_pauta_mensual
           SET tipo_turno = 'planificado',
               estado_puesto = CASE WHEN guardia_id IS NOT NULL THEN 'asignado' ELSE 'ppc' END,
               estado_guardia = NULL,
               tipo_cobertura = CASE WHEN guardia_id IS NOT NULL THEN 'guardia_asignado' ELSE 'ppc' END,
               guardia_trabajo_id = guardia_id,
               meta = (COALESCE(meta, '{}'::jsonb)
                         - 'cobertura_guardia_id'
                         - 'tipo'
                         - 'extra_uid'
                         - 'es_extra'
                         - 'reemplazo_guardia_id'
                         - 'reemplazo_guardia_nombre'
                         - 'sin_cobertura'
                         - 'motivo'
                         - 'falta_sin_aviso')
                     || jsonb_build_object(
                        'deshacer_actor', $2,
                        'deshacer_ts', NOW()::text,
                        'action', 'deshacer'
                     )
           WHERE id = $1::bigint`,
          [pauta_id, actor]
        );
        
        // Eliminar turnos extra relacionados
        await client.query(
          `DELETE FROM TE_turnos_extras WHERE pauta_id = $1::bigint`,
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
      
      return new Response(JSON.stringify({ success: true, message: 'Marcado deshecho correctamente' }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } finally {
      client.release?.();
    }
  } catch (err:any) {
    console.error('[deshacer] error completo:', err);
    console.error('[deshacer] stack:', err?.stack);
    return new Response(err?.message ?? 'error', { status: 500 });
  }
});