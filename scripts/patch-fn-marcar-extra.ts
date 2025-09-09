#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function patchFnMarcarExtra() {
  console.log('🔧 Actualizando función as_turnos.fn_marcar_extra...');
  try {
    await query(`
      DROP FUNCTION IF EXISTS as_turnos.fn_marcar_extra(date, uuid, uuid, uuid, uuid, text, text);
      CREATE OR REPLACE FUNCTION as_turnos.fn_marcar_extra(
          p_fecha date,
          p_instalacion_id uuid,
          p_rol_id uuid,
          p_puesto_id uuid,
          p_cobertura_guardia_id uuid,
          p_origen text,
          p_actor_ref text
      )
      RETURNS TABLE (
          ok boolean,
          updated_pauta_id bigint
      )
      LANGUAGE plpgsql
      AS $$
      DECLARE
          v_pauta_id BIGINT;
          v_has_turnos_extras BOOLEAN := FALSE;
      BEGIN
          -- Buscar la pauta del día y puesto (usa make_date)
          SELECT id INTO v_pauta_id
          FROM public.as_turnos_pauta_mensual
          WHERE make_date(anio, mes, dia) = p_fecha
            AND puesto_id = p_puesto_id
          ORDER BY id DESC
          LIMIT 1;

          IF NOT FOUND THEN
              RETURN QUERY SELECT FALSE, NULL::bigint;
              RETURN;
          END IF;

          -- Actualizar como asistido con cobertura
          UPDATE public.as_turnos_pauta_mensual
          SET 
              estado = 'trabajado',
              estado_ui = 'asistido',
              meta = COALESCE(meta, '{}'::jsonb) || 
                     jsonb_build_object(
                       'cobertura_guardia_id', p_cobertura_guardia_id::text,
                       'origen', p_origen,
                       'actor_ref', p_actor_ref,
                       'action', 'marcar_extra',
                       'ts', NOW()::text
                     ),
              updated_at = NOW()
          WHERE id = v_pauta_id;

          -- Verificar existencia de tabla turnos_extras
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema='public' AND table_name='turnos_extras'
          ) INTO v_has_turnos_extras;

          IF v_has_turnos_extras THEN
            BEGIN
              INSERT INTO public.turnos_extras 
                (id, extra_uid, instalacion_id, rol_id, puesto_id, guardia_trabajo_id, origen)
              VALUES 
                (gen_random_uuid(), encode(sha256(random()::text::bytea),'hex'), 
                 p_instalacion_id, p_rol_id, p_puesto_id, p_cobertura_guardia_id, p_origen);
            EXCEPTION WHEN OTHERS THEN
              NULL;
            END;
          END IF;

          RETURN QUERY SELECT TRUE, v_pauta_id;
      END;
      $$;
    `);
    console.log('✅ fn_marcar_extra actualizada (usa make_date y es tolerante a faltas de columnas)');
  } catch (err) {
    console.error('❌ Error actualizando fn_marcar_extra:', err);
    process.exit(1);
  }
  process.exit(0);
}

patchFnMarcarExtra();
