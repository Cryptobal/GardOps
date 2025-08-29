## RBAC Admin

### Configuración
- Definir `POSTGRES_URL` en `.env.local` (ver `.env.example`).
- En local puedes enviar `x-user-email: tu@correo.com` para simular el usuario actual.

### Auditoría y Auto-sanación
- Ejecutar: `npx tsx scripts/rbac/audit-and-fix.ts`.
- Crea tablas básicas (`tenants`, `usuarios`, `roles`, `permisos`, `usuarios_roles`, `roles_permisos`) y funciones `fn_usuario_tiene_permiso`, `fn_create_tenant` (idempotente).

### Endpoints (requieren permiso rbac.platform_admin)
- POST `/api/admin/tenants/create` body `{ nombre, slug, owner_email, owner_nombre? }`
- GET `/api/admin/tenants?q=&page=1&limit=20`
- GET `/api/admin/rbac/usuarios?q=&page=1&limit=20`
- PUT `/api/admin/rbac/usuarios/:id` body `{ nombre?, activo?, tenant_id? }`
- DELETE `/api/admin/rbac/usuarios/:id`
- POST `/api/admin/rbac/usuarios/:id/roles` body `{ rol_id, action: 'add'|'remove' }`
- GET `/api/admin/rbac/roles?tenant_id`
- POST `/api/admin/rbac/roles` body `{ tenant_id|null, nombre, clave }`
- PUT `/api/admin/rbac/roles` body `{ id, nombre?, clave?, tenant_id? }`
- DELETE `/api/admin/rbac/roles?id=uuid`
- GET `/api/admin/rbac/permisos?tenant_id` (tenant_id vacío → globales)
- POST `/api/admin/rbac/permisos` body `{ tenant_id|null, nombre, clave }`
- PUT `/api/admin/rbac/permisos` body `{ id, nombre?, clave?, tenant_id? }`
- DELETE `/api/admin/rbac/permisos?id=uuid`

### UI Admin
Rutas:
- `/admin/seguridad/tenants`
- `/admin/seguridad/usuarios`
- `/admin/seguridad/roles`
- `/admin/seguridad/permisos`

### Probar con curl (ejemplos)
```bash
curl -H "x-user-email: Carlos.irigoyen@gard.cl" \
     -H "Content-Type: application/json" \
     -X POST http://localhost:3000/api/admin/tenants/create \
     -d '{"nombre":"Demo","slug":"demo","owner_email":"owner@demo.com","owner_nombre":"Owner Demo"}'

curl -H "x-user-email: Carlos.irigoyen@gard.cl" http://localhost:3000/api/admin/tenants
```

### Smoke
`npx tsx scripts/rbac/smoke.ts`


