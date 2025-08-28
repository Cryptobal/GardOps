-- =====================================================
-- SCRIPT PARA ELIMINAR TABLA sueldo_valor_uf
-- Ya no es necesaria porque usamos la API de la CMF
-- =====================================================

-- 1. Eliminar función que usa la tabla
DROP FUNCTION IF EXISTS obtener_valor_uf(DATE);

-- 2. Eliminar índice de la tabla
DROP INDEX IF EXISTS idx_sueldo_uf_fecha;

-- 3. Eliminar la tabla
DROP TABLE IF EXISTS sueldo_valor_uf;

-- 4. Verificar que se eliminó correctamente
SELECT 'Tabla sueldo_valor_uf eliminada correctamente' as resultado;

