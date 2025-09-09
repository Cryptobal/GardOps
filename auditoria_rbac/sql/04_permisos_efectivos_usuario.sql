-- reemplaza mail
WITH user_ctx AS (
  SELECT id AS user_id FROM auth_users WHERE lower(email)=lower('test@example.com')
),
eff AS (
  SELECT DISTINCT r.tenant_id, p.resource, p.action
  FROM rbac_user_roles ur
  JOIN rbac_roles r ON r.id = ur.role_id
  JOIN rbac_role_permissions rp ON rp.role_id = r.id
  JOIN rbac_permissions p ON p.id = rp.permission_id
  JOIN user_ctx u ON u.user_id = ur.user_id
)
SELECT * FROM eff ORDER BY tenant_id, resource, action;
