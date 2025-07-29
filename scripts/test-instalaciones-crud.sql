-- Script de prueba para CRUD de instalaciones
-- Este script prueba crear, leer, actualizar y eliminar instalaciones

-- 1. INSERTAR una nueva instalación de prueba
INSERT INTO instalaciones (
  nombre, 
  cliente_id, 
  direccion, 
  latitud, 
  longitud, 
  ciudad, 
  comuna, 
  valor_turno_extra, 
  estado
) VALUES (
  'Instalación de Prueba CRUD',
  (SELECT id FROM clientes LIMIT 1), -- Usar el primer cliente disponible
  'Av. Providencia 1234, Providencia, Chile',
  -33.4489,
  -70.6693,
  'Santiago',
  'Providencia',
  50000,
  'Activo'
) RETURNING id, nombre, ciudad, comuna;

-- 2. LEER la instalación creada
SELECT 
  i.id,
  i.nombre,
  c.nombre as cliente_nombre,
  i.direccion,
  i.ciudad,
  i.comuna,
  i.valor_turno_extra,
  i.estado
FROM instalaciones i
LEFT JOIN clientes c ON i.cliente_id = c.id
WHERE i.nombre = 'Instalación de Prueba CRUD';

-- 3. ACTUALIZAR la instalación
UPDATE instalaciones 
SET 
  nombre = 'Instalación de Prueba CRUD - Actualizada',
  direccion = 'Av. Las Condes 5678, Las Condes, Chile',
  ciudad = 'Santiago',
  comuna = 'Las Condes',
  valor_turno_extra = 75000,
  updated_at = NOW()
WHERE nombre = 'Instalación de Prueba CRUD'
RETURNING id, nombre, direccion, ciudad, comuna, valor_turno_extra;

-- 4. VERIFICAR la actualización
SELECT 
  i.id,
  i.nombre,
  c.nombre as cliente_nombre,
  i.direccion,
  i.ciudad,
  i.comuna,
  i.valor_turno_extra,
  i.estado,
  i.updated_at
FROM instalaciones i
LEFT JOIN clientes c ON i.cliente_id = c.id
WHERE i.nombre = 'Instalación de Prueba CRUD - Actualizada';

-- 5. ELIMINAR la instalación de prueba
DELETE FROM instalaciones 
WHERE nombre = 'Instalación de Prueba CRUD - Actualizada'
RETURNING id, nombre;

-- 6. VERIFICAR que fue eliminada
SELECT COUNT(*) as total_instalaciones_prueba
FROM instalaciones 
WHERE nombre LIKE '%Instalación de Prueba CRUD%';

-- 7. Mostrar estadísticas generales
SELECT 
  COUNT(*) as total_instalaciones,
  COUNT(CASE WHEN estado = 'Activo' THEN 1 END) as instalaciones_activas,
  COUNT(CASE WHEN estado = 'Inactivo' THEN 1 END) as instalaciones_inactivas,
  COUNT(CASE WHEN ciudad IS NOT NULL THEN 1 END) as con_ciudad,
  COUNT(CASE WHEN comuna IS NOT NULL THEN 1 END) as con_comuna
FROM instalaciones; 