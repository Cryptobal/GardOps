# PLAN DE ACCIÓN - AUDITORÍA GARDOPS
**Fecha:** 29 de Julio de 2025  
**Base de Datos:** PostgreSQL (Neon)  
**Proyecto:** GardOps - Sistema de Gestión de Guardias

---

## 🎯 OBJETIVOS DEL PLAN

1. **Normalizar nomenclatura** de columnas y tablas
2. **Optimizar índices** para mejorar rendimiento
3. **Corregir inconsistencias** de tipos de datos
4. **Implementar funcionalidades** pendientes
5. **Mejorar integridad** de datos

---

## 📋 FASE 1: NORMALIZACIÓN DE NOMENCLATURA

### 1.1 Estandarización de Timestamps
**Problema:** Mezcla de `created_at`/`creado_en` y `updated_at`/`modificado_en`

**Acciones:**
- [ ] Cambiar `creado_en` → `created_at` en:
  - `documentos`
  - `pautas_diarias`
  - `pautas_mensuales`
  - `planillas`
  - `tipos_documentos`
  - `turnos_extras`

- [ ] Agregar `created_at` faltante en:
  - `bancos`
  - `documentos_guardias`
  - `documentos_instalacion`
  - `documentos_usuarios`
  - `firmas`
  - `planillas_pago`
  - `rondas`
  - `turnos_extra`
  - `usuarios_permisos`
  - `usuarios_roles`

- [ ] Agregar `updated_at` faltante en:
  - `documentos_clientes`
  - `tipos_documentos`
  - `turnos_extras`
  - `usuarios`

### 1.2 Estandarización de Nombres de Columnas
**Problema:** Mezcla de español e inglés

**Acciones:**
- [ ] Cambiar `tamaño` → `tamano` en `documentos_clientes`
- [ ] Cambiar `año` → `anio` en `planificacion_mensual`
- [ ] Cambiar `último_acceso` → `ultimo_acceso` en `usuarios`
- [ ] Cambiar `aprobado_por` → `aprobado_por` en `turnos_extras`

---

## 📊 FASE 2: OPTIMIZACIÓN DE ÍNDICES

### 2.1 Índices Críticos Faltantes
**Prioridad ALTA:**

- [ ] `clientes.email` - Búsqueda por email
- [ ] `clientes.telefono` - Búsqueda por teléfono
- [ ] `guardias.telefono` - Búsqueda por teléfono
- [ ] `guardias.activo` - Filtrado por estado
- [ ] `usuarios.telefono` - Búsqueda por teléfono
- [ ] `tenants.activo` - Filtrado por estado
- [ ] `tipos_documentos.activo` - Filtrado por estado

### 2.2 Índices de Fechas
**Prioridad MEDIA:**

- [ ] `documentos.fecha_vencimiento` - Alertas de vencimiento
- [ ] `documentos_clientes.fecha_vencimiento` - Alertas de vencimiento
- [ ] `puestos_por_cubrir.fecha_limite_cobertura` - Seguimiento de cobertura
- [ ] `asignaciones_guardias.fecha_inicio` - Filtrado por fecha
- [ ] `asignaciones_guardias.fecha_termino` - Filtrado por fecha

### 2.3 Índices de Relaciones
**Prioridad MEDIA:**

- [ ] `instalaciones.cliente_id` - Filtrado por cliente
- [ ] `documentos_usuarios.tenant_id` - Filtrado por tenant
- [ ] `rondas.tenant_id` - Filtrado por tenant
- [ ] `turnos_extra.tenant_id` - Filtrado por tenant
- [ ] `usuarios_roles.tenant_id` - Filtrado por tenant

---

## 🔧 FASE 3: CORRECCIÓN DE TIPOS DE DATOS

### 3.1 Inconsistencias Críticas
**Problema:** `asignaciones_guardias.guardia_id` es integer pero `guardias.id` es UUID

**Acciones:**
- [ ] Cambiar `asignaciones_guardias.guardia_id` de `integer` a `uuid`
- [ ] Actualizar datos existentes para mantener integridad referencial
- [ ] Verificar que no haya datos huérfanos

### 3.2 Campo Legacy
**Problema:** `guardias.legacy_id` sin propósito claro

**Acciones:**
- [ ] Investigar origen y propósito del campo
- [ ] Decidir si mantener o eliminar
- [ ] Si se mantiene, documentar su propósito

---

## 🚀 FASE 4: IMPLEMENTACIÓN DE FUNCIONALIDADES

### 4.1 Sistema de Planificación
**Tablas vacías que necesitan implementación:**

- [ ] `pautas_diarias` - Planificación diaria de guardias
- [ ] `pautas_mensuales` - Planificación mensual
- [ ] `planificacion_mensual` - Configuración de planificación
- [ ] `planillas` - Generación de planillas
- [ ] `planillas_pago` - Cálculo de pagos

### 4.2 Sistema de Operaciones
**Tablas vacías que necesitan implementación:**

- [ ] `rondas` - Registro de rondas de vigilancia
- [ ] `turnos_extra` - Gestión de turnos adicionales
- [ ] `turnos_extras` - Turnos de cobertura

### 4.3 Sistema de Documentos
**Tablas vacías que necesitan implementación:**

- [ ] `documentos` - Documentos generales
- [ ] `documentos_guardias` - Documentos de personal
- [ ] `documentos_instalacion` - Documentos de instalaciones
- [ ] `documentos_usuarios` - Documentos de usuarios
- [ ] `firmas` - Sistema de firmas digitales
- [ ] `alertas_documentos` - Alertas de vencimiento

### 4.4 Sistema de Permisos
**Tablas vacías que necesitan implementación:**

- [ ] `usuarios_roles` - Roles de usuario
- [ ] `usuarios_permisos` - Permisos específicos

---

## 📈 FASE 5: MEJORAS DE RENDIMIENTO

### 5.1 Optimización de Consultas
**Acciones:**
- [ ] Crear vistas materializadas para reportes complejos
- [ ] Optimizar consultas de `resumen_instalaciones`
- [ ] Optimizar consultas de `vista_ppc_detallada`

### 5.2 Particionamiento
**Evaluar:**
- [ ] Particionamiento de `documentos_clientes` por fecha
- [ ] Particionamiento de `logs_clientes` por fecha
- [ ] Particionamiento de `rondas` por fecha

### 5.3 Limpieza de Datos
**Acciones:**
- [ ] Implementar políticas de retención para logs
- [ ] Archivar documentos antiguos
- [ ] Limpiar datos de prueba

---

## 🔒 FASE 6: SEGURIDAD Y AUDITORÍA

### 6.1 Auditoría de Accesos
**Implementar:**
- [ ] Logs de acceso a la base de datos
- [ ] Auditoría de cambios en datos críticos
- [ ] Monitoreo de consultas lentas

### 6.2 Backup y Recuperación
**Verificar:**
- [ ] Estrategia de backup automático
- [ ] Plan de recuperación de desastres
- [ ] Pruebas de restauración

---

## 📅 CRONOGRAMA ESTIMADO

### Semana 1-2: Normalización
- Fase 1: Normalización de nomenclatura
- Corrección de tipos de datos críticos

### Semana 3-4: Optimización
- Fase 2: Implementación de índices críticos
- Fase 5: Optimización de consultas

### Semana 5-6: Implementación
- Fase 4: Implementación de funcionalidades básicas
- Sistema de planificación

### Semana 7-8: Seguridad y Testing
- Fase 6: Seguridad y auditoría
- Pruebas completas del sistema

---

## ⚠️ RIESGOS Y CONSIDERACIONES

### Riesgos Técnicos
- **Migración de datos:** Backup completo antes de cambios
- **Tiempo de inactividad:** Programar en horarios de bajo uso
- **Compatibilidad:** Verificar que aplicaciones sigan funcionando

### Riesgos de Negocio
- **Interrupción del servicio:** Plan de rollback preparado
- **Pérdida de datos:** Múltiples backups verificados
- **Rendimiento:** Monitoreo continuo durante cambios

---

## 📊 MÉTRICAS DE ÉXITO

### Antes vs Después
- **Tiempo de respuesta:** Reducir consultas lentas en 50%
- **Uso de espacio:** Optimizar almacenamiento en 20%
- **Integridad:** 0 inconsistencias de datos
- **Funcionalidad:** 100% de tablas operativas

### Monitoreo Continuo
- **Performance:** Consultas bajo 100ms
- **Disponibilidad:** 99.9% uptime
- **Errores:** Menos de 0.1% de errores de base de datos

---

## 🎯 PRÓXIMOS PASOS

1. **Aprobación del plan** por stakeholders
2. **Preparación del entorno** de desarrollo
3. **Creación de scripts** de migración
4. **Implementación gradual** por fases
5. **Monitoreo y ajustes** continuos

---

**Responsable:** Equipo de Desarrollo GardOps  
**Fecha de Revisión:** 29 de Julio de 2025  
**Próxima Revisión:** 5 de Agosto de 2025 