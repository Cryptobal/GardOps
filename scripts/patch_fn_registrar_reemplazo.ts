#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function patchFnRegistrarReemplazo() {
  console.log('🔧 Parchando as_turnos.fn_registrar_reemplazo para evitar ambigüedad de "meta"...');
  try {
    await query(`
      DROP FUNCTION IF EXISTS as_turnos.fn_registrar_reemplazo(bigint, uuid, text, text);
    `);

    await query(`
      CREATE OR REPLACE FUNCTION as_turnos.fn_registrar_reemplazo(
        p_pauta_id bigint,
        p_cobertura_guardia_id uuid,
        p_actor_ref text,
        p_motivo text DEFAULT NULL
      )
      RETURNS TABLE (ok boolean, pauta_id bigint, estado text)
      LANGUAGE plpgsql
      AS $$
      BEGIN
        -- Alias explícito para evitar ambigüedad de columnas
        UPDATE public.as_turnos_pauta_mensual AS pm
        SET 
          estado = 'trabajado',
          estado_ui = 'te',
          meta = COALESCE(pm.meta, '{}'::jsonb) || 
                 jsonb_build_object(
                   'tipo','turno_extra',
                   'te_origen','reemplazo',
                   'cobertura_guardia_id', p_cobertura_guardia_id::text,
                   'motivo', p_motivo,
                   'marcado_por', p_actor_ref,
                   'marcado_ts', NOW()::text,
                   'action','registrar_reemplazo'
                 ),
          updated_at = NOW()
        WHERE pm.id = p_pauta_id;

        IF NOT FOUND THEN
          RETURN QUERY SELECT FALSE, p_pauta_id, 'error: Pauta no encontrada'::text; RETURN;
        END IF;
        RETURN QUERY SELECT TRUE, p_pauta_id, 'te'::text;
      END;$$;
    `);

    console.log('✅ Función recreada correctamente.');
  } catch (e:any) {
    console.error('❌ Error aplicando parche:', e.message || e);
    process.exit(1);
  }
}

patchFnRegistrarReemplazo().then(()=>process.exit(0));
