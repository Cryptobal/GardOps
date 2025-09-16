import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/app/api/_middleware/withPermission';
import { getClient } from '@/lib/database';
import { getCurrentUserRef } from '@/lib/auth';
import { unstable_noStore as noStore } from 'next/cache';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
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
        // Usar actualización directa con nuevos campos
        // Actualizar tanto guardia_id como guardia_trabajo_id para satisfacer el trigger
        await client.query(
          `UPDATE public.as_turnos_pauta_mensual
           SET tipo_cobertura = 'turno_extra',
               guardia_id = $2::uuid,
               guardia_trabajo_id = $2::uuid,
               meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object('cobertura_guardia_id', $2::text),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1::bigint`,
          [finalPautaId, finalGuardiaId]
        );
        
        // Luego obtener los datos actualizados
        const { rows } = await client.query(
          `SELECT pm.id, make_date(pm.anio, pm.mes, pm.dia) as fecha, pm.tipo_cobertura, pm.guardia_trabajo_id
           FROM public.as_turnos_pauta_mensual pm
           WHERE pm.id = $1::bigint`,
          [finalPautaId]
        );
        
        logger.debug('POST /api/turnos/ppc/cubrir - Payload recibido:', {
          turno_id: finalPautaId,
          cobertura_guardia_id: finalGuardiaId
        });
        logger.debug('Respuesta:', rows[0]);
        
        // Crear turno extra automáticamente
        try {
          const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/pauta-diaria/turno-extra/sync-coberturas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (syncResponse.ok) {
            logger.debug('✅ Turno extra sincronizado automáticamente');
          }
        } catch (error) {
          logger.warn(' No se pudo sincronizar turno extra:', error);
        }
        
        return NextResponse.json(rows[0] ?? null);
      } else {
        // Fallback: actualizar directamente con nuevos campos
        // Actualizar tanto guardia_id como guardia_trabajo_id para satisfacer el trigger
        await client.query(
          `UPDATE public.as_turnos_pauta_mensual
           SET tipo_cobertura = 'turno_extra',
               guardia_id = $2::uuid,
               guardia_trabajo_id = $2::uuid,
               meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object('cobertura_guardia_id', $2::text),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1::bigint`,
          [finalPautaId, finalGuardiaId]
        );
        
        const { rows } = await client.query(
          `SELECT id, make_date(anio, mes, dia) as fecha, tipo_cobertura, guardia_trabajo_id
           FROM public.as_turnos_pauta_mensual
           WHERE id = $1::bigint`,
          [finalPautaId]
        );
        
        logger.debug('POST /api/turnos/ppc/cubrir - Payload recibido:', {
          turno_id: finalPautaId,
          cobertura_guardia_id: finalGuardiaId
        });
        logger.debug('Respuesta:', rows[0]);
        
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