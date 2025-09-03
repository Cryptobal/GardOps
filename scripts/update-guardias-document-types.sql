-- ============================================
-- ACTUALIZAR TIPOS DE DOCUMENTOS PARA GUARDIAS
-- ============================================
-- Este script actualiza los tipos de documentos para guardias
-- con nombres predefinidos y configuración de vencimientos

BEGIN;

-- 1. Desactivar tipos existentes para guardias
UPDATE documentos_tipos 
SET activo = false 
WHERE modulo = 'guardias';

-- 2. Insertar/actualizar tipos de documentos para guardias con nombres predefinidos
INSERT INTO documentos_tipos (id, modulo, nombre, requiere_vencimiento, dias_antes_alarma, activo, creado_en)
VALUES 
    -- Documentos de identidad (sin vencimiento)
    (gen_random_uuid(), 'guardias', 'Carnet Identidad Frontal', false, 0, true, NOW()),
    (gen_random_uuid(), 'guardias', 'Carnet Identidad Reverso', false, 0, true, NOW()),
    
    -- Certificados de salud y antecedentes (con vencimiento)
    (gen_random_uuid(), 'guardias', 'Certificado OS10', true, 30, true, NOW()),
    (gen_random_uuid(), 'guardias', 'Certificado Antecedentes', true, 30, true, NOW()),
    
    -- Certificados de estudios (sin vencimiento)
    (gen_random_uuid(), 'guardias', 'Certificado Enseñanza Media', false, 0, true, NOW()),
    
    -- Certificados previsionales (sin vencimiento)
    (gen_random_uuid(), 'guardias', 'Certificado AFP', false, 0, true, NOW()),
    (gen_random_uuid(), 'guardias', 'Certificado AFC', false, 0, true, NOW()),
    (gen_random_uuid(), 'guardias', 'Certificado FONASA/ISAPRE', false, 0, true, NOW()),
    
    -- Documentos laborales (sin vencimiento)
    (gen_random_uuid(), 'guardias', 'Contrato de Trabajo', false, 0, true, NOW()),
    (gen_random_uuid(), 'guardias', 'Finiquito', false, 0, true, NOW()),
    
    -- Otros documentos importantes
    (gen_random_uuid(), 'guardias', 'Certificado Residencia', false, 0, true, NOW()),
    (gen_random_uuid(), 'guardias', 'Licencia de Conducir', true, 60, true, NOW()),
    (gen_random_uuid(), 'guardias', 'Certificado de Capacitación', true, 365, true, NOW()),
    (gen_random_uuid(), 'guardias', 'Certificado de Primeros Auxilios', true, 730, true, NOW()),
    (gen_random_uuid(), 'guardias', 'Certificado de Manejo de Extintores', true, 730, true, NOW()),
    (gen_random_uuid(), 'guardias', 'Certificado de Seguridad Ocupacional', true, 365, true, NOW()),
    
    -- Documento genérico para otros casos
    (gen_random_uuid(), 'guardias', 'Otro Documento', false, 0, true, NOW())
ON CONFLICT (modulo, nombre) 
DO UPDATE SET 
    requiere_vencimiento = EXCLUDED.requiere_vencimiento,
    dias_antes_alarma = EXCLUDED.dias_antes_alarma,
    activo = EXCLUDED.activo,
    updated_at = NOW();

-- 3. Verificar que se crearon correctamente
SELECT 
    id, 
    nombre, 
    modulo, 
    requiere_vencimiento, 
    dias_antes_alarma, 
    activo,
    CASE 
        WHEN requiere_vencimiento THEN '⚠️ Con vencimiento'
        ELSE '✅ Sin vencimiento'
    END as estado_vencimiento
FROM documentos_tipos 
WHERE modulo = 'guardias' AND activo = true
ORDER BY 
    CASE 
        WHEN nombre LIKE '%Carnet%' THEN 1
        WHEN nombre LIKE '%OS10%' THEN 2
        WHEN nombre LIKE '%Antecedentes%' THEN 3
        WHEN nombre LIKE '%Enseñanza%' THEN 4
        WHEN nombre LIKE '%AFP%' THEN 5
        WHEN nombre LIKE '%AFC%' THEN 6
        WHEN nombre LIKE '%FONASA%' THEN 7
        WHEN nombre LIKE '%Contrato%' THEN 8
        WHEN nombre LIKE '%Finiquito%' THEN 9
        WHEN nombre LIKE '%Residencia%' THEN 10
        WHEN nombre LIKE '%Licencia%' THEN 11
        WHEN nombre LIKE '%Capacitación%' THEN 12
        WHEN nombre LIKE '%Primeros Auxilios%' THEN 13
        WHEN nombre LIKE '%Extintores%' THEN 14
        WHEN nombre LIKE '%Seguridad Ocupacional%' THEN 15
        ELSE 99
    END,
    nombre;

-- 4. Mostrar resumen de la configuración
SELECT 
    'Resumen de tipos de documentos para guardias' as titulo,
    COUNT(*) as total_tipos,
    COUNT(CASE WHEN requiere_vencimiento THEN 1 END) as con_vencimiento,
    COUNT(CASE WHEN NOT requiere_vencimiento THEN 1 END) as sin_vencimiento
FROM documentos_tipos 
WHERE modulo = 'guardias' AND activo = true;

COMMIT;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 
-- 1. CERTIFICADO OS10: Vence cada 30 días (requiere renovación mensual)
-- 2. CERTIFICADO ANTECEDENTES: Vence cada 30 días
-- 3. LICENCIA DE CONDUCIR: Vence cada 60 días
-- 4. CERTIFICADOS DE CAPACITACIÓN: Vencen cada año
-- 5. CERTIFICADOS DE SEGURIDAD: Vencen cada 2 años
-- 
-- Los nombres están predefinidos para que cuando se suba un documento:
-- - El usuario vea exactamente qué tipo de documento está subiendo
-- - Se mantenga consistencia en la nomenclatura
-- - Se facilite la búsqueda y filtrado
-- 
-- ============================================
