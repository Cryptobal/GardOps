SELECT r.id, r.tenant_id, r.name
FROM rbac_roles r
LEFT JOIN rbac_role_permissions rp ON rp.role_id = r.id
WHERE rp.role_id IS NULL
ORDER BY r.tenant_id, r.name;
