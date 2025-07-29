# AUDITORÍA COMPLETA DE BASE DE DATOS GARDOPS
**Fecha de Auditoría:** 29 de Julio de 2025  
**Base de Datos:** PostgreSQL (Neon)  
**Proyecto:** GardOps - Sistema de Gestión de Guardias

---

## 📊 RESUMEN EJECUTIVO

### Estadísticas Generales
- **Total de Tablas:** 35
- **Total de Claves Foráneas:** 62
- **Total de Índices:** 125
- **Tablas con Datos:** 19
- **Tablas Vacías:** 16

### Distribución de Datos
- **Tabla más grande:** `guardias` (220 registros, 128 MB)
- **Tabla más pequeña con datos:** `puestos_por_cubrir` (1 registro, 96 MB)
- **Mayor uso de espacio:** `documentos_clientes` (2 registros, 3.7 GB - archivos binarios)

---

## 🗂️ ANÁLISIS DETALLADO POR TABLAS

### 1. TABLAS PRINCIPALES OPERATIVAS

#### 🔐 **guardias** (220 registros, 128 MB)
**Propósito:** Gestión de personal de seguridad
- **Columnas principales:** id (PK), tenant_id, nombre, apellido, email, telefono, activo
- **Relaciones:** tenant_id → tenants.id
- **Estado:** Activa con datos

#### 🏢 **instalaciones** (34 registros, 64 MB)
**Propósito:** Ubicaciones donde se prestan servicios
- **Columnas principales:** id (PK), cliente_id, nombre, direccion, lat, lng, estado
- **Relaciones:** 
  - cliente_id → clientes.id
  - region_id → regiones.id
  - ciudad_id → ciudades.id
  - comuna_id → comunas.id
  - tenant_id → tenants.id
- **Estado:** Activa con datos

#### 👥 **clientes** (18 registros, 80 MB)
**Propósito:** Empresas que contratan servicios
- **Columnas principales:** id (PK), nombre, rut, representante_legal, estado, email, telefono
- **Relaciones:** tenant_id → tenants.id
- **Estado:** Activa con datos

#### 📋 **asignaciones_guardias** (2 registros, 128 MB)
**Propósito:** Asignación de guardias a puestos específicos
- **Columnas principales:** id (PK), guardia_id, requisito_puesto_id, tipo_asignacion, fecha_inicio, estado
- **Relaciones:** 
  - requisito_puesto_id → requisitos_puesto.id
  - tenant_id → tenants.id
- **Estado:** Activa con datos mínimos

#### 📄 **documentos_clientes** (2 registros, 3.7 GB)
**Propósito:** Almacenamiento de documentos de clientes
- **Columnas principales:** id (PK), cliente_id, nombre, tipo, contenido_archivo, fecha_vencimiento
- **Relaciones:** 
  - cliente_id → clientes.id
  - tipo_documento_id → tipos_documentos.id
- **Estado:** Activa con archivos binarios grandes

### 2. TABLAS DE CONFIGURACIÓN Y CATÁLOGOS

#### 🏦 **bancos** (18 registros, 64 MB)
**Propósito:** Catálogo de instituciones bancarias
- **Columnas:** id (PK), codigo, nombre, updated_at
- **Estado:** Activa con datos

#### 🏥 **isapres** (7 registros, 48 MB)
**Propósito:** Catálogo de ISAPRES
- **Columnas:** id (PK), nombre, created_at, updated_at
- **Estado:** Activa con datos

#### 💼 **afps** (6 registros, 48 MB)
**Propósito:** Catálogo de AFP
- **Columnas:** id (PK), nombre, created_at, updated_at
- **Estado:** Activa con datos

#### 🗺️ **regiones** (16 registros, 64 MB)
**Propósito:** División territorial - Regiones
- **Columnas:** id (PK), nombre, codigo, created_at, updated_at
- **Relaciones:** ciudades.region_id → regiones.id
- **Estado:** Activa con datos

#### 🏙️ **ciudades** (8 registros, 48 MB)
**Propósito:** División territorial - Ciudades
- **Columnas:** id (PK), region_id, nombre, created_at, updated_at
- **Relaciones:** 
  - region_id → regiones.id
  - comunas.ciudad_id → ciudades.id
- **Estado:** Activa con datos

#### 🏘️ **comunas** (8 registros, 48 MB)
**Propósito:** División territorial - Comunas
- **Columnas:** id (PK), ciudad_id, nombre, created_at, updated_at
- **Relaciones:** ciudad_id → ciudades.id
- **Estado:** Activa con datos

#### 📝 **tipos_documentos** (17 registros, 48 MB)
**Propósito:** Catálogo de tipos de documentos
- **Columnas:** id (PK), modulo, nombre, requiere_vencimiento, dias_antes_alarma, activo
- **Estado:** Activa con datos

### 3. TABLAS DE GESTIÓN OPERATIVA

#### ⚙️ **roles_servicio** (6 registros, 80 MB)
**Propósito:** Configuración de turnos y horarios
- **Columnas:** id (PK), dias_trabajo, dias_descanso, horas_turno, hora_inicio, hora_termino, nombre
- **Relaciones:** tenant_id → tenants.id
- **Estado:** Activa con datos

#### 🎯 **requisitos_puesto** (5 registros, 80 MB)
**Propósito:** Requisitos de personal por puesto
- **Columnas:** id (PK), instalacion_id, puesto_operativo_id, rol_servicio_id, cantidad_guardias
- **Relaciones:** 
  - instalacion_id → instalaciones.id
  - puesto_operativo_id → puestos_operativos.id
  - rol_servicio_id → roles_servicio.id
- **Estado:** Activa con datos

#### 🏗️ **puestos_operativos** (2 registros, 48 MB)
**Propósito:** Puestos de trabajo en instalaciones
- **Columnas:** id (PK), instalacion_id, nombre, estado
- **Relaciones:** 
  - instalacion_id → instalaciones.id
  - tenant_id → tenants.id
- **Estado:** Activa con datos mínimos

#### 📊 **puestos_por_cubrir** (1 registro, 96 MB)
**Propósito:** Vacantes que necesitan cobertura
- **Columnas:** id (PK), requisito_puesto_id, cantidad_faltante, motivo, prioridad, estado
- **Relaciones:** 
  - requisito_puesto_id → requisitos_puesto.id
  - tenant_id → tenants.id
- **Estado:** Activa con datos mínimos

#### 👤 **usuarios** (3 registros, 112 MB)
**Propósito:** Usuarios del sistema
- **Columnas:** id (PK), email, password, nombre, apellido, rol, activo
- **Relaciones:** tenant_id → tenants.id
- **Estado:** Activa con datos

#### 🏢 **tenants** (2 registros, 48 MB)
**Propósito:** Multi-tenancy - Organizaciones
- **Columnas:** id (PK), nombre, rut, activo
- **Estado:** Activa con datos

#### 📋 **logs_clientes** (8 registros, 64 MB)
**Propósito:** Auditoría de cambios en clientes
- **Columnas:** id (PK), cliente_id, accion, usuario, tipo, contexto, fecha
- **Relaciones:** cliente_id → clientes.id
- **Estado:** Activa con datos

---

## 🚫 TABLAS VACÍAS (16 tablas)

### Documentos y Firmas
- `documentos` (32 MB)
- `documentos_guardias` (24 MB)
- `documentos_instalacion` (32 MB)
- `documentos_usuarios` (24 MB)
- `firmas` (16 MB)
- `alertas_documentos` (40 MB)

### Planificación y Pautas
- `pautas_diarias` (48 MB)
- `pautas_mensuales` (40 MB)
- `planificacion_mensual` (32 MB)
- `planillas` (24 MB)
- `planillas_pago` (16 MB)

### Operaciones
- `rondas` (24 MB)
- `turnos_extra` (24 MB)
- `turnos_extras` (56 MB)

### Usuarios y Permisos
- `usuarios_permisos` (32 MB)
- `usuarios_roles` (24 MB)

---

## 🔗 RELACIONES DETECTADAS

### Jerarquía Principal
```
tenants (organizaciones)
├── clientes
│   ├── instalaciones
│   │   ├── puestos_operativos
│   │   │   └── requisitos_puesto
│   │   │       └── puestos_por_cubrir
│   │   └── documentos_instalacion
│   └── documentos_clientes
├── guardias
│   ├── asignaciones_guardias
│   ├── documentos_guardias
│   └── rondas
├── usuarios
│   ├── usuarios_roles
│   └── usuarios_permisos
└── roles_servicio
```

### Relaciones Geográficas
```
regiones
└── ciudades
    └── comunas
        └── instalaciones
```

---

## ⚠️ PROBLEMAS DETECTADOS

### 1. Inconsistencias de Nomenclatura
- **Mezcla de idiomas:** Español e inglés en nombres de columnas
- **Inconsistencia en timestamps:** `created_at` vs `creado_en`, `updated_at` vs `modificado_en`

### 2. Campos Faltantes
- **Sin `created_at`:** bancos, documentos_guardias, documentos_instalacion, documentos_usuarios, firmas, planillas_pago, rondas, turnos_extra, usuarios_permisos, usuarios_roles
- **Sin `updated_at`:** documentos_clientes, tipos_documentos, turnos_extras, usuarios

### 3. Índices Faltantes
- **Fechas sin índice:** 85 columnas de timestamp/date sin índices
- **Campos importantes sin índice:** email, telefono, activo, estado

### 4. Relaciones Huérfanas
- **guardias.legacy_id:** Campo integer sin relación definida
- **asignaciones_guardias.guardia_id:** Tipo integer pero guardias.id es UUID

---

## 📈 RECOMENDACIONES

### 1. Normalización de Nomenclatura
- Estandarizar nombres de columnas a español
- Unificar convención de timestamps

### 2. Optimización de Índices
- Crear índices en columnas de fecha frecuentemente consultadas
- Agregar índices en campos de búsqueda (email, telefono, estado)

### 3. Corrección de Tipos de Datos
- Cambiar `asignaciones_guardias.guardia_id` de integer a UUID
- Revisar `guardias.legacy_id` para determinar su propósito

### 4. Implementación de Funcionalidades
- Activar tablas de planificación (pautas, planillas)
- Implementar sistema de rondas y turnos extra
- Configurar sistema de permisos y roles

---

## 🎯 RESUMEN DEL MODELO ACTUAL

### Tablas Principales Operativas ✅
- **Gestión de Personal:** guardias, usuarios
- **Gestión de Clientes:** clientes, instalaciones
- **Asignaciones:** asignaciones_guardias, puestos_por_cubrir
- **Documentos:** documentos_clientes (con archivos binarios)

### Tablas de Configuración ✅
- **Geografía:** regiones, ciudades, comunas
- **Catálogos:** bancos, isapres, afps, tipos_documentos
- **Operación:** roles_servicio, requisitos_puesto, puestos_operativos

### Tablas Pendientes de Implementación ⏳
- **Planificación:** pautas_diarias, pautas_mensuales, planificacion_mensual
- **Operaciones:** rondas, turnos_extra, turnos_extras
- **Gestión:** planillas, planillas_pago, usuarios_permisos, usuarios_roles
- **Documentos:** documentos, documentos_guardias, documentos_instalacion, documentos_usuarios, firmas
- **Alertas:** alertas_documentos

### Estado General
- **Base sólida:** 19 tablas con datos operativos
- **Estructura completa:** 35 tablas para funcionalidad completa
- **Necesita optimización:** Índices y normalización de nomenclatura
- **Listo para desarrollo:** Modelo de datos funcional para GardOps 