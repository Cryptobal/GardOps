#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function patchFnDeshacer() {
  console.log('🔧 Actualizando función as_turnos.fn_deshacer...');
  try {
    await query(`
      DROP FUNCTION IF EXISTS as_turnos.fn_deshacer(bigint, text);
      CREATE OR REPLACE FUNCTION as_turnos.fn_deshacer(
          p_pauta_id bigint,
          p_actor_ref text
      )
      RETURNS TABLE (
          ok boolean,
          pauta_id bigint,
          estado text
      )
      LANGUAGE plpgsql
      AS $$
      DECLARE
          v_pauta RECORD;
      BEGIN
          SELECT * INTO v_pauta
          FROM public.as_turnos_pauta_mensual
          WHERE id = p_pauta_id;

          IF NOT FOUND THEN
              RETURN QUERY SELECT FALSE, p_pauta_id, 'error: Pauta no encontrada'::text;
              RETURN;
          END IF;

          UPDATE public.as_turnos_pauta_mensual
          SET 
              estado = 'planificado',
              estado_ui = 'plan',
              meta = (COALESCE(meta, '{}'::jsonb)
                        - 'reemplazo_guardia_id'
                        - 'reemplazo_guardia_nombre'
                        - 'cobertura_guardia_id'
                        - 'cobertura_guardia_nombre'
                        - 'sin_cobertura'
                        - 'motivo'
                        - 'falta_sin_aviso'
                        - 'extra_uid'
                        - 'es_extra'
                        - 'tipo'
                        - 'estado_ui') -- limpiar estado_ui en meta que sobreescribe la vista
                     || jsonb_build_object(
                        'deshacer_actor', p_actor_ref,
                        'deshacer_ts', NOW()::text,
                        'action', 'deshacer'
                     ),
              updated_at = NOW()
          WHERE id = p_pauta_id;

          RETURN QUERY SELECT TRUE, p_pauta_id, 'plan'::text;
      END;
      $$;
    `);
    console.log('✅ fn_deshacer actualizada (estado planificado + limpieza meta.estado_ui)');
  } catch (err) {
    console.error('❌ Error actualizando fn_deshacer:', err);
    process.exit(1);
  }
  process.exit(0);
}

patchFnDeshacer();
