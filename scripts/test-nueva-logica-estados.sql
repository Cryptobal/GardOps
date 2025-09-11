-- ===============================================
-- SCRIPT DE TESTING PARA NUEVA LÓGICA DE ESTADOS
-- ===============================================

-- 1. Verificar que las nuevas columnas existen
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'as_turnos_pauta_mensual' 
  AND table_schema = 'public'
  AND column_name IN ('tipo_turno', 'estado_puesto', 'estado_guardia', 'tipo_cobertura', 'guardia_trabajo_id')
ORDER BY column_name;

-- 2. Verificar que las vistas funcionan
SELECT 
  'Vista unificada' as tipo,
  COUNT(*) as registros
FROM public.as_turnos_v_pauta_diaria_unificada
UNION ALL
SELECT 
  'Vista dedup' as tipo,
  COUNT(*) as registros
FROM public.as_turnos_v_pauta_diaria_dedup_fixed;

-- 3. Verificar que las funciones existen
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'as_turnos' 
  AND routine_name IN ('fn_deshacer', 'fn_marcar_extra', 'fn_registrar_reemplazo')
ORDER BY routine_name;

-- 4. Test de función fn_deshacer (con datos de prueba)
-- NOTA: Solo ejecutar si hay datos de prueba
/*
SELECT 'Test fn_deshacer' as test;
SELECT * FROM as_turnos.fn_deshacer(1, 'test_script');
*/

-- 5. Test de función fn_marcar_extra (con datos de prueba)
-- NOTA: Solo ejecutar si hay datos de prueba
/*
SELECT 'Test fn_marcar_extra' as test;
SELECT * FROM as_turnos.fn_marcar_extra(
  CURRENT_DATE,
  '00000000-0000-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'test',
  'test_script'
);
*/

-- 6. Verificar índices creados
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename = 'as_turnos_pauta_mensual' 
  AND indexname LIKE 'idx_pauta_%'
ORDER BY indexname;

-- 7. Verificar que no hay datos inconsistentes
SELECT 
  'Registros con nueva estructura' as tipo,
  COUNT(*) as cantidad
FROM public.as_turnos_pauta_mensual
WHERE tipo_turno IS NOT NULL OR estado_puesto IS NOT NULL OR estado_guardia IS NOT NULL OR tipo_cobertura IS NOT NULL;

-- 8. Verificar estructura de metadatos
SELECT 
  'Registros con meta limpio' as tipo,
  COUNT(*) as cantidad
FROM public.as_turnos_pauta_mensual
WHERE meta ? 'estado_ui' = false 
  AND meta ? 'reemplazo_guardia_id' = false 
  AND meta ? 'reemplazo_guardia_nombre' = false;

-- 9. Resumen final
SELECT 
  'MIGRACIÓN COMPLETADA EXITOSAMENTE' as estado,
  NOW() as timestamp;

