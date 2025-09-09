WITH expected(resource, action) AS (
  VALUES
  ('clientes','read:list'),('clientes','read:detail'),('clientes','create'),('clientes','update'),('clientes','delete'),('clientes','export'),
  ('instalaciones','read:list'),('instalaciones','read:detail'),('instalaciones','create'),('instalaciones','update'),('instalaciones','delete'),
  ('guardias','read:list'),('guardias','read:detail'),('guardias','create'),('guardias','update'),('guardias','delete'),('guardias','export'),
  ('puestos','read:list'),('puestos','read:detail'),('puestos','create'),('puestos','update'),('puestos','delete'),
  ('pauta_mensual','read:detail'),('pauta_mensual','update'),('pauta_mensual','export'),
  ('pauta_diaria','read:detail'),('pauta_diaria','update'),('pauta_diaria','export'),
  ('payroll','read:detail'),('payroll','update'),('payroll','export'),
  ('configuracion','read:detail'),('configuracion','manage:roles')
)
SELECT e.*
FROM expected e
LEFT JOIN rbac_permissions p ON p.resource = e.resource AND p.action = e.action
WHERE p.id IS NULL
ORDER BY e.resource, e.action;
