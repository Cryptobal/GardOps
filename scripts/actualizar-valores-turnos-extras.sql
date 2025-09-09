-- Script para actualizar valores de turno extra en instalaciones
-- Ejecutar en base de datos GardOps

-- Verificar instalaciones actuales
SELECT 
    id,
    nombre,
    valor_turno_extra,
    created_at
FROM instalaciones 
ORDER BY nombre;

-- Actualizar instalaciones con valores de turno extra
UPDATE instalaciones 
SET valor_turno_extra = 30000
WHERE nombre LIKE '%Test%' OR nombre LIKE '%A Test%';

-- Actualizar otras instalaciones con valores diferentes
UPDATE instalaciones 
SET valor_turno_extra = 25000
WHERE nombre LIKE '%Centro%' OR nombre LIKE '%Mall%';

UPDATE instalaciones 
SET valor_turno_extra = 35000
WHERE nombre LIKE '%Industrial%' OR nombre LIKE '%Fábrica%';

-- Verificar cambios
SELECT 
    id,
    nombre,
    valor_turno_extra,
    updated_at
FROM instalaciones 
WHERE valor_turno_extra IS NOT NULL AND valor_turno_extra > 0
ORDER BY nombre;

-- Verificar turnos extras existentes
SELECT 
    te.id,
    te.guardia_id,
    g.nombre || ' ' || g.apellido_paterno as guardia_nombre,
    te.instalacion_id,
    i.nombre as instalacion_nombre,
    i.valor_turno_extra as valor_instalacion,
    te.valor as valor_turno_extra,
    te.estado,
    te.pagado,
    te.created_at
FROM turnos_extras te
JOIN guardias g ON g.id = te.guardia_id
JOIN instalaciones i ON i.id = te.instalacion_id
ORDER BY te.created_at DESC
LIMIT 5; 