### Plan de codemod (no aplicar aún)

- **Objetivo**: asegurar uso de `rbacFetch` y estandarizar verificación de permisos.

1) Reemplazos de fetch → rbacFetch

- Archivo: `src/lib/can.ts`
  - Reemplazar:
    - `fetch('/api/me/permissions?perm=' + encodeURIComponent(permission), { cache: 'no-store' })`
  - Por:
    - `rbacFetch('/api/me/permissions?perm=' + encodeURIComponent(permission), { cache: 'no-store' })`
  - Agregar import: `import { rbacFetch } from '@/lib/rbacClient'`

- Archivo: `src/lib/api/turnos.ts`
  - Reemplazar:
    - `fetch('/api/me/permissions?perm=turnos.marcar_asistencia', ...)`
  - Por una de dos opciones:
    - Opción A (consistente con actual): `rbacFetch('/api/me/permissions?perm=turnos.marcar_asistencia', ...)`
    - Opción B (nuevo endpoint): `rbacFetch('/api/rbac/can?perm=turnos.marcar_asistencia')` y leer `{ allowed }`
  - Agregar import: `import { rbacFetch } from '@/lib/rbacClient'`

- Archivo: `src/app/admin/seguridad/tenants/tenants-client.tsx` (si sigue en uso)
  - Reemplazar:
    - `fetch('/api/admin/tenants' ...)` y `fetch('/api/admin/tenants/create' ...)`
  - Por:
    - `rbacFetch('/api/admin/tenants' ...)` y `rbacFetch('/api/admin/tenants/create' ...)`
  - Agregar import: `import { rbacFetch } from '@/lib/rbacClient'`

2) Ajustes `useCan`/guards (si migramos a /api/rbac/can)

- `src/lib/permissions.ts`
  - Posible cambio futuro: `fetchCan` use `/api/rbac/can?perm=...` en vez de `/api/me/permissions?perm=...` (mantener compatibilidad y logs).

3) Endpoints sin validación server-side

- `src/app/api/admin/rbac/roles/route.ts` y `src/app/api/admin/rbac/permisos/route.ts`
  - Añadir verificación mínima server-side (lectura):
    - `requirePlatformAdmin(req as any)` o crear `requirePermission('rbac.roles.read')`/`requirePermission('rbac.permisos.read')` análogo a `requirePlatformAdmin`.

4) Limpieza

- Confirmar que `src/middleware.ts` solo inyecta header en dev y no en producción.
- Remover usos de `fetch` directo hacia `/api/me/permissions`, `/api/admin/**`, `/api/rbac/**` que no pasen por `rbacFetch`.
