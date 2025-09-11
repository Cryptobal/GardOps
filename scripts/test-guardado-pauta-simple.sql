-- ===============================================
-- SCRIPT DE TESTING SIMPLE PARA GUARDADO DE PAUTA
-- ===============================================

-- 1. Limpiar datos de prueba anteriores
DELETE FROM public.as_turnos_pauta_mensual 
WHERE anio = 2025 AND mes = 9 AND dia BETWEEN 1 AND 3;

-- 2. Insertar datos de prueba con nueva estructura (sin guardias específicos)
INSERT INTO public.as_turnos_pauta_mensual (
  puesto_id, guardia_id, anio, mes, dia, estado,
  tipo_turno, estado_puesto, estado_guardia, tipo_cobertura, guardia_trabajo_id
) VALUES 
-- Día libre
('dc7f452a-de29-4ae7-991d-13c26b25d505', null, 2025, 9, 1, 'libre', 'libre', 'libre', null, null, null),
-- PPC sin cobertura
('ba596beb-d8cb-406c-9d72-8fbc4bda7801', null, 2025, 9, 2, 'planificado', 'planificado', 'ppc', null, 'sin_cobertura', null);

-- 3. Verificar que los datos se insertaron correctamente
SELECT 
  'Datos insertados' as estado,
  puesto_id,
  guardia_id,
  dia,
  estado,
  tipo_turno,
  estado_puesto,
  estado_guardia,
  tipo_cobertura,
  guardia_trabajo_id
FROM public.as_turnos_pauta_mensual 
WHERE anio = 2025 AND mes = 9 AND dia BETWEEN 1 AND 3
ORDER BY dia;

-- 4. Verificar que las vistas funcionan con los nuevos datos
SELECT 
  'Vista unificada' as tipo,
  COUNT(*) as registros
FROM public.as_turnos_v_pauta_diaria_unificada
WHERE fecha = '2025-09-01';

-- 5. Test de función fn_deshacer con datos de prueba
SELECT 'Test fn_deshacer' as test;
SELECT * FROM as_turnos.fn_deshacer(
  (SELECT id FROM public.as_turnos_pauta_mensual WHERE anio = 2025 AND mes = 9 AND dia = 2 LIMIT 1),
  'test_script'
);

-- 6. Verificar que el deshacer funcionó correctamente
SELECT 
  'Después del deshacer' as estado,
  puesto_id,
  guardia_id,
  dia,
  estado,
  tipo_turno,
  estado_puesto,
  estado_guardia,
  tipo_cobertura,
  guardia_trabajo_id
FROM public.as_turnos_pauta_mensual 
WHERE anio = 2025 AND mes = 9 AND dia = 2;

-- 7. Limpiar datos de prueba
DELETE FROM public.as_turnos_pauta_mensual 
WHERE anio = 2025 AND mes = 9 AND dia BETWEEN 1 AND 3;

SELECT 'TESTING COMPLETADO EXITOSAMENTE' as resultado;
