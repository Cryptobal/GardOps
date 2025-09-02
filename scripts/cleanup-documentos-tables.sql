-- ============================================
-- LIMPIEZA DEFINITIVA DE TABLAS DE DOCUMENTOS
-- ============================================

-- 1. Primero, arreglar el constraint que está mal
DO $$
BEGIN
    -- Si el constraint existe y apunta a la tabla incorrecta, eliminarlo
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'documentos_tipo_documento_id_fkey'
        AND conrelid = 'documentos'::regclass
    ) THEN
        ALTER TABLE documentos DROP CONSTRAINT documentos_tipo_documento_id_fkey;
        RAISE NOTICE '✅ Constraint incorrecto eliminado';
    END IF;
    
    -- Crear el constraint correcto
    ALTER TABLE documentos 
    ADD CONSTRAINT documentos_tipo_documento_id_fkey 
    FOREIGN KEY (tipo_documento_id) 
    REFERENCES documentos_tipos(id);
    
    RAISE NOTICE '✅ Constraint correcto creado';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '⚠️ El constraint ya existe';
END $$;

-- 2. Eliminar tablas viejas que ya no se usan (están vacías)
DROP TABLE IF EXISTS documentos_clientes CASCADE;
DROP TABLE IF EXISTS documentos_guardias CASCADE;
DROP TABLE IF EXISTS documentos_instalacion CASCADE;
DROP TABLE IF EXISTS documentos_postulacion CASCADE;

-- 3. Eliminar tablas de tipos duplicadas
DROP TABLE IF EXISTS tipos_documentos CASCADE;
DROP TABLE IF EXISTS tipos_documentos_postulacion CASCADE;

-- 4. Verificar que solo queden las tablas correctas
DO $$
DECLARE
    tabla_count INT;
BEGIN
    SELECT COUNT(*) INTO tabla_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('documentos', 'documentos_tipos');
    
    IF tabla_count = 2 THEN
        RAISE NOTICE '✅ LIMPIEZA COMPLETA: Solo quedan las tablas correctas (documentos y documentos_tipos)';
    ELSE
        RAISE WARNING '⚠️ Verificar: deberían quedar solo 2 tablas';
    END IF;
END $$;

-- 5. Mostrar estructura final
SELECT 
    'TABLAS DE DOCUMENTOS DESPUÉS DE LIMPIEZA:' as info;
    
SELECT 
    table_name,
    'OK' as estado
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%documento%'
ORDER BY table_name;

-- 6. Verificar el constraint final
SELECT 
    'CONSTRAINT FINAL:' as info;
    
SELECT 
    conname,
    pg_get_constraintdef(oid) as definition,
    confrelid::regclass as referenced_table
FROM pg_constraint 
WHERE conrelid = 'documentos'::regclass 
AND conname LIKE '%tipo_documento_id%';
