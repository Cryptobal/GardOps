# Resumen Auditoría RBAC

## Mapa de Endpoints
```json
[
  {
    "method": "GET",
    "route": "/api/add-tenant-to-tipos-documentos",
    "module": "add-tenant-to-tipos-documentos",
    "action": "read:list",
    "file": "src/app/api/add-tenant-to-tipos-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/alertas-documentos",
    "module": "alertas-documentos",
    "action": "read:list",
    "file": "src/app/api/alertas-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/alertas-documentos",
    "module": "alertas-documentos",
    "action": "create",
    "file": "src/app/api/alertas-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/alertas-documentos",
    "module": "alertas-documentos",
    "action": "update",
    "file": "src/app/api/alertas-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/bancos",
    "module": "bancos",
    "action": "read:list",
    "file": "src/app/api/bancos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/audit-database",
    "module": "audit-database",
    "action": "read:list",
    "file": "src/app/api/audit-database/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/check-documentos-structure",
    "module": "check-documentos-structure",
    "action": "read:list",
    "file": "src/app/api/check-documentos-structure/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/check-sueldo-tables",
    "module": "check-sueldo-tables",
    "action": "read:list",
    "file": "src/app/api/check-sueldo-tables/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/check-tables",
    "module": "check-tables",
    "action": "read:list",
    "file": "src/app/api/check-tables/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/clientes",
    "module": "clientes",
    "action": "read:list",
    "file": "src/app/api/clientes/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/clientes",
    "module": "clientes",
    "action": "create",
    "file": "src/app/api/clientes/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/clientes",
    "module": "clientes",
    "action": "update",
    "file": "src/app/api/clientes/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/clientes",
    "module": "clientes",
    "action": "delete",
    "file": "src/app/api/clientes/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/comunas",
    "module": "comunas",
    "action": "read:list",
    "file": "src/app/api/comunas/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/create-second-tenant",
    "module": "create-second-tenant",
    "action": "create",
    "file": "src/app/api/create-second-tenant/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/database-status",
    "module": "database-status",
    "action": "read:list",
    "file": "src/app/api/database-status/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/describe-clientes",
    "module": "describe-clientes",
    "action": "read:list",
    "file": "src/app/api/describe-clientes/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/document-url",
    "module": "document-url",
    "action": "create",
    "file": "src/app/api/document-url/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/documentos",
    "module": "documentos",
    "action": "read:list",
    "file": "src/app/api/documentos/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/documentos",
    "module": "documentos",
    "action": "delete",
    "file": "src/app/api/documentos/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/documentos-clientes",
    "module": "documentos-clientes",
    "action": "update",
    "file": "src/app/api/documentos-clientes/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/documentos-global",
    "module": "documentos-global",
    "action": "read:list",
    "file": "src/app/api/documentos-global/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/documentos-instalaciones",
    "module": "documentos-instalaciones",
    "action": "update",
    "file": "src/app/api/documentos-instalaciones/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/documents",
    "module": "documents",
    "action": "read:list",
    "file": "src/app/api/documents/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/documents",
    "module": "documents",
    "action": "delete",
    "file": "src/app/api/documents/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/documentos-guardias",
    "module": "documentos-guardias",
    "action": "read:list",
    "file": "src/app/api/documentos-guardias/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/documentos-guardias",
    "module": "documentos-guardias",
    "action": "update",
    "file": "src/app/api/documentos-guardias/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/download-document",
    "module": "download-document",
    "action": "read:list",
    "file": "src/app/api/download-document/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/estructuras-sueldo",
    "module": "estructuras-sueldo",
    "action": "read:list",
    "file": "src/app/api/estructuras-sueldo/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/estructuras-sueldo",
    "module": "estructuras-sueldo",
    "action": "create",
    "file": "src/app/api/estructuras-sueldo/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/flags",
    "module": "flags",
    "action": "read:list",
    "file": "src/app/api/flags/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias-test",
    "module": "guardias-test",
    "action": "read:list",
    "file": "src/app/api/guardias-test/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias",
    "module": "guardias",
    "action": "read:list",
    "file": "src/app/api/guardias/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/guardias",
    "module": "guardias",
    "action": "create",
    "file": "src/app/api/guardias/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias-con-coordenadas",
    "module": "guardias-con-coordenadas",
    "action": "read:list",
    "file": "src/app/api/guardias-con-coordenadas/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones",
    "module": "instalaciones",
    "action": "read:list",
    "file": "src/app/api/instalaciones/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/instalaciones",
    "module": "instalaciones",
    "action": "update",
    "file": "src/app/api/instalaciones/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/instalaciones",
    "module": "instalaciones",
    "action": "delete",
    "file": "src/app/api/instalaciones/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones-con-coordenadas",
    "module": "instalaciones-con-coordenadas",
    "action": "read:list",
    "file": "src/app/api/instalaciones-con-coordenadas/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/init-users",
    "module": "init-users",
    "action": "create",
    "file": "src/app/api/init-users/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones-con-turnos-extras",
    "module": "instalaciones-con-turnos-extras",
    "action": "read:list",
    "file": "src/app/api/instalaciones-con-turnos-extras/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones-con-ppc-activos",
    "module": "instalaciones-con-ppc-activos",
    "action": "read:list",
    "file": "src/app/api/instalaciones-con-ppc-activos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/logs",
    "module": "logs",
    "action": "read:list",
    "file": "src/app/api/logs/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/logs",
    "module": "logs",
    "action": "create",
    "file": "src/app/api/logs/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/migrate-alertas-documentos",
    "module": "migrate-alertas-documentos",
    "action": "read:list",
    "file": "src/app/api/migrate-alertas-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/migrate-clientes",
    "module": "migrate-clientes",
    "action": "read:list",
    "file": "src/app/api/migrate-clientes/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/migrate-documentos-tipos-multi-tenant",
    "module": "migrate-documentos-tipos-multi-tenant",
    "action": "read:list",
    "file": "src/app/api/migrate-documentos-tipos-multi-tenant/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/migrate-documentos",
    "module": "migrate-documentos",
    "action": "read:list",
    "file": "src/app/api/migrate-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/migrate-logs-clientes",
    "module": "migrate-logs-clientes",
    "action": "read:list",
    "file": "src/app/api/migrate-logs-clientes/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/migrate-planillas-add-codigo",
    "module": "migrate-planillas-add-codigo",
    "action": "create",
    "file": "src/app/api/migrate-planillas-add-codigo/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/migrate",
    "module": "migrate",
    "action": "create",
    "file": "src/app/api/migrate/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/migrate",
    "module": "migrate",
    "action": "read:list",
    "file": "src/app/api/migrate/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/migrate-preserve",
    "module": "migrate-preserve",
    "action": "create",
    "file": "src/app/api/migrate-preserve/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/migrate-preserve",
    "module": "migrate-preserve",
    "action": "read:list",
    "file": "src/app/api/migrate-preserve/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/migrate-planillas-turnos-extras",
    "module": "migrate-planillas-turnos-extras",
    "action": "create",
    "file": "src/app/api/migrate-planillas-turnos-extras/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/migrate-tipos-documentos",
    "module": "migrate-tipos-documentos",
    "action": "read:list",
    "file": "src/app/api/migrate-tipos-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/migrate-usuarios",
    "module": "migrate-usuarios",
    "action": "read:list",
    "file": "src/app/api/migrate-usuarios/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/migrate-rename-tables-te",
    "module": "migrate-rename-tables-te",
    "action": "create",
    "file": "src/app/api/migrate-rename-tables-te/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria",
    "module": "pauta-diaria",
    "action": "read:list",
    "file": "src/app/api/pauta-diaria/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-mensual",
    "module": "pauta-mensual",
    "action": "read:list",
    "file": "src/app/api/pauta-mensual/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/rename-tipos-documentos",
    "module": "rename-tipos-documentos",
    "action": "read:list",
    "file": "src/app/api/rename-tipos-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/roles",
    "module": "roles",
    "action": "read:list",
    "file": "src/app/api/roles/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/ppc",
    "module": "ppc",
    "action": "read:list",
    "file": "src/app/api/ppc/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/setup-permissions",
    "module": "setup-permissions",
    "action": "create",
    "file": "src/app/api/setup-permissions/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/roles-servicio",
    "module": "roles-servicio",
    "action": "read:list",
    "file": "src/app/api/roles-servicio/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/roles-servicio",
    "module": "roles-servicio",
    "action": "create",
    "file": "src/app/api/roles-servicio/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/test-afp",
    "module": "test-afp",
    "action": "read:list",
    "file": "src/app/api/test-afp/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/test-db-connection",
    "module": "test-db-connection",
    "action": "read:list",
    "file": "src/app/api/test-db-connection/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/test-db-structure",
    "module": "test-db-structure",
    "action": "read:list",
    "file": "src/app/api/test-db-structure/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/test-estructuras-sueldo",
    "module": "test-estructuras-sueldo",
    "action": "read:list",
    "file": "src/app/api/test-estructuras-sueldo/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/test-roles-servicio",
    "module": "test-roles-servicio",
    "action": "read:list",
    "file": "src/app/api/test-roles-servicio/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/test-sueldo-simple",
    "module": "test-sueldo-simple",
    "action": "read:list",
    "file": "src/app/api/test-sueldo-simple/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/test-table-structure",
    "module": "test-table-structure",
    "action": "read:list",
    "file": "src/app/api/test-table-structure/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/tipos-documentos",
    "module": "tipos-documentos",
    "action": "read:list",
    "file": "src/app/api/tipos-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/tipos-documentos",
    "module": "tipos-documentos",
    "action": "create",
    "file": "src/app/api/tipos-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/tipos-documentos",
    "module": "tipos-documentos",
    "action": "update",
    "file": "src/app/api/tipos-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/tipos-documentos",
    "module": "tipos-documentos",
    "action": "delete",
    "file": "src/app/api/tipos-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/tipos-puesto",
    "module": "tipos-puesto",
    "action": "read:list",
    "file": "src/app/api/tipos-puesto/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/tipos-puesto",
    "module": "tipos-puesto",
    "action": "create",
    "file": "src/app/api/tipos-puesto/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/test-param",
    "module": "test-param",
    "action": "read:list",
    "file": "src/app/api/test-param/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/users",
    "module": "users",
    "action": "read:list",
    "file": "src/app/api/users/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/upload-document",
    "module": "upload-document",
    "action": "create",
    "file": "src/app/api/upload-document/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/admin/actualizar-turnos-extras",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/actualizar-turnos-extras/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/admin/tenants",
    "module": "admin",
    "action": "read:list",
    "file": "src/app/api/admin/tenants/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "POST",
    "route": "/api/admin/tenants",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/tenants/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "POST",
    "route": "/api/auth/login",
    "module": "auth",
    "action": "create",
    "file": "src/app/api/auth/login/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/clientes/[id]",
    "module": "clientes",
    "action": "read:detail",
    "file": "src/app/api/clientes/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/clientes/[id]",
    "module": "clientes",
    "action": "update",
    "file": "src/app/api/clientes/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/doc/templates",
    "module": "doc",
    "action": "read:list",
    "file": "src/app/api/doc/templates/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/doc/templates",
    "module": "doc",
    "action": "create",
    "file": "src/app/api/doc/templates/route.ts",
    "middleware": []
  },
  {
    "method": "PATCH",
    "route": "/api/documentos/[id]",
    "module": "documentos",
    "action": "update",
    "file": "src/app/api/documentos/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/debug/whoami",
    "module": "debug",
    "action": "read:list",
    "file": "src/app/api/debug/whoami/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/estructuras-servicio/global",
    "module": "estructuras-servicio",
    "action": "read:list",
    "file": "src/app/api/estructuras-servicio/global/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/estructuras-servicio/global",
    "module": "estructuras-servicio",
    "action": "update",
    "file": "src/app/api/estructuras-servicio/global/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/estructuras-sueldo/[id]",
    "module": "estructuras-sueldo",
    "action": "read:detail",
    "file": "src/app/api/estructuras-sueldo/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/estructuras-sueldo/[id]",
    "module": "estructuras-sueldo",
    "action": "update",
    "file": "src/app/api/estructuras-sueldo/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/estructuras-sueldo/[id]",
    "module": "estructuras-sueldo",
    "action": "delete",
    "file": "src/app/api/estructuras-sueldo/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/estructuras-sueldo/inactivar",
    "module": "estructuras-sueldo",
    "action": "create",
    "file": "src/app/api/estructuras-sueldo/inactivar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias/buscar",
    "module": "guardias",
    "action": "read:list",
    "file": "src/app/api/guardias/buscar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias/conflictos",
    "module": "guardias",
    "action": "read:list",
    "file": "src/app/api/guardias/conflictos/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/guardias/[id]",
    "module": "guardias",
    "action": "update",
    "file": "src/app/api/guardias/[id]/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/guardias/[id]",
    "module": "guardias",
    "action": "read:detail",
    "file": "src/app/api/guardias/[id]/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "PATCH",
    "route": "/api/guardias/[id]",
    "module": "guardias",
    "action": "update",
    "file": "src/app/api/guardias/[id]/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "DELETE",
    "route": "/api/guardias/[id]",
    "module": "guardias",
    "action": "delete",
    "file": "src/app/api/guardias/[id]/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/guardias/disponibles",
    "module": "guardias",
    "action": "read:list",
    "file": "src/app/api/guardias/disponibles/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias/guardia-metrics",
    "module": "guardias",
    "action": "read:list",
    "file": "src/app/api/guardias/guardia-metrics/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/guardias/permisos",
    "module": "guardias",
    "action": "create",
    "file": "src/app/api/guardias/permisos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias/permisos",
    "module": "guardias",
    "action": "read:list",
    "file": "src/app/api/guardias/permisos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guards/nearby",
    "module": "guards",
    "action": "read:list",
    "file": "src/app/api/guards/nearby/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/kpis",
    "module": "instalaciones",
    "action": "read:list",
    "file": "src/app/api/instalaciones/kpis/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/documentos-vencidos",
    "module": "instalaciones",
    "action": "read:list",
    "file": "src/app/api/instalaciones/documentos-vencidos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/logs/check-structure",
    "module": "logs",
    "action": "read:list",
    "file": "src/app/api/logs/check-structure/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/logs/cleanup-test",
    "module": "logs",
    "action": "delete",
    "file": "src/app/api/logs/cleanup-test/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/logs/exportar",
    "module": "logs",
    "action": "export",
    "file": "src/app/api/logs/exportar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/logs/filtros",
    "module": "logs",
    "action": "read:list",
    "file": "src/app/api/logs/filtros/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/logs/test",
    "module": "logs",
    "action": "read:list",
    "file": "src/app/api/logs/test/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/me/password",
    "module": "me",
    "action": "update",
    "file": "src/app/api/me/password/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/me/permissions",
    "module": "me",
    "action": "read:list",
    "file": "src/app/api/me/permissions/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/me/effective-permissions",
    "module": "me",
    "action": "read:list",
    "file": "src/app/api/me/effective-permissions/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/me/ping",
    "module": "me",
    "action": "read:list",
    "file": "src/app/api/me/ping/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/me/profile",
    "module": "me",
    "action": "read:list",
    "file": "src/app/api/me/profile/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/me/profile",
    "module": "me",
    "action": "update",
    "file": "src/app/api/me/profile/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/pauta-mensual/actualizar-celda",
    "module": "pauta-mensual",
    "action": "update",
    "file": "src/app/api/pauta-mensual/actualizar-celda/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-mensual/crear",
    "module": "pauta-mensual",
    "action": "create",
    "file": "src/app/api/pauta-mensual/crear/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/pauta-mensual/eliminar",
    "module": "pauta-mensual",
    "action": "delete",
    "file": "src/app/api/pauta-mensual/eliminar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-mensual/exportar-xlsx",
    "module": "pauta-mensual",
    "action": "export",
    "file": "src/app/api/pauta-mensual/exportar-xlsx/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-mensual/exportar-pdf",
    "module": "pauta-mensual",
    "action": "export",
    "file": "src/app/api/pauta-mensual/exportar-pdf/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-mensual/guardar",
    "module": "pauta-mensual",
    "action": "create",
    "file": "src/app/api/pauta-mensual/guardar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-mensual/resumen",
    "module": "pauta-mensual",
    "action": "read:list",
    "file": "src/app/api/pauta-mensual/resumen/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-mensual/verificar-roles",
    "module": "pauta-mensual",
    "action": "create",
    "file": "src/app/api/pauta-mensual/verificar-roles/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/estructuras-guardia",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/estructuras-guardia/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-diaria/turno-extra",
    "module": "pauta-diaria",
    "action": "create",
    "file": "src/app/api/pauta-diaria/turno-extra/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra",
    "module": "pauta-diaria",
    "action": "read:list",
    "file": "src/app/api/pauta-diaria/turno-extra/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/guardias",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/guardias/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/instalaciones",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/instalaciones/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/sueldo-items",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/sueldo-items/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/items-extras",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/items-extras/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/payroll/items-extras",
    "module": "payroll",
    "action": "create",
    "file": "src/app/api/payroll/items-extras/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/payroll/items-extras",
    "module": "payroll",
    "action": "update",
    "file": "src/app/api/payroll/items-extras/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/payroll/items-extras",
    "module": "payroll",
    "action": "delete",
    "file": "src/app/api/payroll/items-extras/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/roles-servicio",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/roles-servicio/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/rbac/can",
    "module": "rbac",
    "action": "read:list",
    "file": "src/app/api/rbac/can/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "POST",
    "route": "/api/ppc/asignar",
    "module": "ppc",
    "action": "create",
    "file": "src/app/api/ppc/asignar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/items",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/items/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/payroll/items",
    "module": "payroll",
    "action": "create",
    "file": "src/app/api/payroll/items/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/ppc/metricas",
    "module": "ppc",
    "action": "read:list",
    "file": "src/app/api/ppc/metricas/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/ppc/pendientes",
    "module": "ppc",
    "action": "read:list",
    "file": "src/app/api/ppc/pendientes/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/roles-servicio/inactivar",
    "module": "roles-servicio",
    "action": "create",
    "file": "src/app/api/roles-servicio/inactivar/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/roles-servicio/activar",
    "module": "roles-servicio",
    "action": "create",
    "file": "src/app/api/roles-servicio/activar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/roles-servicio/stats",
    "module": "roles-servicio",
    "action": "read:list",
    "file": "src/app/api/roles-servicio/stats/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/roles-servicio/verificar-pautas",
    "module": "roles-servicio",
    "action": "create",
    "file": "src/app/api/roles-servicio/verificar-pautas/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/roles-servicio/[id]",
    "module": "roles-servicio",
    "action": "read:detail",
    "file": "src/app/api/roles-servicio/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/roles-servicio/[id]",
    "module": "roles-servicio",
    "action": "update",
    "file": "src/app/api/roles-servicio/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/roles-servicio/[id]",
    "module": "roles-servicio",
    "action": "delete",
    "file": "src/app/api/roles-servicio/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PATCH",
    "route": "/api/roles-servicio/[id]",
    "module": "roles-servicio",
    "action": "update",
    "file": "src/app/api/roles-servicio/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/calcular",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/calcular/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/sueldos/calcular",
    "module": "sueldos",
    "action": "read:list",
    "file": "src/app/api/sueldos/calcular/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/migrar-estructura",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/migrar-estructura/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/sueldos/debug-tabla",
    "module": "sueldos",
    "action": "read:list",
    "file": "src/app/api/sueldos/debug-tabla/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/init-db",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/init-db/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/sueldos/init-db",
    "module": "sueldos",
    "action": "read:list",
    "file": "src/app/api/sueldos/init-db/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/migrar-parametros",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/migrar-parametros/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/migrate",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/migrate/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/sueldos/migrate",
    "module": "sueldos",
    "action": "read:list",
    "file": "src/app/api/sueldos/migrate/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/sueldos/parametros",
    "module": "sueldos",
    "action": "read:list",
    "file": "src/app/api/sueldos/parametros/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/parametros",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/parametros/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/sueldos/parametros",
    "module": "sueldos",
    "action": "update",
    "file": "src/app/api/sueldos/parametros/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/sueldos/parametros",
    "module": "sueldos",
    "action": "delete",
    "file": "src/app/api/sueldos/parametros/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/planilla",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/planilla/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/sueldos/planilla",
    "module": "sueldos",
    "action": "read:list",
    "file": "src/app/api/sueldos/planilla/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/sueldos/planilla",
    "module": "sueldos",
    "action": "update",
    "file": "src/app/api/sueldos/planilla/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/reporte",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/reporte/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/sueldos/reporte",
    "module": "sueldos",
    "action": "read:list",
    "file": "src/app/api/sueldos/reporte/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/verificar-parametros",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/verificar-parametros/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/tipos-puesto/[id]",
    "module": "tipos-puesto",
    "action": "read:detail",
    "file": "src/app/api/tipos-puesto/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/tipos-puesto/[id]",
    "module": "tipos-puesto",
    "action": "update",
    "file": "src/app/api/tipos-puesto/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/tipos-puesto/[id]",
    "module": "tipos-puesto",
    "action": "delete",
    "file": "src/app/api/tipos-puesto/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/turnos/asistencia",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/asistencia/route.ts",
    "middleware": [
      "withPermission"
    ]
  },
  {
    "method": "POST",
    "route": "/api/turnos/deshacer",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/deshacer/route.ts",
    "middleware": [
      "withPermission"
    ]
  },
  {
    "method": "POST",
    "route": "/api/turnos/cobertura",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/cobertura/route.ts",
    "middleware": [
      "withPermission"
    ]
  },
  {
    "method": "POST",
    "route": "/api/turnos/asistencia-new",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/asistencia-new/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/turnos/deshacer-new",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/deshacer-new/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/turnos/extra-new",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/extra-new/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/turnos/inasistencia",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/inasistencia/route.ts",
    "middleware": [
      "withPermission"
    ]
  },
  {
    "method": "POST",
    "route": "/api/turnos/reemplazo-new",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/reemplazo-new/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/admin/rbac/assign-admin-role",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/rbac/assign-admin-role/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/turnos/revertir",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/revertir/route.ts",
    "middleware": [
      "withPermission"
    ]
  },
  {
    "method": "POST",
    "route": "/api/admin/rbac/clean-test-user",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/rbac/clean-test-user/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/admin/rbac/create-admin-role",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/rbac/create-admin-role/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "POST",
    "route": "/api/admin/rbac/create-permissions-batch",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/rbac/create-permissions-batch/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/admin/rbac/debug-permissions",
    "module": "admin",
    "action": "read:list",
    "file": "src/app/api/admin/rbac/debug-permissions/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/admin/rbac/debug-permissions-public",
    "module": "admin",
    "action": "read:list",
    "file": "src/app/api/admin/rbac/debug-permissions-public/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/admin/rbac/fix-admin-permissions",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/rbac/fix-admin-permissions/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/admin/rbac/roles",
    "module": "admin",
    "action": "read:list",
    "file": "src/app/api/admin/rbac/roles/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "POST",
    "route": "/api/admin/rbac/roles",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/rbac/roles/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/admin/rbac/usuarios",
    "module": "admin",
    "action": "read:list",
    "file": "src/app/api/admin/rbac/usuarios/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "POST",
    "route": "/api/admin/rbac/usuarios",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/rbac/usuarios/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/admin/rbac/permisos",
    "module": "admin",
    "action": "read:list",
    "file": "src/app/api/admin/rbac/permisos/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "POST",
    "route": "/api/admin/tenants/create",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/tenants/create/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/vars/variables",
    "module": "vars",
    "action": "read:list",
    "file": "src/app/api/vars/variables/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/doc/templates/[id]",
    "module": "doc",
    "action": "read:detail",
    "file": "src/app/api/doc/templates/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/doc/templates/[id]",
    "module": "doc",
    "action": "update",
    "file": "src/app/api/doc/templates/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/doc/templates/[id]",
    "module": "doc",
    "action": "delete",
    "file": "src/app/api/doc/templates/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/estructuras-servicio/[estructuraId]/activar",
    "module": "estructuras-servicio",
    "action": "update",
    "file": "src/app/api/estructuras-servicio/[estructuraId]/activar/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/estructuras-sueldo/[id]/inactivar",
    "module": "estructuras-sueldo",
    "action": "update",
    "file": "src/app/api/estructuras-sueldo/[id]/inactivar/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/estructuras-servicio/[estructuraId]/inactivar",
    "module": "estructuras-servicio",
    "action": "update",
    "file": "src/app/api/estructuras-servicio/[estructuraId]/inactivar/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/estructuras-sueldo/[id]/toggle-activo",
    "module": "estructuras-sueldo",
    "action": "update",
    "file": "src/app/api/estructuras-sueldo/[id]/toggle-activo/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias/[id]/asignacion",
    "module": "guardias",
    "action": "read:detail",
    "file": "src/app/api/guardias/[id]/asignacion/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias/[id]/asignacion-actual",
    "module": "guardias",
    "action": "read:detail",
    "file": "src/app/api/guardias/[id]/asignacion-actual/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/guardias/[id]/bancarios",
    "module": "guardias",
    "action": "create",
    "file": "src/app/api/guardias/[id]/bancarios/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/estructuras-sueldo/por-rol/[id]",
    "module": "estructuras-sueldo",
    "action": "read:detail",
    "file": "src/app/api/estructuras-sueldo/por-rol/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/estructuras-sueldo/por-rol/[id]",
    "module": "estructuras-sueldo",
    "action": "update",
    "file": "src/app/api/estructuras-sueldo/por-rol/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/guardias/[id]/fecha-os10",
    "module": "guardias",
    "action": "update",
    "file": "src/app/api/guardias/[id]/fecha-os10/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/guardias/[id]/banco",
    "module": "guardias",
    "action": "read:detail",
    "file": "src/app/api/guardias/[id]/banco/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "PATCH",
    "route": "/api/guardias/[id]/banco",
    "module": "guardias",
    "action": "update",
    "file": "src/app/api/guardias/[id]/banco/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/guardias/[id]/historial-mensual",
    "module": "guardias",
    "action": "read:detail",
    "file": "src/app/api/guardias/[id]/historial-mensual/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias/[id]/pagos-turnos-extras",
    "module": "guardias",
    "action": "read:detail",
    "file": "src/app/api/guardias/[id]/pagos-turnos-extras/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/guardias/[id]/terminar-asignacion",
    "module": "guardias",
    "action": "create",
    "file": "src/app/api/guardias/[id]/terminar-asignacion/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/guardias/permisos/[id]",
    "module": "guardias",
    "action": "delete",
    "file": "src/app/api/guardias/permisos/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/completa",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/completa/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/estadisticas",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/estadisticas/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias/[id]/pagos",
    "module": "guardias",
    "action": "read:detail",
    "file": "src/app/api/guardias/[id]/pagos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/estadisticas_v2",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/estadisticas_v2/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/estructuras-servicio",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/estructuras-servicio/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones/[id]/estructuras-servicio",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/[id]/estructuras-servicio/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/ppc",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/ppc/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones/[id]/ppc",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/[id]/ppc/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/ppc-activos_v2",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/ppc-activos_v2/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/ppc-activos",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/ppc-activos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/turnos",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/turnos/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones/[id]/turnos",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/[id]/turnos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/turnos_v2",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/turnos_v2/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones/[id]/turnos_v2",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/[id]/turnos_v2/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/pauta-diaria/observacion/[id]",
    "module": "pauta-diaria",
    "action": "delete",
    "file": "src/app/api/pauta-diaria/observacion/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/estructuras/instalacion",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/estructuras/instalacion/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/payroll/estructuras-guardia/ensure",
    "module": "payroll",
    "action": "create",
    "file": "src/app/api/payroll/estructuras-guardia/ensure/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/estructuras-guardia/historial",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/estructuras-guardia/historial/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/payroll/estructuras-guardia/items",
    "module": "payroll",
    "action": "create",
    "file": "src/app/api/payroll/estructuras-guardia/items/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra/dashboard",
    "module": "pauta-diaria",
    "action": "read:list",
    "file": "src/app/api/pauta-diaria/turno-extra/dashboard/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra/exportar",
    "module": "pauta-diaria",
    "action": "export",
    "file": "src/app/api/pauta-diaria/turno-extra/exportar/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-diaria/turno-extra/marcar-pagado",
    "module": "pauta-diaria",
    "action": "create",
    "file": "src/app/api/pauta-diaria/turno-extra/marcar-pagado/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-diaria/turno-extra/preservar",
    "module": "pauta-diaria",
    "action": "create",
    "file": "src/app/api/pauta-diaria/turno-extra/preservar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra/preservar",
    "module": "pauta-diaria",
    "action": "read:list",
    "file": "src/app/api/pauta-diaria/turno-extra/preservar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra/planillas",
    "module": "pauta-diaria",
    "action": "read:list",
    "file": "src/app/api/pauta-diaria/turno-extra/planillas/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-diaria/turno-extra/planillas",
    "module": "pauta-diaria",
    "action": "create",
    "file": "src/app/api/pauta-diaria/turno-extra/planillas/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra/stats",
    "module": "pauta-diaria",
    "action": "read:list",
    "file": "src/app/api/pauta-diaria/turno-extra/stats/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-diaria/turno-extra/sync-coberturas",
    "module": "pauta-diaria",
    "action": "create",
    "file": "src/app/api/pauta-diaria/turno-extra/sync-coberturas/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra/sync-coberturas",
    "module": "pauta-diaria",
    "action": "read:list",
    "file": "src/app/api/pauta-diaria/turno-extra/sync-coberturas/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-diaria/turno-extra/limpiar",
    "module": "pauta-diaria",
    "action": "create",
    "file": "src/app/api/pauta-diaria/turno-extra/limpiar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra/limpiar",
    "module": "pauta-diaria",
    "action": "read:list",
    "file": "src/app/api/pauta-diaria/turno-extra/limpiar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/estructuras-servicio/vigente",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/estructuras-servicio/vigente/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra/test",
    "module": "pauta-diaria",
    "action": "read:list",
    "file": "src/app/api/pauta-diaria/turno-extra/test/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/payroll/items/[id]",
    "module": "payroll",
    "action": "update",
    "file": "src/app/api/payroll/items/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/payroll/items/[id]",
    "module": "payroll",
    "action": "delete",
    "file": "src/app/api/payroll/items/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/roles-servicio/instalacion/[id]",
    "module": "roles-servicio",
    "action": "read:detail",
    "file": "src/app/api/roles-servicio/instalacion/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/roles-servicio/[id]/toggle-activo",
    "module": "roles-servicio",
    "action": "update",
    "file": "src/app/api/roles-servicio/[id]/toggle-activo/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/parametros/copiar",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/parametros/copiar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/sueldos/parametros/periodos",
    "module": "sueldos",
    "action": "read:list",
    "file": "src/app/api/sueldos/parametros/periodos/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/turnos/ppc/cubrir",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/ppc/cubrir/route.ts",
    "middleware": [
      "withPermission"
    ]
  },
  {
    "method": "POST",
    "route": "/api/turnos/asistencia/undo",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/asistencia/undo/route.ts",
    "middleware": [
      "withPermission"
    ]
  },
  {
    "method": "GET",
    "route": "/api/payroll/items/opciones",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/items/opciones/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/turnos/ppc/sin-cobertura",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/ppc/sin-cobertura/route.ts",
    "middleware": [
      "withPermission"
    ]
  },
  {
    "method": "PUT",
    "route": "/api/admin/rbac/usuarios/[id]",
    "module": "admin",
    "action": "update",
    "file": "src/app/api/admin/rbac/usuarios/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/admin/rbac/usuarios/[id]",
    "module": "admin",
    "action": "delete",
    "file": "src/app/api/admin/rbac/usuarios/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/admin/rbac/permisos/[id]",
    "module": "admin",
    "action": "update",
    "file": "src/app/api/admin/rbac/permisos/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/admin/rbac/permisos/[id]",
    "module": "admin",
    "action": "delete",
    "file": "src/app/api/admin/rbac/permisos/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/instalaciones/[id]/estructuras-servicio/[estructuraId]",
    "module": "instalaciones",
    "action": "update",
    "file": "src/app/api/instalaciones/[id]/estructuras-servicio/[estructuraId]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/instalaciones/[id]/estructuras-servicio/[estructuraId]",
    "module": "instalaciones",
    "action": "delete",
    "file": "src/app/api/instalaciones/[id]/estructuras-servicio/[estructuraId]/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/admin/rbac/roles/[id]",
    "module": "admin",
    "action": "read:detail",
    "file": "src/app/api/admin/rbac/roles/[id]/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "PUT",
    "route": "/api/admin/rbac/roles/[id]",
    "module": "admin",
    "action": "update",
    "file": "src/app/api/admin/rbac/roles/[id]/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "DELETE",
    "route": "/api/admin/rbac/roles/[id]",
    "module": "admin",
    "action": "delete",
    "file": "src/app/api/admin/rbac/roles/[id]/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "DELETE",
    "route": "/api/instalaciones/[id]/ppc/[ppcId]",
    "module": "instalaciones",
    "action": "delete",
    "file": "src/app/api/instalaciones/[id]/ppc/[ppcId]/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones/[id]/ppc/desasignar",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/[id]/ppc/desasignar/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones/[id]/ppc/desasignar_v2",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/[id]/ppc/desasignar_v2/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/instalaciones/[id]/turnos/[turnoId]",
    "module": "instalaciones",
    "action": "delete",
    "file": "src/app/api/instalaciones/[id]/turnos/[turnoId]/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/payroll/estructuras/instalacion/create",
    "module": "payroll",
    "action": "create",
    "file": "src/app/api/payroll/estructuras/instalacion/create/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/payroll/estructuras/instalacion/ensure",
    "module": "payroll",
    "action": "create",
    "file": "src/app/api/payroll/estructuras/instalacion/ensure/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/payroll/estructuras/instalacion/items",
    "module": "payroll",
    "action": "create",
    "file": "src/app/api/payroll/estructuras/instalacion/items/route.ts",
    "middleware": []
  },
  {
    "method": "PATCH",
    "route": "/api/payroll/estructuras-guardia/[id]/cerrar",
    "module": "payroll",
    "action": "update",
    "file": "src/app/api/payroll/estructuras-guardia/[id]/cerrar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/puestos/[puestoId]",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/puestos/[puestoId]/route.ts",
    "middleware": []
  },
  {
    "method": "PATCH",
    "route": "/api/instalaciones/[id]/puestos/[puestoId]",
    "module": "instalaciones",
    "action": "update",
    "file": "src/app/api/instalaciones/[id]/puestos/[puestoId]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/payroll/estructuras-guardia/items/[id]",
    "module": "payroll",
    "action": "update",
    "file": "src/app/api/payroll/estructuras-guardia/items/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/payroll/estructuras-guardia/items/[id]",
    "module": "payroll",
    "action": "delete",
    "file": "src/app/api/payroll/estructuras-guardia/items/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/admin/rbac/usuarios/[id]/roles",
    "module": "admin",
    "action": "read:detail",
    "file": "src/app/api/admin/rbac/usuarios/[id]/roles/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "POST",
    "route": "/api/admin/rbac/usuarios/[id]/roles",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/rbac/usuarios/[id]/roles/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/guardias/[id]/pagos/[pago_id]/csv",
    "module": "guardias",
    "action": "read:detail",
    "file": "src/app/api/guardias/[id]/pagos/[pago_id]/csv/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/admin/rbac/roles/[id]/make-admin-public",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/rbac/roles/[id]/make-admin-public/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones/[id]/ppc/[ppcId]/desasignar",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/[id]/ppc/[ppcId]/desasignar/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2",
    "module": "instalaciones",
    "action": "delete",
    "file": "src/app/api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2/route.ts",
    "middleware": []
  },
  {
    "method": "PATCH",
    "route": "/api/payroll/estructuras/instalacion/[id]/cerrar",
    "module": "payroll",
    "action": "update",
    "file": "src/app/api/payroll/estructuras/instalacion/[id]/cerrar/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id]",
    "module": "payroll",
    "action": "update",
    "file": "src/app/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id]",
    "module": "payroll",
    "action": "delete",
    "file": "src/app/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/payroll/estructuras/instalacion/items/[id]",
    "module": "payroll",
    "action": "update",
    "file": "src/app/api/payroll/estructuras/instalacion/items/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/payroll/estructuras/instalacion/items/[id]",
    "module": "payroll",
    "action": "delete",
    "file": "src/app/api/payroll/estructuras/instalacion/items/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/admin/rbac/roles/[id]/permisos",
    "module": "admin",
    "action": "read:detail",
    "file": "src/app/api/admin/rbac/roles/[id]/permisos/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "PUT",
    "route": "/api/admin/rbac/roles/[id]/permisos",
    "module": "admin",
    "action": "update",
    "file": "src/app/api/admin/rbac/roles/[id]/permisos/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra/planillas/[id]/descargar",
    "module": "pauta-diaria",
    "action": "read:detail",
    "file": "src/app/api/pauta-diaria/turno-extra/planillas/[id]/descargar/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/pauta-diaria/turno-extra/planillas/[id]/eliminar",
    "module": "pauta-diaria",
    "action": "delete",
    "file": "src/app/api/pauta-diaria/turno-extra/planillas/[id]/eliminar/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada",
    "module": "pauta-diaria",
    "action": "create",
    "file": "src/app/api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada/route.ts",
    "middleware": []
  }
]
```

## Hallazgos estáticos
# Auditoría estática de endpoints RBAC

## Endpoints detectados
```json
[
  {
    "method": "GET",
    "route": "/api/add-tenant-to-tipos-documentos",
    "module": "add-tenant-to-tipos-documentos",
    "action": "read:list",
    "file": "src/app/api/add-tenant-to-tipos-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/alertas-documentos",
    "module": "alertas-documentos",
    "action": "read:list",
    "file": "src/app/api/alertas-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/alertas-documentos",
    "module": "alertas-documentos",
    "action": "create",
    "file": "src/app/api/alertas-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/alertas-documentos",
    "module": "alertas-documentos",
    "action": "update",
    "file": "src/app/api/alertas-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/bancos",
    "module": "bancos",
    "action": "read:list",
    "file": "src/app/api/bancos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/audit-database",
    "module": "audit-database",
    "action": "read:list",
    "file": "src/app/api/audit-database/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/check-documentos-structure",
    "module": "check-documentos-structure",
    "action": "read:list",
    "file": "src/app/api/check-documentos-structure/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/check-sueldo-tables",
    "module": "check-sueldo-tables",
    "action": "read:list",
    "file": "src/app/api/check-sueldo-tables/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/check-tables",
    "module": "check-tables",
    "action": "read:list",
    "file": "src/app/api/check-tables/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/clientes",
    "module": "clientes",
    "action": "read:list",
    "file": "src/app/api/clientes/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/clientes",
    "module": "clientes",
    "action": "create",
    "file": "src/app/api/clientes/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/clientes",
    "module": "clientes",
    "action": "update",
    "file": "src/app/api/clientes/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/clientes",
    "module": "clientes",
    "action": "delete",
    "file": "src/app/api/clientes/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/comunas",
    "module": "comunas",
    "action": "read:list",
    "file": "src/app/api/comunas/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/create-second-tenant",
    "module": "create-second-tenant",
    "action": "create",
    "file": "src/app/api/create-second-tenant/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/database-status",
    "module": "database-status",
    "action": "read:list",
    "file": "src/app/api/database-status/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/describe-clientes",
    "module": "describe-clientes",
    "action": "read:list",
    "file": "src/app/api/describe-clientes/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/document-url",
    "module": "document-url",
    "action": "create",
    "file": "src/app/api/document-url/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/documentos",
    "module": "documentos",
    "action": "read:list",
    "file": "src/app/api/documentos/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/documentos",
    "module": "documentos",
    "action": "delete",
    "file": "src/app/api/documentos/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/documentos-clientes",
    "module": "documentos-clientes",
    "action": "update",
    "file": "src/app/api/documentos-clientes/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/documentos-global",
    "module": "documentos-global",
    "action": "read:list",
    "file": "src/app/api/documentos-global/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/documentos-instalaciones",
    "module": "documentos-instalaciones",
    "action": "update",
    "file": "src/app/api/documentos-instalaciones/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/documents",
    "module": "documents",
    "action": "read:list",
    "file": "src/app/api/documents/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/documents",
    "module": "documents",
    "action": "delete",
    "file": "src/app/api/documents/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/documentos-guardias",
    "module": "documentos-guardias",
    "action": "read:list",
    "file": "src/app/api/documentos-guardias/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/documentos-guardias",
    "module": "documentos-guardias",
    "action": "update",
    "file": "src/app/api/documentos-guardias/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/download-document",
    "module": "download-document",
    "action": "read:list",
    "file": "src/app/api/download-document/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/estructuras-sueldo",
    "module": "estructuras-sueldo",
    "action": "read:list",
    "file": "src/app/api/estructuras-sueldo/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/estructuras-sueldo",
    "module": "estructuras-sueldo",
    "action": "create",
    "file": "src/app/api/estructuras-sueldo/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/flags",
    "module": "flags",
    "action": "read:list",
    "file": "src/app/api/flags/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias-test",
    "module": "guardias-test",
    "action": "read:list",
    "file": "src/app/api/guardias-test/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias",
    "module": "guardias",
    "action": "read:list",
    "file": "src/app/api/guardias/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/guardias",
    "module": "guardias",
    "action": "create",
    "file": "src/app/api/guardias/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias-con-coordenadas",
    "module": "guardias-con-coordenadas",
    "action": "read:list",
    "file": "src/app/api/guardias-con-coordenadas/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones",
    "module": "instalaciones",
    "action": "read:list",
    "file": "src/app/api/instalaciones/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/instalaciones",
    "module": "instalaciones",
    "action": "update",
    "file": "src/app/api/instalaciones/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/instalaciones",
    "module": "instalaciones",
    "action": "delete",
    "file": "src/app/api/instalaciones/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones-con-coordenadas",
    "module": "instalaciones-con-coordenadas",
    "action": "read:list",
    "file": "src/app/api/instalaciones-con-coordenadas/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/init-users",
    "module": "init-users",
    "action": "create",
    "file": "src/app/api/init-users/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones-con-turnos-extras",
    "module": "instalaciones-con-turnos-extras",
    "action": "read:list",
    "file": "src/app/api/instalaciones-con-turnos-extras/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones-con-ppc-activos",
    "module": "instalaciones-con-ppc-activos",
    "action": "read:list",
    "file": "src/app/api/instalaciones-con-ppc-activos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/logs",
    "module": "logs",
    "action": "read:list",
    "file": "src/app/api/logs/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/logs",
    "module": "logs",
    "action": "create",
    "file": "src/app/api/logs/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/migrate-alertas-documentos",
    "module": "migrate-alertas-documentos",
    "action": "read:list",
    "file": "src/app/api/migrate-alertas-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/migrate-clientes",
    "module": "migrate-clientes",
    "action": "read:list",
    "file": "src/app/api/migrate-clientes/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/migrate-documentos-tipos-multi-tenant",
    "module": "migrate-documentos-tipos-multi-tenant",
    "action": "read:list",
    "file": "src/app/api/migrate-documentos-tipos-multi-tenant/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/migrate-documentos",
    "module": "migrate-documentos",
    "action": "read:list",
    "file": "src/app/api/migrate-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/migrate-logs-clientes",
    "module": "migrate-logs-clientes",
    "action": "read:list",
    "file": "src/app/api/migrate-logs-clientes/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/migrate-planillas-add-codigo",
    "module": "migrate-planillas-add-codigo",
    "action": "create",
    "file": "src/app/api/migrate-planillas-add-codigo/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/migrate",
    "module": "migrate",
    "action": "create",
    "file": "src/app/api/migrate/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/migrate",
    "module": "migrate",
    "action": "read:list",
    "file": "src/app/api/migrate/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/migrate-preserve",
    "module": "migrate-preserve",
    "action": "create",
    "file": "src/app/api/migrate-preserve/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/migrate-preserve",
    "module": "migrate-preserve",
    "action": "read:list",
    "file": "src/app/api/migrate-preserve/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/migrate-planillas-turnos-extras",
    "module": "migrate-planillas-turnos-extras",
    "action": "create",
    "file": "src/app/api/migrate-planillas-turnos-extras/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/migrate-tipos-documentos",
    "module": "migrate-tipos-documentos",
    "action": "read:list",
    "file": "src/app/api/migrate-tipos-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/migrate-usuarios",
    "module": "migrate-usuarios",
    "action": "read:list",
    "file": "src/app/api/migrate-usuarios/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/migrate-rename-tables-te",
    "module": "migrate-rename-tables-te",
    "action": "create",
    "file": "src/app/api/migrate-rename-tables-te/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria",
    "module": "pauta-diaria",
    "action": "read:list",
    "file": "src/app/api/pauta-diaria/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-mensual",
    "module": "pauta-mensual",
    "action": "read:list",
    "file": "src/app/api/pauta-mensual/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/rename-tipos-documentos",
    "module": "rename-tipos-documentos",
    "action": "read:list",
    "file": "src/app/api/rename-tipos-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/roles",
    "module": "roles",
    "action": "read:list",
    "file": "src/app/api/roles/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/ppc",
    "module": "ppc",
    "action": "read:list",
    "file": "src/app/api/ppc/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/setup-permissions",
    "module": "setup-permissions",
    "action": "create",
    "file": "src/app/api/setup-permissions/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/roles-servicio",
    "module": "roles-servicio",
    "action": "read:list",
    "file": "src/app/api/roles-servicio/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/roles-servicio",
    "module": "roles-servicio",
    "action": "create",
    "file": "src/app/api/roles-servicio/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/test-afp",
    "module": "test-afp",
    "action": "read:list",
    "file": "src/app/api/test-afp/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/test-db-connection",
    "module": "test-db-connection",
    "action": "read:list",
    "file": "src/app/api/test-db-connection/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/test-db-structure",
    "module": "test-db-structure",
    "action": "read:list",
    "file": "src/app/api/test-db-structure/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/test-estructuras-sueldo",
    "module": "test-estructuras-sueldo",
    "action": "read:list",
    "file": "src/app/api/test-estructuras-sueldo/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/test-roles-servicio",
    "module": "test-roles-servicio",
    "action": "read:list",
    "file": "src/app/api/test-roles-servicio/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/test-sueldo-simple",
    "module": "test-sueldo-simple",
    "action": "read:list",
    "file": "src/app/api/test-sueldo-simple/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/test-table-structure",
    "module": "test-table-structure",
    "action": "read:list",
    "file": "src/app/api/test-table-structure/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/tipos-documentos",
    "module": "tipos-documentos",
    "action": "read:list",
    "file": "src/app/api/tipos-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/tipos-documentos",
    "module": "tipos-documentos",
    "action": "create",
    "file": "src/app/api/tipos-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/tipos-documentos",
    "module": "tipos-documentos",
    "action": "update",
    "file": "src/app/api/tipos-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/tipos-documentos",
    "module": "tipos-documentos",
    "action": "delete",
    "file": "src/app/api/tipos-documentos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/tipos-puesto",
    "module": "tipos-puesto",
    "action": "read:list",
    "file": "src/app/api/tipos-puesto/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/tipos-puesto",
    "module": "tipos-puesto",
    "action": "create",
    "file": "src/app/api/tipos-puesto/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/test-param",
    "module": "test-param",
    "action": "read:list",
    "file": "src/app/api/test-param/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/users",
    "module": "users",
    "action": "read:list",
    "file": "src/app/api/users/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/upload-document",
    "module": "upload-document",
    "action": "create",
    "file": "src/app/api/upload-document/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/admin/actualizar-turnos-extras",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/actualizar-turnos-extras/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/admin/tenants",
    "module": "admin",
    "action": "read:list",
    "file": "src/app/api/admin/tenants/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "POST",
    "route": "/api/admin/tenants",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/tenants/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "POST",
    "route": "/api/auth/login",
    "module": "auth",
    "action": "create",
    "file": "src/app/api/auth/login/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/clientes/[id]",
    "module": "clientes",
    "action": "read:detail",
    "file": "src/app/api/clientes/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/clientes/[id]",
    "module": "clientes",
    "action": "update",
    "file": "src/app/api/clientes/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/doc/templates",
    "module": "doc",
    "action": "read:list",
    "file": "src/app/api/doc/templates/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/doc/templates",
    "module": "doc",
    "action": "create",
    "file": "src/app/api/doc/templates/route.ts",
    "middleware": []
  },
  {
    "method": "PATCH",
    "route": "/api/documentos/[id]",
    "module": "documentos",
    "action": "update",
    "file": "src/app/api/documentos/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/debug/whoami",
    "module": "debug",
    "action": "read:list",
    "file": "src/app/api/debug/whoami/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/estructuras-servicio/global",
    "module": "estructuras-servicio",
    "action": "read:list",
    "file": "src/app/api/estructuras-servicio/global/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/estructuras-servicio/global",
    "module": "estructuras-servicio",
    "action": "update",
    "file": "src/app/api/estructuras-servicio/global/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/estructuras-sueldo/[id]",
    "module": "estructuras-sueldo",
    "action": "read:detail",
    "file": "src/app/api/estructuras-sueldo/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/estructuras-sueldo/[id]",
    "module": "estructuras-sueldo",
    "action": "update",
    "file": "src/app/api/estructuras-sueldo/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/estructuras-sueldo/[id]",
    "module": "estructuras-sueldo",
    "action": "delete",
    "file": "src/app/api/estructuras-sueldo/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/estructuras-sueldo/inactivar",
    "module": "estructuras-sueldo",
    "action": "create",
    "file": "src/app/api/estructuras-sueldo/inactivar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias/buscar",
    "module": "guardias",
    "action": "read:list",
    "file": "src/app/api/guardias/buscar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias/conflictos",
    "module": "guardias",
    "action": "read:list",
    "file": "src/app/api/guardias/conflictos/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/guardias/[id]",
    "module": "guardias",
    "action": "update",
    "file": "src/app/api/guardias/[id]/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/guardias/[id]",
    "module": "guardias",
    "action": "read:detail",
    "file": "src/app/api/guardias/[id]/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "PATCH",
    "route": "/api/guardias/[id]",
    "module": "guardias",
    "action": "update",
    "file": "src/app/api/guardias/[id]/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "DELETE",
    "route": "/api/guardias/[id]",
    "module": "guardias",
    "action": "delete",
    "file": "src/app/api/guardias/[id]/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/guardias/disponibles",
    "module": "guardias",
    "action": "read:list",
    "file": "src/app/api/guardias/disponibles/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias/guardia-metrics",
    "module": "guardias",
    "action": "read:list",
    "file": "src/app/api/guardias/guardia-metrics/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/guardias/permisos",
    "module": "guardias",
    "action": "create",
    "file": "src/app/api/guardias/permisos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias/permisos",
    "module": "guardias",
    "action": "read:list",
    "file": "src/app/api/guardias/permisos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guards/nearby",
    "module": "guards",
    "action": "read:list",
    "file": "src/app/api/guards/nearby/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/kpis",
    "module": "instalaciones",
    "action": "read:list",
    "file": "src/app/api/instalaciones/kpis/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/documentos-vencidos",
    "module": "instalaciones",
    "action": "read:list",
    "file": "src/app/api/instalaciones/documentos-vencidos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/logs/check-structure",
    "module": "logs",
    "action": "read:list",
    "file": "src/app/api/logs/check-structure/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/logs/cleanup-test",
    "module": "logs",
    "action": "delete",
    "file": "src/app/api/logs/cleanup-test/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/logs/exportar",
    "module": "logs",
    "action": "export",
    "file": "src/app/api/logs/exportar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/logs/filtros",
    "module": "logs",
    "action": "read:list",
    "file": "src/app/api/logs/filtros/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/logs/test",
    "module": "logs",
    "action": "read:list",
    "file": "src/app/api/logs/test/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/me/password",
    "module": "me",
    "action": "update",
    "file": "src/app/api/me/password/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/me/permissions",
    "module": "me",
    "action": "read:list",
    "file": "src/app/api/me/permissions/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/me/effective-permissions",
    "module": "me",
    "action": "read:list",
    "file": "src/app/api/me/effective-permissions/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/me/ping",
    "module": "me",
    "action": "read:list",
    "file": "src/app/api/me/ping/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/me/profile",
    "module": "me",
    "action": "read:list",
    "file": "src/app/api/me/profile/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/me/profile",
    "module": "me",
    "action": "update",
    "file": "src/app/api/me/profile/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/pauta-mensual/actualizar-celda",
    "module": "pauta-mensual",
    "action": "update",
    "file": "src/app/api/pauta-mensual/actualizar-celda/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-mensual/crear",
    "module": "pauta-mensual",
    "action": "create",
    "file": "src/app/api/pauta-mensual/crear/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/pauta-mensual/eliminar",
    "module": "pauta-mensual",
    "action": "delete",
    "file": "src/app/api/pauta-mensual/eliminar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-mensual/exportar-xlsx",
    "module": "pauta-mensual",
    "action": "export",
    "file": "src/app/api/pauta-mensual/exportar-xlsx/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-mensual/exportar-pdf",
    "module": "pauta-mensual",
    "action": "export",
    "file": "src/app/api/pauta-mensual/exportar-pdf/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-mensual/guardar",
    "module": "pauta-mensual",
    "action": "create",
    "file": "src/app/api/pauta-mensual/guardar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-mensual/resumen",
    "module": "pauta-mensual",
    "action": "read:list",
    "file": "src/app/api/pauta-mensual/resumen/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-mensual/verificar-roles",
    "module": "pauta-mensual",
    "action": "create",
    "file": "src/app/api/pauta-mensual/verificar-roles/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/estructuras-guardia",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/estructuras-guardia/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-diaria/turno-extra",
    "module": "pauta-diaria",
    "action": "create",
    "file": "src/app/api/pauta-diaria/turno-extra/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra",
    "module": "pauta-diaria",
    "action": "read:list",
    "file": "src/app/api/pauta-diaria/turno-extra/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/guardias",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/guardias/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/instalaciones",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/instalaciones/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/sueldo-items",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/sueldo-items/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/items-extras",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/items-extras/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/payroll/items-extras",
    "module": "payroll",
    "action": "create",
    "file": "src/app/api/payroll/items-extras/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/payroll/items-extras",
    "module": "payroll",
    "action": "update",
    "file": "src/app/api/payroll/items-extras/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/payroll/items-extras",
    "module": "payroll",
    "action": "delete",
    "file": "src/app/api/payroll/items-extras/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/roles-servicio",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/roles-servicio/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/rbac/can",
    "module": "rbac",
    "action": "read:list",
    "file": "src/app/api/rbac/can/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "POST",
    "route": "/api/ppc/asignar",
    "module": "ppc",
    "action": "create",
    "file": "src/app/api/ppc/asignar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/items",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/items/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/payroll/items",
    "module": "payroll",
    "action": "create",
    "file": "src/app/api/payroll/items/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/ppc/metricas",
    "module": "ppc",
    "action": "read:list",
    "file": "src/app/api/ppc/metricas/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/ppc/pendientes",
    "module": "ppc",
    "action": "read:list",
    "file": "src/app/api/ppc/pendientes/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/roles-servicio/inactivar",
    "module": "roles-servicio",
    "action": "create",
    "file": "src/app/api/roles-servicio/inactivar/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/roles-servicio/activar",
    "module": "roles-servicio",
    "action": "create",
    "file": "src/app/api/roles-servicio/activar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/roles-servicio/stats",
    "module": "roles-servicio",
    "action": "read:list",
    "file": "src/app/api/roles-servicio/stats/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/roles-servicio/verificar-pautas",
    "module": "roles-servicio",
    "action": "create",
    "file": "src/app/api/roles-servicio/verificar-pautas/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/roles-servicio/[id]",
    "module": "roles-servicio",
    "action": "read:detail",
    "file": "src/app/api/roles-servicio/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/roles-servicio/[id]",
    "module": "roles-servicio",
    "action": "update",
    "file": "src/app/api/roles-servicio/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/roles-servicio/[id]",
    "module": "roles-servicio",
    "action": "delete",
    "file": "src/app/api/roles-servicio/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PATCH",
    "route": "/api/roles-servicio/[id]",
    "module": "roles-servicio",
    "action": "update",
    "file": "src/app/api/roles-servicio/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/calcular",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/calcular/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/sueldos/calcular",
    "module": "sueldos",
    "action": "read:list",
    "file": "src/app/api/sueldos/calcular/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/migrar-estructura",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/migrar-estructura/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/sueldos/debug-tabla",
    "module": "sueldos",
    "action": "read:list",
    "file": "src/app/api/sueldos/debug-tabla/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/init-db",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/init-db/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/sueldos/init-db",
    "module": "sueldos",
    "action": "read:list",
    "file": "src/app/api/sueldos/init-db/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/migrar-parametros",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/migrar-parametros/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/migrate",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/migrate/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/sueldos/migrate",
    "module": "sueldos",
    "action": "read:list",
    "file": "src/app/api/sueldos/migrate/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/sueldos/parametros",
    "module": "sueldos",
    "action": "read:list",
    "file": "src/app/api/sueldos/parametros/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/parametros",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/parametros/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/sueldos/parametros",
    "module": "sueldos",
    "action": "update",
    "file": "src/app/api/sueldos/parametros/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/sueldos/parametros",
    "module": "sueldos",
    "action": "delete",
    "file": "src/app/api/sueldos/parametros/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/planilla",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/planilla/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/sueldos/planilla",
    "module": "sueldos",
    "action": "read:list",
    "file": "src/app/api/sueldos/planilla/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/sueldos/planilla",
    "module": "sueldos",
    "action": "update",
    "file": "src/app/api/sueldos/planilla/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/reporte",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/reporte/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/sueldos/reporte",
    "module": "sueldos",
    "action": "read:list",
    "file": "src/app/api/sueldos/reporte/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/verificar-parametros",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/verificar-parametros/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/tipos-puesto/[id]",
    "module": "tipos-puesto",
    "action": "read:detail",
    "file": "src/app/api/tipos-puesto/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/tipos-puesto/[id]",
    "module": "tipos-puesto",
    "action": "update",
    "file": "src/app/api/tipos-puesto/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/tipos-puesto/[id]",
    "module": "tipos-puesto",
    "action": "delete",
    "file": "src/app/api/tipos-puesto/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/turnos/asistencia",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/asistencia/route.ts",
    "middleware": [
      "withPermission"
    ]
  },
  {
    "method": "POST",
    "route": "/api/turnos/deshacer",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/deshacer/route.ts",
    "middleware": [
      "withPermission"
    ]
  },
  {
    "method": "POST",
    "route": "/api/turnos/cobertura",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/cobertura/route.ts",
    "middleware": [
      "withPermission"
    ]
  },
  {
    "method": "POST",
    "route": "/api/turnos/asistencia-new",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/asistencia-new/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/turnos/deshacer-new",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/deshacer-new/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/turnos/extra-new",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/extra-new/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/turnos/inasistencia",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/inasistencia/route.ts",
    "middleware": [
      "withPermission"
    ]
  },
  {
    "method": "POST",
    "route": "/api/turnos/reemplazo-new",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/reemplazo-new/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/admin/rbac/assign-admin-role",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/rbac/assign-admin-role/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/turnos/revertir",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/revertir/route.ts",
    "middleware": [
      "withPermission"
    ]
  },
  {
    "method": "POST",
    "route": "/api/admin/rbac/clean-test-user",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/rbac/clean-test-user/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/admin/rbac/create-admin-role",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/rbac/create-admin-role/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "POST",
    "route": "/api/admin/rbac/create-permissions-batch",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/rbac/create-permissions-batch/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/admin/rbac/debug-permissions",
    "module": "admin",
    "action": "read:list",
    "file": "src/app/api/admin/rbac/debug-permissions/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/admin/rbac/debug-permissions-public",
    "module": "admin",
    "action": "read:list",
    "file": "src/app/api/admin/rbac/debug-permissions-public/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/admin/rbac/fix-admin-permissions",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/rbac/fix-admin-permissions/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/admin/rbac/roles",
    "module": "admin",
    "action": "read:list",
    "file": "src/app/api/admin/rbac/roles/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "POST",
    "route": "/api/admin/rbac/roles",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/rbac/roles/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/admin/rbac/usuarios",
    "module": "admin",
    "action": "read:list",
    "file": "src/app/api/admin/rbac/usuarios/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "POST",
    "route": "/api/admin/rbac/usuarios",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/rbac/usuarios/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/admin/rbac/permisos",
    "module": "admin",
    "action": "read:list",
    "file": "src/app/api/admin/rbac/permisos/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "POST",
    "route": "/api/admin/tenants/create",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/tenants/create/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/vars/variables",
    "module": "vars",
    "action": "read:list",
    "file": "src/app/api/vars/variables/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/doc/templates/[id]",
    "module": "doc",
    "action": "read:detail",
    "file": "src/app/api/doc/templates/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/doc/templates/[id]",
    "module": "doc",
    "action": "update",
    "file": "src/app/api/doc/templates/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/doc/templates/[id]",
    "module": "doc",
    "action": "delete",
    "file": "src/app/api/doc/templates/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/estructuras-servicio/[estructuraId]/activar",
    "module": "estructuras-servicio",
    "action": "update",
    "file": "src/app/api/estructuras-servicio/[estructuraId]/activar/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/estructuras-sueldo/[id]/inactivar",
    "module": "estructuras-sueldo",
    "action": "update",
    "file": "src/app/api/estructuras-sueldo/[id]/inactivar/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/estructuras-servicio/[estructuraId]/inactivar",
    "module": "estructuras-servicio",
    "action": "update",
    "file": "src/app/api/estructuras-servicio/[estructuraId]/inactivar/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/estructuras-sueldo/[id]/toggle-activo",
    "module": "estructuras-sueldo",
    "action": "update",
    "file": "src/app/api/estructuras-sueldo/[id]/toggle-activo/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias/[id]/asignacion",
    "module": "guardias",
    "action": "read:detail",
    "file": "src/app/api/guardias/[id]/asignacion/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias/[id]/asignacion-actual",
    "module": "guardias",
    "action": "read:detail",
    "file": "src/app/api/guardias/[id]/asignacion-actual/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/guardias/[id]/bancarios",
    "module": "guardias",
    "action": "create",
    "file": "src/app/api/guardias/[id]/bancarios/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/estructuras-sueldo/por-rol/[id]",
    "module": "estructuras-sueldo",
    "action": "read:detail",
    "file": "src/app/api/estructuras-sueldo/por-rol/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/estructuras-sueldo/por-rol/[id]",
    "module": "estructuras-sueldo",
    "action": "update",
    "file": "src/app/api/estructuras-sueldo/por-rol/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/guardias/[id]/fecha-os10",
    "module": "guardias",
    "action": "update",
    "file": "src/app/api/guardias/[id]/fecha-os10/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/guardias/[id]/banco",
    "module": "guardias",
    "action": "read:detail",
    "file": "src/app/api/guardias/[id]/banco/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "PATCH",
    "route": "/api/guardias/[id]/banco",
    "module": "guardias",
    "action": "update",
    "file": "src/app/api/guardias/[id]/banco/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/guardias/[id]/historial-mensual",
    "module": "guardias",
    "action": "read:detail",
    "file": "src/app/api/guardias/[id]/historial-mensual/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias/[id]/pagos-turnos-extras",
    "module": "guardias",
    "action": "read:detail",
    "file": "src/app/api/guardias/[id]/pagos-turnos-extras/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/guardias/[id]/terminar-asignacion",
    "module": "guardias",
    "action": "create",
    "file": "src/app/api/guardias/[id]/terminar-asignacion/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/guardias/permisos/[id]",
    "module": "guardias",
    "action": "delete",
    "file": "src/app/api/guardias/permisos/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/completa",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/completa/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/estadisticas",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/estadisticas/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/guardias/[id]/pagos",
    "module": "guardias",
    "action": "read:detail",
    "file": "src/app/api/guardias/[id]/pagos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/estadisticas_v2",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/estadisticas_v2/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/estructuras-servicio",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/estructuras-servicio/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones/[id]/estructuras-servicio",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/[id]/estructuras-servicio/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/ppc",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/ppc/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones/[id]/ppc",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/[id]/ppc/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/ppc-activos_v2",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/ppc-activos_v2/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/ppc-activos",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/ppc-activos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/turnos",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/turnos/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones/[id]/turnos",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/[id]/turnos/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/turnos_v2",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/turnos_v2/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones/[id]/turnos_v2",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/[id]/turnos_v2/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/pauta-diaria/observacion/[id]",
    "module": "pauta-diaria",
    "action": "delete",
    "file": "src/app/api/pauta-diaria/observacion/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/estructuras/instalacion",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/estructuras/instalacion/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/payroll/estructuras-guardia/ensure",
    "module": "payroll",
    "action": "create",
    "file": "src/app/api/payroll/estructuras-guardia/ensure/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/estructuras-guardia/historial",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/estructuras-guardia/historial/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/payroll/estructuras-guardia/items",
    "module": "payroll",
    "action": "create",
    "file": "src/app/api/payroll/estructuras-guardia/items/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra/dashboard",
    "module": "pauta-diaria",
    "action": "read:list",
    "file": "src/app/api/pauta-diaria/turno-extra/dashboard/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra/exportar",
    "module": "pauta-diaria",
    "action": "export",
    "file": "src/app/api/pauta-diaria/turno-extra/exportar/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-diaria/turno-extra/marcar-pagado",
    "module": "pauta-diaria",
    "action": "create",
    "file": "src/app/api/pauta-diaria/turno-extra/marcar-pagado/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-diaria/turno-extra/preservar",
    "module": "pauta-diaria",
    "action": "create",
    "file": "src/app/api/pauta-diaria/turno-extra/preservar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra/preservar",
    "module": "pauta-diaria",
    "action": "read:list",
    "file": "src/app/api/pauta-diaria/turno-extra/preservar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra/planillas",
    "module": "pauta-diaria",
    "action": "read:list",
    "file": "src/app/api/pauta-diaria/turno-extra/planillas/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-diaria/turno-extra/planillas",
    "module": "pauta-diaria",
    "action": "create",
    "file": "src/app/api/pauta-diaria/turno-extra/planillas/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra/stats",
    "module": "pauta-diaria",
    "action": "read:list",
    "file": "src/app/api/pauta-diaria/turno-extra/stats/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-diaria/turno-extra/sync-coberturas",
    "module": "pauta-diaria",
    "action": "create",
    "file": "src/app/api/pauta-diaria/turno-extra/sync-coberturas/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra/sync-coberturas",
    "module": "pauta-diaria",
    "action": "read:list",
    "file": "src/app/api/pauta-diaria/turno-extra/sync-coberturas/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-diaria/turno-extra/limpiar",
    "module": "pauta-diaria",
    "action": "create",
    "file": "src/app/api/pauta-diaria/turno-extra/limpiar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra/limpiar",
    "module": "pauta-diaria",
    "action": "read:list",
    "file": "src/app/api/pauta-diaria/turno-extra/limpiar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/payroll/estructuras-servicio/vigente",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/estructuras-servicio/vigente/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra/test",
    "module": "pauta-diaria",
    "action": "read:list",
    "file": "src/app/api/pauta-diaria/turno-extra/test/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/payroll/items/[id]",
    "module": "payroll",
    "action": "update",
    "file": "src/app/api/payroll/items/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/payroll/items/[id]",
    "module": "payroll",
    "action": "delete",
    "file": "src/app/api/payroll/items/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/roles-servicio/instalacion/[id]",
    "module": "roles-servicio",
    "action": "read:detail",
    "file": "src/app/api/roles-servicio/instalacion/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/roles-servicio/[id]/toggle-activo",
    "module": "roles-servicio",
    "action": "update",
    "file": "src/app/api/roles-servicio/[id]/toggle-activo/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/sueldos/parametros/copiar",
    "module": "sueldos",
    "action": "create",
    "file": "src/app/api/sueldos/parametros/copiar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/sueldos/parametros/periodos",
    "module": "sueldos",
    "action": "read:list",
    "file": "src/app/api/sueldos/parametros/periodos/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/turnos/ppc/cubrir",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/ppc/cubrir/route.ts",
    "middleware": [
      "withPermission"
    ]
  },
  {
    "method": "POST",
    "route": "/api/turnos/asistencia/undo",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/asistencia/undo/route.ts",
    "middleware": [
      "withPermission"
    ]
  },
  {
    "method": "GET",
    "route": "/api/payroll/items/opciones",
    "module": "payroll",
    "action": "read:list",
    "file": "src/app/api/payroll/items/opciones/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/turnos/ppc/sin-cobertura",
    "module": "turnos",
    "action": "create",
    "file": "src/app/api/turnos/ppc/sin-cobertura/route.ts",
    "middleware": [
      "withPermission"
    ]
  },
  {
    "method": "PUT",
    "route": "/api/admin/rbac/usuarios/[id]",
    "module": "admin",
    "action": "update",
    "file": "src/app/api/admin/rbac/usuarios/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/admin/rbac/usuarios/[id]",
    "module": "admin",
    "action": "delete",
    "file": "src/app/api/admin/rbac/usuarios/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/admin/rbac/permisos/[id]",
    "module": "admin",
    "action": "update",
    "file": "src/app/api/admin/rbac/permisos/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/admin/rbac/permisos/[id]",
    "module": "admin",
    "action": "delete",
    "file": "src/app/api/admin/rbac/permisos/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/instalaciones/[id]/estructuras-servicio/[estructuraId]",
    "module": "instalaciones",
    "action": "update",
    "file": "src/app/api/instalaciones/[id]/estructuras-servicio/[estructuraId]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/instalaciones/[id]/estructuras-servicio/[estructuraId]",
    "module": "instalaciones",
    "action": "delete",
    "file": "src/app/api/instalaciones/[id]/estructuras-servicio/[estructuraId]/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/admin/rbac/roles/[id]",
    "module": "admin",
    "action": "read:detail",
    "file": "src/app/api/admin/rbac/roles/[id]/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "PUT",
    "route": "/api/admin/rbac/roles/[id]",
    "module": "admin",
    "action": "update",
    "file": "src/app/api/admin/rbac/roles/[id]/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "DELETE",
    "route": "/api/admin/rbac/roles/[id]",
    "module": "admin",
    "action": "delete",
    "file": "src/app/api/admin/rbac/roles/[id]/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "DELETE",
    "route": "/api/instalaciones/[id]/ppc/[ppcId]",
    "module": "instalaciones",
    "action": "delete",
    "file": "src/app/api/instalaciones/[id]/ppc/[ppcId]/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones/[id]/ppc/desasignar",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/[id]/ppc/desasignar/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones/[id]/ppc/desasignar_v2",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/[id]/ppc/desasignar_v2/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/instalaciones/[id]/turnos/[turnoId]",
    "module": "instalaciones",
    "action": "delete",
    "file": "src/app/api/instalaciones/[id]/turnos/[turnoId]/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/payroll/estructuras/instalacion/create",
    "module": "payroll",
    "action": "create",
    "file": "src/app/api/payroll/estructuras/instalacion/create/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/payroll/estructuras/instalacion/ensure",
    "module": "payroll",
    "action": "create",
    "file": "src/app/api/payroll/estructuras/instalacion/ensure/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/payroll/estructuras/instalacion/items",
    "module": "payroll",
    "action": "create",
    "file": "src/app/api/payroll/estructuras/instalacion/items/route.ts",
    "middleware": []
  },
  {
    "method": "PATCH",
    "route": "/api/payroll/estructuras-guardia/[id]/cerrar",
    "module": "payroll",
    "action": "update",
    "file": "src/app/api/payroll/estructuras-guardia/[id]/cerrar/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/instalaciones/[id]/puestos/[puestoId]",
    "module": "instalaciones",
    "action": "read:detail",
    "file": "src/app/api/instalaciones/[id]/puestos/[puestoId]/route.ts",
    "middleware": []
  },
  {
    "method": "PATCH",
    "route": "/api/instalaciones/[id]/puestos/[puestoId]",
    "module": "instalaciones",
    "action": "update",
    "file": "src/app/api/instalaciones/[id]/puestos/[puestoId]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/payroll/estructuras-guardia/items/[id]",
    "module": "payroll",
    "action": "update",
    "file": "src/app/api/payroll/estructuras-guardia/items/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/payroll/estructuras-guardia/items/[id]",
    "module": "payroll",
    "action": "delete",
    "file": "src/app/api/payroll/estructuras-guardia/items/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/admin/rbac/usuarios/[id]/roles",
    "module": "admin",
    "action": "read:detail",
    "file": "src/app/api/admin/rbac/usuarios/[id]/roles/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "POST",
    "route": "/api/admin/rbac/usuarios/[id]/roles",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/rbac/usuarios/[id]/roles/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/guardias/[id]/pagos/[pago_id]/csv",
    "module": "guardias",
    "action": "read:detail",
    "file": "src/app/api/guardias/[id]/pagos/[pago_id]/csv/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/admin/rbac/roles/[id]/make-admin-public",
    "module": "admin",
    "action": "create",
    "file": "src/app/api/admin/rbac/roles/[id]/make-admin-public/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones/[id]/ppc/[ppcId]/desasignar",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/[id]/ppc/[ppcId]/desasignar/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs",
    "module": "instalaciones",
    "action": "create",
    "file": "src/app/api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2",
    "module": "instalaciones",
    "action": "delete",
    "file": "src/app/api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2/route.ts",
    "middleware": []
  },
  {
    "method": "PATCH",
    "route": "/api/payroll/estructuras/instalacion/[id]/cerrar",
    "module": "payroll",
    "action": "update",
    "file": "src/app/api/payroll/estructuras/instalacion/[id]/cerrar/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id]",
    "module": "payroll",
    "action": "update",
    "file": "src/app/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id]",
    "module": "payroll",
    "action": "delete",
    "file": "src/app/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id]/route.ts",
    "middleware": []
  },
  {
    "method": "PUT",
    "route": "/api/payroll/estructuras/instalacion/items/[id]",
    "module": "payroll",
    "action": "update",
    "file": "src/app/api/payroll/estructuras/instalacion/items/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/payroll/estructuras/instalacion/items/[id]",
    "module": "payroll",
    "action": "delete",
    "file": "src/app/api/payroll/estructuras/instalacion/items/[id]/route.ts",
    "middleware": []
  },
  {
    "method": "GET",
    "route": "/api/admin/rbac/roles/[id]/permisos",
    "module": "admin",
    "action": "read:detail",
    "file": "src/app/api/admin/rbac/roles/[id]/permisos/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "PUT",
    "route": "/api/admin/rbac/roles/[id]/permisos",
    "module": "admin",
    "action": "update",
    "file": "src/app/api/admin/rbac/roles/[id]/permisos/route.ts",
    "middleware": [
      "userHasPerm-inline"
    ]
  },
  {
    "method": "GET",
    "route": "/api/pauta-diaria/turno-extra/planillas/[id]/descargar",
    "module": "pauta-diaria",
    "action": "read:detail",
    "file": "src/app/api/pauta-diaria/turno-extra/planillas/[id]/descargar/route.ts",
    "middleware": []
  },
  {
    "method": "DELETE",
    "route": "/api/pauta-diaria/turno-extra/planillas/[id]/eliminar",
    "module": "pauta-diaria",
    "action": "delete",
    "file": "src/app/api/pauta-diaria/turno-extra/planillas/[id]/eliminar/route.ts",
    "middleware": []
  },
  {
    "method": "POST",
    "route": "/api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada",
    "module": "pauta-diaria",
    "action": "create",
    "file": "src/app/api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada/route.ts",
    "middleware": []
  }
]
```

## Hallazgos
- P1: POST /api/alertas-documentos sin middleware de autorización (src/app/api/alertas-documentos/route.ts)
- P1: PUT /api/alertas-documentos sin middleware de autorización (src/app/api/alertas-documentos/route.ts)
- P1: POST /api/clientes sin middleware de autorización (src/app/api/clientes/route.ts)
- P1: PUT /api/clientes sin middleware de autorización (src/app/api/clientes/route.ts)
- P1: DELETE /api/clientes sin middleware de autorización (src/app/api/clientes/route.ts)
- P1: POST /api/create-second-tenant sin middleware de autorización (src/app/api/create-second-tenant/route.ts)
- P1: POST /api/document-url sin middleware de autorización (src/app/api/document-url/route.ts)
- P1: DELETE /api/documentos sin middleware de autorización (src/app/api/documentos/route.ts)
- P1: PUT /api/documentos-clientes sin middleware de autorización (src/app/api/documentos-clientes/route.ts)
- P1: PUT /api/documentos-instalaciones sin middleware de autorización (src/app/api/documentos-instalaciones/route.ts)
- P1: DELETE /api/documents sin middleware de autorización (src/app/api/documents/route.ts)
- P1: PUT /api/documentos-guardias sin middleware de autorización (src/app/api/documentos-guardias/route.ts)
- P1: POST /api/estructuras-sueldo sin middleware de autorización (src/app/api/estructuras-sueldo/route.ts)
- P1: POST /api/guardias sin middleware de autorización (src/app/api/guardias/route.ts)
- P1: POST /api/instalaciones sin middleware de autorización (src/app/api/instalaciones/route.ts)
- P1: PUT /api/instalaciones sin middleware de autorización (src/app/api/instalaciones/route.ts)
- P1: DELETE /api/instalaciones sin middleware de autorización (src/app/api/instalaciones/route.ts)
- P1: POST /api/init-users sin middleware de autorización (src/app/api/init-users/route.ts)
- P1: POST /api/logs sin middleware de autorización (src/app/api/logs/route.ts)
- P1: POST /api/migrate-planillas-add-codigo sin middleware de autorización (src/app/api/migrate-planillas-add-codigo/route.ts)
- P1: POST /api/migrate sin middleware de autorización (src/app/api/migrate/route.ts)
- P1: POST /api/migrate-preserve sin middleware de autorización (src/app/api/migrate-preserve/route.ts)
- P1: POST /api/migrate-planillas-turnos-extras sin middleware de autorización (src/app/api/migrate-planillas-turnos-extras/route.ts)
- P1: POST /api/migrate-rename-tables-te sin middleware de autorización (src/app/api/migrate-rename-tables-te/route.ts)
- P1: POST /api/setup-permissions sin middleware de autorización (src/app/api/setup-permissions/route.ts)
- P1: POST /api/roles-servicio sin middleware de autorización (src/app/api/roles-servicio/route.ts)
- P1: POST /api/tipos-documentos sin middleware de autorización (src/app/api/tipos-documentos/route.ts)
- P1: PUT /api/tipos-documentos sin middleware de autorización (src/app/api/tipos-documentos/route.ts)
- P1: DELETE /api/tipos-documentos sin middleware de autorización (src/app/api/tipos-documentos/route.ts)
- P1: POST /api/tipos-puesto sin middleware de autorización (src/app/api/tipos-puesto/route.ts)
- P1: POST /api/upload-document sin middleware de autorización (src/app/api/upload-document/route.ts)
- P1: POST /api/admin/actualizar-turnos-extras sin middleware de autorización (src/app/api/admin/actualizar-turnos-extras/route.ts)
- P1: POST /api/auth/login sin middleware de autorización (src/app/api/auth/login/route.ts)
- P1: PUT /api/clientes/[id] sin middleware de autorización (src/app/api/clientes/[id]/route.ts)
- P1: POST /api/doc/templates sin middleware de autorización (src/app/api/doc/templates/route.ts)
- P1: PATCH /api/documentos/[id] sin middleware de autorización (src/app/api/documentos/[id]/route.ts)
- P1: PUT /api/estructuras-servicio/global sin middleware de autorización (src/app/api/estructuras-servicio/global/route.ts)
- P1: PUT /api/estructuras-sueldo/[id] sin middleware de autorización (src/app/api/estructuras-sueldo/[id]/route.ts)
- P1: DELETE /api/estructuras-sueldo/[id] sin middleware de autorización (src/app/api/estructuras-sueldo/[id]/route.ts)
- P1: POST /api/estructuras-sueldo/inactivar sin middleware de autorización (src/app/api/estructuras-sueldo/inactivar/route.ts)
- P1: POST /api/guardias/permisos sin middleware de autorización (src/app/api/guardias/permisos/route.ts)
- P1: DELETE /api/logs/cleanup-test sin middleware de autorización (src/app/api/logs/cleanup-test/route.ts)
- P1: PUT /api/me/password sin middleware de autorización (src/app/api/me/password/route.ts)
- P1: PUT /api/me/profile sin middleware de autorización (src/app/api/me/profile/route.ts)
- P1: PUT /api/pauta-mensual/actualizar-celda sin middleware de autorización (src/app/api/pauta-mensual/actualizar-celda/route.ts)
- P1: POST /api/pauta-mensual/crear sin middleware de autorización (src/app/api/pauta-mensual/crear/route.ts)
- P1: DELETE /api/pauta-mensual/eliminar sin middleware de autorización (src/app/api/pauta-mensual/eliminar/route.ts)
- P1: POST /api/pauta-mensual/guardar sin middleware de autorización (src/app/api/pauta-mensual/guardar/route.ts)
- P1: POST /api/pauta-mensual/verificar-roles sin middleware de autorización (src/app/api/pauta-mensual/verificar-roles/route.ts)
- P1: POST /api/pauta-diaria/turno-extra sin middleware de autorización (src/app/api/pauta-diaria/turno-extra/route.ts)
- P1: POST /api/payroll/items-extras sin middleware de autorización (src/app/api/payroll/items-extras/route.ts)
- P1: PUT /api/payroll/items-extras sin middleware de autorización (src/app/api/payroll/items-extras/route.ts)
- P1: DELETE /api/payroll/items-extras sin middleware de autorización (src/app/api/payroll/items-extras/route.ts)
- P1: POST /api/ppc/asignar sin middleware de autorización (src/app/api/ppc/asignar/route.ts)
- P1: POST /api/payroll/items sin middleware de autorización (src/app/api/payroll/items/route.ts)
- P1: POST /api/roles-servicio/inactivar sin middleware de autorización (src/app/api/roles-servicio/inactivar/route.ts)
- P1: POST /api/roles-servicio/activar sin middleware de autorización (src/app/api/roles-servicio/activar/route.ts)
- P1: POST /api/roles-servicio/verificar-pautas sin middleware de autorización (src/app/api/roles-servicio/verificar-pautas/route.ts)
- P1: PUT /api/roles-servicio/[id] sin middleware de autorización (src/app/api/roles-servicio/[id]/route.ts)
- P1: DELETE /api/roles-servicio/[id] sin middleware de autorización (src/app/api/roles-servicio/[id]/route.ts)
- P1: PATCH /api/roles-servicio/[id] sin middleware de autorización (src/app/api/roles-servicio/[id]/route.ts)
- P1: POST /api/sueldos/calcular sin middleware de autorización (src/app/api/sueldos/calcular/route.ts)
- P1: POST /api/sueldos/migrar-estructura sin middleware de autorización (src/app/api/sueldos/migrar-estructura/route.ts)
- P1: POST /api/sueldos/init-db sin middleware de autorización (src/app/api/sueldos/init-db/route.ts)
- P1: POST /api/sueldos/migrar-parametros sin middleware de autorización (src/app/api/sueldos/migrar-parametros/route.ts)
- P1: POST /api/sueldos/migrate sin middleware de autorización (src/app/api/sueldos/migrate/route.ts)
- P1: POST /api/sueldos/parametros sin middleware de autorización (src/app/api/sueldos/parametros/route.ts)
- P1: PUT /api/sueldos/parametros sin middleware de autorización (src/app/api/sueldos/parametros/route.ts)
- P1: DELETE /api/sueldos/parametros sin middleware de autorización (src/app/api/sueldos/parametros/route.ts)
- P1: POST /api/sueldos/planilla sin middleware de autorización (src/app/api/sueldos/planilla/route.ts)
- P1: PUT /api/sueldos/planilla sin middleware de autorización (src/app/api/sueldos/planilla/route.ts)
- P1: POST /api/sueldos/reporte sin middleware de autorización (src/app/api/sueldos/reporte/route.ts)
- P1: POST /api/sueldos/verificar-parametros sin middleware de autorización (src/app/api/sueldos/verificar-parametros/route.ts)
- P1: PUT /api/tipos-puesto/[id] sin middleware de autorización (src/app/api/tipos-puesto/[id]/route.ts)
- P1: DELETE /api/tipos-puesto/[id] sin middleware de autorización (src/app/api/tipos-puesto/[id]/route.ts)
- P1: POST /api/turnos/asistencia-new sin middleware de autorización (src/app/api/turnos/asistencia-new/route.ts)
- P1: POST /api/turnos/deshacer-new sin middleware de autorización (src/app/api/turnos/deshacer-new/route.ts)
- P1: POST /api/turnos/extra-new sin middleware de autorización (src/app/api/turnos/extra-new/route.ts)
- P1: POST /api/turnos/reemplazo-new sin middleware de autorización (src/app/api/turnos/reemplazo-new/route.ts)
- P1: POST /api/admin/rbac/assign-admin-role sin middleware de autorización (src/app/api/admin/rbac/assign-admin-role/route.ts)
- P1: POST /api/admin/rbac/clean-test-user sin middleware de autorización (src/app/api/admin/rbac/clean-test-user/route.ts)
- P1: POST /api/admin/rbac/create-permissions-batch sin middleware de autorización (src/app/api/admin/rbac/create-permissions-batch/route.ts)
- P1: POST /api/admin/rbac/fix-admin-permissions sin middleware de autorización (src/app/api/admin/rbac/fix-admin-permissions/route.ts)
- P1: PUT /api/doc/templates/[id] sin middleware de autorización (src/app/api/doc/templates/[id]/route.ts)
- P1: DELETE /api/doc/templates/[id] sin middleware de autorización (src/app/api/doc/templates/[id]/route.ts)
- P1: PUT /api/estructuras-servicio/[estructuraId]/activar sin middleware de autorización (src/app/api/estructuras-servicio/[estructuraId]/activar/route.ts)
- P1: PUT /api/estructuras-sueldo/[id]/inactivar sin middleware de autorización (src/app/api/estructuras-sueldo/[id]/inactivar/route.ts)
- P1: PUT /api/estructuras-servicio/[estructuraId]/inactivar sin middleware de autorización (src/app/api/estructuras-servicio/[estructuraId]/inactivar/route.ts)
- P1: PUT /api/estructuras-sueldo/[id]/toggle-activo sin middleware de autorización (src/app/api/estructuras-sueldo/[id]/toggle-activo/route.ts)
- P1: POST /api/guardias/[id]/bancarios sin middleware de autorización (src/app/api/guardias/[id]/bancarios/route.ts)
- P1: PUT /api/estructuras-sueldo/por-rol/[id] sin middleware de autorización (src/app/api/estructuras-sueldo/por-rol/[id]/route.ts)
- P1: POST /api/guardias/[id]/terminar-asignacion sin middleware de autorización (src/app/api/guardias/[id]/terminar-asignacion/route.ts)
- P1: DELETE /api/guardias/permisos/[id] sin middleware de autorización (src/app/api/guardias/permisos/[id]/route.ts)
- P1: POST /api/instalaciones/[id]/estructuras-servicio sin middleware de autorización (src/app/api/instalaciones/[id]/estructuras-servicio/route.ts)
- P1: POST /api/instalaciones/[id]/ppc sin middleware de autorización (src/app/api/instalaciones/[id]/ppc/route.ts)
- P1: POST /api/instalaciones/[id]/turnos sin middleware de autorización (src/app/api/instalaciones/[id]/turnos/route.ts)
- P1: POST /api/instalaciones/[id]/turnos_v2 sin middleware de autorización (src/app/api/instalaciones/[id]/turnos_v2/route.ts)
- P1: DELETE /api/pauta-diaria/observacion/[id] sin middleware de autorización (src/app/api/pauta-diaria/observacion/[id]/route.ts)
- P1: POST /api/payroll/estructuras-guardia/ensure sin middleware de autorización (src/app/api/payroll/estructuras-guardia/ensure/route.ts)
- P1: POST /api/payroll/estructuras-guardia/items sin middleware de autorización (src/app/api/payroll/estructuras-guardia/items/route.ts)
- P1: POST /api/pauta-diaria/turno-extra/marcar-pagado sin middleware de autorización (src/app/api/pauta-diaria/turno-extra/marcar-pagado/route.ts)
- P1: POST /api/pauta-diaria/turno-extra/preservar sin middleware de autorización (src/app/api/pauta-diaria/turno-extra/preservar/route.ts)
- P1: POST /api/pauta-diaria/turno-extra/planillas sin middleware de autorización (src/app/api/pauta-diaria/turno-extra/planillas/route.ts)
- P1: POST /api/pauta-diaria/turno-extra/sync-coberturas sin middleware de autorización (src/app/api/pauta-diaria/turno-extra/sync-coberturas/route.ts)
- P1: POST /api/pauta-diaria/turno-extra/limpiar sin middleware de autorización (src/app/api/pauta-diaria/turno-extra/limpiar/route.ts)
- P1: PUT /api/payroll/items/[id] sin middleware de autorización (src/app/api/payroll/items/[id]/route.ts)
- P1: DELETE /api/payroll/items/[id] sin middleware de autorización (src/app/api/payroll/items/[id]/route.ts)
- P1: PUT /api/roles-servicio/[id]/toggle-activo sin middleware de autorización (src/app/api/roles-servicio/[id]/toggle-activo/route.ts)
- P1: POST /api/sueldos/parametros/copiar sin middleware de autorización (src/app/api/sueldos/parametros/copiar/route.ts)
- P1: PUT /api/admin/rbac/usuarios/[id] sin middleware de autorización (src/app/api/admin/rbac/usuarios/[id]/route.ts)
- P1: DELETE /api/admin/rbac/usuarios/[id] sin middleware de autorización (src/app/api/admin/rbac/usuarios/[id]/route.ts)
- P1: PUT /api/admin/rbac/permisos/[id] sin middleware de autorización (src/app/api/admin/rbac/permisos/[id]/route.ts)
- P1: DELETE /api/admin/rbac/permisos/[id] sin middleware de autorización (src/app/api/admin/rbac/permisos/[id]/route.ts)
- P1: PUT /api/instalaciones/[id]/estructuras-servicio/[estructuraId] sin middleware de autorización (src/app/api/instalaciones/[id]/estructuras-servicio/[estructuraId]/route.ts)
- P1: DELETE /api/instalaciones/[id]/estructuras-servicio/[estructuraId] sin middleware de autorización (src/app/api/instalaciones/[id]/estructuras-servicio/[estructuraId]/route.ts)
- P1: DELETE /api/instalaciones/[id]/ppc/[ppcId] sin middleware de autorización (src/app/api/instalaciones/[id]/ppc/[ppcId]/route.ts)
- P1: POST /api/instalaciones/[id]/ppc/desasignar sin middleware de autorización (src/app/api/instalaciones/[id]/ppc/desasignar/route.ts)
- P1: POST /api/instalaciones/[id]/ppc/desasignar_v2 sin middleware de autorización (src/app/api/instalaciones/[id]/ppc/desasignar_v2/route.ts)
- P1: DELETE /api/instalaciones/[id]/turnos/[turnoId] sin middleware de autorización (src/app/api/instalaciones/[id]/turnos/[turnoId]/route.ts)
- P1: POST /api/payroll/estructuras/instalacion/create sin middleware de autorización (src/app/api/payroll/estructuras/instalacion/create/route.ts)
- P1: POST /api/payroll/estructuras/instalacion/ensure sin middleware de autorización (src/app/api/payroll/estructuras/instalacion/ensure/route.ts)
- P1: POST /api/payroll/estructuras/instalacion/items sin middleware de autorización (src/app/api/payroll/estructuras/instalacion/items/route.ts)
- P1: PATCH /api/payroll/estructuras-guardia/[id]/cerrar sin middleware de autorización (src/app/api/payroll/estructuras-guardia/[id]/cerrar/route.ts)
- P1: PATCH /api/instalaciones/[id]/puestos/[puestoId] sin middleware de autorización (src/app/api/instalaciones/[id]/puestos/[puestoId]/route.ts)
- P1: PUT /api/payroll/estructuras-guardia/items/[id] sin middleware de autorización (src/app/api/payroll/estructuras-guardia/items/[id]/route.ts)
- P1: DELETE /api/payroll/estructuras-guardia/items/[id] sin middleware de autorización (src/app/api/payroll/estructuras-guardia/items/[id]/route.ts)
- P1: POST /api/admin/rbac/roles/[id]/make-admin-public sin middleware de autorización (src/app/api/admin/rbac/roles/[id]/make-admin-public/route.ts)
- P1: POST /api/instalaciones/[id]/ppc/[ppcId]/desasignar sin middleware de autorización (src/app/api/instalaciones/[id]/ppc/[ppcId]/desasignar/route.ts)
- P1: POST /api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2 sin middleware de autorización (src/app/api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2/route.ts)
- P1: POST /api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs sin middleware de autorización (src/app/api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs/route.ts)
- P1: DELETE /api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2 sin middleware de autorización (src/app/api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2/route.ts)
- P1: PATCH /api/payroll/estructuras/instalacion/[id]/cerrar sin middleware de autorización (src/app/api/payroll/estructuras/instalacion/[id]/cerrar/route.ts)
- P1: PUT /api/payroll/estructuras/instalacion/sueldo-base/[estructura_id] sin middleware de autorización (src/app/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id]/route.ts)
- P1: DELETE /api/payroll/estructuras/instalacion/sueldo-base/[estructura_id] sin middleware de autorización (src/app/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id]/route.ts)
- P1: PUT /api/payroll/estructuras/instalacion/items/[id] sin middleware de autorización (src/app/api/payroll/estructuras/instalacion/items/[id]/route.ts)
- P1: DELETE /api/payroll/estructuras/instalacion/items/[id] sin middleware de autorización (src/app/api/payroll/estructuras/instalacion/items/[id]/route.ts)
- P1: DELETE /api/pauta-diaria/turno-extra/planillas/[id]/eliminar sin middleware de autorización (src/app/api/pauta-diaria/turno-extra/planillas/[id]/eliminar/route.ts)
- P1: POST /api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada sin middleware de autorización (src/app/api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada/route.ts)

## Resultados API
```csv
tenant,role,module,action,method,route,expected,ok,status
TENANT_A,none,clientes,read:list,GET,/api/clientes,deny,false,500
TENANT_A,read,clientes,read:list,GET,/api/clientes,allow,false,500
TENANT_A,editor,clientes,read:list,GET,/api/clientes,allow,false,500
TENANT_A,admin,clientes,read:list,GET,/api/clientes,allow,false,500
TENANT_B,none,clientes,read:list,GET,/api/clientes,deny,false,500
TENANT_B,read,clientes,read:list,GET,/api/clientes,allow,false,500
TENANT_B,editor,clientes,read:list,GET,/api/clientes,allow,false,500
TENANT_B,admin,clientes,read:list,GET,/api/clientes,allow,false,500
TENANT_A,none,clientes,create,POST,/api/clientes,deny,false,500
TENANT_A,read,clientes,create,POST,/api/clientes,deny,false,500
TENANT_A,editor,clientes,create,POST,/api/clientes,allow,false,500
TENANT_A,admin,clientes,create,POST,/api/clientes,allow,false,500
TENANT_B,none,clientes,create,POST,/api/clientes,deny,false,500
TENANT_B,read,clientes,create,POST,/api/clientes,deny,false,500
TENANT_B,editor,clientes,create,POST,/api/clientes,allow,false,500
TENANT_B,admin,clientes,create,POST,/api/clientes,allow,false,500
TENANT_A,none,clientes,update,PUT,/api/clientes,deny,false,500
TENANT_A,read,clientes,update,PUT,/api/clientes,deny,false,500
TENANT_A,editor,clientes,update,PUT,/api/clientes,allow,false,500
TENANT_A,admin,clientes,update,PUT,/api/clientes,allow,false,500
TENANT_B,none,clientes,update,PUT,/api/clientes,deny,false,500
TENANT_B,read,clientes,update,PUT,/api/clientes,deny,false,500
TENANT_B,editor,clientes,update,PUT,/api/clientes,allow,false,500
TENANT_B,admin,clientes,update,PUT,/api/clientes,allow,false,500
TENANT_A,none,clientes,delete,DELETE,/api/clientes,deny,false,500
TENANT_A,read,clientes,delete,DELETE,/api/clientes,deny,false,500
TENANT_A,editor,clientes,delete,DELETE,/api/clientes,deny,false,500
TENANT_A,admin,clientes,delete,DELETE,/api/clientes,allow,false,500
TENANT_B,none,clientes,delete,DELETE,/api/clientes,deny,false,500
TENANT_B,read,clientes,delete,DELETE,/api/clientes,deny,false,500
TENANT_B,editor,clientes,delete,DELETE,/api/clientes,deny,false,500
TENANT_B,admin,clientes,delete,DELETE,/api/clientes,allow,false,500
TENANT_A,none,guardias,read:list,GET,/api/guardias,deny,false,500
TENANT_A,read,guardias,read:list,GET,/api/guardias,allow,false,500
TENANT_A,editor,guardias,read:list,GET,/api/guardias,allow,false,500
TENANT_A,admin,guardias,read:list,GET,/api/guardias,allow,false,500
TENANT_B,none,guardias,read:list,GET,/api/guardias,deny,false,500
TENANT_B,read,guardias,read:list,GET,/api/guardias,allow,false,500
TENANT_B,editor,guardias,read:list,GET,/api/guardias,allow,false,500
TENANT_B,admin,guardias,read:list,GET,/api/guardias,allow,false,500
TENANT_A,none,guardias,create,POST,/api/guardias,deny,false,500
TENANT_A,read,guardias,create,POST,/api/guardias,deny,false,500
TENANT_A,editor,guardias,create,POST,/api/guardias,allow,false,500
TENANT_A,admin,guardias,create,POST,/api/guardias,allow,false,500
TENANT_B,none,guardias,create,POST,/api/guardias,deny,false,500
TENANT_B,read,guardias,create,POST,/api/guardias,deny,false,500
TENANT_B,editor,guardias,create,POST,/api/guardias,allow,false,500
TENANT_B,admin,guardias,create,POST,/api/guardias,allow,false,500
TENANT_A,none,instalaciones,read:list,GET,/api/instalaciones,deny,false,500
TENANT_A,read,instalaciones,read:list,GET,/api/instalaciones,allow,false,500
TENANT_A,editor,instalaciones,read:list,GET,/api/instalaciones,allow,false,500
TENANT_A,admin,instalaciones,read:list,GET,/api/instalaciones,allow,false,500
TENANT_B,none,instalaciones,read:list,GET,/api/instalaciones,deny,false,500
TENANT_B,read,instalaciones,read:list,GET,/api/instalaciones,allow,false,500
TENANT_B,editor,instalaciones,read:list,GET,/api/instalaciones,allow,false,500
TENANT_B,admin,instalaciones,read:list,GET,/api/instalaciones,allow,false,500
TENANT_A,none,instalaciones,create,POST,/api/instalaciones,deny,false,500
TENANT_A,read,instalaciones,create,POST,/api/instalaciones,deny,false,500
TENANT_A,editor,instalaciones,create,POST,/api/instalaciones,allow,false,500
TENANT_A,admin,instalaciones,create,POST,/api/instalaciones,allow,false,500
TENANT_B,none,instalaciones,create,POST,/api/instalaciones,deny,false,500
TENANT_B,read,instalaciones,create,POST,/api/instalaciones,deny,false,500
TENANT_B,editor,instalaciones,create,POST,/api/instalaciones,allow,false,500
TENANT_B,admin,instalaciones,create,POST,/api/instalaciones,allow,false,500
TENANT_A,none,instalaciones,update,PUT,/api/instalaciones,deny,false,500
TENANT_A,read,instalaciones,update,PUT,/api/instalaciones,deny,false,500
TENANT_A,editor,instalaciones,update,PUT,/api/instalaciones,allow,false,500
TENANT_A,admin,instalaciones,update,PUT,/api/instalaciones,allow,false,500
TENANT_B,none,instalaciones,update,PUT,/api/instalaciones,deny,false,500
TENANT_B,read,instalaciones,update,PUT,/api/instalaciones,deny,false,500
TENANT_B,editor,instalaciones,update,PUT,/api/instalaciones,allow,false,500
TENANT_B,admin,instalaciones,update,PUT,/api/instalaciones,allow,false,500
TENANT_A,none,instalaciones,delete,DELETE,/api/instalaciones,deny,false,500
TENANT_A,read,instalaciones,delete,DELETE,/api/instalaciones,deny,false,500
TENANT_A,editor,instalaciones,delete,DELETE,/api/instalaciones,deny,false,500
TENANT_A,admin,instalaciones,delete,DELETE,/api/instalaciones,allow,false,500
TENANT_B,none,instalaciones,delete,DELETE,/api/instalaciones,deny,false,500
TENANT_B,read,instalaciones,delete,DELETE,/api/instalaciones,deny,false,500
TENANT_B,editor,instalaciones,delete,DELETE,/api/instalaciones,deny,false,500
TENANT_B,admin,instalaciones,delete,DELETE,/api/instalaciones,allow,false,500
TENANT_A,none,pauta-diaria,read:list,GET,/api/pauta-diaria,deny,false,500
TENANT_A,read,pauta-diaria,read:list,GET,/api/pauta-diaria,deny,false,500
TENANT_A,editor,pauta-diaria,read:list,GET,/api/pauta-diaria,deny,false,500
TENANT_A,admin,pauta-diaria,read:list,GET,/api/pauta-diaria,deny,false,500
TENANT_B,none,pauta-diaria,read:list,GET,/api/pauta-diaria,deny,false,500
TENANT_B,read,pauta-diaria,read:list,GET,/api/pauta-diaria,deny,false,500
TENANT_B,editor,pauta-diaria,read:list,GET,/api/pauta-diaria,deny,false,500
TENANT_B,admin,pauta-diaria,read:list,GET,/api/pauta-diaria,deny,false,500
TENANT_A,none,pauta-mensual,read:list,GET,/api/pauta-mensual,deny,false,500
TENANT_A,read,pauta-mensual,read:list,GET,/api/pauta-mensual,deny,false,500
TENANT_A,editor,pauta-mensual,read:list,GET,/api/pauta-mensual,deny,false,500
TENANT_A,admin,pauta-mensual,read:list,GET,/api/pauta-mensual,deny,false,500
TENANT_B,none,pauta-mensual,read:list,GET,/api/pauta-mensual,deny,false,500
TENANT_B,read,pauta-mensual,read:list,GET,/api/pauta-mensual,deny,false,500
TENANT_B,editor,pauta-mensual,read:list,GET,/api/pauta-mensual,deny,false,500
TENANT_B,admin,pauta-mensual,read:list,GET,/api/pauta-mensual,deny,false,500
TENANT_A,none,clientes,read:detail,GET,/api/clientes/[id],deny,false,500
TENANT_A,read,clientes,read:detail,GET,/api/clientes/[id],allow,false,500
TENANT_A,editor,clientes,read:detail,GET,/api/clientes/[id],allow,false,500
TENANT_A,admin,clientes,read:detail,GET,/api/clientes/[id],allow,false,500
TENANT_B,none,clientes,read:detail,GET,/api/clientes/[id],deny,false,500
TENANT_B,read,clientes,read:detail,GET,/api/clientes/[id],allow,false,500
TENANT_B,editor,clientes,read:detail,GET,/api/clientes/[id],allow,false,500
TENANT_B,admin,clientes,read:detail,GET,/api/clientes/[id],allow,false,500
TENANT_A,none,clientes,update,PUT,/api/clientes/[id],deny,false,500
TENANT_A,read,clientes,update,PUT,/api/clientes/[id],deny,false,500
TENANT_A,editor,clientes,update,PUT,/api/clientes/[id],allow,false,500
TENANT_A,admin,clientes,update,PUT,/api/clientes/[id],allow,false,500
TENANT_B,none,clientes,update,PUT,/api/clientes/[id],deny,false,500
TENANT_B,read,clientes,update,PUT,/api/clientes/[id],deny,false,500
TENANT_B,editor,clientes,update,PUT,/api/clientes/[id],allow,false,500
TENANT_B,admin,clientes,update,PUT,/api/clientes/[id],allow,false,500
TENANT_A,none,guardias,read:list,GET,/api/guardias/buscar,deny,false,500
TENANT_A,read,guardias,read:list,GET,/api/guardias/buscar,allow,false,500
TENANT_A,editor,guardias,read:list,GET,/api/guardias/buscar,allow,false,500
TENANT_A,admin,guardias,read:list,GET,/api/guardias/buscar,allow,false,500
TENANT_B,none,guardias,read:list,GET,/api/guardias/buscar,deny,false,500
TENANT_B,read,guardias,read:list,GET,/api/guardias/buscar,allow,false,500
TENANT_B,editor,guardias,read:list,GET,/api/guardias/buscar,allow,false,500
TENANT_B,admin,guardias,read:list,GET,/api/guardias/buscar,allow,false,500
TENANT_A,none,guardias,read:list,GET,/api/guardias/conflictos,deny,false,500
TENANT_A,read,guardias,read:list,GET,/api/guardias/conflictos,allow,false,500
TENANT_A,editor,guardias,read:list,GET,/api/guardias/conflictos,allow,false,500
TENANT_A,admin,guardias,read:list,GET,/api/guardias/conflictos,allow,false,500
TENANT_B,none,guardias,read:list,GET,/api/guardias/conflictos,deny,false,500
TENANT_B,read,guardias,read:list,GET,/api/guardias/conflictos,allow,false,500
TENANT_B,editor,guardias,read:list,GET,/api/guardias/conflictos,allow,false,500
TENANT_B,admin,guardias,read:list,GET,/api/guardias/conflictos,allow,false,500
TENANT_A,none,guardias,update,PUT,/api/guardias/[id],deny,false,500
TENANT_A,read,guardias,update,PUT,/api/guardias/[id],deny,false,500
TENANT_A,editor,guardias,update,PUT,/api/guardias/[id],allow,false,500
TENANT_A,admin,guardias,update,PUT,/api/guardias/[id],allow,false,500
TENANT_B,none,guardias,update,PUT,/api/guardias/[id],deny,false,500
TENANT_B,read,guardias,update,PUT,/api/guardias/[id],deny,false,500
TENANT_B,editor,guardias,update,PUT,/api/guardias/[id],allow,false,500
TENANT_B,admin,guardias,update,PUT,/api/guardias/[id],allow,false,500
TENANT_A,none,guardias,read:detail,GET,/api/guardias/[id],deny,false,500
TENANT_A,read,guardias,read:detail,GET,/api/guardias/[id],allow,false,500
TENANT_A,editor,guardias,read:detail,GET,/api/guardias/[id],allow,false,500
TENANT_A,admin,guardias,read:detail,GET,/api/guardias/[id],allow,false,500
TENANT_B,none,guardias,read:detail,GET,/api/guardias/[id],deny,false,500
TENANT_B,read,guardias,read:detail,GET,/api/guardias/[id],allow,false,500
TENANT_B,editor,guardias,read:detail,GET,/api/guardias/[id],allow,false,500
TENANT_B,admin,guardias,read:detail,GET,/api/guardias/[id],allow,false,500
TENANT_A,none,guardias,update,PATCH,/api/guardias/[id],deny,false,500
TENANT_A,read,guardias,update,PATCH,/api/guardias/[id],deny,false,500
TENANT_A,editor,guardias,update,PATCH,/api/guardias/[id],allow,false,500
TENANT_A,admin,guardias,update,PATCH,/api/guardias/[id],allow,false,500
TENANT_B,none,guardias,update,PATCH,/api/guardias/[id],deny,false,500
TENANT_B,read,guardias,update,PATCH,/api/guardias/[id],deny,false,500
TENANT_B,editor,guardias,update,PATCH,/api/guardias/[id],allow,false,500
TENANT_B,admin,guardias,update,PATCH,/api/guardias/[id],allow,false,500
TENANT_A,none,guardias,delete,DELETE,/api/guardias/[id],deny,false,500
TENANT_A,read,guardias,delete,DELETE,/api/guardias/[id],deny,false,500
TENANT_A,editor,guardias,delete,DELETE,/api/guardias/[id],deny,false,500
TENANT_A,admin,guardias,delete,DELETE,/api/guardias/[id],allow,false,500
TENANT_B,none,guardias,delete,DELETE,/api/guardias/[id],deny,false,500
TENANT_B,read,guardias,delete,DELETE,/api/guardias/[id],deny,false,500
TENANT_B,editor,guardias,delete,DELETE,/api/guardias/[id],deny,false,500
TENANT_B,admin,guardias,delete,DELETE,/api/guardias/[id],allow,false,500
TENANT_A,none,guardias,read:list,GET,/api/guardias/disponibles,deny,false,500
TENANT_A,read,guardias,read:list,GET,/api/guardias/disponibles,allow,false,500
TENANT_A,editor,guardias,read:list,GET,/api/guardias/disponibles,allow,false,500
TENANT_A,admin,guardias,read:list,GET,/api/guardias/disponibles,allow,false,500
TENANT_B,none,guardias,read:list,GET,/api/guardias/disponibles,deny,false,500
TENANT_B,read,guardias,read:list,GET,/api/guardias/disponibles,allow,false,500
TENANT_B,editor,guardias,read:list,GET,/api/guardias/disponibles,allow,false,500
TENANT_B,admin,guardias,read:list,GET,/api/guardias/disponibles,allow,false,500
TENANT_A,none,guardias,read:list,GET,/api/guardias/guardia-metrics,deny,false,500
TENANT_A,read,guardias,read:list,GET,/api/guardias/guardia-metrics,allow,false,500
TENANT_A,editor,guardias,read:list,GET,/api/guardias/guardia-metrics,allow,false,500
TENANT_A,admin,guardias,read:list,GET,/api/guardias/guardia-metrics,allow,false,500
TENANT_B,none,guardias,read:list,GET,/api/guardias/guardia-metrics,deny,false,500
TENANT_B,read,guardias,read:list,GET,/api/guardias/guardia-metrics,allow,false,500
TENANT_B,editor,guardias,read:list,GET,/api/guardias/guardia-metrics,allow,false,500
TENANT_B,admin,guardias,read:list,GET,/api/guardias/guardia-metrics,allow,false,500
TENANT_A,none,guardias,create,POST,/api/guardias/permisos,deny,false,500
TENANT_A,read,guardias,create,POST,/api/guardias/permisos,deny,false,500
TENANT_A,editor,guardias,create,POST,/api/guardias/permisos,allow,false,500
TENANT_A,admin,guardias,create,POST,/api/guardias/permisos,allow,false,500
TENANT_B,none,guardias,create,POST,/api/guardias/permisos,deny,false,500
TENANT_B,read,guardias,create,POST,/api/guardias/permisos,deny,false,500
TENANT_B,editor,guardias,create,POST,/api/guardias/permisos,allow,false,500
TENANT_B,admin,guardias,create,POST,/api/guardias/permisos,allow,false,500
TENANT_A,none,guardias,read:list,GET,/api/guardias/permisos,deny,false,500
TENANT_A,read,guardias,read:list,GET,/api/guardias/permisos,allow,false,500
TENANT_A,editor,guardias,read:list,GET,/api/guardias/permisos,allow,false,500
TENANT_A,admin,guardias,read:list,GET,/api/guardias/permisos,allow,false,500
TENANT_B,none,guardias,read:list,GET,/api/guardias/permisos,deny,false,500
TENANT_B,read,guardias,read:list,GET,/api/guardias/permisos,allow,false,500
TENANT_B,editor,guardias,read:list,GET,/api/guardias/permisos,allow,false,500
TENANT_B,admin,guardias,read:list,GET,/api/guardias/permisos,allow,false,500
TENANT_A,none,instalaciones,read:list,GET,/api/instalaciones/kpis,deny,false,500
TENANT_A,read,instalaciones,read:list,GET,/api/instalaciones/kpis,allow,false,500
TENANT_A,editor,instalaciones,read:list,GET,/api/instalaciones/kpis,allow,false,500
TENANT_A,admin,instalaciones,read:list,GET,/api/instalaciones/kpis,allow,false,500
TENANT_B,none,instalaciones,read:list,GET,/api/instalaciones/kpis,deny,false,500
TENANT_B,read,instalaciones,read:list,GET,/api/instalaciones/kpis,allow,false,500
TENANT_B,editor,instalaciones,read:list,GET,/api/instalaciones/kpis,allow,false,500
TENANT_B,admin,instalaciones,read:list,GET,/api/instalaciones/kpis,allow,false,500
TENANT_A,none,instalaciones,read:detail,GET,/api/instalaciones/[id],deny,false,500
TENANT_A,read,instalaciones,read:detail,GET,/api/instalaciones/[id],allow,false,500
TENANT_A,editor,instalaciones,read:detail,GET,/api/instalaciones/[id],allow,false,500
TENANT_A,admin,instalaciones,read:detail,GET,/api/instalaciones/[id],allow,false,500
TENANT_B,none,instalaciones,read:detail,GET,/api/instalaciones/[id],deny,false,500
TENANT_B,read,instalaciones,read:detail,GET,/api/instalaciones/[id],allow,false,500
TENANT_B,editor,instalaciones,read:detail,GET,/api/instalaciones/[id],allow,false,500
TENANT_B,admin,instalaciones,read:detail,GET,/api/instalaciones/[id],allow,false,500
TENANT_A,none,instalaciones,read:list,GET,/api/instalaciones/documentos-vencidos,deny,false,500
TENANT_A,read,instalaciones,read:list,GET,/api/instalaciones/documentos-vencidos,allow,false,500
TENANT_A,editor,instalaciones,read:list,GET,/api/instalaciones/documentos-vencidos,allow,false,500
TENANT_A,admin,instalaciones,read:list,GET,/api/instalaciones/documentos-vencidos,allow,false,500
TENANT_B,none,instalaciones,read:list,GET,/api/instalaciones/documentos-vencidos,deny,false,500
TENANT_B,read,instalaciones,read:list,GET,/api/instalaciones/documentos-vencidos,allow,false,500
TENANT_B,editor,instalaciones,read:list,GET,/api/instalaciones/documentos-vencidos,allow,false,500
TENANT_B,admin,instalaciones,read:list,GET,/api/instalaciones/documentos-vencidos,allow,false,500
TENANT_A,none,pauta-mensual,update,PUT,/api/pauta-mensual/actualizar-celda,deny,false,500
TENANT_A,read,pauta-mensual,update,PUT,/api/pauta-mensual/actualizar-celda,deny,false,500
TENANT_A,editor,pauta-mensual,update,PUT,/api/pauta-mensual/actualizar-celda,allow,false,500
TENANT_A,admin,pauta-mensual,update,PUT,/api/pauta-mensual/actualizar-celda,allow,false,500
TENANT_B,none,pauta-mensual,update,PUT,/api/pauta-mensual/actualizar-celda,deny,false,500
TENANT_B,read,pauta-mensual,update,PUT,/api/pauta-mensual/actualizar-celda,deny,false,500
TENANT_B,editor,pauta-mensual,update,PUT,/api/pauta-mensual/actualizar-celda,allow,false,500
TENANT_B,admin,pauta-mensual,update,PUT,/api/pauta-mensual/actualizar-celda,allow,false,500
TENANT_A,none,pauta-mensual,create,POST,/api/pauta-mensual/crear,deny,false,500
TENANT_A,read,pauta-mensual,create,POST,/api/pauta-mensual/crear,deny,false,500
TENANT_A,editor,pauta-mensual,create,POST,/api/pauta-mensual/crear,deny,false,500
TENANT_A,admin,pauta-mensual,create,POST,/api/pauta-mensual/crear,deny,false,500
TENANT_B,none,pauta-mensual,create,POST,/api/pauta-mensual/crear,deny,false,500
TENANT_B,read,pauta-mensual,create,POST,/api/pauta-mensual/crear,deny,false,500
TENANT_B,editor,pauta-mensual,create,POST,/api/pauta-mensual/crear,deny,false,500
TENANT_B,admin,pauta-mensual,create,POST,/api/pauta-mensual/crear,deny,false,500
TENANT_A,none,pauta-mensual,delete,DELETE,/api/pauta-mensual/eliminar,deny,false,500
TENANT_A,read,pauta-mensual,delete,DELETE,/api/pauta-mensual/eliminar,deny,false,500
TENANT_A,editor,pauta-mensual,delete,DELETE,/api/pauta-mensual/eliminar,deny,false,500
TENANT_A,admin,pauta-mensual,delete,DELETE,/api/pauta-mensual/eliminar,deny,false,500
TENANT_B,none,pauta-mensual,delete,DELETE,/api/pauta-mensual/eliminar,deny,false,500
TENANT_B,read,pauta-mensual,delete,DELETE,/api/pauta-mensual/eliminar,deny,false,500
TENANT_B,editor,pauta-mensual,delete,DELETE,/api/pauta-mensual/eliminar,deny,false,500
TENANT_B,admin,pauta-mensual,delete,DELETE,/api/pauta-mensual/eliminar,deny,false,500
TENANT_A,none,pauta-mensual,export,GET,/api/pauta-mensual/exportar-xlsx,deny,false,500
TENANT_A,read,pauta-mensual,export,GET,/api/pauta-mensual/exportar-xlsx,deny,false,500
TENANT_A,editor,pauta-mensual,export,GET,/api/pauta-mensual/exportar-xlsx,deny,false,500
TENANT_A,admin,pauta-mensual,export,GET,/api/pauta-mensual/exportar-xlsx,allow,false,500
TENANT_B,none,pauta-mensual,export,GET,/api/pauta-mensual/exportar-xlsx,deny,false,500
TENANT_B,read,pauta-mensual,export,GET,/api/pauta-mensual/exportar-xlsx,deny,false,500
TENANT_B,editor,pauta-mensual,export,GET,/api/pauta-mensual/exportar-xlsx,deny,false,500
TENANT_B,admin,pauta-mensual,export,GET,/api/pauta-mensual/exportar-xlsx,allow,false,500
TENANT_A,none,pauta-mensual,export,GET,/api/pauta-mensual/exportar-pdf,deny,false,500
TENANT_A,read,pauta-mensual,export,GET,/api/pauta-mensual/exportar-pdf,deny,false,500
TENANT_A,editor,pauta-mensual,export,GET,/api/pauta-mensual/exportar-pdf,deny,false,500
TENANT_A,admin,pauta-mensual,export,GET,/api/pauta-mensual/exportar-pdf,allow,false,500
TENANT_B,none,pauta-mensual,export,GET,/api/pauta-mensual/exportar-pdf,deny,false,500
TENANT_B,read,pauta-mensual,export,GET,/api/pauta-mensual/exportar-pdf,deny,false,500
TENANT_B,editor,pauta-mensual,export,GET,/api/pauta-mensual/exportar-pdf,deny,false,500
TENANT_B,admin,pauta-mensual,export,GET,/api/pauta-mensual/exportar-pdf,allow,false,500
TENANT_A,none,pauta-mensual,create,POST,/api/pauta-mensual/guardar,deny,false,500
TENANT_A,read,pauta-mensual,create,POST,/api/pauta-mensual/guardar,deny,false,500
TENANT_A,editor,pauta-mensual,create,POST,/api/pauta-mensual/guardar,deny,false,500
TENANT_A,admin,pauta-mensual,create,POST,/api/pauta-mensual/guardar,deny,false,500
TENANT_B,none,pauta-mensual,create,POST,/api/pauta-mensual/guardar,deny,false,500
TENANT_B,read,pauta-mensual,create,POST,/api/pauta-mensual/guardar,deny,false,500
TENANT_B,editor,pauta-mensual,create,POST,/api/pauta-mensual/guardar,deny,false,500
TENANT_B,admin,pauta-mensual,create,POST,/api/pauta-mensual/guardar,deny,false,500
TENANT_A,none,pauta-mensual,read:list,GET,/api/pauta-mensual/resumen,deny,false,500
TENANT_A,read,pauta-mensual,read:list,GET,/api/pauta-mensual/resumen,deny,false,500
TENANT_A,editor,pauta-mensual,read:list,GET,/api/pauta-mensual/resumen,deny,false,500
TENANT_A,admin,pauta-mensual,read:list,GET,/api/pauta-mensual/resumen,deny,false,500
TENANT_B,none,pauta-mensual,read:list,GET,/api/pauta-mensual/resumen,deny,false,500
TENANT_B,read,pauta-mensual,read:list,GET,/api/pauta-mensual/resumen,deny,false,500
TENANT_B,editor,pauta-mensual,read:list,GET,/api/pauta-mensual/resumen,deny,false,500
TENANT_B,admin,pauta-mensual,read:list,GET,/api/pauta-mensual/resumen,deny,false,500
TENANT_A,none,pauta-mensual,create,POST,/api/pauta-mensual/verificar-roles,deny,false,500
TENANT_A,read,pauta-mensual,create,POST,/api/pauta-mensual/verificar-roles,deny,false,500
TENANT_A,editor,pauta-mensual,create,POST,/api/pauta-mensual/verificar-roles,deny,false,500
TENANT_A,admin,pauta-mensual,create,POST,/api/pauta-mensual/verificar-roles,deny,false,500
TENANT_B,none,pauta-mensual,create,POST,/api/pauta-mensual/verificar-roles,deny,false,500
TENANT_B,read,pauta-mensual,create,POST,/api/pauta-mensual/verificar-roles,deny,false,500
TENANT_B,editor,pauta-mensual,create,POST,/api/pauta-mensual/verificar-roles,deny,false,500
TENANT_B,admin,pauta-mensual,create,POST,/api/pauta-mensual/verificar-roles,deny,false,500
TENANT_A,none,payroll,read:list,GET,/api/payroll/estructuras-guardia,deny,false,500
TENANT_A,read,payroll,read:list,GET,/api/payroll/estructuras-guardia,deny,false,500
TENANT_A,editor,payroll,read:list,GET,/api/payroll/estructuras-guardia,deny,false,500
TENANT_A,admin,payroll,read:list,GET,/api/payroll/estructuras-guardia,deny,false,500
TENANT_B,none,payroll,read:list,GET,/api/payroll/estructuras-guardia,deny,false,500
TENANT_B,read,payroll,read:list,GET,/api/payroll/estructuras-guardia,deny,false,500
TENANT_B,editor,payroll,read:list,GET,/api/payroll/estructuras-guardia,deny,false,500
TENANT_B,admin,payroll,read:list,GET,/api/payroll/estructuras-guardia,deny,false,500
TENANT_A,none,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra,deny,false,500
TENANT_A,read,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra,deny,false,500
TENANT_A,editor,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra,deny,false,500
TENANT_A,admin,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra,deny,false,500
TENANT_B,none,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra,deny,false,500
TENANT_B,read,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra,deny,false,500
TENANT_B,editor,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra,deny,false,500
TENANT_B,admin,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra,deny,false,500
TENANT_A,none,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra,deny,false,500
TENANT_A,read,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra,deny,false,500
TENANT_A,editor,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra,deny,false,500
TENANT_A,admin,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra,deny,false,500
TENANT_B,none,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra,deny,false,500
TENANT_B,read,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra,deny,false,500
TENANT_B,editor,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra,deny,false,500
TENANT_B,admin,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra,deny,false,500
TENANT_A,none,payroll,read:list,GET,/api/payroll/guardias,deny,false,500
TENANT_A,read,payroll,read:list,GET,/api/payroll/guardias,deny,false,500
TENANT_A,editor,payroll,read:list,GET,/api/payroll/guardias,deny,false,500
TENANT_A,admin,payroll,read:list,GET,/api/payroll/guardias,deny,false,500
TENANT_B,none,payroll,read:list,GET,/api/payroll/guardias,deny,false,500
TENANT_B,read,payroll,read:list,GET,/api/payroll/guardias,deny,false,500
TENANT_B,editor,payroll,read:list,GET,/api/payroll/guardias,deny,false,500
TENANT_B,admin,payroll,read:list,GET,/api/payroll/guardias,deny,false,500
TENANT_A,none,payroll,read:list,GET,/api/payroll/instalaciones,deny,false,500
TENANT_A,read,payroll,read:list,GET,/api/payroll/instalaciones,deny,false,500
TENANT_A,editor,payroll,read:list,GET,/api/payroll/instalaciones,deny,false,500
TENANT_A,admin,payroll,read:list,GET,/api/payroll/instalaciones,deny,false,500
TENANT_B,none,payroll,read:list,GET,/api/payroll/instalaciones,deny,false,500
TENANT_B,read,payroll,read:list,GET,/api/payroll/instalaciones,deny,false,500
TENANT_B,editor,payroll,read:list,GET,/api/payroll/instalaciones,deny,false,500
TENANT_B,admin,payroll,read:list,GET,/api/payroll/instalaciones,deny,false,500
TENANT_A,none,payroll,read:list,GET,/api/payroll/sueldo-items,deny,false,500
TENANT_A,read,payroll,read:list,GET,/api/payroll/sueldo-items,deny,false,500
TENANT_A,editor,payroll,read:list,GET,/api/payroll/sueldo-items,deny,false,500
TENANT_A,admin,payroll,read:list,GET,/api/payroll/sueldo-items,deny,false,500
TENANT_B,none,payroll,read:list,GET,/api/payroll/sueldo-items,deny,false,500
TENANT_B,read,payroll,read:list,GET,/api/payroll/sueldo-items,deny,false,500
TENANT_B,editor,payroll,read:list,GET,/api/payroll/sueldo-items,deny,false,500
TENANT_B,admin,payroll,read:list,GET,/api/payroll/sueldo-items,deny,false,500
TENANT_A,none,payroll,read:list,GET,/api/payroll/items-extras,deny,false,500
TENANT_A,read,payroll,read:list,GET,/api/payroll/items-extras,deny,false,500
TENANT_A,editor,payroll,read:list,GET,/api/payroll/items-extras,deny,false,500
TENANT_A,admin,payroll,read:list,GET,/api/payroll/items-extras,deny,false,500
TENANT_B,none,payroll,read:list,GET,/api/payroll/items-extras,deny,false,500
TENANT_B,read,payroll,read:list,GET,/api/payroll/items-extras,deny,false,500
TENANT_B,editor,payroll,read:list,GET,/api/payroll/items-extras,deny,false,500
TENANT_B,admin,payroll,read:list,GET,/api/payroll/items-extras,deny,false,500
TENANT_A,none,payroll,create,POST,/api/payroll/items-extras,deny,false,500
TENANT_A,read,payroll,create,POST,/api/payroll/items-extras,deny,false,500
TENANT_A,editor,payroll,create,POST,/api/payroll/items-extras,deny,false,500
TENANT_A,admin,payroll,create,POST,/api/payroll/items-extras,deny,false,500
TENANT_B,none,payroll,create,POST,/api/payroll/items-extras,deny,false,500
TENANT_B,read,payroll,create,POST,/api/payroll/items-extras,deny,false,500
TENANT_B,editor,payroll,create,POST,/api/payroll/items-extras,deny,false,500
TENANT_B,admin,payroll,create,POST,/api/payroll/items-extras,deny,false,500
TENANT_A,none,payroll,update,PUT,/api/payroll/items-extras,deny,false,500
TENANT_A,read,payroll,update,PUT,/api/payroll/items-extras,deny,false,500
TENANT_A,editor,payroll,update,PUT,/api/payroll/items-extras,allow,false,500
TENANT_A,admin,payroll,update,PUT,/api/payroll/items-extras,allow,false,500
TENANT_B,none,payroll,update,PUT,/api/payroll/items-extras,deny,false,500
TENANT_B,read,payroll,update,PUT,/api/payroll/items-extras,deny,false,500
TENANT_B,editor,payroll,update,PUT,/api/payroll/items-extras,allow,false,500
TENANT_B,admin,payroll,update,PUT,/api/payroll/items-extras,allow,false,500
TENANT_A,none,payroll,delete,DELETE,/api/payroll/items-extras,deny,false,500
TENANT_A,read,payroll,delete,DELETE,/api/payroll/items-extras,deny,false,500
TENANT_A,editor,payroll,delete,DELETE,/api/payroll/items-extras,deny,false,500
TENANT_A,admin,payroll,delete,DELETE,/api/payroll/items-extras,deny,false,500
TENANT_B,none,payroll,delete,DELETE,/api/payroll/items-extras,deny,false,500
TENANT_B,read,payroll,delete,DELETE,/api/payroll/items-extras,deny,false,500
TENANT_B,editor,payroll,delete,DELETE,/api/payroll/items-extras,deny,false,500
TENANT_B,admin,payroll,delete,DELETE,/api/payroll/items-extras,deny,false,500
TENANT_A,none,payroll,read:list,GET,/api/payroll/roles-servicio,deny,false,500
TENANT_A,read,payroll,read:list,GET,/api/payroll/roles-servicio,deny,false,500
TENANT_A,editor,payroll,read:list,GET,/api/payroll/roles-servicio,deny,false,500
TENANT_A,admin,payroll,read:list,GET,/api/payroll/roles-servicio,deny,false,500
TENANT_B,none,payroll,read:list,GET,/api/payroll/roles-servicio,deny,false,500
TENANT_B,read,payroll,read:list,GET,/api/payroll/roles-servicio,deny,false,500
TENANT_B,editor,payroll,read:list,GET,/api/payroll/roles-servicio,deny,false,500
TENANT_B,admin,payroll,read:list,GET,/api/payroll/roles-servicio,deny,false,500
TENANT_A,none,payroll,read:list,GET,/api/payroll/items,deny,false,500
TENANT_A,read,payroll,read:list,GET,/api/payroll/items,deny,false,500
TENANT_A,editor,payroll,read:list,GET,/api/payroll/items,deny,false,500
TENANT_A,admin,payroll,read:list,GET,/api/payroll/items,deny,false,500
TENANT_B,none,payroll,read:list,GET,/api/payroll/items,deny,false,500
TENANT_B,read,payroll,read:list,GET,/api/payroll/items,deny,false,500
TENANT_B,editor,payroll,read:list,GET,/api/payroll/items,deny,false,500
TENANT_B,admin,payroll,read:list,GET,/api/payroll/items,deny,false,500
TENANT_A,none,payroll,create,POST,/api/payroll/items,deny,false,500
TENANT_A,read,payroll,create,POST,/api/payroll/items,deny,false,500
TENANT_A,editor,payroll,create,POST,/api/payroll/items,deny,false,500
TENANT_A,admin,payroll,create,POST,/api/payroll/items,deny,false,500
TENANT_B,none,payroll,create,POST,/api/payroll/items,deny,false,500
TENANT_B,read,payroll,create,POST,/api/payroll/items,deny,false,500
TENANT_B,editor,payroll,create,POST,/api/payroll/items,deny,false,500
TENANT_B,admin,payroll,create,POST,/api/payroll/items,deny,false,500
TENANT_A,none,guardias,read:detail,GET,/api/guardias/[id]/asignacion,deny,false,500
TENANT_A,read,guardias,read:detail,GET,/api/guardias/[id]/asignacion,allow,false,500
TENANT_A,editor,guardias,read:detail,GET,/api/guardias/[id]/asignacion,allow,false,500
TENANT_A,admin,guardias,read:detail,GET,/api/guardias/[id]/asignacion,allow,false,500
TENANT_B,none,guardias,read:detail,GET,/api/guardias/[id]/asignacion,deny,false,500
TENANT_B,read,guardias,read:detail,GET,/api/guardias/[id]/asignacion,allow,false,500
TENANT_B,editor,guardias,read:detail,GET,/api/guardias/[id]/asignacion,allow,false,500
TENANT_B,admin,guardias,read:detail,GET,/api/guardias/[id]/asignacion,allow,false,500
TENANT_A,none,guardias,read:detail,GET,/api/guardias/[id]/asignacion-actual,deny,false,500
TENANT_A,read,guardias,read:detail,GET,/api/guardias/[id]/asignacion-actual,allow,false,500
TENANT_A,editor,guardias,read:detail,GET,/api/guardias/[id]/asignacion-actual,allow,false,500
TENANT_A,admin,guardias,read:detail,GET,/api/guardias/[id]/asignacion-actual,allow,false,500
TENANT_B,none,guardias,read:detail,GET,/api/guardias/[id]/asignacion-actual,deny,false,500
TENANT_B,read,guardias,read:detail,GET,/api/guardias/[id]/asignacion-actual,allow,false,500
TENANT_B,editor,guardias,read:detail,GET,/api/guardias/[id]/asignacion-actual,allow,false,500
TENANT_B,admin,guardias,read:detail,GET,/api/guardias/[id]/asignacion-actual,allow,false,500
TENANT_A,none,guardias,create,POST,/api/guardias/[id]/bancarios,deny,false,500
TENANT_A,read,guardias,create,POST,/api/guardias/[id]/bancarios,deny,false,500
TENANT_A,editor,guardias,create,POST,/api/guardias/[id]/bancarios,allow,false,500
TENANT_A,admin,guardias,create,POST,/api/guardias/[id]/bancarios,allow,false,500
TENANT_B,none,guardias,create,POST,/api/guardias/[id]/bancarios,deny,false,500
TENANT_B,read,guardias,create,POST,/api/guardias/[id]/bancarios,deny,false,500
TENANT_B,editor,guardias,create,POST,/api/guardias/[id]/bancarios,allow,false,500
TENANT_B,admin,guardias,create,POST,/api/guardias/[id]/bancarios,allow,false,500
TENANT_A,none,guardias,update,PUT,/api/guardias/[id]/fecha-os10,deny,false,500
TENANT_A,read,guardias,update,PUT,/api/guardias/[id]/fecha-os10,deny,false,500
TENANT_A,editor,guardias,update,PUT,/api/guardias/[id]/fecha-os10,allow,false,500
TENANT_A,admin,guardias,update,PUT,/api/guardias/[id]/fecha-os10,allow,false,500
TENANT_B,none,guardias,update,PUT,/api/guardias/[id]/fecha-os10,deny,false,500
TENANT_B,read,guardias,update,PUT,/api/guardias/[id]/fecha-os10,deny,false,500
TENANT_B,editor,guardias,update,PUT,/api/guardias/[id]/fecha-os10,allow,false,500
TENANT_B,admin,guardias,update,PUT,/api/guardias/[id]/fecha-os10,allow,false,500
TENANT_A,none,guardias,read:detail,GET,/api/guardias/[id]/banco,deny,false,500
TENANT_A,read,guardias,read:detail,GET,/api/guardias/[id]/banco,allow,false,500
TENANT_A,editor,guardias,read:detail,GET,/api/guardias/[id]/banco,allow,false,500
TENANT_A,admin,guardias,read:detail,GET,/api/guardias/[id]/banco,allow,false,500
TENANT_B,none,guardias,read:detail,GET,/api/guardias/[id]/banco,deny,false,500
TENANT_B,read,guardias,read:detail,GET,/api/guardias/[id]/banco,allow,false,500
TENANT_B,editor,guardias,read:detail,GET,/api/guardias/[id]/banco,allow,false,500
TENANT_B,admin,guardias,read:detail,GET,/api/guardias/[id]/banco,allow,false,500
TENANT_A,none,guardias,update,PATCH,/api/guardias/[id]/banco,deny,false,500
TENANT_A,read,guardias,update,PATCH,/api/guardias/[id]/banco,deny,false,500
TENANT_A,editor,guardias,update,PATCH,/api/guardias/[id]/banco,allow,false,500
TENANT_A,admin,guardias,update,PATCH,/api/guardias/[id]/banco,allow,false,500
TENANT_B,none,guardias,update,PATCH,/api/guardias/[id]/banco,deny,false,500
TENANT_B,read,guardias,update,PATCH,/api/guardias/[id]/banco,deny,false,500
TENANT_B,editor,guardias,update,PATCH,/api/guardias/[id]/banco,allow,false,500
TENANT_B,admin,guardias,update,PATCH,/api/guardias/[id]/banco,allow,false,500
TENANT_A,none,guardias,read:detail,GET,/api/guardias/[id]/historial-mensual,deny,false,500
TENANT_A,read,guardias,read:detail,GET,/api/guardias/[id]/historial-mensual,allow,false,500
TENANT_A,editor,guardias,read:detail,GET,/api/guardias/[id]/historial-mensual,allow,false,500
TENANT_A,admin,guardias,read:detail,GET,/api/guardias/[id]/historial-mensual,allow,false,500
TENANT_B,none,guardias,read:detail,GET,/api/guardias/[id]/historial-mensual,deny,false,500
TENANT_B,read,guardias,read:detail,GET,/api/guardias/[id]/historial-mensual,allow,false,500
TENANT_B,editor,guardias,read:detail,GET,/api/guardias/[id]/historial-mensual,allow,false,500
TENANT_B,admin,guardias,read:detail,GET,/api/guardias/[id]/historial-mensual,allow,false,500
TENANT_A,none,guardias,read:detail,GET,/api/guardias/[id]/pagos-turnos-extras,deny,false,500
TENANT_A,read,guardias,read:detail,GET,/api/guardias/[id]/pagos-turnos-extras,allow,false,500
TENANT_A,editor,guardias,read:detail,GET,/api/guardias/[id]/pagos-turnos-extras,allow,false,500
TENANT_A,admin,guardias,read:detail,GET,/api/guardias/[id]/pagos-turnos-extras,allow,false,500
TENANT_B,none,guardias,read:detail,GET,/api/guardias/[id]/pagos-turnos-extras,deny,false,500
TENANT_B,read,guardias,read:detail,GET,/api/guardias/[id]/pagos-turnos-extras,allow,false,500
TENANT_B,editor,guardias,read:detail,GET,/api/guardias/[id]/pagos-turnos-extras,allow,false,500
TENANT_B,admin,guardias,read:detail,GET,/api/guardias/[id]/pagos-turnos-extras,allow,false,500
TENANT_A,none,guardias,create,POST,/api/guardias/[id]/terminar-asignacion,deny,false,500
TENANT_A,read,guardias,create,POST,/api/guardias/[id]/terminar-asignacion,deny,false,500
TENANT_A,editor,guardias,create,POST,/api/guardias/[id]/terminar-asignacion,allow,false,500
TENANT_A,admin,guardias,create,POST,/api/guardias/[id]/terminar-asignacion,allow,false,500
TENANT_B,none,guardias,create,POST,/api/guardias/[id]/terminar-asignacion,deny,false,500
TENANT_B,read,guardias,create,POST,/api/guardias/[id]/terminar-asignacion,deny,false,500
TENANT_B,editor,guardias,create,POST,/api/guardias/[id]/terminar-asignacion,allow,false,500
TENANT_B,admin,guardias,create,POST,/api/guardias/[id]/terminar-asignacion,allow,false,500
TENANT_A,none,guardias,delete,DELETE,/api/guardias/permisos/[id],deny,false,500
TENANT_A,read,guardias,delete,DELETE,/api/guardias/permisos/[id],deny,false,500
TENANT_A,editor,guardias,delete,DELETE,/api/guardias/permisos/[id],deny,false,500
TENANT_A,admin,guardias,delete,DELETE,/api/guardias/permisos/[id],allow,false,500
TENANT_B,none,guardias,delete,DELETE,/api/guardias/permisos/[id],deny,false,500
TENANT_B,read,guardias,delete,DELETE,/api/guardias/permisos/[id],deny,false,500
TENANT_B,editor,guardias,delete,DELETE,/api/guardias/permisos/[id],deny,false,500
TENANT_B,admin,guardias,delete,DELETE,/api/guardias/permisos/[id],allow,false,500
TENANT_A,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/completa,deny,false,500
TENANT_A,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/completa,allow,false,500
TENANT_A,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/completa,allow,false,500
TENANT_A,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/completa,allow,false,500
TENANT_B,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/completa,deny,false,500
TENANT_B,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/completa,allow,false,500
TENANT_B,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/completa,allow,false,500
TENANT_B,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/completa,allow,false,500
TENANT_A,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/estadisticas,deny,false,500
TENANT_A,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/estadisticas,allow,false,500
TENANT_A,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/estadisticas,allow,false,500
TENANT_A,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/estadisticas,allow,false,500
TENANT_B,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/estadisticas,deny,false,500
TENANT_B,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/estadisticas,allow,false,500
TENANT_B,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/estadisticas,allow,false,500
TENANT_B,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/estadisticas,allow,false,500
TENANT_A,none,guardias,read:detail,GET,/api/guardias/[id]/pagos,deny,false,500
TENANT_A,read,guardias,read:detail,GET,/api/guardias/[id]/pagos,allow,false,500
TENANT_A,editor,guardias,read:detail,GET,/api/guardias/[id]/pagos,allow,false,500
TENANT_A,admin,guardias,read:detail,GET,/api/guardias/[id]/pagos,allow,false,500
TENANT_B,none,guardias,read:detail,GET,/api/guardias/[id]/pagos,deny,false,500
TENANT_B,read,guardias,read:detail,GET,/api/guardias/[id]/pagos,allow,false,500
TENANT_B,editor,guardias,read:detail,GET,/api/guardias/[id]/pagos,allow,false,500
TENANT_B,admin,guardias,read:detail,GET,/api/guardias/[id]/pagos,allow,false,500
TENANT_A,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/estadisticas_v2,deny,false,500
TENANT_A,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/estadisticas_v2,allow,false,500
TENANT_A,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/estadisticas_v2,allow,false,500
TENANT_A,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/estadisticas_v2,allow,false,500
TENANT_B,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/estadisticas_v2,deny,false,500
TENANT_B,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/estadisticas_v2,allow,false,500
TENANT_B,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/estadisticas_v2,allow,false,500
TENANT_B,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/estadisticas_v2,allow,false,500
TENANT_A,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/estructuras-servicio,deny,false,500
TENANT_A,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/estructuras-servicio,allow,false,500
TENANT_A,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/estructuras-servicio,allow,false,500
TENANT_A,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/estructuras-servicio,allow,false,500
TENANT_B,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/estructuras-servicio,deny,false,500
TENANT_B,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/estructuras-servicio,allow,false,500
TENANT_B,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/estructuras-servicio,allow,false,500
TENANT_B,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/estructuras-servicio,allow,false,500
TENANT_A,none,instalaciones,create,POST,/api/instalaciones/[id]/estructuras-servicio,deny,false,500
TENANT_A,read,instalaciones,create,POST,/api/instalaciones/[id]/estructuras-servicio,deny,false,500
TENANT_A,editor,instalaciones,create,POST,/api/instalaciones/[id]/estructuras-servicio,allow,false,500
TENANT_A,admin,instalaciones,create,POST,/api/instalaciones/[id]/estructuras-servicio,allow,false,500
TENANT_B,none,instalaciones,create,POST,/api/instalaciones/[id]/estructuras-servicio,deny,false,500
TENANT_B,read,instalaciones,create,POST,/api/instalaciones/[id]/estructuras-servicio,deny,false,500
TENANT_B,editor,instalaciones,create,POST,/api/instalaciones/[id]/estructuras-servicio,allow,false,500
TENANT_B,admin,instalaciones,create,POST,/api/instalaciones/[id]/estructuras-servicio,allow,false,500
TENANT_A,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc,deny,false,500
TENANT_A,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc,allow,false,500
TENANT_A,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc,allow,false,500
TENANT_A,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc,allow,false,500
TENANT_B,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc,deny,false,500
TENANT_B,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc,allow,false,500
TENANT_B,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc,allow,false,500
TENANT_B,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc,allow,false,500
TENANT_A,none,instalaciones,create,POST,/api/instalaciones/[id]/ppc,deny,false,500
TENANT_A,read,instalaciones,create,POST,/api/instalaciones/[id]/ppc,deny,false,500
TENANT_A,editor,instalaciones,create,POST,/api/instalaciones/[id]/ppc,allow,false,500
TENANT_A,admin,instalaciones,create,POST,/api/instalaciones/[id]/ppc,allow,false,500
TENANT_B,none,instalaciones,create,POST,/api/instalaciones/[id]/ppc,deny,false,500
TENANT_B,read,instalaciones,create,POST,/api/instalaciones/[id]/ppc,deny,false,500
TENANT_B,editor,instalaciones,create,POST,/api/instalaciones/[id]/ppc,allow,false,500
TENANT_B,admin,instalaciones,create,POST,/api/instalaciones/[id]/ppc,allow,false,500
TENANT_A,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc-activos_v2,deny,false,500
TENANT_A,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc-activos_v2,allow,false,500
TENANT_A,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc-activos_v2,allow,false,500
TENANT_A,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc-activos_v2,allow,false,500
TENANT_B,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc-activos_v2,deny,false,500
TENANT_B,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc-activos_v2,allow,false,500
TENANT_B,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc-activos_v2,allow,false,500
TENANT_B,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc-activos_v2,allow,false,500
TENANT_A,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc-activos,deny,false,500
TENANT_A,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc-activos,allow,false,500
TENANT_A,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc-activos,allow,false,500
TENANT_A,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc-activos,allow,false,500
TENANT_B,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc-activos,deny,false,500
TENANT_B,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc-activos,allow,false,500
TENANT_B,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc-activos,allow,false,500
TENANT_B,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/ppc-activos,allow,false,500
TENANT_A,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/turnos,deny,false,500
TENANT_A,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/turnos,allow,false,500
TENANT_A,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/turnos,allow,false,500
TENANT_A,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/turnos,allow,false,500
TENANT_B,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/turnos,deny,false,500
TENANT_B,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/turnos,allow,false,500
TENANT_B,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/turnos,allow,false,500
TENANT_B,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/turnos,allow,false,500
TENANT_A,none,instalaciones,create,POST,/api/instalaciones/[id]/turnos,deny,false,500
TENANT_A,read,instalaciones,create,POST,/api/instalaciones/[id]/turnos,deny,false,500
TENANT_A,editor,instalaciones,create,POST,/api/instalaciones/[id]/turnos,allow,false,500
TENANT_A,admin,instalaciones,create,POST,/api/instalaciones/[id]/turnos,allow,false,500
TENANT_B,none,instalaciones,create,POST,/api/instalaciones/[id]/turnos,deny,false,500
TENANT_B,read,instalaciones,create,POST,/api/instalaciones/[id]/turnos,deny,false,500
TENANT_B,editor,instalaciones,create,POST,/api/instalaciones/[id]/turnos,allow,false,500
TENANT_B,admin,instalaciones,create,POST,/api/instalaciones/[id]/turnos,allow,false,500
TENANT_A,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/turnos_v2,deny,false,500
TENANT_A,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/turnos_v2,allow,false,500
TENANT_A,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/turnos_v2,allow,false,500
TENANT_A,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/turnos_v2,allow,false,500
TENANT_B,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/turnos_v2,deny,false,500
TENANT_B,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/turnos_v2,allow,false,500
TENANT_B,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/turnos_v2,allow,false,500
TENANT_B,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/turnos_v2,allow,false,500
TENANT_A,none,instalaciones,create,POST,/api/instalaciones/[id]/turnos_v2,deny,false,500
TENANT_A,read,instalaciones,create,POST,/api/instalaciones/[id]/turnos_v2,deny,false,500
TENANT_A,editor,instalaciones,create,POST,/api/instalaciones/[id]/turnos_v2,allow,false,500
TENANT_A,admin,instalaciones,create,POST,/api/instalaciones/[id]/turnos_v2,allow,false,500
TENANT_B,none,instalaciones,create,POST,/api/instalaciones/[id]/turnos_v2,deny,false,500
TENANT_B,read,instalaciones,create,POST,/api/instalaciones/[id]/turnos_v2,deny,false,500
TENANT_B,editor,instalaciones,create,POST,/api/instalaciones/[id]/turnos_v2,allow,false,500
TENANT_B,admin,instalaciones,create,POST,/api/instalaciones/[id]/turnos_v2,allow,false,500
TENANT_A,none,pauta-diaria,delete,DELETE,/api/pauta-diaria/observacion/[id],deny,false,500
TENANT_A,read,pauta-diaria,delete,DELETE,/api/pauta-diaria/observacion/[id],deny,false,500
TENANT_A,editor,pauta-diaria,delete,DELETE,/api/pauta-diaria/observacion/[id],deny,false,500
TENANT_A,admin,pauta-diaria,delete,DELETE,/api/pauta-diaria/observacion/[id],deny,false,500
TENANT_B,none,pauta-diaria,delete,DELETE,/api/pauta-diaria/observacion/[id],deny,false,500
TENANT_B,read,pauta-diaria,delete,DELETE,/api/pauta-diaria/observacion/[id],deny,false,500
TENANT_B,editor,pauta-diaria,delete,DELETE,/api/pauta-diaria/observacion/[id],deny,false,500
TENANT_B,admin,pauta-diaria,delete,DELETE,/api/pauta-diaria/observacion/[id],deny,false,500
TENANT_A,none,payroll,read:list,GET,/api/payroll/estructuras/instalacion,deny,false,500
TENANT_A,read,payroll,read:list,GET,/api/payroll/estructuras/instalacion,deny,false,500
TENANT_A,editor,payroll,read:list,GET,/api/payroll/estructuras/instalacion,deny,false,500
TENANT_A,admin,payroll,read:list,GET,/api/payroll/estructuras/instalacion,deny,false,500
TENANT_B,none,payroll,read:list,GET,/api/payroll/estructuras/instalacion,deny,false,500
TENANT_B,read,payroll,read:list,GET,/api/payroll/estructuras/instalacion,deny,false,500
TENANT_B,editor,payroll,read:list,GET,/api/payroll/estructuras/instalacion,deny,false,500
TENANT_B,admin,payroll,read:list,GET,/api/payroll/estructuras/instalacion,deny,false,500
TENANT_A,none,payroll,create,POST,/api/payroll/estructuras-guardia/ensure,deny,false,500
TENANT_A,read,payroll,create,POST,/api/payroll/estructuras-guardia/ensure,deny,false,500
TENANT_A,editor,payroll,create,POST,/api/payroll/estructuras-guardia/ensure,deny,false,500
TENANT_A,admin,payroll,create,POST,/api/payroll/estructuras-guardia/ensure,deny,false,500
TENANT_B,none,payroll,create,POST,/api/payroll/estructuras-guardia/ensure,deny,false,500
TENANT_B,read,payroll,create,POST,/api/payroll/estructuras-guardia/ensure,deny,false,500
TENANT_B,editor,payroll,create,POST,/api/payroll/estructuras-guardia/ensure,deny,false,500
TENANT_B,admin,payroll,create,POST,/api/payroll/estructuras-guardia/ensure,deny,false,500
TENANT_A,none,payroll,read:list,GET,/api/payroll/estructuras-guardia/historial,deny,false,500
TENANT_A,read,payroll,read:list,GET,/api/payroll/estructuras-guardia/historial,deny,false,500
TENANT_A,editor,payroll,read:list,GET,/api/payroll/estructuras-guardia/historial,deny,false,500
TENANT_A,admin,payroll,read:list,GET,/api/payroll/estructuras-guardia/historial,deny,false,500
TENANT_B,none,payroll,read:list,GET,/api/payroll/estructuras-guardia/historial,deny,false,500
TENANT_B,read,payroll,read:list,GET,/api/payroll/estructuras-guardia/historial,deny,false,500
TENANT_B,editor,payroll,read:list,GET,/api/payroll/estructuras-guardia/historial,deny,false,500
TENANT_B,admin,payroll,read:list,GET,/api/payroll/estructuras-guardia/historial,deny,false,500
TENANT_A,none,payroll,create,POST,/api/payroll/estructuras-guardia/items,deny,false,500
TENANT_A,read,payroll,create,POST,/api/payroll/estructuras-guardia/items,deny,false,500
TENANT_A,editor,payroll,create,POST,/api/payroll/estructuras-guardia/items,deny,false,500
TENANT_A,admin,payroll,create,POST,/api/payroll/estructuras-guardia/items,deny,false,500
TENANT_B,none,payroll,create,POST,/api/payroll/estructuras-guardia/items,deny,false,500
TENANT_B,read,payroll,create,POST,/api/payroll/estructuras-guardia/items,deny,false,500
TENANT_B,editor,payroll,create,POST,/api/payroll/estructuras-guardia/items,deny,false,500
TENANT_B,admin,payroll,create,POST,/api/payroll/estructuras-guardia/items,deny,false,500
TENANT_A,none,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/dashboard,deny,false,500
TENANT_A,read,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/dashboard,deny,false,500
TENANT_A,editor,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/dashboard,deny,false,500
TENANT_A,admin,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/dashboard,deny,false,500
TENANT_B,none,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/dashboard,deny,false,500
TENANT_B,read,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/dashboard,deny,false,500
TENANT_B,editor,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/dashboard,deny,false,500
TENANT_B,admin,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/dashboard,deny,false,500
TENANT_A,none,pauta-diaria,export,GET,/api/pauta-diaria/turno-extra/exportar,deny,false,500
TENANT_A,read,pauta-diaria,export,GET,/api/pauta-diaria/turno-extra/exportar,deny,false,500
TENANT_A,editor,pauta-diaria,export,GET,/api/pauta-diaria/turno-extra/exportar,deny,false,500
TENANT_A,admin,pauta-diaria,export,GET,/api/pauta-diaria/turno-extra/exportar,allow,false,500
TENANT_B,none,pauta-diaria,export,GET,/api/pauta-diaria/turno-extra/exportar,deny,false,500
TENANT_B,read,pauta-diaria,export,GET,/api/pauta-diaria/turno-extra/exportar,deny,false,500
TENANT_B,editor,pauta-diaria,export,GET,/api/pauta-diaria/turno-extra/exportar,deny,false,500
TENANT_B,admin,pauta-diaria,export,GET,/api/pauta-diaria/turno-extra/exportar,allow,false,500
TENANT_A,none,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/marcar-pagado,deny,false,500
TENANT_A,read,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/marcar-pagado,deny,false,500
TENANT_A,editor,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/marcar-pagado,deny,false,500
TENANT_A,admin,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/marcar-pagado,deny,false,500
TENANT_B,none,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/marcar-pagado,deny,false,500
TENANT_B,read,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/marcar-pagado,deny,false,500
TENANT_B,editor,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/marcar-pagado,deny,false,500
TENANT_B,admin,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/marcar-pagado,deny,false,500
TENANT_A,none,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/preservar,deny,false,500
TENANT_A,read,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/preservar,deny,false,500
TENANT_A,editor,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/preservar,deny,false,500
TENANT_A,admin,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/preservar,deny,false,500
TENANT_B,none,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/preservar,deny,false,500
TENANT_B,read,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/preservar,deny,false,500
TENANT_B,editor,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/preservar,deny,false,500
TENANT_B,admin,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/preservar,deny,false,500
TENANT_A,none,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/preservar,deny,false,500
TENANT_A,read,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/preservar,deny,false,500
TENANT_A,editor,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/preservar,deny,false,500
TENANT_A,admin,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/preservar,deny,false,500
TENANT_B,none,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/preservar,deny,false,500
TENANT_B,read,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/preservar,deny,false,500
TENANT_B,editor,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/preservar,deny,false,500
TENANT_B,admin,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/preservar,deny,false,500
TENANT_A,none,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/planillas,deny,false,500
TENANT_A,read,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/planillas,deny,false,500
TENANT_A,editor,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/planillas,deny,false,500
TENANT_A,admin,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/planillas,deny,false,500
TENANT_B,none,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/planillas,deny,false,500
TENANT_B,read,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/planillas,deny,false,500
TENANT_B,editor,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/planillas,deny,false,500
TENANT_B,admin,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/planillas,deny,false,500
TENANT_A,none,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/planillas,deny,false,500
TENANT_A,read,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/planillas,deny,false,500
TENANT_A,editor,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/planillas,deny,false,500
TENANT_A,admin,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/planillas,deny,false,500
TENANT_B,none,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/planillas,deny,false,500
TENANT_B,read,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/planillas,deny,false,500
TENANT_B,editor,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/planillas,deny,false,500
TENANT_B,admin,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/planillas,deny,false,500
TENANT_A,none,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/stats,deny,false,500
TENANT_A,read,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/stats,deny,false,500
TENANT_A,editor,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/stats,deny,false,500
TENANT_A,admin,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/stats,deny,false,500
TENANT_B,none,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/stats,deny,false,500
TENANT_B,read,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/stats,deny,false,500
TENANT_B,editor,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/stats,deny,false,500
TENANT_B,admin,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/stats,deny,false,500
TENANT_A,none,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/sync-coberturas,deny,false,500
TENANT_A,read,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/sync-coberturas,deny,false,500
TENANT_A,editor,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/sync-coberturas,deny,false,500
TENANT_A,admin,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/sync-coberturas,deny,false,500
TENANT_B,none,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/sync-coberturas,deny,false,500
TENANT_B,read,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/sync-coberturas,deny,false,500
TENANT_B,editor,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/sync-coberturas,deny,false,500
TENANT_B,admin,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/sync-coberturas,deny,false,500
TENANT_A,none,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/sync-coberturas,deny,false,500
TENANT_A,read,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/sync-coberturas,deny,false,500
TENANT_A,editor,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/sync-coberturas,deny,false,500
TENANT_A,admin,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/sync-coberturas,deny,false,500
TENANT_B,none,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/sync-coberturas,deny,false,500
TENANT_B,read,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/sync-coberturas,deny,false,500
TENANT_B,editor,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/sync-coberturas,deny,false,500
TENANT_B,admin,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/sync-coberturas,deny,false,500
TENANT_A,none,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/limpiar,deny,false,500
TENANT_A,read,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/limpiar,deny,false,500
TENANT_A,editor,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/limpiar,deny,false,500
TENANT_A,admin,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/limpiar,deny,false,500
TENANT_B,none,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/limpiar,deny,false,500
TENANT_B,read,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/limpiar,deny,false,500
TENANT_B,editor,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/limpiar,deny,false,500
TENANT_B,admin,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/limpiar,deny,false,500
TENANT_A,none,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/limpiar,deny,false,500
TENANT_A,read,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/limpiar,deny,false,500
TENANT_A,editor,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/limpiar,deny,false,500
TENANT_A,admin,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/limpiar,deny,false,500
TENANT_B,none,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/limpiar,deny,false,500
TENANT_B,read,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/limpiar,deny,false,500
TENANT_B,editor,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/limpiar,deny,false,500
TENANT_B,admin,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/limpiar,deny,false,500
TENANT_A,none,payroll,read:list,GET,/api/payroll/estructuras-servicio/vigente,deny,false,500
TENANT_A,read,payroll,read:list,GET,/api/payroll/estructuras-servicio/vigente,deny,false,500
TENANT_A,editor,payroll,read:list,GET,/api/payroll/estructuras-servicio/vigente,deny,false,500
TENANT_A,admin,payroll,read:list,GET,/api/payroll/estructuras-servicio/vigente,deny,false,500
TENANT_B,none,payroll,read:list,GET,/api/payroll/estructuras-servicio/vigente,deny,false,500
TENANT_B,read,payroll,read:list,GET,/api/payroll/estructuras-servicio/vigente,deny,false,500
TENANT_B,editor,payroll,read:list,GET,/api/payroll/estructuras-servicio/vigente,deny,false,500
TENANT_B,admin,payroll,read:list,GET,/api/payroll/estructuras-servicio/vigente,deny,false,500
TENANT_A,none,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/test,deny,false,500
TENANT_A,read,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/test,deny,false,500
TENANT_A,editor,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/test,deny,false,500
TENANT_A,admin,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/test,deny,false,500
TENANT_B,none,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/test,deny,false,500
TENANT_B,read,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/test,deny,false,500
TENANT_B,editor,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/test,deny,false,500
TENANT_B,admin,pauta-diaria,read:list,GET,/api/pauta-diaria/turno-extra/test,deny,false,500
TENANT_A,none,payroll,update,PUT,/api/payroll/items/[id],deny,false,500
TENANT_A,read,payroll,update,PUT,/api/payroll/items/[id],deny,false,500
TENANT_A,editor,payroll,update,PUT,/api/payroll/items/[id],allow,false,500
TENANT_A,admin,payroll,update,PUT,/api/payroll/items/[id],allow,false,500
TENANT_B,none,payroll,update,PUT,/api/payroll/items/[id],deny,false,500
TENANT_B,read,payroll,update,PUT,/api/payroll/items/[id],deny,false,500
TENANT_B,editor,payroll,update,PUT,/api/payroll/items/[id],allow,false,500
TENANT_B,admin,payroll,update,PUT,/api/payroll/items/[id],allow,false,500
TENANT_A,none,payroll,delete,DELETE,/api/payroll/items/[id],deny,false,500
TENANT_A,read,payroll,delete,DELETE,/api/payroll/items/[id],deny,false,500
TENANT_A,editor,payroll,delete,DELETE,/api/payroll/items/[id],deny,false,500
TENANT_A,admin,payroll,delete,DELETE,/api/payroll/items/[id],deny,false,500
TENANT_B,none,payroll,delete,DELETE,/api/payroll/items/[id],deny,false,500
TENANT_B,read,payroll,delete,DELETE,/api/payroll/items/[id],deny,false,500
TENANT_B,editor,payroll,delete,DELETE,/api/payroll/items/[id],deny,false,500
TENANT_B,admin,payroll,delete,DELETE,/api/payroll/items/[id],deny,false,500
TENANT_A,none,payroll,read:list,GET,/api/payroll/items/opciones,deny,false,500
TENANT_A,read,payroll,read:list,GET,/api/payroll/items/opciones,deny,false,500
TENANT_A,editor,payroll,read:list,GET,/api/payroll/items/opciones,deny,false,500
TENANT_A,admin,payroll,read:list,GET,/api/payroll/items/opciones,deny,false,500
TENANT_B,none,payroll,read:list,GET,/api/payroll/items/opciones,deny,false,500
TENANT_B,read,payroll,read:list,GET,/api/payroll/items/opciones,deny,false,500
TENANT_B,editor,payroll,read:list,GET,/api/payroll/items/opciones,deny,false,500
TENANT_B,admin,payroll,read:list,GET,/api/payroll/items/opciones,deny,false,500
TENANT_A,none,instalaciones,update,PUT,/api/instalaciones/[id]/estructuras-servicio/[estructuraId],deny,false,500
TENANT_A,read,instalaciones,update,PUT,/api/instalaciones/[id]/estructuras-servicio/[estructuraId],deny,false,500
TENANT_A,editor,instalaciones,update,PUT,/api/instalaciones/[id]/estructuras-servicio/[estructuraId],allow,false,500
TENANT_A,admin,instalaciones,update,PUT,/api/instalaciones/[id]/estructuras-servicio/[estructuraId],allow,false,500
TENANT_B,none,instalaciones,update,PUT,/api/instalaciones/[id]/estructuras-servicio/[estructuraId],deny,false,500
TENANT_B,read,instalaciones,update,PUT,/api/instalaciones/[id]/estructuras-servicio/[estructuraId],deny,false,500
TENANT_B,editor,instalaciones,update,PUT,/api/instalaciones/[id]/estructuras-servicio/[estructuraId],allow,false,500
TENANT_B,admin,instalaciones,update,PUT,/api/instalaciones/[id]/estructuras-servicio/[estructuraId],allow,false,500
TENANT_A,none,instalaciones,delete,DELETE,/api/instalaciones/[id]/estructuras-servicio/[estructuraId],deny,false,500
TENANT_A,read,instalaciones,delete,DELETE,/api/instalaciones/[id]/estructuras-servicio/[estructuraId],deny,false,500
TENANT_A,editor,instalaciones,delete,DELETE,/api/instalaciones/[id]/estructuras-servicio/[estructuraId],deny,false,500
TENANT_A,admin,instalaciones,delete,DELETE,/api/instalaciones/[id]/estructuras-servicio/[estructuraId],allow,false,500
TENANT_B,none,instalaciones,delete,DELETE,/api/instalaciones/[id]/estructuras-servicio/[estructuraId],deny,false,500
TENANT_B,read,instalaciones,delete,DELETE,/api/instalaciones/[id]/estructuras-servicio/[estructuraId],deny,false,500
TENANT_B,editor,instalaciones,delete,DELETE,/api/instalaciones/[id]/estructuras-servicio/[estructuraId],deny,false,500
TENANT_B,admin,instalaciones,delete,DELETE,/api/instalaciones/[id]/estructuras-servicio/[estructuraId],allow,false,500
TENANT_A,none,instalaciones,delete,DELETE,/api/instalaciones/[id]/ppc/[ppcId],deny,false,500
TENANT_A,read,instalaciones,delete,DELETE,/api/instalaciones/[id]/ppc/[ppcId],deny,false,500
TENANT_A,editor,instalaciones,delete,DELETE,/api/instalaciones/[id]/ppc/[ppcId],deny,false,500
TENANT_A,admin,instalaciones,delete,DELETE,/api/instalaciones/[id]/ppc/[ppcId],allow,false,500
TENANT_B,none,instalaciones,delete,DELETE,/api/instalaciones/[id]/ppc/[ppcId],deny,false,500
TENANT_B,read,instalaciones,delete,DELETE,/api/instalaciones/[id]/ppc/[ppcId],deny,false,500
TENANT_B,editor,instalaciones,delete,DELETE,/api/instalaciones/[id]/ppc/[ppcId],deny,false,500
TENANT_B,admin,instalaciones,delete,DELETE,/api/instalaciones/[id]/ppc/[ppcId],allow,false,500
TENANT_A,none,instalaciones,create,POST,/api/instalaciones/[id]/ppc/desasignar,deny,false,500
TENANT_A,read,instalaciones,create,POST,/api/instalaciones/[id]/ppc/desasignar,deny,false,500
TENANT_A,editor,instalaciones,create,POST,/api/instalaciones/[id]/ppc/desasignar,allow,false,500
TENANT_A,admin,instalaciones,create,POST,/api/instalaciones/[id]/ppc/desasignar,allow,false,500
TENANT_B,none,instalaciones,create,POST,/api/instalaciones/[id]/ppc/desasignar,deny,false,500
TENANT_B,read,instalaciones,create,POST,/api/instalaciones/[id]/ppc/desasignar,deny,false,500
TENANT_B,editor,instalaciones,create,POST,/api/instalaciones/[id]/ppc/desasignar,allow,false,500
TENANT_B,admin,instalaciones,create,POST,/api/instalaciones/[id]/ppc/desasignar,allow,false,500
TENANT_A,none,instalaciones,create,POST,/api/instalaciones/[id]/ppc/desasignar_v2,deny,false,500
TENANT_A,read,instalaciones,create,POST,/api/instalaciones/[id]/ppc/desasignar_v2,deny,false,500
TENANT_A,editor,instalaciones,create,POST,/api/instalaciones/[id]/ppc/desasignar_v2,allow,false,500
TENANT_A,admin,instalaciones,create,POST,/api/instalaciones/[id]/ppc/desasignar_v2,allow,false,500
TENANT_B,none,instalaciones,create,POST,/api/instalaciones/[id]/ppc/desasignar_v2,deny,false,500
TENANT_B,read,instalaciones,create,POST,/api/instalaciones/[id]/ppc/desasignar_v2,deny,false,500
TENANT_B,editor,instalaciones,create,POST,/api/instalaciones/[id]/ppc/desasignar_v2,allow,false,500
TENANT_B,admin,instalaciones,create,POST,/api/instalaciones/[id]/ppc/desasignar_v2,allow,false,500
TENANT_A,none,instalaciones,delete,DELETE,/api/instalaciones/[id]/turnos/[turnoId],deny,false,500
TENANT_A,read,instalaciones,delete,DELETE,/api/instalaciones/[id]/turnos/[turnoId],deny,false,500
TENANT_A,editor,instalaciones,delete,DELETE,/api/instalaciones/[id]/turnos/[turnoId],deny,false,500
TENANT_A,admin,instalaciones,delete,DELETE,/api/instalaciones/[id]/turnos/[turnoId],allow,false,500
TENANT_B,none,instalaciones,delete,DELETE,/api/instalaciones/[id]/turnos/[turnoId],deny,false,500
TENANT_B,read,instalaciones,delete,DELETE,/api/instalaciones/[id]/turnos/[turnoId],deny,false,500
TENANT_B,editor,instalaciones,delete,DELETE,/api/instalaciones/[id]/turnos/[turnoId],deny,false,500
TENANT_B,admin,instalaciones,delete,DELETE,/api/instalaciones/[id]/turnos/[turnoId],allow,false,500
TENANT_A,none,payroll,create,POST,/api/payroll/estructuras/instalacion/create,deny,false,500
TENANT_A,read,payroll,create,POST,/api/payroll/estructuras/instalacion/create,deny,false,500
TENANT_A,editor,payroll,create,POST,/api/payroll/estructuras/instalacion/create,deny,false,500
TENANT_A,admin,payroll,create,POST,/api/payroll/estructuras/instalacion/create,deny,false,500
TENANT_B,none,payroll,create,POST,/api/payroll/estructuras/instalacion/create,deny,false,500
TENANT_B,read,payroll,create,POST,/api/payroll/estructuras/instalacion/create,deny,false,500
TENANT_B,editor,payroll,create,POST,/api/payroll/estructuras/instalacion/create,deny,false,500
TENANT_B,admin,payroll,create,POST,/api/payroll/estructuras/instalacion/create,deny,false,500
TENANT_A,none,payroll,create,POST,/api/payroll/estructuras/instalacion/ensure,deny,false,500
TENANT_A,read,payroll,create,POST,/api/payroll/estructuras/instalacion/ensure,deny,false,500
TENANT_A,editor,payroll,create,POST,/api/payroll/estructuras/instalacion/ensure,deny,false,500
TENANT_A,admin,payroll,create,POST,/api/payroll/estructuras/instalacion/ensure,deny,false,500
TENANT_B,none,payroll,create,POST,/api/payroll/estructuras/instalacion/ensure,deny,false,500
TENANT_B,read,payroll,create,POST,/api/payroll/estructuras/instalacion/ensure,deny,false,500
TENANT_B,editor,payroll,create,POST,/api/payroll/estructuras/instalacion/ensure,deny,false,500
TENANT_B,admin,payroll,create,POST,/api/payroll/estructuras/instalacion/ensure,deny,false,500
TENANT_A,none,payroll,create,POST,/api/payroll/estructuras/instalacion/items,deny,false,500
TENANT_A,read,payroll,create,POST,/api/payroll/estructuras/instalacion/items,deny,false,500
TENANT_A,editor,payroll,create,POST,/api/payroll/estructuras/instalacion/items,deny,false,500
TENANT_A,admin,payroll,create,POST,/api/payroll/estructuras/instalacion/items,deny,false,500
TENANT_B,none,payroll,create,POST,/api/payroll/estructuras/instalacion/items,deny,false,500
TENANT_B,read,payroll,create,POST,/api/payroll/estructuras/instalacion/items,deny,false,500
TENANT_B,editor,payroll,create,POST,/api/payroll/estructuras/instalacion/items,deny,false,500
TENANT_B,admin,payroll,create,POST,/api/payroll/estructuras/instalacion/items,deny,false,500
TENANT_A,none,payroll,update,PATCH,/api/payroll/estructuras-guardia/[id]/cerrar,deny,false,500
TENANT_A,read,payroll,update,PATCH,/api/payroll/estructuras-guardia/[id]/cerrar,deny,false,500
TENANT_A,editor,payroll,update,PATCH,/api/payroll/estructuras-guardia/[id]/cerrar,allow,false,500
TENANT_A,admin,payroll,update,PATCH,/api/payroll/estructuras-guardia/[id]/cerrar,allow,false,500
TENANT_B,none,payroll,update,PATCH,/api/payroll/estructuras-guardia/[id]/cerrar,deny,false,500
TENANT_B,read,payroll,update,PATCH,/api/payroll/estructuras-guardia/[id]/cerrar,deny,false,500
TENANT_B,editor,payroll,update,PATCH,/api/payroll/estructuras-guardia/[id]/cerrar,allow,false,500
TENANT_B,admin,payroll,update,PATCH,/api/payroll/estructuras-guardia/[id]/cerrar,allow,false,500
TENANT_A,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/puestos/[puestoId],deny,false,500
TENANT_A,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/puestos/[puestoId],allow,false,500
TENANT_A,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/puestos/[puestoId],allow,false,500
TENANT_A,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/puestos/[puestoId],allow,false,500
TENANT_B,none,instalaciones,read:detail,GET,/api/instalaciones/[id]/puestos/[puestoId],deny,false,500
TENANT_B,read,instalaciones,read:detail,GET,/api/instalaciones/[id]/puestos/[puestoId],allow,false,500
TENANT_B,editor,instalaciones,read:detail,GET,/api/instalaciones/[id]/puestos/[puestoId],allow,false,500
TENANT_B,admin,instalaciones,read:detail,GET,/api/instalaciones/[id]/puestos/[puestoId],allow,false,500
TENANT_A,none,instalaciones,update,PATCH,/api/instalaciones/[id]/puestos/[puestoId],deny,false,500
TENANT_A,read,instalaciones,update,PATCH,/api/instalaciones/[id]/puestos/[puestoId],deny,false,500
TENANT_A,editor,instalaciones,update,PATCH,/api/instalaciones/[id]/puestos/[puestoId],allow,false,500
TENANT_A,admin,instalaciones,update,PATCH,/api/instalaciones/[id]/puestos/[puestoId],allow,false,500
TENANT_B,none,instalaciones,update,PATCH,/api/instalaciones/[id]/puestos/[puestoId],deny,false,500
TENANT_B,read,instalaciones,update,PATCH,/api/instalaciones/[id]/puestos/[puestoId],deny,false,500
TENANT_B,editor,instalaciones,update,PATCH,/api/instalaciones/[id]/puestos/[puestoId],allow,false,500
TENANT_B,admin,instalaciones,update,PATCH,/api/instalaciones/[id]/puestos/[puestoId],allow,false,500
TENANT_A,none,payroll,update,PUT,/api/payroll/estructuras-guardia/items/[id],deny,false,500
TENANT_A,read,payroll,update,PUT,/api/payroll/estructuras-guardia/items/[id],deny,false,500
TENANT_A,editor,payroll,update,PUT,/api/payroll/estructuras-guardia/items/[id],allow,false,500
TENANT_A,admin,payroll,update,PUT,/api/payroll/estructuras-guardia/items/[id],allow,false,500
TENANT_B,none,payroll,update,PUT,/api/payroll/estructuras-guardia/items/[id],deny,false,500
TENANT_B,read,payroll,update,PUT,/api/payroll/estructuras-guardia/items/[id],deny,false,500
TENANT_B,editor,payroll,update,PUT,/api/payroll/estructuras-guardia/items/[id],allow,false,500
TENANT_B,admin,payroll,update,PUT,/api/payroll/estructuras-guardia/items/[id],allow,false,500
TENANT_A,none,payroll,delete,DELETE,/api/payroll/estructuras-guardia/items/[id],deny,false,500
TENANT_A,read,payroll,delete,DELETE,/api/payroll/estructuras-guardia/items/[id],deny,false,500
TENANT_A,editor,payroll,delete,DELETE,/api/payroll/estructuras-guardia/items/[id],deny,false,500
TENANT_A,admin,payroll,delete,DELETE,/api/payroll/estructuras-guardia/items/[id],deny,false,500
TENANT_B,none,payroll,delete,DELETE,/api/payroll/estructuras-guardia/items/[id],deny,false,500
TENANT_B,read,payroll,delete,DELETE,/api/payroll/estructuras-guardia/items/[id],deny,false,500
TENANT_B,editor,payroll,delete,DELETE,/api/payroll/estructuras-guardia/items/[id],deny,false,500
TENANT_B,admin,payroll,delete,DELETE,/api/payroll/estructuras-guardia/items/[id],deny,false,500
TENANT_A,none,guardias,read:detail,GET,/api/guardias/[id]/pagos/[pago_id]/csv,deny,false,500
TENANT_A,read,guardias,read:detail,GET,/api/guardias/[id]/pagos/[pago_id]/csv,allow,false,500
TENANT_A,editor,guardias,read:detail,GET,/api/guardias/[id]/pagos/[pago_id]/csv,allow,false,500
TENANT_A,admin,guardias,read:detail,GET,/api/guardias/[id]/pagos/[pago_id]/csv,allow,false,500
TENANT_B,none,guardias,read:detail,GET,/api/guardias/[id]/pagos/[pago_id]/csv,deny,false,500
TENANT_B,read,guardias,read:detail,GET,/api/guardias/[id]/pagos/[pago_id]/csv,allow,false,500
TENANT_B,editor,guardias,read:detail,GET,/api/guardias/[id]/pagos/[pago_id]/csv,allow,false,500
TENANT_B,admin,guardias,read:detail,GET,/api/guardias/[id]/pagos/[pago_id]/csv,allow,false,500
TENANT_A,none,instalaciones,create,POST,/api/instalaciones/[id]/ppc/[ppcId]/desasignar,deny,false,500
TENANT_A,read,instalaciones,create,POST,/api/instalaciones/[id]/ppc/[ppcId]/desasignar,deny,false,500
TENANT_A,editor,instalaciones,create,POST,/api/instalaciones/[id]/ppc/[ppcId]/desasignar,allow,false,500
TENANT_A,admin,instalaciones,create,POST,/api/instalaciones/[id]/ppc/[ppcId]/desasignar,allow,false,500
TENANT_B,none,instalaciones,create,POST,/api/instalaciones/[id]/ppc/[ppcId]/desasignar,deny,false,500
TENANT_B,read,instalaciones,create,POST,/api/instalaciones/[id]/ppc/[ppcId]/desasignar,deny,false,500
TENANT_B,editor,instalaciones,create,POST,/api/instalaciones/[id]/ppc/[ppcId]/desasignar,allow,false,500
TENANT_B,admin,instalaciones,create,POST,/api/instalaciones/[id]/ppc/[ppcId]/desasignar,allow,false,500
TENANT_A,none,instalaciones,create,POST,/api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2,deny,false,500
TENANT_A,read,instalaciones,create,POST,/api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2,deny,false,500
TENANT_A,editor,instalaciones,create,POST,/api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2,allow,false,500
TENANT_A,admin,instalaciones,create,POST,/api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2,allow,false,500
TENANT_B,none,instalaciones,create,POST,/api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2,deny,false,500
TENANT_B,read,instalaciones,create,POST,/api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2,deny,false,500
TENANT_B,editor,instalaciones,create,POST,/api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2,allow,false,500
TENANT_B,admin,instalaciones,create,POST,/api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2,allow,false,500
TENANT_A,none,instalaciones,create,POST,/api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs,deny,false,500
TENANT_A,read,instalaciones,create,POST,/api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs,deny,false,500
TENANT_A,editor,instalaciones,create,POST,/api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs,allow,false,500
TENANT_A,admin,instalaciones,create,POST,/api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs,allow,false,500
TENANT_B,none,instalaciones,create,POST,/api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs,deny,false,500
TENANT_B,read,instalaciones,create,POST,/api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs,deny,false,500
TENANT_B,editor,instalaciones,create,POST,/api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs,allow,false,500
TENANT_B,admin,instalaciones,create,POST,/api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs,allow,false,500
TENANT_A,none,instalaciones,delete,DELETE,/api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2,deny,false,500
TENANT_A,read,instalaciones,delete,DELETE,/api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2,deny,false,500
TENANT_A,editor,instalaciones,delete,DELETE,/api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2,deny,false,500
TENANT_A,admin,instalaciones,delete,DELETE,/api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2,allow,false,500
TENANT_B,none,instalaciones,delete,DELETE,/api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2,deny,false,500
TENANT_B,read,instalaciones,delete,DELETE,/api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2,deny,false,500
TENANT_B,editor,instalaciones,delete,DELETE,/api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2,deny,false,500
TENANT_B,admin,instalaciones,delete,DELETE,/api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2,allow,false,500
TENANT_A,none,payroll,update,PATCH,/api/payroll/estructuras/instalacion/[id]/cerrar,deny,false,500
TENANT_A,read,payroll,update,PATCH,/api/payroll/estructuras/instalacion/[id]/cerrar,deny,false,500
TENANT_A,editor,payroll,update,PATCH,/api/payroll/estructuras/instalacion/[id]/cerrar,allow,false,500
TENANT_A,admin,payroll,update,PATCH,/api/payroll/estructuras/instalacion/[id]/cerrar,allow,false,500
TENANT_B,none,payroll,update,PATCH,/api/payroll/estructuras/instalacion/[id]/cerrar,deny,false,500
TENANT_B,read,payroll,update,PATCH,/api/payroll/estructuras/instalacion/[id]/cerrar,deny,false,500
TENANT_B,editor,payroll,update,PATCH,/api/payroll/estructuras/instalacion/[id]/cerrar,allow,false,500
TENANT_B,admin,payroll,update,PATCH,/api/payroll/estructuras/instalacion/[id]/cerrar,allow,false,500
TENANT_A,none,payroll,update,PUT,/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id],deny,false,500
TENANT_A,read,payroll,update,PUT,/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id],deny,false,500
TENANT_A,editor,payroll,update,PUT,/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id],allow,false,500
TENANT_A,admin,payroll,update,PUT,/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id],allow,false,500
TENANT_B,none,payroll,update,PUT,/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id],deny,false,500
TENANT_B,read,payroll,update,PUT,/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id],deny,false,500
TENANT_B,editor,payroll,update,PUT,/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id],allow,false,500
TENANT_B,admin,payroll,update,PUT,/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id],allow,false,500
TENANT_A,none,payroll,delete,DELETE,/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id],deny,false,500
TENANT_A,read,payroll,delete,DELETE,/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id],deny,false,500
TENANT_A,editor,payroll,delete,DELETE,/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id],deny,false,500
TENANT_A,admin,payroll,delete,DELETE,/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id],deny,false,500
TENANT_B,none,payroll,delete,DELETE,/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id],deny,false,500
TENANT_B,read,payroll,delete,DELETE,/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id],deny,false,500
TENANT_B,editor,payroll,delete,DELETE,/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id],deny,false,500
TENANT_B,admin,payroll,delete,DELETE,/api/payroll/estructuras/instalacion/sueldo-base/[estructura_id],deny,false,500
TENANT_A,none,payroll,update,PUT,/api/payroll/estructuras/instalacion/items/[id],deny,false,500
TENANT_A,read,payroll,update,PUT,/api/payroll/estructuras/instalacion/items/[id],deny,false,500
TENANT_A,editor,payroll,update,PUT,/api/payroll/estructuras/instalacion/items/[id],allow,false,500
TENANT_A,admin,payroll,update,PUT,/api/payroll/estructuras/instalacion/items/[id],allow,false,500
TENANT_B,none,payroll,update,PUT,/api/payroll/estructuras/instalacion/items/[id],deny,false,500
TENANT_B,read,payroll,update,PUT,/api/payroll/estructuras/instalacion/items/[id],deny,false,500
TENANT_B,editor,payroll,update,PUT,/api/payroll/estructuras/instalacion/items/[id],allow,false,500
TENANT_B,admin,payroll,update,PUT,/api/payroll/estructuras/instalacion/items/[id],allow,false,500
TENANT_A,none,payroll,delete,DELETE,/api/payroll/estructuras/instalacion/items/[id],deny,false,500
TENANT_A,read,payroll,delete,DELETE,/api/payroll/estructuras/instalacion/items/[id],deny,false,500
TENANT_A,editor,payroll,delete,DELETE,/api/payroll/estructuras/instalacion/items/[id],deny,false,500
TENANT_A,admin,payroll,delete,DELETE,/api/payroll/estructuras/instalacion/items/[id],deny,false,500
TENANT_B,none,payroll,delete,DELETE,/api/payroll/estructuras/instalacion/items/[id],deny,false,500
TENANT_B,read,payroll,delete,DELETE,/api/payroll/estructuras/instalacion/items/[id],deny,false,500
TENANT_B,editor,payroll,delete,DELETE,/api/payroll/estructuras/instalacion/items/[id],deny,false,500
TENANT_B,admin,payroll,delete,DELETE,/api/payroll/estructuras/instalacion/items/[id],deny,false,500
TENANT_A,none,pauta-diaria,read:detail,GET,/api/pauta-diaria/turno-extra/planillas/[id]/descargar,deny,false,500
TENANT_A,read,pauta-diaria,read:detail,GET,/api/pauta-diaria/turno-extra/planillas/[id]/descargar,allow,false,500
TENANT_A,editor,pauta-diaria,read:detail,GET,/api/pauta-diaria/turno-extra/planillas/[id]/descargar,allow,false,500
TENANT_A,admin,pauta-diaria,read:detail,GET,/api/pauta-diaria/turno-extra/planillas/[id]/descargar,allow,false,500
TENANT_B,none,pauta-diaria,read:detail,GET,/api/pauta-diaria/turno-extra/planillas/[id]/descargar,deny,false,500
TENANT_B,read,pauta-diaria,read:detail,GET,/api/pauta-diaria/turno-extra/planillas/[id]/descargar,allow,false,500
TENANT_B,editor,pauta-diaria,read:detail,GET,/api/pauta-diaria/turno-extra/planillas/[id]/descargar,allow,false,500
TENANT_B,admin,pauta-diaria,read:detail,GET,/api/pauta-diaria/turno-extra/planillas/[id]/descargar,allow,false,500
TENANT_A,none,pauta-diaria,delete,DELETE,/api/pauta-diaria/turno-extra/planillas/[id]/eliminar,deny,false,500
TENANT_A,read,pauta-diaria,delete,DELETE,/api/pauta-diaria/turno-extra/planillas/[id]/eliminar,deny,false,500
TENANT_A,editor,pauta-diaria,delete,DELETE,/api/pauta-diaria/turno-extra/planillas/[id]/eliminar,deny,false,500
TENANT_A,admin,pauta-diaria,delete,DELETE,/api/pauta-diaria/turno-extra/planillas/[id]/eliminar,deny,false,500
TENANT_B,none,pauta-diaria,delete,DELETE,/api/pauta-diaria/turno-extra/planillas/[id]/eliminar,deny,false,500
TENANT_B,read,pauta-diaria,delete,DELETE,/api/pauta-diaria/turno-extra/planillas/[id]/eliminar,deny,false,500
TENANT_B,editor,pauta-diaria,delete,DELETE,/api/pauta-diaria/turno-extra/planillas/[id]/eliminar,deny,false,500
TENANT_B,admin,pauta-diaria,delete,DELETE,/api/pauta-diaria/turno-extra/planillas/[id]/eliminar,deny,false,500
TENANT_A,none,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada,deny,false,500
TENANT_A,read,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada,deny,false,500
TENANT_A,editor,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada,deny,false,500
TENANT_A,admin,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada,deny,false,500
TENANT_B,none,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada,deny,false,500
TENANT_B,read,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada,deny,false,500
TENANT_B,editor,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada,deny,false,500
TENANT_B,admin,pauta-diaria,create,POST,/api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada,deny,false,500
```
- TENANT_A/none → GET /api/clientes (clientes:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/clientes (clientes:read:list) esperado=allow status=500
- TENANT_A/editor → GET /api/clientes (clientes:read:list) esperado=allow status=500
- TENANT_A/admin → GET /api/clientes (clientes:read:list) esperado=allow status=500
- TENANT_B/none → GET /api/clientes (clientes:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/clientes (clientes:read:list) esperado=allow status=500
- TENANT_B/editor → GET /api/clientes (clientes:read:list) esperado=allow status=500
- TENANT_B/admin → GET /api/clientes (clientes:read:list) esperado=allow status=500
- TENANT_A/none → POST /api/clientes (clientes:create) esperado=deny status=500
- TENANT_A/read → POST /api/clientes (clientes:create) esperado=deny status=500
- TENANT_A/editor → POST /api/clientes (clientes:create) esperado=allow status=500
- TENANT_A/admin → POST /api/clientes (clientes:create) esperado=allow status=500
- TENANT_B/none → POST /api/clientes (clientes:create) esperado=deny status=500
- TENANT_B/read → POST /api/clientes (clientes:create) esperado=deny status=500
- TENANT_B/editor → POST /api/clientes (clientes:create) esperado=allow status=500
- TENANT_B/admin → POST /api/clientes (clientes:create) esperado=allow status=500
- TENANT_A/none → PUT /api/clientes (clientes:update) esperado=deny status=500
- TENANT_A/read → PUT /api/clientes (clientes:update) esperado=deny status=500
- TENANT_A/editor → PUT /api/clientes (clientes:update) esperado=allow status=500
- TENANT_A/admin → PUT /api/clientes (clientes:update) esperado=allow status=500
- TENANT_B/none → PUT /api/clientes (clientes:update) esperado=deny status=500
- TENANT_B/read → PUT /api/clientes (clientes:update) esperado=deny status=500
- TENANT_B/editor → PUT /api/clientes (clientes:update) esperado=allow status=500
- TENANT_B/admin → PUT /api/clientes (clientes:update) esperado=allow status=500
- TENANT_A/none → DELETE /api/clientes (clientes:delete) esperado=deny status=500
- TENANT_A/read → DELETE /api/clientes (clientes:delete) esperado=deny status=500
- TENANT_A/editor → DELETE /api/clientes (clientes:delete) esperado=deny status=500
- TENANT_A/admin → DELETE /api/clientes (clientes:delete) esperado=allow status=500
- TENANT_B/none → DELETE /api/clientes (clientes:delete) esperado=deny status=500
- TENANT_B/read → DELETE /api/clientes (clientes:delete) esperado=deny status=500
- TENANT_B/editor → DELETE /api/clientes (clientes:delete) esperado=deny status=500
- TENANT_B/admin → DELETE /api/clientes (clientes:delete) esperado=allow status=500
- TENANT_A/none → GET /api/guardias (guardias:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/guardias (guardias:read:list) esperado=allow status=500
- TENANT_A/editor → GET /api/guardias (guardias:read:list) esperado=allow status=500
- TENANT_A/admin → GET /api/guardias (guardias:read:list) esperado=allow status=500
- TENANT_B/none → GET /api/guardias (guardias:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/guardias (guardias:read:list) esperado=allow status=500
- TENANT_B/editor → GET /api/guardias (guardias:read:list) esperado=allow status=500
- TENANT_B/admin → GET /api/guardias (guardias:read:list) esperado=allow status=500
- TENANT_A/none → POST /api/guardias (guardias:create) esperado=deny status=500
- TENANT_A/read → POST /api/guardias (guardias:create) esperado=deny status=500
- TENANT_A/editor → POST /api/guardias (guardias:create) esperado=allow status=500
- TENANT_A/admin → POST /api/guardias (guardias:create) esperado=allow status=500
- TENANT_B/none → POST /api/guardias (guardias:create) esperado=deny status=500
- TENANT_B/read → POST /api/guardias (guardias:create) esperado=deny status=500
- TENANT_B/editor → POST /api/guardias (guardias:create) esperado=allow status=500
- TENANT_B/admin → POST /api/guardias (guardias:create) esperado=allow status=500
- TENANT_A/none → GET /api/instalaciones (instalaciones:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/instalaciones (instalaciones:read:list) esperado=allow status=500
- TENANT_A/editor → GET /api/instalaciones (instalaciones:read:list) esperado=allow status=500
- TENANT_A/admin → GET /api/instalaciones (instalaciones:read:list) esperado=allow status=500
- TENANT_B/none → GET /api/instalaciones (instalaciones:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/instalaciones (instalaciones:read:list) esperado=allow status=500
- TENANT_B/editor → GET /api/instalaciones (instalaciones:read:list) esperado=allow status=500
- TENANT_B/admin → GET /api/instalaciones (instalaciones:read:list) esperado=allow status=500
- TENANT_A/none → POST /api/instalaciones (instalaciones:create) esperado=deny status=500
- TENANT_A/read → POST /api/instalaciones (instalaciones:create) esperado=deny status=500
- TENANT_A/editor → POST /api/instalaciones (instalaciones:create) esperado=allow status=500
- TENANT_A/admin → POST /api/instalaciones (instalaciones:create) esperado=allow status=500
- TENANT_B/none → POST /api/instalaciones (instalaciones:create) esperado=deny status=500
- TENANT_B/read → POST /api/instalaciones (instalaciones:create) esperado=deny status=500
- TENANT_B/editor → POST /api/instalaciones (instalaciones:create) esperado=allow status=500
- TENANT_B/admin → POST /api/instalaciones (instalaciones:create) esperado=allow status=500
- TENANT_A/none → PUT /api/instalaciones (instalaciones:update) esperado=deny status=500
- TENANT_A/read → PUT /api/instalaciones (instalaciones:update) esperado=deny status=500
- TENANT_A/editor → PUT /api/instalaciones (instalaciones:update) esperado=allow status=500
- TENANT_A/admin → PUT /api/instalaciones (instalaciones:update) esperado=allow status=500
- TENANT_B/none → PUT /api/instalaciones (instalaciones:update) esperado=deny status=500
- TENANT_B/read → PUT /api/instalaciones (instalaciones:update) esperado=deny status=500
- TENANT_B/editor → PUT /api/instalaciones (instalaciones:update) esperado=allow status=500
- TENANT_B/admin → PUT /api/instalaciones (instalaciones:update) esperado=allow status=500
- TENANT_A/none → DELETE /api/instalaciones (instalaciones:delete) esperado=deny status=500
- TENANT_A/read → DELETE /api/instalaciones (instalaciones:delete) esperado=deny status=500
- TENANT_A/editor → DELETE /api/instalaciones (instalaciones:delete) esperado=deny status=500
- TENANT_A/admin → DELETE /api/instalaciones (instalaciones:delete) esperado=allow status=500
- TENANT_B/none → DELETE /api/instalaciones (instalaciones:delete) esperado=deny status=500
- TENANT_B/read → DELETE /api/instalaciones (instalaciones:delete) esperado=deny status=500
- TENANT_B/editor → DELETE /api/instalaciones (instalaciones:delete) esperado=deny status=500
- TENANT_B/admin → DELETE /api/instalaciones (instalaciones:delete) esperado=allow status=500
- TENANT_A/none → GET /api/pauta-diaria (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/pauta-diaria (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/pauta-diaria (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/pauta-diaria (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/pauta-diaria (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/pauta-diaria (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/pauta-diaria (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/pauta-diaria (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/none → GET /api/pauta-mensual (pauta-mensual:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/pauta-mensual (pauta-mensual:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/pauta-mensual (pauta-mensual:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/pauta-mensual (pauta-mensual:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/pauta-mensual (pauta-mensual:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/pauta-mensual (pauta-mensual:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/pauta-mensual (pauta-mensual:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/pauta-mensual (pauta-mensual:read:list) esperado=deny status=500
- TENANT_A/none → GET /api/clientes/[id] (clientes:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/clientes/[id] (clientes:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/clientes/[id] (clientes:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/clientes/[id] (clientes:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/clientes/[id] (clientes:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/clientes/[id] (clientes:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/clientes/[id] (clientes:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/clientes/[id] (clientes:read:detail) esperado=allow status=500
- TENANT_A/none → PUT /api/clientes/[id] (clientes:update) esperado=deny status=500
- TENANT_A/read → PUT /api/clientes/[id] (clientes:update) esperado=deny status=500
- TENANT_A/editor → PUT /api/clientes/[id] (clientes:update) esperado=allow status=500
- TENANT_A/admin → PUT /api/clientes/[id] (clientes:update) esperado=allow status=500
- TENANT_B/none → PUT /api/clientes/[id] (clientes:update) esperado=deny status=500
- TENANT_B/read → PUT /api/clientes/[id] (clientes:update) esperado=deny status=500
- TENANT_B/editor → PUT /api/clientes/[id] (clientes:update) esperado=allow status=500
- TENANT_B/admin → PUT /api/clientes/[id] (clientes:update) esperado=allow status=500
- TENANT_A/none → GET /api/guardias/buscar (guardias:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/guardias/buscar (guardias:read:list) esperado=allow status=500
- TENANT_A/editor → GET /api/guardias/buscar (guardias:read:list) esperado=allow status=500
- TENANT_A/admin → GET /api/guardias/buscar (guardias:read:list) esperado=allow status=500
- TENANT_B/none → GET /api/guardias/buscar (guardias:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/guardias/buscar (guardias:read:list) esperado=allow status=500
- TENANT_B/editor → GET /api/guardias/buscar (guardias:read:list) esperado=allow status=500
- TENANT_B/admin → GET /api/guardias/buscar (guardias:read:list) esperado=allow status=500
- TENANT_A/none → GET /api/guardias/conflictos (guardias:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/guardias/conflictos (guardias:read:list) esperado=allow status=500
- TENANT_A/editor → GET /api/guardias/conflictos (guardias:read:list) esperado=allow status=500
- TENANT_A/admin → GET /api/guardias/conflictos (guardias:read:list) esperado=allow status=500
- TENANT_B/none → GET /api/guardias/conflictos (guardias:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/guardias/conflictos (guardias:read:list) esperado=allow status=500
- TENANT_B/editor → GET /api/guardias/conflictos (guardias:read:list) esperado=allow status=500
- TENANT_B/admin → GET /api/guardias/conflictos (guardias:read:list) esperado=allow status=500
- TENANT_A/none → PUT /api/guardias/[id] (guardias:update) esperado=deny status=500
- TENANT_A/read → PUT /api/guardias/[id] (guardias:update) esperado=deny status=500
- TENANT_A/editor → PUT /api/guardias/[id] (guardias:update) esperado=allow status=500
- TENANT_A/admin → PUT /api/guardias/[id] (guardias:update) esperado=allow status=500
- TENANT_B/none → PUT /api/guardias/[id] (guardias:update) esperado=deny status=500
- TENANT_B/read → PUT /api/guardias/[id] (guardias:update) esperado=deny status=500
- TENANT_B/editor → PUT /api/guardias/[id] (guardias:update) esperado=allow status=500
- TENANT_B/admin → PUT /api/guardias/[id] (guardias:update) esperado=allow status=500
- TENANT_A/none → GET /api/guardias/[id] (guardias:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/guardias/[id] (guardias:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/guardias/[id] (guardias:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/guardias/[id] (guardias:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/guardias/[id] (guardias:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/guardias/[id] (guardias:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/guardias/[id] (guardias:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/guardias/[id] (guardias:read:detail) esperado=allow status=500
- TENANT_A/none → PATCH /api/guardias/[id] (guardias:update) esperado=deny status=500
- TENANT_A/read → PATCH /api/guardias/[id] (guardias:update) esperado=deny status=500
- TENANT_A/editor → PATCH /api/guardias/[id] (guardias:update) esperado=allow status=500
- TENANT_A/admin → PATCH /api/guardias/[id] (guardias:update) esperado=allow status=500
- TENANT_B/none → PATCH /api/guardias/[id] (guardias:update) esperado=deny status=500
- TENANT_B/read → PATCH /api/guardias/[id] (guardias:update) esperado=deny status=500
- TENANT_B/editor → PATCH /api/guardias/[id] (guardias:update) esperado=allow status=500
- TENANT_B/admin → PATCH /api/guardias/[id] (guardias:update) esperado=allow status=500
- TENANT_A/none → DELETE /api/guardias/[id] (guardias:delete) esperado=deny status=500
- TENANT_A/read → DELETE /api/guardias/[id] (guardias:delete) esperado=deny status=500
- TENANT_A/editor → DELETE /api/guardias/[id] (guardias:delete) esperado=deny status=500
- TENANT_A/admin → DELETE /api/guardias/[id] (guardias:delete) esperado=allow status=500
- TENANT_B/none → DELETE /api/guardias/[id] (guardias:delete) esperado=deny status=500
- TENANT_B/read → DELETE /api/guardias/[id] (guardias:delete) esperado=deny status=500
- TENANT_B/editor → DELETE /api/guardias/[id] (guardias:delete) esperado=deny status=500
- TENANT_B/admin → DELETE /api/guardias/[id] (guardias:delete) esperado=allow status=500
- TENANT_A/none → GET /api/guardias/disponibles (guardias:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/guardias/disponibles (guardias:read:list) esperado=allow status=500
- TENANT_A/editor → GET /api/guardias/disponibles (guardias:read:list) esperado=allow status=500
- TENANT_A/admin → GET /api/guardias/disponibles (guardias:read:list) esperado=allow status=500
- TENANT_B/none → GET /api/guardias/disponibles (guardias:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/guardias/disponibles (guardias:read:list) esperado=allow status=500
- TENANT_B/editor → GET /api/guardias/disponibles (guardias:read:list) esperado=allow status=500
- TENANT_B/admin → GET /api/guardias/disponibles (guardias:read:list) esperado=allow status=500
- TENANT_A/none → GET /api/guardias/guardia-metrics (guardias:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/guardias/guardia-metrics (guardias:read:list) esperado=allow status=500
- TENANT_A/editor → GET /api/guardias/guardia-metrics (guardias:read:list) esperado=allow status=500
- TENANT_A/admin → GET /api/guardias/guardia-metrics (guardias:read:list) esperado=allow status=500
- TENANT_B/none → GET /api/guardias/guardia-metrics (guardias:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/guardias/guardia-metrics (guardias:read:list) esperado=allow status=500
- TENANT_B/editor → GET /api/guardias/guardia-metrics (guardias:read:list) esperado=allow status=500
- TENANT_B/admin → GET /api/guardias/guardia-metrics (guardias:read:list) esperado=allow status=500
- TENANT_A/none → POST /api/guardias/permisos (guardias:create) esperado=deny status=500
- TENANT_A/read → POST /api/guardias/permisos (guardias:create) esperado=deny status=500
- TENANT_A/editor → POST /api/guardias/permisos (guardias:create) esperado=allow status=500
- TENANT_A/admin → POST /api/guardias/permisos (guardias:create) esperado=allow status=500
- TENANT_B/none → POST /api/guardias/permisos (guardias:create) esperado=deny status=500
- TENANT_B/read → POST /api/guardias/permisos (guardias:create) esperado=deny status=500
- TENANT_B/editor → POST /api/guardias/permisos (guardias:create) esperado=allow status=500
- TENANT_B/admin → POST /api/guardias/permisos (guardias:create) esperado=allow status=500
- TENANT_A/none → GET /api/guardias/permisos (guardias:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/guardias/permisos (guardias:read:list) esperado=allow status=500
- TENANT_A/editor → GET /api/guardias/permisos (guardias:read:list) esperado=allow status=500
- TENANT_A/admin → GET /api/guardias/permisos (guardias:read:list) esperado=allow status=500
- TENANT_B/none → GET /api/guardias/permisos (guardias:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/guardias/permisos (guardias:read:list) esperado=allow status=500
- TENANT_B/editor → GET /api/guardias/permisos (guardias:read:list) esperado=allow status=500
- TENANT_B/admin → GET /api/guardias/permisos (guardias:read:list) esperado=allow status=500
- TENANT_A/none → GET /api/instalaciones/kpis (instalaciones:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/instalaciones/kpis (instalaciones:read:list) esperado=allow status=500
- TENANT_A/editor → GET /api/instalaciones/kpis (instalaciones:read:list) esperado=allow status=500
- TENANT_A/admin → GET /api/instalaciones/kpis (instalaciones:read:list) esperado=allow status=500
- TENANT_B/none → GET /api/instalaciones/kpis (instalaciones:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/instalaciones/kpis (instalaciones:read:list) esperado=allow status=500
- TENANT_B/editor → GET /api/instalaciones/kpis (instalaciones:read:list) esperado=allow status=500
- TENANT_B/admin → GET /api/instalaciones/kpis (instalaciones:read:list) esperado=allow status=500
- TENANT_A/none → GET /api/instalaciones/[id] (instalaciones:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/instalaciones/[id] (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/instalaciones/[id] (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/instalaciones/[id] (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/instalaciones/[id] (instalaciones:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/instalaciones/[id] (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/instalaciones/[id] (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/instalaciones/[id] (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/none → GET /api/instalaciones/documentos-vencidos (instalaciones:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/instalaciones/documentos-vencidos (instalaciones:read:list) esperado=allow status=500
- TENANT_A/editor → GET /api/instalaciones/documentos-vencidos (instalaciones:read:list) esperado=allow status=500
- TENANT_A/admin → GET /api/instalaciones/documentos-vencidos (instalaciones:read:list) esperado=allow status=500
- TENANT_B/none → GET /api/instalaciones/documentos-vencidos (instalaciones:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/instalaciones/documentos-vencidos (instalaciones:read:list) esperado=allow status=500
- TENANT_B/editor → GET /api/instalaciones/documentos-vencidos (instalaciones:read:list) esperado=allow status=500
- TENANT_B/admin → GET /api/instalaciones/documentos-vencidos (instalaciones:read:list) esperado=allow status=500
- TENANT_A/none → PUT /api/pauta-mensual/actualizar-celda (pauta-mensual:update) esperado=deny status=500
- TENANT_A/read → PUT /api/pauta-mensual/actualizar-celda (pauta-mensual:update) esperado=deny status=500
- TENANT_A/editor → PUT /api/pauta-mensual/actualizar-celda (pauta-mensual:update) esperado=allow status=500
- TENANT_A/admin → PUT /api/pauta-mensual/actualizar-celda (pauta-mensual:update) esperado=allow status=500
- TENANT_B/none → PUT /api/pauta-mensual/actualizar-celda (pauta-mensual:update) esperado=deny status=500
- TENANT_B/read → PUT /api/pauta-mensual/actualizar-celda (pauta-mensual:update) esperado=deny status=500
- TENANT_B/editor → PUT /api/pauta-mensual/actualizar-celda (pauta-mensual:update) esperado=allow status=500
- TENANT_B/admin → PUT /api/pauta-mensual/actualizar-celda (pauta-mensual:update) esperado=allow status=500
- TENANT_A/none → POST /api/pauta-mensual/crear (pauta-mensual:create) esperado=deny status=500
- TENANT_A/read → POST /api/pauta-mensual/crear (pauta-mensual:create) esperado=deny status=500
- TENANT_A/editor → POST /api/pauta-mensual/crear (pauta-mensual:create) esperado=deny status=500
- TENANT_A/admin → POST /api/pauta-mensual/crear (pauta-mensual:create) esperado=deny status=500
- TENANT_B/none → POST /api/pauta-mensual/crear (pauta-mensual:create) esperado=deny status=500
- TENANT_B/read → POST /api/pauta-mensual/crear (pauta-mensual:create) esperado=deny status=500
- TENANT_B/editor → POST /api/pauta-mensual/crear (pauta-mensual:create) esperado=deny status=500
- TENANT_B/admin → POST /api/pauta-mensual/crear (pauta-mensual:create) esperado=deny status=500
- TENANT_A/none → DELETE /api/pauta-mensual/eliminar (pauta-mensual:delete) esperado=deny status=500
- TENANT_A/read → DELETE /api/pauta-mensual/eliminar (pauta-mensual:delete) esperado=deny status=500
- TENANT_A/editor → DELETE /api/pauta-mensual/eliminar (pauta-mensual:delete) esperado=deny status=500
- TENANT_A/admin → DELETE /api/pauta-mensual/eliminar (pauta-mensual:delete) esperado=deny status=500
- TENANT_B/none → DELETE /api/pauta-mensual/eliminar (pauta-mensual:delete) esperado=deny status=500
- TENANT_B/read → DELETE /api/pauta-mensual/eliminar (pauta-mensual:delete) esperado=deny status=500
- TENANT_B/editor → DELETE /api/pauta-mensual/eliminar (pauta-mensual:delete) esperado=deny status=500
- TENANT_B/admin → DELETE /api/pauta-mensual/eliminar (pauta-mensual:delete) esperado=deny status=500
- TENANT_A/none → GET /api/pauta-mensual/exportar-xlsx (pauta-mensual:export) esperado=deny status=500
- TENANT_A/read → GET /api/pauta-mensual/exportar-xlsx (pauta-mensual:export) esperado=deny status=500
- TENANT_A/editor → GET /api/pauta-mensual/exportar-xlsx (pauta-mensual:export) esperado=deny status=500
- TENANT_A/admin → GET /api/pauta-mensual/exportar-xlsx (pauta-mensual:export) esperado=allow status=500
- TENANT_B/none → GET /api/pauta-mensual/exportar-xlsx (pauta-mensual:export) esperado=deny status=500
- TENANT_B/read → GET /api/pauta-mensual/exportar-xlsx (pauta-mensual:export) esperado=deny status=500
- TENANT_B/editor → GET /api/pauta-mensual/exportar-xlsx (pauta-mensual:export) esperado=deny status=500
- TENANT_B/admin → GET /api/pauta-mensual/exportar-xlsx (pauta-mensual:export) esperado=allow status=500
- TENANT_A/none → GET /api/pauta-mensual/exportar-pdf (pauta-mensual:export) esperado=deny status=500
- TENANT_A/read → GET /api/pauta-mensual/exportar-pdf (pauta-mensual:export) esperado=deny status=500
- TENANT_A/editor → GET /api/pauta-mensual/exportar-pdf (pauta-mensual:export) esperado=deny status=500
- TENANT_A/admin → GET /api/pauta-mensual/exportar-pdf (pauta-mensual:export) esperado=allow status=500
- TENANT_B/none → GET /api/pauta-mensual/exportar-pdf (pauta-mensual:export) esperado=deny status=500
- TENANT_B/read → GET /api/pauta-mensual/exportar-pdf (pauta-mensual:export) esperado=deny status=500
- TENANT_B/editor → GET /api/pauta-mensual/exportar-pdf (pauta-mensual:export) esperado=deny status=500
- TENANT_B/admin → GET /api/pauta-mensual/exportar-pdf (pauta-mensual:export) esperado=allow status=500
- TENANT_A/none → POST /api/pauta-mensual/guardar (pauta-mensual:create) esperado=deny status=500
- TENANT_A/read → POST /api/pauta-mensual/guardar (pauta-mensual:create) esperado=deny status=500
- TENANT_A/editor → POST /api/pauta-mensual/guardar (pauta-mensual:create) esperado=deny status=500
- TENANT_A/admin → POST /api/pauta-mensual/guardar (pauta-mensual:create) esperado=deny status=500
- TENANT_B/none → POST /api/pauta-mensual/guardar (pauta-mensual:create) esperado=deny status=500
- TENANT_B/read → POST /api/pauta-mensual/guardar (pauta-mensual:create) esperado=deny status=500
- TENANT_B/editor → POST /api/pauta-mensual/guardar (pauta-mensual:create) esperado=deny status=500
- TENANT_B/admin → POST /api/pauta-mensual/guardar (pauta-mensual:create) esperado=deny status=500
- TENANT_A/none → GET /api/pauta-mensual/resumen (pauta-mensual:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/pauta-mensual/resumen (pauta-mensual:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/pauta-mensual/resumen (pauta-mensual:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/pauta-mensual/resumen (pauta-mensual:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/pauta-mensual/resumen (pauta-mensual:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/pauta-mensual/resumen (pauta-mensual:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/pauta-mensual/resumen (pauta-mensual:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/pauta-mensual/resumen (pauta-mensual:read:list) esperado=deny status=500
- TENANT_A/none → POST /api/pauta-mensual/verificar-roles (pauta-mensual:create) esperado=deny status=500
- TENANT_A/read → POST /api/pauta-mensual/verificar-roles (pauta-mensual:create) esperado=deny status=500
- TENANT_A/editor → POST /api/pauta-mensual/verificar-roles (pauta-mensual:create) esperado=deny status=500
- TENANT_A/admin → POST /api/pauta-mensual/verificar-roles (pauta-mensual:create) esperado=deny status=500
- TENANT_B/none → POST /api/pauta-mensual/verificar-roles (pauta-mensual:create) esperado=deny status=500
- TENANT_B/read → POST /api/pauta-mensual/verificar-roles (pauta-mensual:create) esperado=deny status=500
- TENANT_B/editor → POST /api/pauta-mensual/verificar-roles (pauta-mensual:create) esperado=deny status=500
- TENANT_B/admin → POST /api/pauta-mensual/verificar-roles (pauta-mensual:create) esperado=deny status=500
- TENANT_A/none → GET /api/payroll/estructuras-guardia (payroll:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/payroll/estructuras-guardia (payroll:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/payroll/estructuras-guardia (payroll:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/payroll/estructuras-guardia (payroll:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/payroll/estructuras-guardia (payroll:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/payroll/estructuras-guardia (payroll:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/payroll/estructuras-guardia (payroll:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/payroll/estructuras-guardia (payroll:read:list) esperado=deny status=500
- TENANT_A/none → POST /api/pauta-diaria/turno-extra (pauta-diaria:create) esperado=deny status=500
- TENANT_A/read → POST /api/pauta-diaria/turno-extra (pauta-diaria:create) esperado=deny status=500
- TENANT_A/editor → POST /api/pauta-diaria/turno-extra (pauta-diaria:create) esperado=deny status=500
- TENANT_A/admin → POST /api/pauta-diaria/turno-extra (pauta-diaria:create) esperado=deny status=500
- TENANT_B/none → POST /api/pauta-diaria/turno-extra (pauta-diaria:create) esperado=deny status=500
- TENANT_B/read → POST /api/pauta-diaria/turno-extra (pauta-diaria:create) esperado=deny status=500
- TENANT_B/editor → POST /api/pauta-diaria/turno-extra (pauta-diaria:create) esperado=deny status=500
- TENANT_B/admin → POST /api/pauta-diaria/turno-extra (pauta-diaria:create) esperado=deny status=500
- TENANT_A/none → GET /api/pauta-diaria/turno-extra (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/pauta-diaria/turno-extra (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/pauta-diaria/turno-extra (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/pauta-diaria/turno-extra (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/pauta-diaria/turno-extra (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/pauta-diaria/turno-extra (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/pauta-diaria/turno-extra (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/pauta-diaria/turno-extra (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/none → GET /api/payroll/guardias (payroll:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/payroll/guardias (payroll:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/payroll/guardias (payroll:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/payroll/guardias (payroll:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/payroll/guardias (payroll:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/payroll/guardias (payroll:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/payroll/guardias (payroll:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/payroll/guardias (payroll:read:list) esperado=deny status=500
- TENANT_A/none → GET /api/payroll/instalaciones (payroll:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/payroll/instalaciones (payroll:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/payroll/instalaciones (payroll:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/payroll/instalaciones (payroll:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/payroll/instalaciones (payroll:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/payroll/instalaciones (payroll:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/payroll/instalaciones (payroll:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/payroll/instalaciones (payroll:read:list) esperado=deny status=500
- TENANT_A/none → GET /api/payroll/sueldo-items (payroll:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/payroll/sueldo-items (payroll:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/payroll/sueldo-items (payroll:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/payroll/sueldo-items (payroll:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/payroll/sueldo-items (payroll:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/payroll/sueldo-items (payroll:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/payroll/sueldo-items (payroll:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/payroll/sueldo-items (payroll:read:list) esperado=deny status=500
- TENANT_A/none → GET /api/payroll/items-extras (payroll:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/payroll/items-extras (payroll:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/payroll/items-extras (payroll:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/payroll/items-extras (payroll:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/payroll/items-extras (payroll:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/payroll/items-extras (payroll:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/payroll/items-extras (payroll:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/payroll/items-extras (payroll:read:list) esperado=deny status=500
- TENANT_A/none → POST /api/payroll/items-extras (payroll:create) esperado=deny status=500
- TENANT_A/read → POST /api/payroll/items-extras (payroll:create) esperado=deny status=500
- TENANT_A/editor → POST /api/payroll/items-extras (payroll:create) esperado=deny status=500
- TENANT_A/admin → POST /api/payroll/items-extras (payroll:create) esperado=deny status=500
- TENANT_B/none → POST /api/payroll/items-extras (payroll:create) esperado=deny status=500
- TENANT_B/read → POST /api/payroll/items-extras (payroll:create) esperado=deny status=500
- TENANT_B/editor → POST /api/payroll/items-extras (payroll:create) esperado=deny status=500
- TENANT_B/admin → POST /api/payroll/items-extras (payroll:create) esperado=deny status=500
- TENANT_A/none → PUT /api/payroll/items-extras (payroll:update) esperado=deny status=500
- TENANT_A/read → PUT /api/payroll/items-extras (payroll:update) esperado=deny status=500
- TENANT_A/editor → PUT /api/payroll/items-extras (payroll:update) esperado=allow status=500
- TENANT_A/admin → PUT /api/payroll/items-extras (payroll:update) esperado=allow status=500
- TENANT_B/none → PUT /api/payroll/items-extras (payroll:update) esperado=deny status=500
- TENANT_B/read → PUT /api/payroll/items-extras (payroll:update) esperado=deny status=500
- TENANT_B/editor → PUT /api/payroll/items-extras (payroll:update) esperado=allow status=500
- TENANT_B/admin → PUT /api/payroll/items-extras (payroll:update) esperado=allow status=500
- TENANT_A/none → DELETE /api/payroll/items-extras (payroll:delete) esperado=deny status=500
- TENANT_A/read → DELETE /api/payroll/items-extras (payroll:delete) esperado=deny status=500
- TENANT_A/editor → DELETE /api/payroll/items-extras (payroll:delete) esperado=deny status=500
- TENANT_A/admin → DELETE /api/payroll/items-extras (payroll:delete) esperado=deny status=500
- TENANT_B/none → DELETE /api/payroll/items-extras (payroll:delete) esperado=deny status=500
- TENANT_B/read → DELETE /api/payroll/items-extras (payroll:delete) esperado=deny status=500
- TENANT_B/editor → DELETE /api/payroll/items-extras (payroll:delete) esperado=deny status=500
- TENANT_B/admin → DELETE /api/payroll/items-extras (payroll:delete) esperado=deny status=500
- TENANT_A/none → GET /api/payroll/roles-servicio (payroll:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/payroll/roles-servicio (payroll:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/payroll/roles-servicio (payroll:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/payroll/roles-servicio (payroll:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/payroll/roles-servicio (payroll:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/payroll/roles-servicio (payroll:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/payroll/roles-servicio (payroll:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/payroll/roles-servicio (payroll:read:list) esperado=deny status=500
- TENANT_A/none → GET /api/payroll/items (payroll:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/payroll/items (payroll:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/payroll/items (payroll:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/payroll/items (payroll:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/payroll/items (payroll:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/payroll/items (payroll:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/payroll/items (payroll:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/payroll/items (payroll:read:list) esperado=deny status=500
- TENANT_A/none → POST /api/payroll/items (payroll:create) esperado=deny status=500
- TENANT_A/read → POST /api/payroll/items (payroll:create) esperado=deny status=500
- TENANT_A/editor → POST /api/payroll/items (payroll:create) esperado=deny status=500
- TENANT_A/admin → POST /api/payroll/items (payroll:create) esperado=deny status=500
- TENANT_B/none → POST /api/payroll/items (payroll:create) esperado=deny status=500
- TENANT_B/read → POST /api/payroll/items (payroll:create) esperado=deny status=500
- TENANT_B/editor → POST /api/payroll/items (payroll:create) esperado=deny status=500
- TENANT_B/admin → POST /api/payroll/items (payroll:create) esperado=deny status=500
- TENANT_A/none → GET /api/guardias/[id]/asignacion (guardias:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/guardias/[id]/asignacion (guardias:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/guardias/[id]/asignacion (guardias:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/guardias/[id]/asignacion (guardias:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/guardias/[id]/asignacion (guardias:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/guardias/[id]/asignacion (guardias:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/guardias/[id]/asignacion (guardias:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/guardias/[id]/asignacion (guardias:read:detail) esperado=allow status=500
- TENANT_A/none → GET /api/guardias/[id]/asignacion-actual (guardias:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/guardias/[id]/asignacion-actual (guardias:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/guardias/[id]/asignacion-actual (guardias:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/guardias/[id]/asignacion-actual (guardias:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/guardias/[id]/asignacion-actual (guardias:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/guardias/[id]/asignacion-actual (guardias:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/guardias/[id]/asignacion-actual (guardias:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/guardias/[id]/asignacion-actual (guardias:read:detail) esperado=allow status=500
- TENANT_A/none → POST /api/guardias/[id]/bancarios (guardias:create) esperado=deny status=500
- TENANT_A/read → POST /api/guardias/[id]/bancarios (guardias:create) esperado=deny status=500
- TENANT_A/editor → POST /api/guardias/[id]/bancarios (guardias:create) esperado=allow status=500
- TENANT_A/admin → POST /api/guardias/[id]/bancarios (guardias:create) esperado=allow status=500
- TENANT_B/none → POST /api/guardias/[id]/bancarios (guardias:create) esperado=deny status=500
- TENANT_B/read → POST /api/guardias/[id]/bancarios (guardias:create) esperado=deny status=500
- TENANT_B/editor → POST /api/guardias/[id]/bancarios (guardias:create) esperado=allow status=500
- TENANT_B/admin → POST /api/guardias/[id]/bancarios (guardias:create) esperado=allow status=500
- TENANT_A/none → PUT /api/guardias/[id]/fecha-os10 (guardias:update) esperado=deny status=500
- TENANT_A/read → PUT /api/guardias/[id]/fecha-os10 (guardias:update) esperado=deny status=500
- TENANT_A/editor → PUT /api/guardias/[id]/fecha-os10 (guardias:update) esperado=allow status=500
- TENANT_A/admin → PUT /api/guardias/[id]/fecha-os10 (guardias:update) esperado=allow status=500
- TENANT_B/none → PUT /api/guardias/[id]/fecha-os10 (guardias:update) esperado=deny status=500
- TENANT_B/read → PUT /api/guardias/[id]/fecha-os10 (guardias:update) esperado=deny status=500
- TENANT_B/editor → PUT /api/guardias/[id]/fecha-os10 (guardias:update) esperado=allow status=500
- TENANT_B/admin → PUT /api/guardias/[id]/fecha-os10 (guardias:update) esperado=allow status=500
- TENANT_A/none → GET /api/guardias/[id]/banco (guardias:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/guardias/[id]/banco (guardias:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/guardias/[id]/banco (guardias:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/guardias/[id]/banco (guardias:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/guardias/[id]/banco (guardias:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/guardias/[id]/banco (guardias:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/guardias/[id]/banco (guardias:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/guardias/[id]/banco (guardias:read:detail) esperado=allow status=500
- TENANT_A/none → PATCH /api/guardias/[id]/banco (guardias:update) esperado=deny status=500
- TENANT_A/read → PATCH /api/guardias/[id]/banco (guardias:update) esperado=deny status=500
- TENANT_A/editor → PATCH /api/guardias/[id]/banco (guardias:update) esperado=allow status=500
- TENANT_A/admin → PATCH /api/guardias/[id]/banco (guardias:update) esperado=allow status=500
- TENANT_B/none → PATCH /api/guardias/[id]/banco (guardias:update) esperado=deny status=500
- TENANT_B/read → PATCH /api/guardias/[id]/banco (guardias:update) esperado=deny status=500
- TENANT_B/editor → PATCH /api/guardias/[id]/banco (guardias:update) esperado=allow status=500
- TENANT_B/admin → PATCH /api/guardias/[id]/banco (guardias:update) esperado=allow status=500
- TENANT_A/none → GET /api/guardias/[id]/historial-mensual (guardias:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/guardias/[id]/historial-mensual (guardias:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/guardias/[id]/historial-mensual (guardias:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/guardias/[id]/historial-mensual (guardias:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/guardias/[id]/historial-mensual (guardias:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/guardias/[id]/historial-mensual (guardias:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/guardias/[id]/historial-mensual (guardias:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/guardias/[id]/historial-mensual (guardias:read:detail) esperado=allow status=500
- TENANT_A/none → GET /api/guardias/[id]/pagos-turnos-extras (guardias:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/guardias/[id]/pagos-turnos-extras (guardias:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/guardias/[id]/pagos-turnos-extras (guardias:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/guardias/[id]/pagos-turnos-extras (guardias:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/guardias/[id]/pagos-turnos-extras (guardias:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/guardias/[id]/pagos-turnos-extras (guardias:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/guardias/[id]/pagos-turnos-extras (guardias:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/guardias/[id]/pagos-turnos-extras (guardias:read:detail) esperado=allow status=500
- TENANT_A/none → POST /api/guardias/[id]/terminar-asignacion (guardias:create) esperado=deny status=500
- TENANT_A/read → POST /api/guardias/[id]/terminar-asignacion (guardias:create) esperado=deny status=500
- TENANT_A/editor → POST /api/guardias/[id]/terminar-asignacion (guardias:create) esperado=allow status=500
- TENANT_A/admin → POST /api/guardias/[id]/terminar-asignacion (guardias:create) esperado=allow status=500
- TENANT_B/none → POST /api/guardias/[id]/terminar-asignacion (guardias:create) esperado=deny status=500
- TENANT_B/read → POST /api/guardias/[id]/terminar-asignacion (guardias:create) esperado=deny status=500
- TENANT_B/editor → POST /api/guardias/[id]/terminar-asignacion (guardias:create) esperado=allow status=500
- TENANT_B/admin → POST /api/guardias/[id]/terminar-asignacion (guardias:create) esperado=allow status=500
- TENANT_A/none → DELETE /api/guardias/permisos/[id] (guardias:delete) esperado=deny status=500
- TENANT_A/read → DELETE /api/guardias/permisos/[id] (guardias:delete) esperado=deny status=500
- TENANT_A/editor → DELETE /api/guardias/permisos/[id] (guardias:delete) esperado=deny status=500
- TENANT_A/admin → DELETE /api/guardias/permisos/[id] (guardias:delete) esperado=allow status=500
- TENANT_B/none → DELETE /api/guardias/permisos/[id] (guardias:delete) esperado=deny status=500
- TENANT_B/read → DELETE /api/guardias/permisos/[id] (guardias:delete) esperado=deny status=500
- TENANT_B/editor → DELETE /api/guardias/permisos/[id] (guardias:delete) esperado=deny status=500
- TENANT_B/admin → DELETE /api/guardias/permisos/[id] (guardias:delete) esperado=allow status=500
- TENANT_A/none → GET /api/instalaciones/[id]/completa (instalaciones:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/instalaciones/[id]/completa (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/instalaciones/[id]/completa (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/instalaciones/[id]/completa (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/instalaciones/[id]/completa (instalaciones:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/instalaciones/[id]/completa (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/instalaciones/[id]/completa (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/instalaciones/[id]/completa (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/none → GET /api/instalaciones/[id]/estadisticas (instalaciones:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/instalaciones/[id]/estadisticas (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/instalaciones/[id]/estadisticas (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/instalaciones/[id]/estadisticas (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/instalaciones/[id]/estadisticas (instalaciones:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/instalaciones/[id]/estadisticas (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/instalaciones/[id]/estadisticas (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/instalaciones/[id]/estadisticas (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/none → GET /api/guardias/[id]/pagos (guardias:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/guardias/[id]/pagos (guardias:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/guardias/[id]/pagos (guardias:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/guardias/[id]/pagos (guardias:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/guardias/[id]/pagos (guardias:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/guardias/[id]/pagos (guardias:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/guardias/[id]/pagos (guardias:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/guardias/[id]/pagos (guardias:read:detail) esperado=allow status=500
- TENANT_A/none → GET /api/instalaciones/[id]/estadisticas_v2 (instalaciones:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/instalaciones/[id]/estadisticas_v2 (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/instalaciones/[id]/estadisticas_v2 (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/instalaciones/[id]/estadisticas_v2 (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/instalaciones/[id]/estadisticas_v2 (instalaciones:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/instalaciones/[id]/estadisticas_v2 (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/instalaciones/[id]/estadisticas_v2 (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/instalaciones/[id]/estadisticas_v2 (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/none → GET /api/instalaciones/[id]/estructuras-servicio (instalaciones:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/instalaciones/[id]/estructuras-servicio (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/instalaciones/[id]/estructuras-servicio (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/instalaciones/[id]/estructuras-servicio (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/instalaciones/[id]/estructuras-servicio (instalaciones:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/instalaciones/[id]/estructuras-servicio (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/instalaciones/[id]/estructuras-servicio (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/instalaciones/[id]/estructuras-servicio (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/none → POST /api/instalaciones/[id]/estructuras-servicio (instalaciones:create) esperado=deny status=500
- TENANT_A/read → POST /api/instalaciones/[id]/estructuras-servicio (instalaciones:create) esperado=deny status=500
- TENANT_A/editor → POST /api/instalaciones/[id]/estructuras-servicio (instalaciones:create) esperado=allow status=500
- TENANT_A/admin → POST /api/instalaciones/[id]/estructuras-servicio (instalaciones:create) esperado=allow status=500
- TENANT_B/none → POST /api/instalaciones/[id]/estructuras-servicio (instalaciones:create) esperado=deny status=500
- TENANT_B/read → POST /api/instalaciones/[id]/estructuras-servicio (instalaciones:create) esperado=deny status=500
- TENANT_B/editor → POST /api/instalaciones/[id]/estructuras-servicio (instalaciones:create) esperado=allow status=500
- TENANT_B/admin → POST /api/instalaciones/[id]/estructuras-servicio (instalaciones:create) esperado=allow status=500
- TENANT_A/none → GET /api/instalaciones/[id]/ppc (instalaciones:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/instalaciones/[id]/ppc (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/instalaciones/[id]/ppc (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/instalaciones/[id]/ppc (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/instalaciones/[id]/ppc (instalaciones:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/instalaciones/[id]/ppc (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/instalaciones/[id]/ppc (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/instalaciones/[id]/ppc (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/none → POST /api/instalaciones/[id]/ppc (instalaciones:create) esperado=deny status=500
- TENANT_A/read → POST /api/instalaciones/[id]/ppc (instalaciones:create) esperado=deny status=500
- TENANT_A/editor → POST /api/instalaciones/[id]/ppc (instalaciones:create) esperado=allow status=500
- TENANT_A/admin → POST /api/instalaciones/[id]/ppc (instalaciones:create) esperado=allow status=500
- TENANT_B/none → POST /api/instalaciones/[id]/ppc (instalaciones:create) esperado=deny status=500
- TENANT_B/read → POST /api/instalaciones/[id]/ppc (instalaciones:create) esperado=deny status=500
- TENANT_B/editor → POST /api/instalaciones/[id]/ppc (instalaciones:create) esperado=allow status=500
- TENANT_B/admin → POST /api/instalaciones/[id]/ppc (instalaciones:create) esperado=allow status=500
- TENANT_A/none → GET /api/instalaciones/[id]/ppc-activos_v2 (instalaciones:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/instalaciones/[id]/ppc-activos_v2 (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/instalaciones/[id]/ppc-activos_v2 (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/instalaciones/[id]/ppc-activos_v2 (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/instalaciones/[id]/ppc-activos_v2 (instalaciones:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/instalaciones/[id]/ppc-activos_v2 (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/instalaciones/[id]/ppc-activos_v2 (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/instalaciones/[id]/ppc-activos_v2 (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/none → GET /api/instalaciones/[id]/ppc-activos (instalaciones:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/instalaciones/[id]/ppc-activos (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/instalaciones/[id]/ppc-activos (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/instalaciones/[id]/ppc-activos (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/instalaciones/[id]/ppc-activos (instalaciones:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/instalaciones/[id]/ppc-activos (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/instalaciones/[id]/ppc-activos (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/instalaciones/[id]/ppc-activos (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/none → GET /api/instalaciones/[id]/turnos (instalaciones:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/instalaciones/[id]/turnos (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/instalaciones/[id]/turnos (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/instalaciones/[id]/turnos (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/instalaciones/[id]/turnos (instalaciones:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/instalaciones/[id]/turnos (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/instalaciones/[id]/turnos (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/instalaciones/[id]/turnos (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/none → POST /api/instalaciones/[id]/turnos (instalaciones:create) esperado=deny status=500
- TENANT_A/read → POST /api/instalaciones/[id]/turnos (instalaciones:create) esperado=deny status=500
- TENANT_A/editor → POST /api/instalaciones/[id]/turnos (instalaciones:create) esperado=allow status=500
- TENANT_A/admin → POST /api/instalaciones/[id]/turnos (instalaciones:create) esperado=allow status=500
- TENANT_B/none → POST /api/instalaciones/[id]/turnos (instalaciones:create) esperado=deny status=500
- TENANT_B/read → POST /api/instalaciones/[id]/turnos (instalaciones:create) esperado=deny status=500
- TENANT_B/editor → POST /api/instalaciones/[id]/turnos (instalaciones:create) esperado=allow status=500
- TENANT_B/admin → POST /api/instalaciones/[id]/turnos (instalaciones:create) esperado=allow status=500
- TENANT_A/none → GET /api/instalaciones/[id]/turnos_v2 (instalaciones:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/instalaciones/[id]/turnos_v2 (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/instalaciones/[id]/turnos_v2 (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/instalaciones/[id]/turnos_v2 (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/instalaciones/[id]/turnos_v2 (instalaciones:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/instalaciones/[id]/turnos_v2 (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/instalaciones/[id]/turnos_v2 (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/instalaciones/[id]/turnos_v2 (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/none → POST /api/instalaciones/[id]/turnos_v2 (instalaciones:create) esperado=deny status=500
- TENANT_A/read → POST /api/instalaciones/[id]/turnos_v2 (instalaciones:create) esperado=deny status=500
- TENANT_A/editor → POST /api/instalaciones/[id]/turnos_v2 (instalaciones:create) esperado=allow status=500
- TENANT_A/admin → POST /api/instalaciones/[id]/turnos_v2 (instalaciones:create) esperado=allow status=500
- TENANT_B/none → POST /api/instalaciones/[id]/turnos_v2 (instalaciones:create) esperado=deny status=500
- TENANT_B/read → POST /api/instalaciones/[id]/turnos_v2 (instalaciones:create) esperado=deny status=500
- TENANT_B/editor → POST /api/instalaciones/[id]/turnos_v2 (instalaciones:create) esperado=allow status=500
- TENANT_B/admin → POST /api/instalaciones/[id]/turnos_v2 (instalaciones:create) esperado=allow status=500
- TENANT_A/none → DELETE /api/pauta-diaria/observacion/[id] (pauta-diaria:delete) esperado=deny status=500
- TENANT_A/read → DELETE /api/pauta-diaria/observacion/[id] (pauta-diaria:delete) esperado=deny status=500
- TENANT_A/editor → DELETE /api/pauta-diaria/observacion/[id] (pauta-diaria:delete) esperado=deny status=500
- TENANT_A/admin → DELETE /api/pauta-diaria/observacion/[id] (pauta-diaria:delete) esperado=deny status=500
- TENANT_B/none → DELETE /api/pauta-diaria/observacion/[id] (pauta-diaria:delete) esperado=deny status=500
- TENANT_B/read → DELETE /api/pauta-diaria/observacion/[id] (pauta-diaria:delete) esperado=deny status=500
- TENANT_B/editor → DELETE /api/pauta-diaria/observacion/[id] (pauta-diaria:delete) esperado=deny status=500
- TENANT_B/admin → DELETE /api/pauta-diaria/observacion/[id] (pauta-diaria:delete) esperado=deny status=500
- TENANT_A/none → GET /api/payroll/estructuras/instalacion (payroll:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/payroll/estructuras/instalacion (payroll:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/payroll/estructuras/instalacion (payroll:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/payroll/estructuras/instalacion (payroll:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/payroll/estructuras/instalacion (payroll:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/payroll/estructuras/instalacion (payroll:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/payroll/estructuras/instalacion (payroll:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/payroll/estructuras/instalacion (payroll:read:list) esperado=deny status=500
- TENANT_A/none → POST /api/payroll/estructuras-guardia/ensure (payroll:create) esperado=deny status=500
- TENANT_A/read → POST /api/payroll/estructuras-guardia/ensure (payroll:create) esperado=deny status=500
- TENANT_A/editor → POST /api/payroll/estructuras-guardia/ensure (payroll:create) esperado=deny status=500
- TENANT_A/admin → POST /api/payroll/estructuras-guardia/ensure (payroll:create) esperado=deny status=500
- TENANT_B/none → POST /api/payroll/estructuras-guardia/ensure (payroll:create) esperado=deny status=500
- TENANT_B/read → POST /api/payroll/estructuras-guardia/ensure (payroll:create) esperado=deny status=500
- TENANT_B/editor → POST /api/payroll/estructuras-guardia/ensure (payroll:create) esperado=deny status=500
- TENANT_B/admin → POST /api/payroll/estructuras-guardia/ensure (payroll:create) esperado=deny status=500
- TENANT_A/none → GET /api/payroll/estructuras-guardia/historial (payroll:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/payroll/estructuras-guardia/historial (payroll:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/payroll/estructuras-guardia/historial (payroll:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/payroll/estructuras-guardia/historial (payroll:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/payroll/estructuras-guardia/historial (payroll:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/payroll/estructuras-guardia/historial (payroll:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/payroll/estructuras-guardia/historial (payroll:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/payroll/estructuras-guardia/historial (payroll:read:list) esperado=deny status=500
- TENANT_A/none → POST /api/payroll/estructuras-guardia/items (payroll:create) esperado=deny status=500
- TENANT_A/read → POST /api/payroll/estructuras-guardia/items (payroll:create) esperado=deny status=500
- TENANT_A/editor → POST /api/payroll/estructuras-guardia/items (payroll:create) esperado=deny status=500
- TENANT_A/admin → POST /api/payroll/estructuras-guardia/items (payroll:create) esperado=deny status=500
- TENANT_B/none → POST /api/payroll/estructuras-guardia/items (payroll:create) esperado=deny status=500
- TENANT_B/read → POST /api/payroll/estructuras-guardia/items (payroll:create) esperado=deny status=500
- TENANT_B/editor → POST /api/payroll/estructuras-guardia/items (payroll:create) esperado=deny status=500
- TENANT_B/admin → POST /api/payroll/estructuras-guardia/items (payroll:create) esperado=deny status=500
- TENANT_A/none → GET /api/pauta-diaria/turno-extra/dashboard (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/pauta-diaria/turno-extra/dashboard (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/pauta-diaria/turno-extra/dashboard (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/pauta-diaria/turno-extra/dashboard (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/pauta-diaria/turno-extra/dashboard (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/pauta-diaria/turno-extra/dashboard (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/pauta-diaria/turno-extra/dashboard (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/pauta-diaria/turno-extra/dashboard (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/none → GET /api/pauta-diaria/turno-extra/exportar (pauta-diaria:export) esperado=deny status=500
- TENANT_A/read → GET /api/pauta-diaria/turno-extra/exportar (pauta-diaria:export) esperado=deny status=500
- TENANT_A/editor → GET /api/pauta-diaria/turno-extra/exportar (pauta-diaria:export) esperado=deny status=500
- TENANT_A/admin → GET /api/pauta-diaria/turno-extra/exportar (pauta-diaria:export) esperado=allow status=500
- TENANT_B/none → GET /api/pauta-diaria/turno-extra/exportar (pauta-diaria:export) esperado=deny status=500
- TENANT_B/read → GET /api/pauta-diaria/turno-extra/exportar (pauta-diaria:export) esperado=deny status=500
- TENANT_B/editor → GET /api/pauta-diaria/turno-extra/exportar (pauta-diaria:export) esperado=deny status=500
- TENANT_B/admin → GET /api/pauta-diaria/turno-extra/exportar (pauta-diaria:export) esperado=allow status=500
- TENANT_A/none → POST /api/pauta-diaria/turno-extra/marcar-pagado (pauta-diaria:create) esperado=deny status=500
- TENANT_A/read → POST /api/pauta-diaria/turno-extra/marcar-pagado (pauta-diaria:create) esperado=deny status=500
- TENANT_A/editor → POST /api/pauta-diaria/turno-extra/marcar-pagado (pauta-diaria:create) esperado=deny status=500
- TENANT_A/admin → POST /api/pauta-diaria/turno-extra/marcar-pagado (pauta-diaria:create) esperado=deny status=500
- TENANT_B/none → POST /api/pauta-diaria/turno-extra/marcar-pagado (pauta-diaria:create) esperado=deny status=500
- TENANT_B/read → POST /api/pauta-diaria/turno-extra/marcar-pagado (pauta-diaria:create) esperado=deny status=500
- TENANT_B/editor → POST /api/pauta-diaria/turno-extra/marcar-pagado (pauta-diaria:create) esperado=deny status=500
- TENANT_B/admin → POST /api/pauta-diaria/turno-extra/marcar-pagado (pauta-diaria:create) esperado=deny status=500
- TENANT_A/none → POST /api/pauta-diaria/turno-extra/preservar (pauta-diaria:create) esperado=deny status=500
- TENANT_A/read → POST /api/pauta-diaria/turno-extra/preservar (pauta-diaria:create) esperado=deny status=500
- TENANT_A/editor → POST /api/pauta-diaria/turno-extra/preservar (pauta-diaria:create) esperado=deny status=500
- TENANT_A/admin → POST /api/pauta-diaria/turno-extra/preservar (pauta-diaria:create) esperado=deny status=500
- TENANT_B/none → POST /api/pauta-diaria/turno-extra/preservar (pauta-diaria:create) esperado=deny status=500
- TENANT_B/read → POST /api/pauta-diaria/turno-extra/preservar (pauta-diaria:create) esperado=deny status=500
- TENANT_B/editor → POST /api/pauta-diaria/turno-extra/preservar (pauta-diaria:create) esperado=deny status=500
- TENANT_B/admin → POST /api/pauta-diaria/turno-extra/preservar (pauta-diaria:create) esperado=deny status=500
- TENANT_A/none → GET /api/pauta-diaria/turno-extra/preservar (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/pauta-diaria/turno-extra/preservar (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/pauta-diaria/turno-extra/preservar (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/pauta-diaria/turno-extra/preservar (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/pauta-diaria/turno-extra/preservar (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/pauta-diaria/turno-extra/preservar (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/pauta-diaria/turno-extra/preservar (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/pauta-diaria/turno-extra/preservar (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/none → GET /api/pauta-diaria/turno-extra/planillas (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/pauta-diaria/turno-extra/planillas (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/pauta-diaria/turno-extra/planillas (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/pauta-diaria/turno-extra/planillas (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/pauta-diaria/turno-extra/planillas (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/pauta-diaria/turno-extra/planillas (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/pauta-diaria/turno-extra/planillas (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/pauta-diaria/turno-extra/planillas (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/none → POST /api/pauta-diaria/turno-extra/planillas (pauta-diaria:create) esperado=deny status=500
- TENANT_A/read → POST /api/pauta-diaria/turno-extra/planillas (pauta-diaria:create) esperado=deny status=500
- TENANT_A/editor → POST /api/pauta-diaria/turno-extra/planillas (pauta-diaria:create) esperado=deny status=500
- TENANT_A/admin → POST /api/pauta-diaria/turno-extra/planillas (pauta-diaria:create) esperado=deny status=500
- TENANT_B/none → POST /api/pauta-diaria/turno-extra/planillas (pauta-diaria:create) esperado=deny status=500
- TENANT_B/read → POST /api/pauta-diaria/turno-extra/planillas (pauta-diaria:create) esperado=deny status=500
- TENANT_B/editor → POST /api/pauta-diaria/turno-extra/planillas (pauta-diaria:create) esperado=deny status=500
- TENANT_B/admin → POST /api/pauta-diaria/turno-extra/planillas (pauta-diaria:create) esperado=deny status=500
- TENANT_A/none → GET /api/pauta-diaria/turno-extra/stats (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/pauta-diaria/turno-extra/stats (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/pauta-diaria/turno-extra/stats (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/pauta-diaria/turno-extra/stats (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/pauta-diaria/turno-extra/stats (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/pauta-diaria/turno-extra/stats (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/pauta-diaria/turno-extra/stats (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/pauta-diaria/turno-extra/stats (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/none → POST /api/pauta-diaria/turno-extra/sync-coberturas (pauta-diaria:create) esperado=deny status=500
- TENANT_A/read → POST /api/pauta-diaria/turno-extra/sync-coberturas (pauta-diaria:create) esperado=deny status=500
- TENANT_A/editor → POST /api/pauta-diaria/turno-extra/sync-coberturas (pauta-diaria:create) esperado=deny status=500
- TENANT_A/admin → POST /api/pauta-diaria/turno-extra/sync-coberturas (pauta-diaria:create) esperado=deny status=500
- TENANT_B/none → POST /api/pauta-diaria/turno-extra/sync-coberturas (pauta-diaria:create) esperado=deny status=500
- TENANT_B/read → POST /api/pauta-diaria/turno-extra/sync-coberturas (pauta-diaria:create) esperado=deny status=500
- TENANT_B/editor → POST /api/pauta-diaria/turno-extra/sync-coberturas (pauta-diaria:create) esperado=deny status=500
- TENANT_B/admin → POST /api/pauta-diaria/turno-extra/sync-coberturas (pauta-diaria:create) esperado=deny status=500
- TENANT_A/none → GET /api/pauta-diaria/turno-extra/sync-coberturas (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/pauta-diaria/turno-extra/sync-coberturas (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/pauta-diaria/turno-extra/sync-coberturas (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/pauta-diaria/turno-extra/sync-coberturas (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/pauta-diaria/turno-extra/sync-coberturas (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/pauta-diaria/turno-extra/sync-coberturas (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/pauta-diaria/turno-extra/sync-coberturas (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/pauta-diaria/turno-extra/sync-coberturas (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/none → POST /api/pauta-diaria/turno-extra/limpiar (pauta-diaria:create) esperado=deny status=500
- TENANT_A/read → POST /api/pauta-diaria/turno-extra/limpiar (pauta-diaria:create) esperado=deny status=500
- TENANT_A/editor → POST /api/pauta-diaria/turno-extra/limpiar (pauta-diaria:create) esperado=deny status=500
- TENANT_A/admin → POST /api/pauta-diaria/turno-extra/limpiar (pauta-diaria:create) esperado=deny status=500
- TENANT_B/none → POST /api/pauta-diaria/turno-extra/limpiar (pauta-diaria:create) esperado=deny status=500
- TENANT_B/read → POST /api/pauta-diaria/turno-extra/limpiar (pauta-diaria:create) esperado=deny status=500
- TENANT_B/editor → POST /api/pauta-diaria/turno-extra/limpiar (pauta-diaria:create) esperado=deny status=500
- TENANT_B/admin → POST /api/pauta-diaria/turno-extra/limpiar (pauta-diaria:create) esperado=deny status=500
- TENANT_A/none → GET /api/pauta-diaria/turno-extra/limpiar (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/pauta-diaria/turno-extra/limpiar (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/pauta-diaria/turno-extra/limpiar (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/pauta-diaria/turno-extra/limpiar (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/pauta-diaria/turno-extra/limpiar (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/pauta-diaria/turno-extra/limpiar (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/pauta-diaria/turno-extra/limpiar (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/pauta-diaria/turno-extra/limpiar (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/none → GET /api/payroll/estructuras-servicio/vigente (payroll:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/payroll/estructuras-servicio/vigente (payroll:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/payroll/estructuras-servicio/vigente (payroll:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/payroll/estructuras-servicio/vigente (payroll:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/payroll/estructuras-servicio/vigente (payroll:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/payroll/estructuras-servicio/vigente (payroll:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/payroll/estructuras-servicio/vigente (payroll:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/payroll/estructuras-servicio/vigente (payroll:read:list) esperado=deny status=500
- TENANT_A/none → GET /api/pauta-diaria/turno-extra/test (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/pauta-diaria/turno-extra/test (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/pauta-diaria/turno-extra/test (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/pauta-diaria/turno-extra/test (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/pauta-diaria/turno-extra/test (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/pauta-diaria/turno-extra/test (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/pauta-diaria/turno-extra/test (pauta-diaria:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/pauta-diaria/turno-extra/test (pauta-diaria:read:list) esperado=deny status=500
- TENANT_A/none → PUT /api/payroll/items/[id] (payroll:update) esperado=deny status=500
- TENANT_A/read → PUT /api/payroll/items/[id] (payroll:update) esperado=deny status=500
- TENANT_A/editor → PUT /api/payroll/items/[id] (payroll:update) esperado=allow status=500
- TENANT_A/admin → PUT /api/payroll/items/[id] (payroll:update) esperado=allow status=500
- TENANT_B/none → PUT /api/payroll/items/[id] (payroll:update) esperado=deny status=500
- TENANT_B/read → PUT /api/payroll/items/[id] (payroll:update) esperado=deny status=500
- TENANT_B/editor → PUT /api/payroll/items/[id] (payroll:update) esperado=allow status=500
- TENANT_B/admin → PUT /api/payroll/items/[id] (payroll:update) esperado=allow status=500
- TENANT_A/none → DELETE /api/payroll/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_A/read → DELETE /api/payroll/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_A/editor → DELETE /api/payroll/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_A/admin → DELETE /api/payroll/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_B/none → DELETE /api/payroll/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_B/read → DELETE /api/payroll/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_B/editor → DELETE /api/payroll/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_B/admin → DELETE /api/payroll/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_A/none → GET /api/payroll/items/opciones (payroll:read:list) esperado=deny status=500
- TENANT_A/read → GET /api/payroll/items/opciones (payroll:read:list) esperado=deny status=500
- TENANT_A/editor → GET /api/payroll/items/opciones (payroll:read:list) esperado=deny status=500
- TENANT_A/admin → GET /api/payroll/items/opciones (payroll:read:list) esperado=deny status=500
- TENANT_B/none → GET /api/payroll/items/opciones (payroll:read:list) esperado=deny status=500
- TENANT_B/read → GET /api/payroll/items/opciones (payroll:read:list) esperado=deny status=500
- TENANT_B/editor → GET /api/payroll/items/opciones (payroll:read:list) esperado=deny status=500
- TENANT_B/admin → GET /api/payroll/items/opciones (payroll:read:list) esperado=deny status=500
- TENANT_A/none → PUT /api/instalaciones/[id]/estructuras-servicio/[estructuraId] (instalaciones:update) esperado=deny status=500
- TENANT_A/read → PUT /api/instalaciones/[id]/estructuras-servicio/[estructuraId] (instalaciones:update) esperado=deny status=500
- TENANT_A/editor → PUT /api/instalaciones/[id]/estructuras-servicio/[estructuraId] (instalaciones:update) esperado=allow status=500
- TENANT_A/admin → PUT /api/instalaciones/[id]/estructuras-servicio/[estructuraId] (instalaciones:update) esperado=allow status=500
- TENANT_B/none → PUT /api/instalaciones/[id]/estructuras-servicio/[estructuraId] (instalaciones:update) esperado=deny status=500
- TENANT_B/read → PUT /api/instalaciones/[id]/estructuras-servicio/[estructuraId] (instalaciones:update) esperado=deny status=500
- TENANT_B/editor → PUT /api/instalaciones/[id]/estructuras-servicio/[estructuraId] (instalaciones:update) esperado=allow status=500
- TENANT_B/admin → PUT /api/instalaciones/[id]/estructuras-servicio/[estructuraId] (instalaciones:update) esperado=allow status=500
- TENANT_A/none → DELETE /api/instalaciones/[id]/estructuras-servicio/[estructuraId] (instalaciones:delete) esperado=deny status=500
- TENANT_A/read → DELETE /api/instalaciones/[id]/estructuras-servicio/[estructuraId] (instalaciones:delete) esperado=deny status=500
- TENANT_A/editor → DELETE /api/instalaciones/[id]/estructuras-servicio/[estructuraId] (instalaciones:delete) esperado=deny status=500
- TENANT_A/admin → DELETE /api/instalaciones/[id]/estructuras-servicio/[estructuraId] (instalaciones:delete) esperado=allow status=500
- TENANT_B/none → DELETE /api/instalaciones/[id]/estructuras-servicio/[estructuraId] (instalaciones:delete) esperado=deny status=500
- TENANT_B/read → DELETE /api/instalaciones/[id]/estructuras-servicio/[estructuraId] (instalaciones:delete) esperado=deny status=500
- TENANT_B/editor → DELETE /api/instalaciones/[id]/estructuras-servicio/[estructuraId] (instalaciones:delete) esperado=deny status=500
- TENANT_B/admin → DELETE /api/instalaciones/[id]/estructuras-servicio/[estructuraId] (instalaciones:delete) esperado=allow status=500
- TENANT_A/none → DELETE /api/instalaciones/[id]/ppc/[ppcId] (instalaciones:delete) esperado=deny status=500
- TENANT_A/read → DELETE /api/instalaciones/[id]/ppc/[ppcId] (instalaciones:delete) esperado=deny status=500
- TENANT_A/editor → DELETE /api/instalaciones/[id]/ppc/[ppcId] (instalaciones:delete) esperado=deny status=500
- TENANT_A/admin → DELETE /api/instalaciones/[id]/ppc/[ppcId] (instalaciones:delete) esperado=allow status=500
- TENANT_B/none → DELETE /api/instalaciones/[id]/ppc/[ppcId] (instalaciones:delete) esperado=deny status=500
- TENANT_B/read → DELETE /api/instalaciones/[id]/ppc/[ppcId] (instalaciones:delete) esperado=deny status=500
- TENANT_B/editor → DELETE /api/instalaciones/[id]/ppc/[ppcId] (instalaciones:delete) esperado=deny status=500
- TENANT_B/admin → DELETE /api/instalaciones/[id]/ppc/[ppcId] (instalaciones:delete) esperado=allow status=500
- TENANT_A/none → POST /api/instalaciones/[id]/ppc/desasignar (instalaciones:create) esperado=deny status=500
- TENANT_A/read → POST /api/instalaciones/[id]/ppc/desasignar (instalaciones:create) esperado=deny status=500
- TENANT_A/editor → POST /api/instalaciones/[id]/ppc/desasignar (instalaciones:create) esperado=allow status=500
- TENANT_A/admin → POST /api/instalaciones/[id]/ppc/desasignar (instalaciones:create) esperado=allow status=500
- TENANT_B/none → POST /api/instalaciones/[id]/ppc/desasignar (instalaciones:create) esperado=deny status=500
- TENANT_B/read → POST /api/instalaciones/[id]/ppc/desasignar (instalaciones:create) esperado=deny status=500
- TENANT_B/editor → POST /api/instalaciones/[id]/ppc/desasignar (instalaciones:create) esperado=allow status=500
- TENANT_B/admin → POST /api/instalaciones/[id]/ppc/desasignar (instalaciones:create) esperado=allow status=500
- TENANT_A/none → POST /api/instalaciones/[id]/ppc/desasignar_v2 (instalaciones:create) esperado=deny status=500
- TENANT_A/read → POST /api/instalaciones/[id]/ppc/desasignar_v2 (instalaciones:create) esperado=deny status=500
- TENANT_A/editor → POST /api/instalaciones/[id]/ppc/desasignar_v2 (instalaciones:create) esperado=allow status=500
- TENANT_A/admin → POST /api/instalaciones/[id]/ppc/desasignar_v2 (instalaciones:create) esperado=allow status=500
- TENANT_B/none → POST /api/instalaciones/[id]/ppc/desasignar_v2 (instalaciones:create) esperado=deny status=500
- TENANT_B/read → POST /api/instalaciones/[id]/ppc/desasignar_v2 (instalaciones:create) esperado=deny status=500
- TENANT_B/editor → POST /api/instalaciones/[id]/ppc/desasignar_v2 (instalaciones:create) esperado=allow status=500
- TENANT_B/admin → POST /api/instalaciones/[id]/ppc/desasignar_v2 (instalaciones:create) esperado=allow status=500
- TENANT_A/none → DELETE /api/instalaciones/[id]/turnos/[turnoId] (instalaciones:delete) esperado=deny status=500
- TENANT_A/read → DELETE /api/instalaciones/[id]/turnos/[turnoId] (instalaciones:delete) esperado=deny status=500
- TENANT_A/editor → DELETE /api/instalaciones/[id]/turnos/[turnoId] (instalaciones:delete) esperado=deny status=500
- TENANT_A/admin → DELETE /api/instalaciones/[id]/turnos/[turnoId] (instalaciones:delete) esperado=allow status=500
- TENANT_B/none → DELETE /api/instalaciones/[id]/turnos/[turnoId] (instalaciones:delete) esperado=deny status=500
- TENANT_B/read → DELETE /api/instalaciones/[id]/turnos/[turnoId] (instalaciones:delete) esperado=deny status=500
- TENANT_B/editor → DELETE /api/instalaciones/[id]/turnos/[turnoId] (instalaciones:delete) esperado=deny status=500
- TENANT_B/admin → DELETE /api/instalaciones/[id]/turnos/[turnoId] (instalaciones:delete) esperado=allow status=500
- TENANT_A/none → POST /api/payroll/estructuras/instalacion/create (payroll:create) esperado=deny status=500
- TENANT_A/read → POST /api/payroll/estructuras/instalacion/create (payroll:create) esperado=deny status=500
- TENANT_A/editor → POST /api/payroll/estructuras/instalacion/create (payroll:create) esperado=deny status=500
- TENANT_A/admin → POST /api/payroll/estructuras/instalacion/create (payroll:create) esperado=deny status=500
- TENANT_B/none → POST /api/payroll/estructuras/instalacion/create (payroll:create) esperado=deny status=500
- TENANT_B/read → POST /api/payroll/estructuras/instalacion/create (payroll:create) esperado=deny status=500
- TENANT_B/editor → POST /api/payroll/estructuras/instalacion/create (payroll:create) esperado=deny status=500
- TENANT_B/admin → POST /api/payroll/estructuras/instalacion/create (payroll:create) esperado=deny status=500
- TENANT_A/none → POST /api/payroll/estructuras/instalacion/ensure (payroll:create) esperado=deny status=500
- TENANT_A/read → POST /api/payroll/estructuras/instalacion/ensure (payroll:create) esperado=deny status=500
- TENANT_A/editor → POST /api/payroll/estructuras/instalacion/ensure (payroll:create) esperado=deny status=500
- TENANT_A/admin → POST /api/payroll/estructuras/instalacion/ensure (payroll:create) esperado=deny status=500
- TENANT_B/none → POST /api/payroll/estructuras/instalacion/ensure (payroll:create) esperado=deny status=500
- TENANT_B/read → POST /api/payroll/estructuras/instalacion/ensure (payroll:create) esperado=deny status=500
- TENANT_B/editor → POST /api/payroll/estructuras/instalacion/ensure (payroll:create) esperado=deny status=500
- TENANT_B/admin → POST /api/payroll/estructuras/instalacion/ensure (payroll:create) esperado=deny status=500
- TENANT_A/none → POST /api/payroll/estructuras/instalacion/items (payroll:create) esperado=deny status=500
- TENANT_A/read → POST /api/payroll/estructuras/instalacion/items (payroll:create) esperado=deny status=500
- TENANT_A/editor → POST /api/payroll/estructuras/instalacion/items (payroll:create) esperado=deny status=500
- TENANT_A/admin → POST /api/payroll/estructuras/instalacion/items (payroll:create) esperado=deny status=500
- TENANT_B/none → POST /api/payroll/estructuras/instalacion/items (payroll:create) esperado=deny status=500
- TENANT_B/read → POST /api/payroll/estructuras/instalacion/items (payroll:create) esperado=deny status=500
- TENANT_B/editor → POST /api/payroll/estructuras/instalacion/items (payroll:create) esperado=deny status=500
- TENANT_B/admin → POST /api/payroll/estructuras/instalacion/items (payroll:create) esperado=deny status=500
- TENANT_A/none → PATCH /api/payroll/estructuras-guardia/[id]/cerrar (payroll:update) esperado=deny status=500
- TENANT_A/read → PATCH /api/payroll/estructuras-guardia/[id]/cerrar (payroll:update) esperado=deny status=500
- TENANT_A/editor → PATCH /api/payroll/estructuras-guardia/[id]/cerrar (payroll:update) esperado=allow status=500
- TENANT_A/admin → PATCH /api/payroll/estructuras-guardia/[id]/cerrar (payroll:update) esperado=allow status=500
- TENANT_B/none → PATCH /api/payroll/estructuras-guardia/[id]/cerrar (payroll:update) esperado=deny status=500
- TENANT_B/read → PATCH /api/payroll/estructuras-guardia/[id]/cerrar (payroll:update) esperado=deny status=500
- TENANT_B/editor → PATCH /api/payroll/estructuras-guardia/[id]/cerrar (payroll:update) esperado=allow status=500
- TENANT_B/admin → PATCH /api/payroll/estructuras-guardia/[id]/cerrar (payroll:update) esperado=allow status=500
- TENANT_A/none → GET /api/instalaciones/[id]/puestos/[puestoId] (instalaciones:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/instalaciones/[id]/puestos/[puestoId] (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/instalaciones/[id]/puestos/[puestoId] (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/instalaciones/[id]/puestos/[puestoId] (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/instalaciones/[id]/puestos/[puestoId] (instalaciones:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/instalaciones/[id]/puestos/[puestoId] (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/instalaciones/[id]/puestos/[puestoId] (instalaciones:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/instalaciones/[id]/puestos/[puestoId] (instalaciones:read:detail) esperado=allow status=500
- TENANT_A/none → PATCH /api/instalaciones/[id]/puestos/[puestoId] (instalaciones:update) esperado=deny status=500
- TENANT_A/read → PATCH /api/instalaciones/[id]/puestos/[puestoId] (instalaciones:update) esperado=deny status=500
- TENANT_A/editor → PATCH /api/instalaciones/[id]/puestos/[puestoId] (instalaciones:update) esperado=allow status=500
- TENANT_A/admin → PATCH /api/instalaciones/[id]/puestos/[puestoId] (instalaciones:update) esperado=allow status=500
- TENANT_B/none → PATCH /api/instalaciones/[id]/puestos/[puestoId] (instalaciones:update) esperado=deny status=500
- TENANT_B/read → PATCH /api/instalaciones/[id]/puestos/[puestoId] (instalaciones:update) esperado=deny status=500
- TENANT_B/editor → PATCH /api/instalaciones/[id]/puestos/[puestoId] (instalaciones:update) esperado=allow status=500
- TENANT_B/admin → PATCH /api/instalaciones/[id]/puestos/[puestoId] (instalaciones:update) esperado=allow status=500
- TENANT_A/none → PUT /api/payroll/estructuras-guardia/items/[id] (payroll:update) esperado=deny status=500
- TENANT_A/read → PUT /api/payroll/estructuras-guardia/items/[id] (payroll:update) esperado=deny status=500
- TENANT_A/editor → PUT /api/payroll/estructuras-guardia/items/[id] (payroll:update) esperado=allow status=500
- TENANT_A/admin → PUT /api/payroll/estructuras-guardia/items/[id] (payroll:update) esperado=allow status=500
- TENANT_B/none → PUT /api/payroll/estructuras-guardia/items/[id] (payroll:update) esperado=deny status=500
- TENANT_B/read → PUT /api/payroll/estructuras-guardia/items/[id] (payroll:update) esperado=deny status=500
- TENANT_B/editor → PUT /api/payroll/estructuras-guardia/items/[id] (payroll:update) esperado=allow status=500
- TENANT_B/admin → PUT /api/payroll/estructuras-guardia/items/[id] (payroll:update) esperado=allow status=500
- TENANT_A/none → DELETE /api/payroll/estructuras-guardia/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_A/read → DELETE /api/payroll/estructuras-guardia/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_A/editor → DELETE /api/payroll/estructuras-guardia/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_A/admin → DELETE /api/payroll/estructuras-guardia/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_B/none → DELETE /api/payroll/estructuras-guardia/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_B/read → DELETE /api/payroll/estructuras-guardia/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_B/editor → DELETE /api/payroll/estructuras-guardia/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_B/admin → DELETE /api/payroll/estructuras-guardia/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_A/none → GET /api/guardias/[id]/pagos/[pago_id]/csv (guardias:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/guardias/[id]/pagos/[pago_id]/csv (guardias:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/guardias/[id]/pagos/[pago_id]/csv (guardias:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/guardias/[id]/pagos/[pago_id]/csv (guardias:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/guardias/[id]/pagos/[pago_id]/csv (guardias:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/guardias/[id]/pagos/[pago_id]/csv (guardias:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/guardias/[id]/pagos/[pago_id]/csv (guardias:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/guardias/[id]/pagos/[pago_id]/csv (guardias:read:detail) esperado=allow status=500
- TENANT_A/none → POST /api/instalaciones/[id]/ppc/[ppcId]/desasignar (instalaciones:create) esperado=deny status=500
- TENANT_A/read → POST /api/instalaciones/[id]/ppc/[ppcId]/desasignar (instalaciones:create) esperado=deny status=500
- TENANT_A/editor → POST /api/instalaciones/[id]/ppc/[ppcId]/desasignar (instalaciones:create) esperado=allow status=500
- TENANT_A/admin → POST /api/instalaciones/[id]/ppc/[ppcId]/desasignar (instalaciones:create) esperado=allow status=500
- TENANT_B/none → POST /api/instalaciones/[id]/ppc/[ppcId]/desasignar (instalaciones:create) esperado=deny status=500
- TENANT_B/read → POST /api/instalaciones/[id]/ppc/[ppcId]/desasignar (instalaciones:create) esperado=deny status=500
- TENANT_B/editor → POST /api/instalaciones/[id]/ppc/[ppcId]/desasignar (instalaciones:create) esperado=allow status=500
- TENANT_B/admin → POST /api/instalaciones/[id]/ppc/[ppcId]/desasignar (instalaciones:create) esperado=allow status=500
- TENANT_A/none → POST /api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2 (instalaciones:create) esperado=deny status=500
- TENANT_A/read → POST /api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2 (instalaciones:create) esperado=deny status=500
- TENANT_A/editor → POST /api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2 (instalaciones:create) esperado=allow status=500
- TENANT_A/admin → POST /api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2 (instalaciones:create) esperado=allow status=500
- TENANT_B/none → POST /api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2 (instalaciones:create) esperado=deny status=500
- TENANT_B/read → POST /api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2 (instalaciones:create) esperado=deny status=500
- TENANT_B/editor → POST /api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2 (instalaciones:create) esperado=allow status=500
- TENANT_B/admin → POST /api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2 (instalaciones:create) esperado=allow status=500
- TENANT_A/none → POST /api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs (instalaciones:create) esperado=deny status=500
- TENANT_A/read → POST /api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs (instalaciones:create) esperado=deny status=500
- TENANT_A/editor → POST /api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs (instalaciones:create) esperado=allow status=500
- TENANT_A/admin → POST /api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs (instalaciones:create) esperado=allow status=500
- TENANT_B/none → POST /api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs (instalaciones:create) esperado=deny status=500
- TENANT_B/read → POST /api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs (instalaciones:create) esperado=deny status=500
- TENANT_B/editor → POST /api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs (instalaciones:create) esperado=allow status=500
- TENANT_B/admin → POST /api/instalaciones/[id]/turnos/[turnoId]/agregar-ppcs (instalaciones:create) esperado=allow status=500
- TENANT_A/none → DELETE /api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2 (instalaciones:delete) esperado=deny status=500
- TENANT_A/read → DELETE /api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2 (instalaciones:delete) esperado=deny status=500
- TENANT_A/editor → DELETE /api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2 (instalaciones:delete) esperado=deny status=500
- TENANT_A/admin → DELETE /api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2 (instalaciones:delete) esperado=allow status=500
- TENANT_B/none → DELETE /api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2 (instalaciones:delete) esperado=deny status=500
- TENANT_B/read → DELETE /api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2 (instalaciones:delete) esperado=deny status=500
- TENANT_B/editor → DELETE /api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2 (instalaciones:delete) esperado=deny status=500
- TENANT_B/admin → DELETE /api/instalaciones/[id]/turnos/[turnoId]/eliminar_turno_v2 (instalaciones:delete) esperado=allow status=500
- TENANT_A/none → PATCH /api/payroll/estructuras/instalacion/[id]/cerrar (payroll:update) esperado=deny status=500
- TENANT_A/read → PATCH /api/payroll/estructuras/instalacion/[id]/cerrar (payroll:update) esperado=deny status=500
- TENANT_A/editor → PATCH /api/payroll/estructuras/instalacion/[id]/cerrar (payroll:update) esperado=allow status=500
- TENANT_A/admin → PATCH /api/payroll/estructuras/instalacion/[id]/cerrar (payroll:update) esperado=allow status=500
- TENANT_B/none → PATCH /api/payroll/estructuras/instalacion/[id]/cerrar (payroll:update) esperado=deny status=500
- TENANT_B/read → PATCH /api/payroll/estructuras/instalacion/[id]/cerrar (payroll:update) esperado=deny status=500
- TENANT_B/editor → PATCH /api/payroll/estructuras/instalacion/[id]/cerrar (payroll:update) esperado=allow status=500
- TENANT_B/admin → PATCH /api/payroll/estructuras/instalacion/[id]/cerrar (payroll:update) esperado=allow status=500
- TENANT_A/none → PUT /api/payroll/estructuras/instalacion/sueldo-base/[estructura_id] (payroll:update) esperado=deny status=500
- TENANT_A/read → PUT /api/payroll/estructuras/instalacion/sueldo-base/[estructura_id] (payroll:update) esperado=deny status=500
- TENANT_A/editor → PUT /api/payroll/estructuras/instalacion/sueldo-base/[estructura_id] (payroll:update) esperado=allow status=500
- TENANT_A/admin → PUT /api/payroll/estructuras/instalacion/sueldo-base/[estructura_id] (payroll:update) esperado=allow status=500
- TENANT_B/none → PUT /api/payroll/estructuras/instalacion/sueldo-base/[estructura_id] (payroll:update) esperado=deny status=500
- TENANT_B/read → PUT /api/payroll/estructuras/instalacion/sueldo-base/[estructura_id] (payroll:update) esperado=deny status=500
- TENANT_B/editor → PUT /api/payroll/estructuras/instalacion/sueldo-base/[estructura_id] (payroll:update) esperado=allow status=500
- TENANT_B/admin → PUT /api/payroll/estructuras/instalacion/sueldo-base/[estructura_id] (payroll:update) esperado=allow status=500
- TENANT_A/none → DELETE /api/payroll/estructuras/instalacion/sueldo-base/[estructura_id] (payroll:delete) esperado=deny status=500
- TENANT_A/read → DELETE /api/payroll/estructuras/instalacion/sueldo-base/[estructura_id] (payroll:delete) esperado=deny status=500
- TENANT_A/editor → DELETE /api/payroll/estructuras/instalacion/sueldo-base/[estructura_id] (payroll:delete) esperado=deny status=500
- TENANT_A/admin → DELETE /api/payroll/estructuras/instalacion/sueldo-base/[estructura_id] (payroll:delete) esperado=deny status=500
- TENANT_B/none → DELETE /api/payroll/estructuras/instalacion/sueldo-base/[estructura_id] (payroll:delete) esperado=deny status=500
- TENANT_B/read → DELETE /api/payroll/estructuras/instalacion/sueldo-base/[estructura_id] (payroll:delete) esperado=deny status=500
- TENANT_B/editor → DELETE /api/payroll/estructuras/instalacion/sueldo-base/[estructura_id] (payroll:delete) esperado=deny status=500
- TENANT_B/admin → DELETE /api/payroll/estructuras/instalacion/sueldo-base/[estructura_id] (payroll:delete) esperado=deny status=500
- TENANT_A/none → PUT /api/payroll/estructuras/instalacion/items/[id] (payroll:update) esperado=deny status=500
- TENANT_A/read → PUT /api/payroll/estructuras/instalacion/items/[id] (payroll:update) esperado=deny status=500
- TENANT_A/editor → PUT /api/payroll/estructuras/instalacion/items/[id] (payroll:update) esperado=allow status=500
- TENANT_A/admin → PUT /api/payroll/estructuras/instalacion/items/[id] (payroll:update) esperado=allow status=500
- TENANT_B/none → PUT /api/payroll/estructuras/instalacion/items/[id] (payroll:update) esperado=deny status=500
- TENANT_B/read → PUT /api/payroll/estructuras/instalacion/items/[id] (payroll:update) esperado=deny status=500
- TENANT_B/editor → PUT /api/payroll/estructuras/instalacion/items/[id] (payroll:update) esperado=allow status=500
- TENANT_B/admin → PUT /api/payroll/estructuras/instalacion/items/[id] (payroll:update) esperado=allow status=500
- TENANT_A/none → DELETE /api/payroll/estructuras/instalacion/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_A/read → DELETE /api/payroll/estructuras/instalacion/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_A/editor → DELETE /api/payroll/estructuras/instalacion/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_A/admin → DELETE /api/payroll/estructuras/instalacion/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_B/none → DELETE /api/payroll/estructuras/instalacion/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_B/read → DELETE /api/payroll/estructuras/instalacion/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_B/editor → DELETE /api/payroll/estructuras/instalacion/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_B/admin → DELETE /api/payroll/estructuras/instalacion/items/[id] (payroll:delete) esperado=deny status=500
- TENANT_A/none → GET /api/pauta-diaria/turno-extra/planillas/[id]/descargar (pauta-diaria:read:detail) esperado=deny status=500
- TENANT_A/read → GET /api/pauta-diaria/turno-extra/planillas/[id]/descargar (pauta-diaria:read:detail) esperado=allow status=500
- TENANT_A/editor → GET /api/pauta-diaria/turno-extra/planillas/[id]/descargar (pauta-diaria:read:detail) esperado=allow status=500
- TENANT_A/admin → GET /api/pauta-diaria/turno-extra/planillas/[id]/descargar (pauta-diaria:read:detail) esperado=allow status=500
- TENANT_B/none → GET /api/pauta-diaria/turno-extra/planillas/[id]/descargar (pauta-diaria:read:detail) esperado=deny status=500
- TENANT_B/read → GET /api/pauta-diaria/turno-extra/planillas/[id]/descargar (pauta-diaria:read:detail) esperado=allow status=500
- TENANT_B/editor → GET /api/pauta-diaria/turno-extra/planillas/[id]/descargar (pauta-diaria:read:detail) esperado=allow status=500
- TENANT_B/admin → GET /api/pauta-diaria/turno-extra/planillas/[id]/descargar (pauta-diaria:read:detail) esperado=allow status=500
- TENANT_A/none → DELETE /api/pauta-diaria/turno-extra/planillas/[id]/eliminar (pauta-diaria:delete) esperado=deny status=500
- TENANT_A/read → DELETE /api/pauta-diaria/turno-extra/planillas/[id]/eliminar (pauta-diaria:delete) esperado=deny status=500
- TENANT_A/editor → DELETE /api/pauta-diaria/turno-extra/planillas/[id]/eliminar (pauta-diaria:delete) esperado=deny status=500
- TENANT_A/admin → DELETE /api/pauta-diaria/turno-extra/planillas/[id]/eliminar (pauta-diaria:delete) esperado=deny status=500
- TENANT_B/none → DELETE /api/pauta-diaria/turno-extra/planillas/[id]/eliminar (pauta-diaria:delete) esperado=deny status=500
- TENANT_B/read → DELETE /api/pauta-diaria/turno-extra/planillas/[id]/eliminar (pauta-diaria:delete) esperado=deny status=500
- TENANT_B/editor → DELETE /api/pauta-diaria/turno-extra/planillas/[id]/eliminar (pauta-diaria:delete) esperado=deny status=500
- TENANT_B/admin → DELETE /api/pauta-diaria/turno-extra/planillas/[id]/eliminar (pauta-diaria:delete) esperado=deny status=500
- TENANT_A/none → POST /api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada (pauta-diaria:create) esperado=deny status=500
- TENANT_A/read → POST /api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada (pauta-diaria:create) esperado=deny status=500
- TENANT_A/editor → POST /api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada (pauta-diaria:create) esperado=deny status=500
- TENANT_A/admin → POST /api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada (pauta-diaria:create) esperado=deny status=500
- TENANT_B/none → POST /api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada (pauta-diaria:create) esperado=deny status=500
- TENANT_B/read → POST /api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada (pauta-diaria:create) esperado=deny status=500
- TENANT_B/editor → POST /api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada (pauta-diaria:create) esperado=deny status=500
- TENANT_B/admin → POST /api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada (pauta-diaria:create) esperado=deny status=500

## Resultados UI
_No disponible_