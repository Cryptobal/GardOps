-- Script para eliminar el tenant GardOps
-- Ejecutar con cuidado, solo si el tenant está vacío

-- 1. Verificar que GardOps existe y está vacío
SELECT 
  t.id::text as id,
  t.nombre,
  COALESCE((SELECT COUNT(*) FROM clientes c WHERE c.tenant_id = t.id), 0)::int as clientes,
  COALESCE((SELECT COUNT(*) FROM instalaciones i WHERE i.tenant_id = t.id), 0)::int as instalaciones,
  COALESCE((SELECT COUNT(*) FROM guardias g WHERE g.tenant_id = t.id), 0)::int as guardias
FROM tenants t 
WHERE t.nombre = 'GardOps';

-- 2. Si está vacío, eliminar el tenant
-- Descomentar las siguientes líneas solo si el tenant está vacío:

-- DELETE FROM tenants WHERE nombre = 'GardOps';

-- 3. Verificar tenants restantes
SELECT id::text as id, nombre, created_at
FROM tenants 
ORDER BY created_at DESC;
