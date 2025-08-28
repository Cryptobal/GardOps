-- Script para generar datos de prueba para Central de Monitoreo
-- Ejecutar en la base de datos

-- 1. Verificar instalaciones disponibles
SELECT 'Verificando instalaciones...' as info;
SELECT id, nombre, telefono FROM instalaciones LIMIT 5;

-- 2. Verificar guardias disponibles
SELECT 'Verificando guardias...' as info;
SELECT id, nombre, telefono FROM guardias LIMIT 5;

-- 3. Generar llamados de prueba para hoy
INSERT INTO central_llamados (
  instalacion_id,
  programado_para,
  estado,
  contacto_tipo,
  contacto_nombre,
  contacto_telefono,
  tenant_id
)
SELECT 
  i.id as instalacion_id,
  -- Generar llamados cada 2 horas desde las 6 AM hasta las 10 PM
  (CURRENT_DATE + INTERVAL '6 hours' + (generate_series(0, 7) * INTERVAL '2 hours')) as programado_para,
  CASE 
    WHEN (CURRENT_DATE + INTERVAL '6 hours' + (generate_series(0, 7) * INTERVAL '2 hours')) < NOW() THEN 'pendiente'
    ELSE 'pendiente'
  END as estado,
  'instalacion' as contacto_tipo,
  i.nombre as contacto_nombre,
  i.telefono as contacto_telefono,
  i.tenant_id
FROM instalaciones i
WHERE i.tenant_id IS NOT NULL
LIMIT 20
ON CONFLICT DO NOTHING;

-- 4. Generar algunos llamados con diferentes estados
UPDATE central_llamados 
SET estado = 'exitoso',
    ejecutado_en = NOW() - INTERVAL '1 hour',
    observaciones = 'Llamado exitoso de prueba'
WHERE id IN (
  SELECT id FROM central_llamados 
  WHERE estado = 'pendiente' 
  AND programado_para < NOW() - INTERVAL '2 hours'
  LIMIT 5
);

-- 5. Generar algunos llamados urgentes (atrasados)
UPDATE central_llamados 
SET estado = 'pendiente',
    observaciones = 'Llamado atrasado de prueba'
WHERE id IN (
  SELECT id FROM central_llamados 
  WHERE estado = 'pendiente' 
  AND programado_para < NOW() - INTERVAL '30 minutes'
  LIMIT 3
);

-- 6. Verificar datos generados
SELECT 'Verificando datos generados...' as info;
SELECT 
  COUNT(*) as total_llamados,
  COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
  COUNT(CASE WHEN estado = 'exitoso' THEN 1 END) as exitosos,
  COUNT(CASE WHEN programado_para < NOW() THEN 1 END) as atrasados
FROM central_llamados;

-- 7. Mostrar algunos ejemplos
SELECT 
  id,
  instalacion_id,
  programado_para,
  estado,
  contacto_nombre,
  contacto_telefono,
  ejecutado_en
FROM central_llamados 
ORDER BY programado_para 
LIMIT 10;
