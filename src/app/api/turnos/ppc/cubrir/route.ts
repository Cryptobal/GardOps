import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/app/api/_middleware/withPermission';
import { getClient } from '@/lib/database';
import { getCurrentUserRef } from '@/lib/auth';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export const POST = withPermission('turnos.marcar_asistencia', async (req: NextRequest) => {
  noStore();
  try {
    const { pauta_id, guardia_id, turno_id, cobertura_guardia_id } = await req.json();
    const finalPautaId = pauta_id || turno_id;
    const finalGuardiaId = cobertura_guardia_id || guardia_id;
    
    if (!finalPautaId || !finalGuardiaId) {
      return new Response('turno_id/pauta_id y cobertura_guardia_id/guardia_id requeridos', { status: 400 });
    }
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
             $1,'reemplazo',
             jsonb_build_object(
               'cobertura_guardia_id',$2::text,
               'estado_ui','reemplazo'
             ),
             $3
           ) x
           join public.as_turnos_pauta_mensual pm on pm.id = $1`,
          [finalPautaId, finalGuardiaId, actor]
        );
        
        console.log('POST /api/turnos/ppc/cubrir - Payload recibido:', {
          turno_id: finalPautaId,
          cobertura_guardia_id: finalGuardiaId
        });
        console.log('Respuesta:', rows[0]);
        
        return NextResponse.json(rows[0] ?? null);
      } else {
        // Fallback: actualizar directamente
        await client.query(
          `UPDATE public.as_turnos_pauta_mensual
           SET estado = 'reemplazo',
               meta = jsonb_build_object(
                 'actor_ref', $2::text,
                 'timestamp', NOW()::text,
                 'action', 'reemplazo',
                 'cobertura_guardia_id', $3::text,
                 'estado_ui', 'reemplazo'
               )
           WHERE id = $1::bigint`,
          [finalPautaId, actor, finalGuardiaId]
        );
        
        const { rows } = await client.query(
          `SELECT id, make_date(anio, mes, dia) as fecha, estado, meta
           FROM public.as_turnos_pauta_mensual
           WHERE id = $1::bigint`,
          [finalPautaId]
        );
        
        console.log('POST /api/turnos/ppc/cubrir - Payload recibido:', {
          turno_id: finalPautaId,
          cobertura_guardia_id: finalGuardiaId
        });
        console.log('Respuesta:', rows[0]);
        
        return NextResponse.json(rows[0] ?? null);
      }
    } finally {
      client.release?.();
    }
  } catch (err:any) {
    console.error('[ppc/cubrir] error completo:', err);
    console.error('[ppc/cubrir] stack:', err?.stack);
    return new Response(err?.message ?? 'error', { status: 500 });
  }
});