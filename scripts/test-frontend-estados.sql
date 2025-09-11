-- ===============================================
-- SCRIPT DE TESTING PARA FRONTEND DE ESTADOS
-- ===============================================

-- 1. Limpiar datos de prueba anteriores
DELETE FROM public.as_turnos_pauta_mensual 
WHERE anio = 2025 AND mes = 9 AND dia BETWEEN 1 AND 5;

-- 2. Insertar datos de prueba con nueva estructura
INSERT INTO public.as_turnos_pauta_mensual (
  puesto_id, guardia_id, anio, mes, dia, estado,
  tipo_turno, estado_puesto, estado_guardia, tipo_cobertura, guardia_trabajo_id
) VALUES 
-- Día libre
('dc7f452a-de29-4ae7-991d-13c26b25d505', null, 2025, 9, 1, 'libre', 'libre', 'libre', null, null, null),
-- Día planificado con guardia (debería mostrar punto azul)
('dc7f452a-de29-4ae7-991d-13c26b25d505', '123e4567-e89b-12d3-a456-426614174000', 2025, 9, 2, 'planificado', 'planificado', 'asignado', 'asistido', 'guardia_asignado', '123e4567-e89b-12d3-a456-426614174000'),
-- PPC sin cobertura (debería mostrar triángulo rojo)
('ba596beb-d8cb-406c-9d72-8fbc4bda7801', null, 2025, 9, 3, 'planificado', 'planificado', 'ppc', null, 'sin_cobertura', null),
-- PPC con cobertura (debería mostrar TE morado)
('ba596beb-d8cb-406c-9d72-8fbc4bda7801', null, 2025, 9, 4, 'planificado', 'planificado', 'ppc', null, 'turno_extra', '123e4567-e89b-12d3-a456-426614174000');

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
WHERE anio = 2025 AND mes = 9 AND dia BETWEEN 1 AND 5
ORDER BY dia;

-- 4. Simular la consulta que hace la API de pauta mensual
SELECT 
  po.id as puesto_id,
  po.nombre_puesto,
  po.guardia_id,
  po.es_ppc,
  pm.dia,
  pm.estado,
  pm.tipo_turno,
  pm.estado_puesto,
  pm.estado_guardia,
  pm.tipo_cobertura,
  pm.guardia_trabajo_id
FROM as_turnos_puestos_operativos po
LEFT JOIN public.as_turnos_pauta_mensual pm ON po.id = pm.puesto_id 
  AND pm.anio = 2025 AND pm.mes = 9 AND pm.dia BETWEEN 1 AND 5
WHERE po.instalacion_id = '903edee6-6964-42b8-bcc4-14d23d4bbe1b'
  AND po.activo = true
ORDER BY po.nombre_puesto, pm.dia;

-- 5. Limpiar datos de prueba
DELETE FROM public.as_turnos_pauta_mensual 
WHERE anio = 2025 AND mes = 9 AND dia BETWEEN 1 AND 5;

SELECT 'TESTING FRONTEND COMPLETADO' as resultado;
