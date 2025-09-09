# 🛰️ Central de Monitoreo - GardOps

## Descripción General

El módulo **Central de Monitoreo** permite realizar un seguimiento nocturno automatizado de los guardias en turno activo a través de llamados telefónicos y WhatsApp. El sistema registra el estado de cada contacto y genera reportes detallados.

## Características Principales

### ✅ Funcionalidades Implementadas

- **Monitoreo Nocturno**: Ventana configurable (por defecto 21:00 - 07:00)
- **Cadencia Personalizable**: Intervalo de llamados configurable por instalación
- **Contacto Dual**: Llamados a teléfono de instalación o directamente a guardias
- **Estados de Llamado**: 6 estados predefinidos (exitoso, no contesta, ocupado, incidente, cancelado, pendiente)
- **Integración WhatsApp**: Botones directos para abrir WhatsApp con mensaje prellenado
- **Reportes en Tiempo Real**: KPIs y métricas actualizadas automáticamente
- **Exportación CSV**: Reportes detallados exportables
- **Auditoría Completa**: Logs de todas las acciones del sistema
- **Configuración por Instalación**: Cada instalación puede tener su propia configuración

### 🏗️ Arquitectura Técnica

#### Base de Datos (Nomenclatura `central_*`)

```sql
-- Configuración por instalación
central_config_instalacion
├── instalacion_id (FK)
├── habilitado (boolean)
├── intervalo_minutos (int)
├── ventana_inicio (time)
├── ventana_fin (time)
└── mensaje_template (text)

-- Agenda y resultados de llamados
central_llamados
├── instalacion_id (FK)
├── guardia_id (FK, opcional)
├── programado_para (timestamp)
├── ejecutado_en (timestamp)
├── estado (enum: pendiente|exitoso|no_contesta|ocupado|incidente|cancelado)
├── contacto_tipo (enum: instalacion|guardia)
├── contacto_telefono (text)
└── observaciones (text)

-- Incidentes detallados
central_incidentes
├── llamado_id (FK)
├── tipo (varchar)
├── severidad (enum: baja|media|alta|critica)
└── detalle (jsonb)

-- Logs de auditoría
central_logs
├── accion (text)
├── entidad_tipo (text)
├── entidad_id (uuid)
└── datos_anteriores/nuevos (jsonb)
```

#### Endpoints API

```
GET  /api/central-monitoring/config          # Listar configuraciones
POST /api/central-monitoring/config          # Guardar configuración
POST /api/central-monitoring/agenda/generar  # Generar agenda de llamados
GET  /api/central-monitoring/agenda          # Listar agenda
PATCH /api/central-monitoring/llamado/[id]   # Actualizar estado de llamado
GET  /api/central-monitoring/turnos-activos  # Obtener turnos activos
GET  /api/central-monitoring/export          # Exportar reportes CSV
```

#### Páginas UI

```
/central-monitoreo                    # Dashboard principal
/central-monitoreo/configuracion      # Configuración por instalación
```

### 🔐 Sistema de Permisos

#### Rol: "Central Monitoring Operator"

**Permisos incluidos:**
- `central_monitoring.view` - Ver Central de Monitoreo
- `central_monitoring.record` - Registrar estados de llamados  
- `central_monitoring.configure` - Configurar cadencia/ventanas
- `central_monitoring.export` - Exportar reportes

### 📱 Experiencia de Usuario

#### Dashboard Principal (`/central-monitoreo`)

1. **Header con KPIs**
   - Instalaciones activas
   - Llamados exitosos
   - Llamados pendientes
   - Incidentes registrados

2. **Turnos Activos por Instalación**
   - Lista de instalaciones con guardias en turno
   - Teléfonos de instalación y guardias
   - Botones directos para WhatsApp y llamadas
   - Información de roles y horarios

3. **Agenda de Llamados**
   - Lista cronológica de llamados programados
   - Estados visuales con badges
   - Botón "Marcar" para registrar resultados
   - Modal con opciones de estado y observaciones

#### Configuración (`/central-monitoreo/configuracion`)

- **Habilitar/Deshabilitar** monitoreo por instalación
- **Intervalo de llamados** (15-180 minutos)
- **Ventana de monitoreo** (hora inicio/fin)
- **Template de mensaje** con variables dinámicas

### 🔄 Flujo de Operación

1. **Configuración Inicial**
   - Configurar teléfonos en instalaciones
   - Establecer cadencia por instalación
   - Definir ventanas de monitoreo

2. **Generación de Agenda**
   - Ejecutar "Generar Agenda" para crear llamados
   - Sistema calcula horarios según configuración
   - Llamados se crean en estado "pendiente"

3. **Operación Nocturna**
   - Operador ve lista de instalaciones activas
   - Realiza contacto por WhatsApp o teléfono
   - Marca resultado con estado correspondiente
   - Agrega observaciones si es necesario

4. **Seguimiento y Reportes**
   - KPIs se actualizan en tiempo real
   - Exportar reportes CSV para análisis
   - Logs de auditoría disponibles

### 📊 Estados de Llamado

| Estado | Descripción | Color |
|--------|-------------|-------|
| ✅ Exitoso | Contacto exitoso, guardia operativo | Verde |
| ⏰ No contesta | No responde al llamado | Ámbar |
| ☎️ Ocupado | Teléfono ocupado | Azul |
| ⚠️ Incidente | Problema reportado | Rojo |
| ✖️ Cancelado | Llamado cancelado | Gris |
| ⏳ Pendiente | Aún no ejecutado | Gris claro |

### 🚀 Instalación y Configuración

#### 1. Ejecutar Migración SQL

```bash
# Ejecutar migración principal
psql $DATABASE_URL -f db/create-central-monitoring.sql

# Ejecutar permisos RBAC
psql $DATABASE_URL -f db/insert-central-monitoring-permissions.sql
```

#### 2. Configurar Teléfonos

```sql
-- Agregar teléfonos a instalaciones existentes
UPDATE instalaciones 
SET telefono = '+56912345678' 
WHERE id = 'uuid-instalacion';
```

#### 3. Asignar Rol a Usuario

```sql
-- Asignar rol a usuario específico
INSERT INTO usuarios_roles (usuario_id, rol_id)
SELECT u.id, r.id 
FROM usuarios u, roles r 
WHERE u.email = 'operador@empresa.com' 
  AND r.nombre = 'Central Monitoring Operator';
```

### 📈 Métricas y KPIs

#### KPIs Principales
- **Tasa de Contacto Exitoso**: % de llamados exitosos
- **Tiempo Promedio de Respuesta**: Minutos desde programado hasta ejecutado
- **Incidentes por Instalación**: Conteo de incidentes por instalación
- **Cobertura de Monitoreo**: % de instalaciones con monitoreo activo

#### Reportes Disponibles
- **Reporte Diario**: Resumen de llamados del día
- **Reporte Semanal**: KPIs agregados por semana
- **Reporte por Instalación**: Métricas específicas por instalación
- **Reporte de Incidentes**: Detalle de incidentes registrados

### 🔧 Mantenimiento

#### Limpieza de Datos

```sql
-- Limpiar llamados antiguos (más de 30 días)
DELETE FROM central_llamados 
WHERE programado_para < CURRENT_DATE - INTERVAL '30 days';

-- Limpiar logs antiguos (más de 90 días)
DELETE FROM central_logs 
WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
```

#### Monitoreo del Sistema

```sql
-- Verificar llamados pendientes
SELECT COUNT(*) as pendientes 
FROM central_llamados 
WHERE estado = 'pendiente' 
  AND programado_para < now();

-- Verificar configuraciones activas
SELECT COUNT(*) as activas 
FROM central_config_instalacion 
WHERE habilitado = true;
```

### 🐛 Troubleshooting

#### Problemas Comunes

1. **No aparecen turnos activos**
   - Verificar que exista pauta diaria para la fecha
   - Confirmar que guardias tengan teléfonos registrados
   - Revisar estados de pauta (trabajado, reemplazo, cubierto)

2. **No se generan llamados**
   - Verificar configuración habilitada por instalación
   - Confirmar ventanas de tiempo válidas
   - Revisar permisos del usuario

3. **Errores en WhatsApp**
   - Verificar formato de teléfonos (+56...)
   - Confirmar que números estén en formato internacional

### 🔮 Próximas Mejoras

- [ ] **Notificaciones Push**: Alertas en tiempo real
- [ ] **Integración SMS**: Envío automático de SMS
- [ ] **Escalación Automática**: Alertas a supervisores
- [ ] **Dashboard Avanzado**: Gráficos y métricas detalladas
- [ ] **API Externa**: Integración con sistemas de monitoreo externos
- [ ] **Geolocalización**: Verificación de ubicación de guardias

---

**Desarrollado para GardOps** - Sistema de Gestión de Guardias

