-- =====================================================
-- DIAGNÓSTICO COMPLETO - CENTRAL DE MONITOREO
-- =====================================================

-- 1. Verificar configuración de Bodega Santa Amalia
SELECT '1️⃣ CONFIGURACIÓN DE BODEGA SANTA AMALIA' as seccion;

SELECT 
  i.id,
  i.nombre,
  i.telefono,
  cci.habilitado,
  cci.intervalo_minutos,
  cci.ventana_inicio,
  cci.ventana_fin,
  cci.modo,
  cci.mensaje_template
FROM instalaciones i
LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
WHERE i.nombre ILIKE '%bodega%' OR i.nombre ILIKE '%santa%' OR i.nombre ILIKE '%amalia%';

-- 2. Verificar puestos operativos activos (usar el ID de la instalación encontrada arriba)
SELECT '2️⃣ PUESTOS OPERATIVOS ACTIVOS' as seccion;

-- Reemplazar 'INSTALACION_ID_AQUI' con el ID real de Bodega Santa Amalia
SELECT 
  po.id,
  po.nombre_puesto,
  po.activo,
  rs.nombre as rol_nombre
FROM as_turnos_puestos_operativos po
INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
WHERE po.instalacion_id = (
  SELECT i.id FROM instalaciones i 
  WHERE i.nombre ILIKE '%bodega%' OR i.nombre ILIKE '%santa%' OR i.nombre ILIKE '%amalia%'
  LIMIT 1
);

-- 3. Verificar pauta mensual para hoy y mañana
SELECT '3️⃣ PAUTA MENSUAL - HOY Y MAÑANA' as seccion;

SELECT 
  pm.id,
  pm.anio,
  pm.mes,
  pm.dia,
  pm.estado,
  pm.guardia_id,
  pm.puesto_id,
  po.nombre_puesto,
  g.nombre as guardia_nombre
FROM as_turnos_pauta_mensual pm
INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id
LEFT JOIN guardias g ON pm.guardia_id = g.id
WHERE po.instalacion_id = (
  SELECT i.id FROM instalaciones i 
  WHERE i.nombre ILIKE '%bodega%' OR i.nombre ILIKE '%santa%' OR i.nombre ILIKE '%amalia%'
  LIMIT 1
)
  AND (
    (pm.anio = EXTRACT(YEAR FROM CURRENT_DATE) AND pm.mes = EXTRACT(MONTH FROM CURRENT_DATE) AND pm.dia = EXTRACT(DAY FROM CURRENT_DATE)) OR
    (pm.anio = EXTRACT(YEAR FROM CURRENT_DATE + 1) AND pm.mes = EXTRACT(MONTH FROM CURRENT_DATE + 1) AND pm.dia = EXTRACT(DAY FROM CURRENT_DATE + 1))
  )
ORDER BY pm.anio, pm.mes, pm.dia;

-- 4. Verificar estados específicos
SELECT '4️⃣ ESTADOS ENCONTRADOS' as seccion;

SELECT 
  pm.estado,
  COUNT(*) as cantidad
FROM as_turnos_pauta_mensual pm
INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id
WHERE po.instalacion_id = (
  SELECT i.id FROM instalaciones i 
  WHERE i.nombre ILIKE '%bodega%' OR i.nombre ILIKE '%santa%' OR i.nombre ILIKE '%amalia%'
  LIMIT 1
)
  AND (
    (pm.anio = EXTRACT(YEAR FROM CURRENT_DATE) AND pm.mes = EXTRACT(MONTH FROM CURRENT_DATE) AND pm.dia = EXTRACT(DAY FROM CURRENT_DATE)) OR
    (pm.anio = EXTRACT(YEAR FROM CURRENT_DATE + 1) AND pm.mes = EXTRACT(MONTH FROM CURRENT_DATE + 1) AND pm.dia = EXTRACT(DAY FROM CURRENT_DATE + 1))
  )
GROUP BY pm.estado;

-- 5. Verificar la vista central_v_llamados_automaticos
SELECT '5️⃣ VISTA CENTRAL_V_LLAMADOS_AUTOMATICOS' as seccion;

SELECT 
  COUNT(*) as total_llamados,
  COUNT(CASE WHEN DATE(programado_para) = CURRENT_DATE THEN 1 END) as llamados_hoy,
  COUNT(CASE WHEN DATE(programado_para) = CURRENT_DATE + 1 THEN 1 END) as llamados_mañana
FROM central_v_llamados_automaticos
WHERE instalacion_id = (
  SELECT i.id FROM instalaciones i 
  WHERE i.nombre ILIKE '%bodega%' OR i.nombre ILIKE '%santa%' OR i.nombre ILIKE '%amalia%'
  LIMIT 1
);

-- 6. Verificar llamados específicos para hoy
SELECT '6️⃣ LLAMADOS PARA HOY' as seccion;

SELECT 
  programado_para,
  instalacion_nombre,
  estado_llamado,
  es_urgente,
  es_actual,
  es_proximo
FROM central_v_llamados_automaticos
WHERE instalacion_id = (
  SELECT i.id FROM instalaciones i 
  WHERE i.nombre ILIKE '%bodega%' OR i.nombre ILIKE '%santa%' OR i.nombre ILIKE '%amalia%'
  LIMIT 1
)
  AND DATE(programado_para) = CURRENT_DATE
ORDER BY programado_para
LIMIT 10;

-- 7. Verificar la consulta exacta que usa la API
SELECT '7️⃣ CONSULTA EXACTA DE LA API' as seccion;

SELECT 
  id,
  instalacion_id,
  programado_para::text as programado_para,
  estado_llamado as estado,
  instalacion_nombre,
  es_urgente,
  es_actual,
  es_proximo
FROM central_v_llamados_automaticos
WHERE DATE(programado_para) = CURRENT_DATE
  AND instalacion_id = (
    SELECT i.id FROM instalaciones i 
    WHERE i.nombre ILIKE '%bodega%' OR i.nombre ILIKE '%santa%' OR i.nombre ILIKE '%amalia%'
    LIMIT 1
  )
ORDER BY programado_para ASC;

-- 8. Verificar condiciones de la vista paso a paso
SELECT '8️⃣ CONDICIONES DE LA VISTA PASO A PASO' as seccion;

-- Condición 1: Puestos activos
SELECT 
  'Puestos activos' as condicion,
  COUNT(*) as resultado
FROM as_turnos_puestos_operativos po
WHERE po.instalacion_id = (
  SELECT i.id FROM instalaciones i 
  WHERE i.nombre ILIKE '%bodega%' OR i.nombre ILIKE '%santa%' OR i.nombre ILIKE '%amalia%'
  LIMIT 1
) AND po.activo = true;

-- Condición 2: Pauta con estado 'planificado'
SELECT 
  'Pauta con estado planificado' as condicion,
  COUNT(*) as resultado
FROM as_turnos_pauta_mensual pm
INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id
WHERE po.instalacion_id = (
  SELECT i.id FROM instalaciones i 
  WHERE i.nombre ILIKE '%bodega%' OR i.nombre ILIKE '%santa%' OR i.nombre ILIKE '%amalia%'
  LIMIT 1
) 
  AND pm.estado = 'planificado'
  AND (
    (pm.anio = EXTRACT(YEAR FROM CURRENT_DATE) AND pm.mes = EXTRACT(MONTH FROM CURRENT_DATE) AND pm.dia = EXTRACT(DAY FROM CURRENT_DATE)) OR
    (pm.anio = EXTRACT(YEAR FROM CURRENT_DATE + 1) AND pm.mes = EXTRACT(MONTH FROM CURRENT_DATE + 1) AND pm.dia = EXTRACT(DAY FROM CURRENT_DATE + 1))
  );

-- Condición 3: Configuración habilitada
SELECT 
  'Configuración completa' as condicion,
  COUNT(*) as resultado
FROM central_config_instalacion cci
WHERE cci.instalacion_id = (
  SELECT i.id FROM instalaciones i 
  WHERE i.nombre ILIKE '%bodega%' OR i.nombre ILIKE '%santa%' OR i.nombre ILIKE '%amalia%'
  LIMIT 1
) 
  AND cci.habilitado = true
  AND cci.intervalo_minutos IS NOT NULL
  AND cci.ventana_inicio IS NOT NULL
  AND cci.ventana_fin IS NOT NULL;

-- 9. Verificar todos los estados posibles en la pauta
SELECT '9️⃣ TODOS LOS ESTADOS EN LA PAUTA' as seccion;

SELECT DISTINCT 
  pm.estado,
  COUNT(*) as cantidad
FROM as_turnos_pauta_mensual pm
INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id
WHERE po.instalacion_id = (
  SELECT i.id FROM instalaciones i 
  WHERE i.nombre ILIKE '%bodega%' OR i.nombre ILIKE '%santa%' OR i.nombre ILIKE '%amalia%'
  LIMIT 1
)
GROUP BY pm.estado
ORDER BY cantidad DESC;

-- 10. Verificar si hay datos en central_llamados (tabla real)
SELECT '🔟 TABLA CENTRAL_LLAMADOS (REAL)' as seccion;

SELECT 
  COUNT(*) as total_llamados_reales,
  COUNT(CASE WHEN DATE(programado_para) = CURRENT_DATE THEN 1 END) as llamados_hoy_reales
FROM central_llamados cl
WHERE cl.instalacion_id = (
  SELECT i.id FROM instalaciones i 
  WHERE i.nombre ILIKE '%bodega%' OR i.nombre ILIKE '%santa%' OR i.nombre ILIKE '%amalia%'
  LIMIT 1
);

