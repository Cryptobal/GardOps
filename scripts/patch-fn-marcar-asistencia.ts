#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function patchFnMarcarAsistencia() {
  console.log('🔧 Actualizando as_turnos.fn_marcar_asistencia (mapear inasistencia) ...');
  try {
    await query(`
      DROP FUNCTION IF EXISTS as_turnos.fn_marcar_asistencia(bigint, text, jsonb, text);
      CREATE OR REPLACE FUNCTION as_turnos.fn_marcar_asistencia(
          p_pauta_id bigint,
          p_estado text,
          p_meta jsonb,
          p_actor_ref text
      )
      RETURNS TABLE (
          ok boolean,
          pauta_id bigint,
          estado text
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
          -- Actualizar la pauta
          UPDATE public.as_turnos_pauta_mensual
          SET 
              estado = COALESCE(p_estado, 'trabajado'),
              estado_ui = CASE
                WHEN (COALESCE(p_meta,'{}'::jsonb)->>'cobertura_guardia_id') IS NOT NULL THEN 'asistido'
                WHEN (COALESCE(p_meta,'{}'::jsonb)->>'estado_ui') = 'reemplazo' THEN 'reemplazo'
                WHEN p_estado = 'sin_cobertura' THEN 'sin_cobertura'
                WHEN p_estado = 'inasistencia' THEN 'inasistencia'
                ELSE 'asistido'
              END,
              meta = COALESCE(meta, '{}'::jsonb) || 
                     COALESCE(p_meta, '{}'::jsonb) || 
                     jsonb_build_object(
                         'marcado_por', p_actor_ref,
                         'marcado_ts', NOW()::text,
                         'action', 'marcar_asistencia'
                     ),
              updated_at = NOW()
          WHERE id = p_pauta_id;
          
          IF NOT FOUND THEN
              RETURN QUERY SELECT 
                  FALSE,
                  p_pauta_id,
                  'error: Pauta no encontrada'::TEXT;
              RETURN;
          END IF;
          
          -- Devolver el estado final
          RETURN QUERY 
          SELECT 
              TRUE,
              p_pauta_id,
              (SELECT estado_ui FROM public.as_turnos_pauta_mensual pm WHERE pm.id = p_pauta_id)::TEXT;
      END;
      $$;
    `);
    console.log('✅ fn_marcar_asistencia actualizada');
  } catch (err) {
    console.error('❌ Error actualizando fn_marcar_asistencia:', err);
    process.exit(1);
  }
  process.exit(0);
}

patchFnMarcarAsistencia();
