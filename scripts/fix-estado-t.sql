-- Script para corregir registros con estado 'T' a 'trabajado'
-- Este script corrige la inconsistencia en la pauta diaria

-- Verificar cuántos registros tienen estado 'T'
SELECT COUNT(*) as registros_con_estado_T 
FROM as_turnos_pauta_mensual 
WHERE estado = 'T';

-- Actualizar registros con estado 'T' a 'trabajado'
UPDATE as_turnos_pauta_mensual 
SET estado = 'trabajado', 
    updated_at = NOW()
WHERE estado = 'T';

-- Verificar que no queden registros con estado 'T'
SELECT COUNT(*) as registros_con_estado_T_despues 
FROM as_turnos_pauta_mensual 
WHERE estado = 'T';

-- Verificar registros actualizados
SELECT COUNT(*) as registros_actualizados 
FROM as_turnos_pauta_mensual 
WHERE estado = 'trabajado' 
AND updated_at >= NOW() - INTERVAL '1 minute'; 