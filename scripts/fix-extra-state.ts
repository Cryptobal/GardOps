#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function fixExtraState() {
  console.log('🔧 Corrigiendo problema con estado EXTRA\n');
  
  try {
    // 1. Primero corregir los registros existentes con estado 'extra'
    console.log('1️⃣ Corrigiendo registros con estado_ui = extra...');
    const updateResult = await query(`
      UPDATE as_turnos_pauta_mensual
      SET estado_ui = CASE
        WHEN meta->>'cobertura_guardia_id' IS NOT NULL THEN 'asistido'
        ELSE 'sin_cobertura'
      END
      WHERE estado_ui = 'extra'
      RETURNING id, estado_ui
    `);
    
    console.log(`  ✅ Corregidos ${updateResult.rows.length} registros`);
    updateResult.rows.forEach((r: any) => {
      console.log(`    ID ${r.id} -> estado_ui: ${r.estado_ui}`);
    });
    
    // 2. Actualizar la función fn_marcar_extra para que no establezca estado_ui = 'extra'
    console.log('\n2️⃣ Actualizando función fn_marcar_extra...');
    
    // Eliminar la función existente
    await query('DROP FUNCTION IF EXISTS as_turnos.fn_marcar_extra(date, uuid, uuid, uuid, uuid, text, text)');
    
    // Recrear la función corregida
    await query(`
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
          extra_uid text
      )
      LANGUAGE plpgsql
      AS $$
      DECLARE
          v_extra_uid TEXT;
          v_pauta_record RECORD;
      BEGIN
          -- Generar UID único para el turno extra
          v_extra_uid := encode(sha256((p_fecha::text || p_instalacion_id::text || 
                                        p_rol_id::text || p_puesto_id::text || 
                                        p_cobertura_guardia_id::text || NOW()::text)::bytea), 'hex');
          
          -- Buscar si existe una pauta para este puesto y fecha
          SELECT *
          INTO v_pauta_record
          FROM public.as_turnos_pauta_mensual
          WHERE fecha = p_fecha
            AND puesto_id = p_puesto_id
          LIMIT 1;
          
          IF FOUND THEN
              -- Si existe una pauta, actualizarla
              UPDATE public.as_turnos_pauta_mensual
              SET 
                  estado = 'trabajado',
                  estado_ui = 'asistido',  -- CORREGIDO: Era 'extra', ahora es 'asistido'
                  meta = COALESCE(meta, '{}'::jsonb) || 
                         jsonb_build_object(
                             'tipo', 'turno_extra',
                             'origen', p_origen,
                             'cobertura_guardia_id', p_cobertura_guardia_id::text,
                             'extra_uid', v_extra_uid,
                             'marcado_por', p_actor_ref,
                             'marcado_ts', NOW()::text,
                             'action', 'marcar_extra'
                         ),
                  updated_at = NOW()
              WHERE id = v_pauta_record.id;
          END IF;
          
          -- Insertar en turnos_extras
          BEGIN
              INSERT INTO public.turnos_extras (
                  id,
                  extra_uid,
                  instalacion_id,
                  rol_id,
                  puesto_id,
                  guardia_trabajo_id,
                  origen,
                  meta,
                  created_at
              ) VALUES (
                  gen_random_uuid(),
                  v_extra_uid,
                  p_instalacion_id,
                  p_rol_id,
                  p_puesto_id,
                  p_cobertura_guardia_id,
                  p_origen,
                  jsonb_build_object(
                      'fecha', p_fecha::text,
                      'actor_ref', p_actor_ref,
                      'created_ts', NOW()::text
                  ),
                  NOW()
              );
          EXCEPTION
              WHEN OTHERS THEN
                  -- Si falla la inserción en turnos_extras, continuar
                  NULL;
          END;
          
          -- Registrar en logs (opcional)
          BEGIN
              INSERT INTO public.logs_turnos_extras (
                  turno_extra_id,
                  accion,
                  usuario,
                  tipo,
                  datos_nuevos,
                  fecha
              ) VALUES (
                  gen_random_uuid(),
                  'marcar_extra',
                  p_actor_ref,
                  'turno_extra',
                  jsonb_build_object(
                      'fecha', p_fecha::text,
                      'instalacion_id', p_instalacion_id,
                      'rol_id', p_rol_id,
                      'puesto_id', p_puesto_id,
                      'cobertura_guardia_id', p_cobertura_guardia_id,
                      'origen', p_origen,
                      'extra_uid', v_extra_uid
                  ),
                  NOW()
              );
          EXCEPTION
              WHEN OTHERS THEN
                  -- Ignorar errores de logs
                  NULL;
          END;
          
          RETURN QUERY SELECT 
              TRUE,
              v_extra_uid;
      END;
      $$
    `);
    
    console.log('  ✅ Función fn_marcar_extra actualizada correctamente');
    console.log('     Ahora establece estado_ui = "asistido" en lugar de "extra"');
    
    // 3. Otorgar permisos
    console.log('\n3️⃣ Otorgando permisos...');
    const roles = ['authenticated', 'app_user'];
    for (const role of roles) {
      try {
        await query(`GRANT EXECUTE ON FUNCTION as_turnos.fn_marcar_extra(date, uuid, uuid, uuid, uuid, text, text) TO ${role}`);
        console.log(`  ✅ Permisos otorgados a ${role}`);
      } catch (err) {
        // Ignorar si el rol no existe
      }
    }
    
    console.log('\n✅ Corrección completada exitosamente');
    console.log('📝 Resumen:');
    console.log('  - Registros con estado "extra" corregidos');
    console.log('  - Función fn_marcar_extra actualizada');
    console.log('  - Ya no se creará el estado "extra"');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

fixExtraState();
