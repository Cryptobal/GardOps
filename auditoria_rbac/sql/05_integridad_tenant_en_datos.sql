SELECT 'instalaciones' AS table, id FROM instalaciones WHERE tenant_id IS NULL
UNION ALL
SELECT 'guardias', id FROM guardias WHERE tenant_id IS NULL
UNION ALL
SELECT 'as_turnos_puestos_operativos', id FROM as_turnos_puestos_operativos WHERE tenant_id IS NULL
ORDER BY table, id;
