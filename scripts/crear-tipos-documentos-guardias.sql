-- Script para crear tipos de documentos básicos para guardias
-- Ejecutar este script si no existen tipos de documentos para el módulo 'guardias'

-- Verificar si ya existen tipos para guardias
DO $$
BEGIN
    -- Solo insertar si no existen tipos para guardias
    IF NOT EXISTS (SELECT 1 FROM tipos_documentos WHERE modulo = 'guardias') THEN
        
        -- Insertar tipos básicos de documentos para guardias
        INSERT INTO tipos_documentos (id, modulo, nombre, requiere_vencimiento, dias_antes_alarma, creado_en) VALUES
        (gen_random_uuid(), 'guardias', 'Carnet de Identidad', false, 0, NOW()),
        (gen_random_uuid(), 'guardias', 'Certificado de Antecedentes', true, 30, NOW()),
        (gen_random_uuid(), 'guardias', 'Certificado de Salud', true, 90, NOW()),
        (gen_random_uuid(), 'guardias', 'Contrato de Trabajo', false, 0, NOW()),
        (gen_random_uuid(), 'guardias', 'Certificado de Capacitación', true, 365, NOW()),
        (gen_random_uuid(), 'guardias', 'Licencia de Conducir', true, 60, NOW()),
        (gen_random_uuid(), 'guardias', 'Certificado de Primeros Auxilios', true, 730, NOW()),
        (gen_random_uuid(), 'guardias', 'Certificado de Manejo de Extintores', true, 730, NOW()),
        (gen_random_uuid(), 'guardias', 'Certificado de Seguridad Ocupacional', true, 365, NOW()),
        (gen_random_uuid(), 'guardias', 'Otros Documentos', false, 0, NOW());
        
        RAISE NOTICE 'Tipos de documentos para guardias creados exitosamente';
    ELSE
        RAISE NOTICE 'Ya existen tipos de documentos para guardias';
    END IF;
END $$;

-- Mostrar los tipos creados
SELECT modulo, nombre, requiere_vencimiento, dias_antes_alarma 
FROM tipos_documentos 
WHERE modulo = 'guardias' 
ORDER BY nombre; 