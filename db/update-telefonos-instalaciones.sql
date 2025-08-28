-- Actualizar teléfonos de prueba en instalaciones
-- Formato: 9 dígitos para números celulares chilenos

UPDATE instalaciones 
SET telefono = '912345678' 
WHERE nombre = 'A TEST 33';

UPDATE instalaciones 
SET telefono = '987654321' 
WHERE nombre = 'A Test';

UPDATE instalaciones 
SET telefono = '945678901' 
WHERE nombre = 'A Test 1';

UPDATE instalaciones 
SET telefono = '923456789' 
WHERE nombre = 'Pine';

UPDATE instalaciones 
SET telefono = '934567890' 
WHERE nombre = 'Tattersall Antofagasta';

-- Mostrar las instalaciones actualizadas
SELECT id, nombre, telefono 
FROM instalaciones 
WHERE telefono IS NOT NULL 
ORDER BY nombre;
