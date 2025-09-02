-- Script para corregir el foreign key de documentos.tipo_documento_id
-- Ejecutar en Neon/PostgreSQL

-- 1. Verificar el constraint actual
SELECT 
  conname,
  contype,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'documentos'::regclass 
  AND conname LIKE '%tipo_documento%';

-- 2. Eliminar el foreign key constraint incorrecto
ALTER TABLE documentos 
DROP CONSTRAINT IF EXISTS documentos_tipo_documento_id_fkey;

-- 3. Crear el foreign key constraint correcto apuntando a documentos_tipos
ALTER TABLE documentos 
ADD CONSTRAINT documentos_tipo_documento_id_fkey 
FOREIGN KEY (tipo_documento_id) 
REFERENCES documentos_tipos(id);

-- 4. Verificar que el constraint se creó correctamente
SELECT 
  conname,
  contype,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'documentos'::regclass 
  AND conname LIKE '%tipo_documento%';

-- 5. Verificar que los datos son consistentes
SELECT 
  'Documentos sin tipo válido' as check_type,
  COUNT(*) as count
FROM documentos d
LEFT JOIN documentos_tipos dt ON d.tipo_documento_id = dt.id
WHERE d.tipo_documento_id IS NOT NULL 
  AND dt.id IS NULL

UNION ALL

SELECT 
  'Tipos disponibles en documentos_tipos' as check_type,
  COUNT(*) as count
FROM documentos_tipos

UNION ALL

SELECT 
  'Documentos totales' as check_type,
  COUNT(*) as count
FROM documentos;
