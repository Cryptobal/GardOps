import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/app/api/_middleware/withPermission';
import { getClient } from '@/lib/database';
import { getCurrentUserRef } from '@/lib/auth';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export const POST = withPermission('turnos.marcar_asistencia', async (req: NextRequest) => {
  noStore();
  try {
    const { pauta_id, falta_sin_aviso, motivo, cubierto_por, con_cobertura, turno_id, cobertura_guardia_id } = await req.json();
    if (!pauta_id && !turno_id) return new Response('pauta_id o turno_id requerido', { status: 400 });
    const actor = await getCurrentUserRef();

    const client = await getClient();
    try {
      // Determinar el estado_ui basado en si hay cobertura o no
      const nuevoEstado = (cubierto_por || cobertura_guardia_id || con_cobertura) ? 'reemplazo' : 'sin_cobertura';
      const guardiaReemplazoId = cobertura_guardia_id || cubierto_por || null;
      
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
          `select pm.id, make_date(pm.anio, pm.mes, pm.dia) as fecha, pm.estado, pm.meta, pm.estado_ui
           from as_turnos.fn_marcar_asistencia(
             $1,'inasistencia',
             jsonb_build_object(
               'falta_sin_aviso',$2,
               'motivo',$3::text,
               'cobertura_guardia_id',$4::text,
               'estado_ui',$5::text
             ),
             $6
           ) x
           join public.as_turnos_pauta_mensual pm on pm.id = $1`,
          [pauta_id || turno_id, !!falta_sin_aviso, motivo ?? null, guardiaReemplazoId, nuevoEstado, actor]
        );
        
        console.log('POST /api/turnos/inasistencia - Payload recibido:', {
          pauta_id: pauta_id || turno_id,
          falta_sin_aviso,
          motivo,
          cobertura_guardia_id: guardiaReemplazoId,
          con_cobertura: con_cobertura || !!guardiaReemplazoId
        });
        console.log('Respuesta:', rows[0]);
        
        return NextResponse.json(rows[0] ?? null);
      } else {
        // Fallback: actualizar directamente
        await client.query(
          `UPDATE public.as_turnos_pauta_mensual
           SET estado = 'inasistencia',
               estado_ui = $6::text,
               meta = jsonb_build_object(
                 'actor_ref', $2::text,
                 'timestamp', NOW()::text,
                 'action', 'inasistencia',
                 'falta_sin_aviso', $3,
                 'motivo', $4::text,
                 'cobertura_guardia_id', $5::text
               )
           WHERE id = $1::bigint`,
          [pauta_id || turno_id, actor, !!falta_sin_aviso, motivo ?? null, guardiaReemplazoId, nuevoEstado]
        );
        
        const { rows } = await client.query(
          `SELECT id, make_date(anio, mes, dia) as fecha, estado, estado_ui, meta
           FROM public.as_turnos_pauta_mensual
           WHERE id = $1::bigint`,
          [pauta_id || turno_id]
        );
        
        console.log('POST /api/turnos/inasistencia - Payload recibido:', {
          pauta_id: pauta_id || turno_id,
          falta_sin_aviso,
          motivo,
          cobertura_guardia_id: guardiaReemplazoId,
          con_cobertura: con_cobertura || !!guardiaReemplazoId
        });
        console.log('Respuesta:', rows[0]);
        
        return NextResponse.json(rows[0] ?? null);
      }
    } finally {
      client.release?.();
    }
  } catch (err:any) {
    console.error('[inasistencia] error completo:', err);
    console.error('[inasistencia] stack:', err?.stack);
    return new Response(err?.message ?? 'error', { status: 500 });
  }
});