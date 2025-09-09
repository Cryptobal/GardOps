## GardOps — Roadmap Global y Documentación por Módulos (Actualizado)

**Fecha**: 2025-08-12  
**Conectividad**: Neon estable  
**Estrategia**: Refactor agresivo e incremental con feature flags, auditoría y RBAC

---

## Estado actual (resumen)

- **RBAC**: ✅ Implementado (tablas y seeds en Neon; `useCan()` y endpoint `GET/POST /api/rbac/can` con fallback legacy). UI de seguridad bajo `configuracion/seguridad/*`.
- **Feature flags**: ✅ En uso. Flag central `ado_v2` (tabla `app_feature_flags`) y flags de cliente/servidor `NEXT_PUBLIC_USE_NEW_TURNOS_API`/`USE_NEW_TURNOS_API` para Pauta Diaria v2. Falta estandarizar otros (`fichas_v2`, `payroll_v1`, `docs_v1`, `firma_v1`).
- **ADO v2 (Pauta Diaria v2)**: ⏳ En rollout. UI y endpoints `*-new` listos; vistas `as_turnos_v_pauta_diaria` y `as_turnos_v_pauta_diaria_dedup` presentes. Pendiente crear/actualizar funciones Neon: `as_turnos.fn_registrar_reemplazo`, `as_turnos.fn_marcar_extra`, `as_turnos.fn_deshacer`, `as_turnos.fn_guardias_disponibles` (scripts listos).
- **Fichas v2**: ⏳ Parcial. Páginas `guardias/[id]`, `instalaciones/[id]`, `clientes/[id]`; tabs de entidad; `DocumentManager` y datos bancarios operativos. Falta unificar `EntityLayout`, `ActivityLog` y panel de asignación como componentes reutilizables.
- **Payroll v1**: ⏳ Avanzado (Beta). Motor en `src/lib/sueldo/*`, API de cálculo, tablas de parámetros (`db/create-sueldo-tables.sql`), estructuras de sueldo y planillas TE. Falta versionado formal de parámetros y exportes mensuales consolidados.
- **Documentos & Plantillas v1**: ⏳ Parcial. Editor (TinyMCE) y API ` /api/doc/templates` operativos; `DocumentManager` funcional. Falta endpoint `POST /api/docs/render` para templating con variables y versionado robusto.
- **Firma Digital v1**: ❌ No iniciado (tablas/flujo por definir).
- **Mobile (Rondas GPS y FaceID)**: ❌ No iniciado.
- **Observabilidad**: ⏳ Parcial. `as_turnos_logs` y endpoints de logs existen; falta métrica de latencia p95 por endpoint y estandarizar logging antes/después.

---

## 1) Roadmap Global de Optimización

### Fase 0 — Preparación (Día 1–2)

- **Inventario de BD**: `meta.tablas_registro` y política `archive.*` → ❌ Pendiente (no existe la tabla de registro).
- **Feature flags**: `ado_v2` operativo vía `app_feature_flags` y `.env` (`USE_NEW_TURNOS_API`, `NEXT_PUBLIC_USE_NEW_TURNOS_API`) → ✅. Estandarizar `fichas_v2`, `payroll_v1`, `docs_v1`, `firma_v1` → ⏳.
- **Carpeta `legacy`**: rutas paralelas y redirect por flag en `/pauta-diaria` → ✅ (`/legacy/pauta-diaria` y `/pauta-diaria-v2`).
- **Observabilidad**: `as_turnos_logs` y `/api/logs` → ⏳; métricas p95 y before/after en funciones críticas → ⏳.

### Fase 1 — Núcleo de Identidad, Permisos y Auditoría (Día 3–6)

- **RBAC** (`usuarios`, `roles`, `permisos`, `roles_permisos`, `usuarios_roles`) → ✅ (scripts idempotentes y smoke test). 
- **Permisos por acción** y **middleware/hook UI `useCan()`** → ✅ (con adaptador y fallback legacy).

### Fase 2 — ADO v2 (Pauta Mensual → Diaria → Acciones) (Semana 2)

- **Vistas**: `as_turnos_v_pauta_diaria` y `as_turnos_v_pauta_diaria_dedup` → ✅.
- **Funciones**: `fn_marcar_asistencia` → ✅; `fn_registrar_reemplazo`, `fn_marcar_extra`, `fn_deshacer`, `fn_guardias_disponibles` → ⚠️ Crear/actualizar en Neon (scripts incluidos).
- **UI**: Pauta Diaria v2 con flag y adapter de endpoints → ✅. CSV de turnos extra (Santander) → ✅ (`/api/pauta-diaria/turno-extra/exportar`).

### Fase 3 — Fichas v2 (Guardia, Instalación, Cliente) (Semana 3)

- **Layout**: `EntityTabs` operativo; falta `EntityLayout` unificado → ⏳.
- **Componentes**: `DocumentManager` y `DatosBancarios` → ✅; `ActivityLog` y `AssignmentPanel` → ⏳.

### Fase 4 — Payroll v1 (Semana 4–5)

- **Parámetros**: Tablas base y seeds (`db/create-sueldo-tables.sql`) → ✅. Versionado formal (`sueldo_param_version`) → ⏳.
- **Motor**: `calcularSueldo()` y subcálculos → ✅. Integración planillas TE → ✅. Exportes mensuales consolidados → ⏳.

### Fase 5 — Documentos & Plantillas v1 (Semana 5)

- Editor rico y catálogo de plantillas → ✅. **Render** con variables (`/api/docs/render`) → ❌ Pendiente. Versionado/permiso granular → ⏳.

### Fase 6 — Firma Digital v1 (Semana 6)

- Flujo, tablas y proveedor HSM/OCSP → ❌ No iniciado.

### Fase 7 — Mobile: Rondas GPS y FaceID (posterior a Payroll)

- Diseño/POC → ❌ No iniciado.

### Criterios de “Done” por fase

- Indicadores de latencia (<300ms p95 en endpoints críticos) → ⏳ implementar medición. 
- Cobertura de permisos por acción meta ≥ 95% → ⏳ auditar vistas críticas.
- Auditoría presente en 100% de funciones SQL de escritura → ⏳ (ADO/Payroll).
- QA/IQA con checklists por módulo y rollback plan → ⏳.

### ¿En qué fase estamos?

- **Fase activa: Fase 2 — ADO v2 (rollout)**.
- Requisitos para cerrar Fase 2: crear/actualizar funciones Neon y realizar smoke tests; activar flag `ado_v2` en DB y `.env` en producción.

### Siguientes pasos (ejecutables en 48h)

- **Neon (SQL)**: ejecutar funciones ADO v2 (idempotentes)
  - `scripts/create-te-rollout.sql` o los scripts `patch-fn-*` según corresponda.
- **Flags**: activar `ado_v2` (`db/enable-ado-v2.sql`) y `.env` (`USE_NEW_TURNOS_API=true`, `NEXT_PUBLIC_USE_NEW_TURNOS_API=true`).
- **Smoke tests**: `npx tsx scripts/smoke-test-new-api.ts` (endpoints y funciones). 
- **Observabilidad**: añadir métricas p95 con aggregación por endpoint y registrar before/after en ADO.

---

## 2) Documentación por Módulo (actualizada)

> Estructura: Propósito, Tablas, Vistas/Funciones, Endpoints, Permisos, Feature flags, Dependencias/Interacciones, KPIs, Notas de despliegue

### 2.1. Core — Identidad, Permisos (RBAC) y Auditoría

- **Propósito**: Control de acceso por acción y trazabilidad.
- **Tablas**:
  - `usuarios`, `roles`, `permisos`, `roles_permisos`, `usuarios_roles`
  - `app_feature_flags(code, enabled)`
  - Logs: `logs_guardias`, `logs_pauta_mensual`, `logs_pauta_diaria`, `logs_turnos_extras`, `logs_documentos`, `logs_usuarios` (algunas propuestas/creadas; estandarizar)
  - `meta.tablas_registro` → Pendiente
- **Vistas/Funciones**:
  - `fn_usuario_tiene_permiso(...)` (Neon) y vistas auxiliares (según migración RBAC)
- **Endpoints**:
  - `GET/POST /api/rbac/can` (chequeo), `GET /api/me/permissions` (fallback legacy)
- **Permisos**: `rbac.platform_admin`, `rbac.roles.read/write`, `usuarios.manage`, `turnos.*`, `payroll.*`, `docs.*`, `firma.*`
- **Feature flags**: `ado_v2` (DB) y `NEXT_PUBLIC_USE_NEW_TURNOS_API`/`USE_NEW_TURNOS_API` (cliente/servidor)
- **Interacciones**: Hook `useCan()` en UI; middleware de rutas sensibles.
- **KPIs**: % acciones bloqueadas, errores de auth, p95 por endpoint.
- **Notas**: Ejecutar `scripts/rbac/migration.sql` y smoke para ambientes nuevos.

### 2.2. ADO — Asignación de Turnos (Pauta Mensual y Diaria)

- **Propósito**: Planificar y operar turnos por puesto/instalación.
- **Tablas**: `as_turnos_puestos_operativos`, `as_turnos_pauta_mensual`, `turnos_extras`, `planillas_turnos_extras`, `as_turnos_logs`
- **Vistas/Funciones**: `as_turnos_v_pauta_diaria`, `as_turnos_v_pauta_diaria_dedup`, `fn_marcar_asistencia`, `fn_registrar_reemplazo`, `fn_marcar_extra`, `fn_deshacer`, `fn_guardias_disponibles`
- **Endpoints**:
  - Legacy: `/api/turnos/asistencia`, `/api/turnos/inasistencia`, `/api/turnos/ppc/cubrir`, `/api/turnos/ppc/sin-cobertura`, `/api/turnos/deshacer`
  - Nuevos (flag ON): `/api/turnos/asistencia-new`, `/api/turnos/reemplazo-new`, `/api/turnos/extra-new`, `/api/turnos/deshacer-new`, `GET /api/guardias/disponibles`
  - Exportes: `GET /api/pauta-diaria/turno-extra/exportar`
- **Permisos**: `turnos.ver`, `turnos.marcar_asistencia`, `turnos.reemplazar`, `turnos.marcar_extra`
- **Feature flags**: `ado_v2`, `USE_NEW_TURNOS_API`, `NEXT_PUBLIC_USE_NEW_TURNOS_API`
- **Interacciones**: Eventos de `guardias_eventos` impactan pauta mensual → diaria.
- **KPIs**: Cobertura de puestos, % ausencias, TTR reemplazo, extras periodo.
- **Notas**: Crear/actualizar funciones Neon y otorgar `GRANT EXECUTE` a roles.

### 2.3. Ficha de Guardia

- **Propósito**: Vista 360° del guardia.
- **Tablas**: `guardias`, `guardias_bancarios`, `guardias_eventos`
- **Endpoints**: `GET/PUT /api/guardias/[id]/bancarios`, `GET /api/guardias/[id]/historial-mensual`
- **Interacciones**: Cambios en `guardias_eventos` afectan pauta.
- **Permisos**: `guardias.ver`, `guardias.editar`, `guardias.eventos.editar`, `guardias.bancarios.editar`
- **Notas**: Integrar `ActivityLog` y `DocumentManager` por entidad.

### 2.4. Ficha de Instalación

- **Propósito**: Configurar y operar una instalación.
- **Tablas**: `instalaciones`, `as_turnos_puestos_operativos`, estructuras de sueldo por rol (`sueldo_estructura_*`)
- **Interacciones**: Generación de pauta mensual y definición de estructuras de sueldo.
- **Permisos**: `instalaciones.ver`, `instalaciones.editar`, `instalaciones.puestos.editar`
- **Notas**: Completar `AssignmentPanel` y logs por acción.

### 2.5. Ficha de Cliente

- **Propósito**: Datos comerciales y contratos.
- **Tablas**: `clientes` (contratos por definir/migrar)
- **Interacciones**: Relación con Instalaciones; base para Documentos/Firma.
- **Notas**: Definir `contratos` y enlazar con Documentos/Firma.

### 2.6. Documentos & Plantillas (Editor)

- **Propósito**: Gestionar plantillas y documentos.
- **Tablas**: `doc_templates` (plantillas), `documentos` (gestión de archivos)
- **Endpoints**: `GET/POST /api/doc/templates`, `PUT /api/doc/templates/[id]`, `GET /api/migrate-documentos`
- **Pendiente**: `POST /api/docs/render` (templating de variables) y versionado/permiso.
- **Permisos**: `docs.ver`, `docs.crear`, `docs.editar`, `docs.render`
- **Notas**: Integrar render con Firma Digital cuando esté listo.

### 2.7. Firma Digital (Contratos, Liquidaciones, Anexos)

- **Propósito**: Ejecutar firmas con validez probatoria.
- **Estado**: No iniciado. 
- **Acciones**: Definir tablas `firma_solicitudes`, `firma_signatarios`, `firma_eventos`; seleccionar proveedor; flujos y evidencia (hash, sello de tiempo, IP).

### 2.8. Payroll

- **Propósito**: Cálculo legal y trazable de remuneraciones.
- **Tablas**: parámetros (`sueldo_afp`, `sueldo_isapre`, `sueldo_mutualidad`, `sueldo_parametros_generales`), estructuras (`sueldo_estructuras_servicio`), bonos globales, planillas y turnos extras.
- **Funciones**: `calcularSueldo()` y submódulos (`imponible`, `noImponible`, `cotizaciones`, `empleador`).
- **Endpoints**: `POST /api/sueldos/calcular`, `GET /api/sueldos/parametros`, migraciones `POST /api/sueldos/migrar-parametros`.
- **Pendiente**: versionado formal (`sueldo_param_version`), exportes mensuales consolidados y LRE.

---

## Anexos rápidos

- **Flags recomendados**: `ado_v2`, `fichas_v2`, `payroll_v1`, `docs_v1`, `firma_v1` (persistir en `app_feature_flags` y exponer en `/api/flags`).
- **Smoke tests**: ADO v2 → `scripts/smoke-test-new-api.ts`.
- **Despliegue**: activar flags vía DB y variables `.env` antes de exponer rutas `v2` por defecto.


