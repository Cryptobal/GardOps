-- Agregar soporte multi-tenant a historial_asignaciones_guardias
-- CONSERVADOR - No rompe funcionalidad existente

-- 1. Agregar campo tenant_id (nullable para compatibilidad)
ALTER TABLE historial_asignaciones_guardias 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 2. Crear índice para performance multi-tenant
CREATE INDEX IF NOT EXISTS idx_historial_asig_tenant 
ON historial_asignaciones_guardias(tenant_id);

-- 3. Actualizar registros existentes con tenant_id de los guardias relacionados
-- SEGURO: Solo actualiza registros que no tienen tenant_id
UPDATE historial_asignaciones_guardias ha
SET tenant_id = g.tenant_id
FROM guardias g 
WHERE ha.guardia_id = g.id 
  AND ha.tenant_id IS NULL;

-- 4. Crear función helper para obtener tenant_id del contexto
CREATE OR REPLACE FUNCTION obtener_tenant_id_actual()
RETURNS UUID AS $$
BEGIN
    -- Por ahora devolver el tenant_id fijo de GardOps
    -- En el futuro se puede obtener del contexto de sesión
    RETURN '1397e653-a702-4020-9702-3ae4f3f8b337'::UUID;
END;
$$ LANGUAGE plpgsql;

-- 5. Comentarios para documentar
COMMENT ON COLUMN historial_asignaciones_guardias.tenant_id IS 
'Identificador del tenant para soporte multi-tenant. NULL = datos legacy compatibles.';

COMMENT ON FUNCTION obtener_tenant_id_actual() IS 
'Función helper para obtener tenant_id actual. Actualmente devuelve tenant fijo de GardOps.';
