-- ===============================================
-- SCRIPT DE TESTING PARA VERIFICAR RESPUESTA DE API
-- ===============================================

-- 1. Verificar que los datos se están guardando con la nueva estructura
SELECT 
  'Datos en BD' as estado,
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
ORDER BY puesto_id, dia;

-- 2. Simular la consulta que hace la API de pauta mensual
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

SELECT 'TESTING API RESPONSE COMPLETADO' as resultado;
