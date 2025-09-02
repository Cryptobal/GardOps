-- ============================================
-- AGREGAR TIPOS DE DOCUMENTOS PARA GUARDIAS
-- ============================================

-- Primero verificamos que la tabla documentos_tipos existe
DO $$
BEGIN
    -- Actualizar OS10 existente para que sea Certificado OS10 con vencimiento
    UPDATE documentos_tipos 
    SET nombre = 'Certificado OS10',
        requiere_vencimiento = true,
        dias_antes_alarma = 30
    WHERE modulo = 'guardias' AND (nombre = 'OS10' OR nombre = 'Certificado OS10');

    -- Insertar los demás tipos de documentos si no existen
    INSERT INTO documentos_tipos (nombre, modulo, requiere_vencimiento, dias_antes_alarma, activo)
    VALUES 
        ('Certificado OS10', 'guardias', true, 30, true),
        ('Carnet Identidad Frontal', 'guardias', false, 0, true),
        ('Carnet Identidad Reverso', 'guardias', false, 0, true),
        ('Certificado Antecedentes', 'guardias', true, 30, true),
        ('Certificado Enseñanza Media', 'guardias', false, 0, true),
        ('Certificado AFP', 'guardias', false, 0, true),
        ('Certificado AFC', 'guardias', false, 0, true),
        ('Certificado FONASA/ISAPRE', 'guardias', false, 0, true),
        ('Contrato de Trabajo', 'guardias', false, 0, true),
        ('Finiquito', 'guardias', false, 0, true),
        ('Certificado Residencia', 'guardias', false, 0, true),
        ('Otro', 'guardias', false, 0, true)
    ON CONFLICT DO NOTHING;

END $$;

-- Verificar que se crearon correctamente
SELECT id, nombre, modulo, requiere_vencimiento, dias_antes_alarma, activo 
FROM documentos_tipos 
WHERE modulo = 'guardias' 
ORDER BY 
    CASE 
        WHEN nombre LIKE '%OS10%' THEN 1
        WHEN nombre LIKE '%Carnet%Frontal%' THEN 2
        WHEN nombre LIKE '%Carnet%Reverso%' THEN 3
        WHEN nombre LIKE '%Antecedentes%' THEN 4
        WHEN nombre LIKE '%Enseñanza%' THEN 5
        WHEN nombre LIKE '%AFP%' THEN 6
        WHEN nombre LIKE '%AFC%' THEN 7
        WHEN nombre LIKE '%FONASA%' THEN 8
        WHEN nombre LIKE '%Contrato%' THEN 9
        WHEN nombre LIKE '%Finiquito%' THEN 10
        WHEN nombre LIKE '%Residencia%' THEN 11
        ELSE 99
    END,
    nombre;
