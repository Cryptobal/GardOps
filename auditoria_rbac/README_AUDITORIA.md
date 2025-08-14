### Auditoría RBAC GardOps (read-only)

- Objetivo: verificar permisos RBAC por módulo/rol/tenant en API y UI, y detectar fugas o bypass.
- Modo: solo lectura. No se realizan escrituras reales. Mutaciones usan `?dryRun=1`, IDs inexistentes o validaciones que devuelven 422.
- Aislamiento: todo vive en `auditoria_rbac/` sin modificar código productivo.

### Requisitos
- Node 18+
- Acceso local a la app: `AUDIT_BASE_URL` (por defecto `http://localhost:3000`).
- Si hay DB Neon/Postgres: `DATABASE_URL` (solo SELECTs).

### Instalación (solo auditoría)
```bash
npm --prefix auditoria_rbac install
```

### Variables de entorno (auditoría)
- Copiar y ajustar `auditoria_rbac/config/.env.audit.example` a `.env.audit` en el mismo directorio si desea sobreescribir.

### Ejecución (comandos)
Ejecute desde la raíz del repo usando el `package.json` interno de auditoría:
```bash
npm --prefix auditoria_rbac run audit:gen-endpoints
npm --prefix auditoria_rbac run audit:snapshot
npm --prefix auditoria_rbac run audit:api
npm --prefix auditoria_rbac run audit:ui
npm --prefix auditoria_rbac run audit:sql
```
O todo junto:
```bash
npm --prefix auditoria_rbac run audit:all
```

### Salidas
- `auditoria_rbac/outputs/rbac_endpoint_map.json` (mapa endpoints → acción)
- `auditoria_rbac/outputs/rbac_static_audit.md` (hallazgos estáticos)
- `auditoria_rbac/outputs/rbac_results_api.csv` + `rbac_failures_api.md`
- `auditoria_rbac/outputs/rbac_results_ui.html` + `rbac_failures_ui.md` + `ui_screenshots/*`
- `auditoria_rbac/outputs/sql/*.csv`
- `auditoria_rbac/outputs/effective_permissions_*.json`

### Seguridad
- Sin DELETE/UPDATE reales. Mutaciones forzadas a `dryRun`/IDs inexistentes.
- No se crean/borrran roles ni permisos productivos.
- Impersonación solo por `x-user-email` en desarrollo.

### Notas
- Si no existe `/api/me/effective-permissions`, se usa `/api/rbac/can` o `/api/me/permissions` por permiso.
- Si faltan tenants/usuarios de prueba, use placeholders en `config/*.json` o proporcione `DATABASE_URL` para que los scripts lean tenants de la base.
