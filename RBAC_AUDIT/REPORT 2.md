### Auditoría RBAC (código + flujo)

- **Usuario de prueba**: `carlos.irigoyen@gard.cl`
- **Permiso “llave maestra” UI**: `rbac.platform_admin`
- **Rutas UI**: `/configuracion/seguridad` y subpáginas
- **Helper esperado**: `rbacFetch` inyecta `x-user-email` con `NEXT_PUBLIC_DEV_USER_EMAIL` en dev
- **Hook**: `useCan(perm)` consulta `/api/me/permissions?perm=...` usando `rbacFetch`

---

### 1) Endpoints protegidos (Usuarios/Roles/Permisos/Tenants + can/me)

1. `src/app/api/admin/rbac/usuarios/route.ts` → `/api/admin/rbac/usuarios`
   - Métodos: GET, POST
   - Email: header `x-user-email` o `NEXT_PUBLIC_DEV_USER_EMAIL`
   - userId: `SELECT id FROM public.usuarios WHERE lower(email)=lower($email)`
   - Permiso exigido: `rbac.platform_admin` (para GET vía chequeo previo; POST usa header dev, no valida explícitamente `platform_admin` pero flujo depende de navegación protegida)
   - Validación: SQL `select public.fn_usuario_tiene_permiso(userId,'rbac.platform_admin')`

2. `src/app/api/admin/rbac/usuarios/[id]/route.ts` → `/api/admin/rbac/usuarios/:id`
   - Métodos: PUT, DELETE
   - Email: `requirePlatformAdmin(req)` usa `getUserEmail`
   - userId: `getUserIdByEmail`
   - Permiso exigido: `rbac.platform_admin`
   - Validación: `userHasPerm(userId,'rbac.platform_admin')` con `fn_usuario_tiene_permiso`

3. `src/app/api/admin/rbac/usuarios/[id]/roles/route.ts` → `/api/admin/rbac/usuarios/:id/roles`
   - Métodos: GET, POST
   - Email: `getUserEmail`
   - userId: `getUserIdByEmail`
   - Permiso exigido: permite si `rbac.platform_admin`; si no, exige autenticación y valida inquilino en operaciones
   - Validación: `userHasPerm(...,'rbac.platform_admin')`; operaciones tocan `usuarios_roles` con validación de `tenant_id`

4. `src/app/api/admin/rbac/roles/route.ts` → `/api/admin/rbac/roles`
   - Método: GET
   - Email: no valida permiso aquí (potencial brecha de autorización)
   - userId: N/A
   - Permiso exigido: N/A explícito (UI lo protege con `useCan('rbac.roles.read')`)
   - Validación: N/A en endpoint (depende de UI)

5. `src/app/api/admin/rbac/roles/[id]/route.ts` → `/api/admin/rbac/roles/:id`
   - Métodos: PUT, DELETE
   - Email: `requirePlatformAdmin`
   - userId: `getUserIdByEmail`
   - Permiso exigido: `rbac.platform_admin`
   - Validación: `fn_usuario_tiene_permiso`

6. `src/app/api/admin/rbac/roles/[id]/permisos/route.ts` → `/api/admin/rbac/roles/:id/permisos`
   - Método: POST
   - Email: `requirePlatformAdmin`
   - userId: `getUserIdByEmail`
   - Permiso exigido: `rbac.platform_admin`
   - Validación: asigna/borra en `roles_permisos`

7. `src/app/api/admin/rbac/permisos/route.ts` → `/api/admin/rbac/permisos`
   - Método: GET
   - Email: no valida permiso aquí (potencial brecha de autorización)
   - userId: N/A
   - Permiso exigido: N/A explícito (UI lo protege con `useCan('rbac.permisos.read')`)
   - Validación: N/A en endpoint (depende de UI)

8. `src/app/api/admin/tenants/route.ts` → `/api/admin/tenants`
   - Método: GET
   - Email: `requirePlatformAdmin`
   - userId: `getUserIdByEmail`
   - Permiso exigido: `rbac.platform_admin`
   - Validación: `fn_usuario_tiene_permiso`

9. `src/app/api/admin/tenants/create/route.ts` → `/api/admin/tenants/create`
   - Método: POST
   - Email: `requirePlatformAdmin`
   - userId: `getUserIdByEmail`
   - Permiso exigido: `rbac.platform_admin`
   - Validación: `fn_usuario_tiene_permiso` y función `fn_create_tenant`

10. `src/app/api/me/permissions/route.ts` → `/api/me/permissions?perm=`
    - Método: GET
    - Lee `perm`/`permiso` de query con validación manual; 400 si vacío
    - Email: `headers().get('x-user-email')` o `NEXT_PUBLIC_DEV_USER_EMAIL`
    - userId: subconsulta por email
    - Valida: `select public.fn_usuario_tiene_permiso((select id), $perm)`

11. `src/app/api/rbac/can/route.ts` → `/api/rbac/can?perm=`
    - Método: GET
    - Lee `perm`/`permiso`; 400 si vacío
    - Email: `getUserEmail(request)` prioriza header, sesión o `NEXT_PUBLIC_DEV_USER_EMAIL` en dev
    - userId: `getUserIdByEmail`
    - Valida: `userHasPerm(userId, perm)` → `fn_usuario_tiene_permiso(userId, perm)`

---

### 2) Componentes/páginas que dependen de permisos

- `src/app/configuracion/seguridad/page.tsx`
  - Usa: `useCan('rbac.platform_admin')` (llave maestra UI)
  - Estado “Super Admin” si `allowed` y `!loading`
  - Correcto: usa `useCan` (que usa `rbacFetch`)

- `src/app/configuracion/seguridad/roles/page.tsx`
  - Usa: `useCan('rbac.roles.read')`
  - Muestra “Sin acceso” cuando `!allowed` y `!loading` (retorno condicional después de loading)
  - Datos vía `rbacFetch` a `/api/admin/rbac/roles` (endpoint no verifica permiso)

- `src/app/configuracion/seguridad/permisos/page.tsx`
  - Usa: `useCan('rbac.permisos.read')`
  - “Sin acceso” si `!allowed` y `!loading`
  - Datos vía `rbacFetch` a `/api/admin/rbac/permisos` (endpoint no verifica permiso)

- `src/app/configuracion/seguridad/tenants/page.tsx`
  - No llama `useCan` explícito; opera contra endpoints protegidos por `requirePlatformAdmin`
  - “No tienes permisos suficientes (403)” si el fetch falla

- `src/app/configuracion/seguridad/usuarios/page.tsx`
  - No llama `useCan`; opera contra endpoints protegidos por `requirePlatformAdmin`

- `src/components/layout/navigation-item-wrapper.tsx`
  - Si `item.permission` existe, hace `useCan(perm)`; oculta ítem si `loading` o `!allowed`

Confirmación `useCan` → `rbacFetch`: `src/lib/permissions.ts` usa `rbacFetch` para `/api/me/permissions`.

---

### 3) Uso de rbacFetch vs fetch directo

- Correcto (rbacFetch):
  - `src/lib/permissions.ts` → `/api/me/permissions`
  - Seguridad UI: usuarios/roles/permisos/tenants llaman `rbacFetch` a endpoints admin

- A migrar (fetch directo hacia RBAC):
  - `src/lib/can.ts` → `fetch('/api/me/permissions?perm=...')` (solo legacy/debug). Debe migrar a `rbacFetch` o eliminar en producción.
  - `src/lib/api/turnos.ts` → `fetch('/api/me/permissions?perm=turnos.marcar_asistencia', ...)` → Debe migrarse a `rbacFetch` o al nuevo `/api/rbac/can`.
  - `src/app/admin/seguridad/tenants/tenants-client.tsx` → usa `fetch` directo a `/api/admin/tenants` y `/api/admin/tenants/create`. Debe migrarse a `rbacFetch` o eliminar si ya no se usa (hay redirect a `/configuracion/seguridad/...`).

---

### 4) Posibles bugs detectados

- Permisos UI vs API:
  - La UI de Roles (`rbac.roles.read`) y Permisos (`rbac.permisos.read`) restringe la vista, pero los endpoints `/api/admin/rbac/roles` y `/api/admin/rbac/permisos` no validan ningún permiso; dependen de la UI para ocultar. Riesgo de fuga si se llama directo.
- `useCan` con perm vacío:
  - El hook maneja vacío devolviendo `allowed=true` y no consulta API, lo cual previene `?perm=` 400.
- Estados de carga “Sin acceso”:
  - Roles/Permisos: muestran “Sin acceso” solo tras `!loading`. Correcto.
  - Navegación: si `item.permission` y `loading`, oculta ítem (no parpadeo pero puede ocultar mientras carga).
- Middleware/auth-wrapper:
  - `src/middleware.ts` inyecta `x-user-email` para TODAS las rutas `/api/*` en desarrollo. No hay middleware adicional que exija algo distinto a `rbac.platform_admin` para `/configuracion/seguridad/**`.
- Discrepancia reportada (allowed: true pero “Sin acceso”):
  - Hipótesis principal: mismatch de claves de permiso entre UI y DB. La migración define permisos `rbac.roles.read`, `rbac.permisos.read`, etc. Si la DB real tiene `roles.manage`/`permisos.read` u otras variantes, `useCan('rbac.roles.read')` devolverá false → “Sin acceso”, mientras `/api/me/permissions?perm=rbac.platform_admin` devuelve true.
  - Otras causas posibles:
    - Usuario activo en DB pero sin `usuarios_roles` asignado para permisos de lectura específicos (solo tiene `rbac.platform_admin` si la función no infiere wildcard).
    - Función `fn_usuario_tiene_permiso` en la instancia Neon distinta a la incluida en `scripts/rbac/migration.sql` (p.ej., no soporta wildcard o espera `email` vs `userId` diferente) y /api/me/permissions usa email→id correctamente, pero roles/permisos usan claves no existentes.

Árbol de dependencias (simplificado):
- UI Seguridad (Roles/Permisos/Usuarios/Tenants)
  - llama `useCan('rbac.roles.read' | 'rbac.permisos.read' | 'rbac.platform_admin')` → `rbacFetch('/api/me/permissions?perm=...')`
  - luego llama `rbacFetch` a endpoints admin:
    - Roles → `/api/admin/rbac/roles` (sin validación en endpoint)
    - Permisos → `/api/admin/rbac/permisos` (sin validación en endpoint)
    - Usuarios → `/api/admin/rbac/usuarios` (valida `rbac.platform_admin`)
    - Tenants → `/api/admin/tenants` (valida `rbac.platform_admin`)
- Endpoints admin → BD
  - Validan permisos con `fn_usuario_tiene_permiso(userId, permiso)` donde aplica

Causa raíz probable del 403/“Sin acceso” en UI pese a `rbac.platform_admin = true`:
- **Desalineación de claves**: la UI exige `rbac.roles.read` y `rbac.permisos.read`, pero el rol Platform Admin en DB podría no tener esos permisos explícitos. Aunque “llave maestra” habilita tenants/usuarios (porque esos endpoints validan `rbac.platform_admin`), las vistas de Roles/Permisos dependen de `rbac.roles.read`/`rbac.permisos.read` en el hook y muestran “Sin acceso”.

---

### 5) Sanidad /api/me/permissions y /api/rbac/can

- `/api/me/permissions`:
  - `perm`/`permiso` en query; valida manualmente, 400 si falta.
  - Email: `headers().get('x-user-email')` o `NEXT_PUBLIC_DEV_USER_EMAIL`.
  - Usa `rbacFetch` en cliente a través de `useCan`.

- `/api/rbac/can`:
  - `perm`/`permiso` en query; valida 400 si falta.
  - Email: `getUserEmail` (header, sesión, o env en dev).
  - Cliente: no hay usos en UI; se podría migrar `useCan` a este endpoint en el futuro.

---

### 6) Señales de UI “Sin acceso”

- Roles: `!allowed` tras `!loading` → bloquea y muestra tarjeta con link de retorno.
- Permisos: igual patrón.
- Seguridad (landing): etiqueta “Super Admin” si `useCan('rbac.platform_admin')` true; no bloquea navegación.
- Tenants/Usuarios: no usan `useCan`, dependen de 403 de los endpoints; muestran mensaje de error si 403.

---

### 7) Recomendaciones

- Añadir validación de permiso en `/api/admin/rbac/roles` y `/api/admin/rbac/permisos` (al menos lectura), o documentar que solo UI protege.
- Asegurar que “Platform Admin” tenga explícitamente los permisos de lectura usados por la UI: `rbac.roles.read`, `rbac.permisos.read`, y si aplica `usuarios.manage`, `rbac.tenants.read`, `rbac.tenants.create` (o claves equivalentes). Ver FIXES.
- Migrar usos de `fetch` directo a `rbacFetch` o a `/api/rbac/can`.
