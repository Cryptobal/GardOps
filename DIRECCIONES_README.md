# GardOps - Sistema de Gestión de Guardias

Sistema profesional para la gestión completa de guardias de seguridad, instalaciones y operaciones diarias.

## 🚀 Sistema de Gestión Diaria Implementado

### ✅ Tablas Principales Creadas

#### 1. **pautas_diarias** - Control de Asistencia Diaria
```sql
- id: UUID PRIMARY KEY
- tenant_id: Referencia a tenant
- pauta_mensual_id: Vinculada a pauta mensual
- fecha: DATE NOT NULL
- guardia_asignado_id: Guardia asignado al turno
- estado: ('asistio', 'licencia', 'falta_aviso', 'permiso', 'libre', 'ppc', 'cobertura')
- cobertura_por_id: Guardia que hace la cobertura (si aplica)
- observacion: Notas adicionales
- creado_en: TIMESTAMP
```

#### 2. **puestos_por_cubrir** - Gestión de PPC Operativos
```sql
- id: UUID PRIMARY KEY
- tenant_id: Referencia a tenant
- pauta_diaria_id: Vinculada a pauta diaria
- instalacion_id: Instalación afectada
- rol_servicio_id: Rol de servicio requerido
- motivo: ('falta_aviso', 'licencia', 'permiso', 'inasistencia')
- observacion: Detalles del PPC
- creado_en: TIMESTAMP
```

#### 3. **turnos_extras** - Turnos Adicionales y Coberturas
```sql
- id: UUID PRIMARY KEY
- tenant_id: Referencia a tenant
- pauta_diaria_id: Vinculada a pauta diaria
- guardia_id: Guardia que realiza el turno extra
- instalacion_origen_id: Instalación de origen
- instalacion_destino_id: Instalación de destino
- tipo: ('cobertura', 'refuerzo', 'emergencia')
- aprobado_por: Responsable que aprueba
- observacion: Detalles del turno extra
- creado_en: TIMESTAMP
```

### 🔧 Características Implementadas

#### ✅ **Arquitectura Multi-Tenant**
- Todas las tablas incluyen `tenant_id` para separación de datos
- Referencias seguras con `ON DELETE CASCADE` y `ON DELETE SET NULL`
- Compatibilidad completa con múltiples empresas

#### ✅ **Índices Optimizados**
- **Por Tenant**: Consultas rápidas por empresa
- **Por Fecha**: Búsquedas eficientes por períodos
- **Por Estado**: Filtrado rápido por tipo de asistencia
- **Por Tipo**: Clasificación de turnos extras
- **Por Instalación**: Consultas por ubicación

#### ✅ **Validaciones de Datos**
- CHECK constraints para estados válidos
- Referencias de integridad entre tablas
- Campos obligatorios y opcionales bien definidos

### 🚀 Scripts de Migración Disponibles

```bash
# Migración completa del sistema
npm run migrate

# Solo crear tabla pautas_diarias
npm run create-pautas-diarias

# Solo crear tablas PPC y turnos extras
npm run create-ppc-turnos

# Testing via API
npm run migrate:test
```

### 📊 Beneficios del Sistema

#### **Gestión Operativa Completa**
- ✅ Control diario de asistencia de guardias
- ✅ Gestión automática de puestos por cubrir (PPC)
- ✅ Registro de turnos extras y coberturas
- ✅ Trazabilidad completa de cambios

#### **Optimización de Consultas**
- ✅ Índices estratégicos para consultas rápidas
- ✅ Relaciones eficientes entre tablas
- ✅ Búsquedas optimizadas por fecha, estado y tipo

#### **Flexibilidad Operativa**
- ✅ Manejo de múltiples tipos de ausencias
- ✅ Sistema de coberturas entre guardias
- ✅ Gestión de turnos de emergencia y refuerzo
- ✅ Observaciones y notas para cada registro

#### **Integridad de Datos**
- ✅ Referencias de clave foránea seguras
- ✅ Validaciones a nivel de base de datos
- ✅ Consistencia multi-tenant garantizada

### 🔒 Seguridad y Mantenimiento

- **Separación por Tenant**: Cada empresa ve solo sus datos
- **Auditoría Completa**: Timestamps de creación en todas las tablas
- **Respaldos Seguros**: Políticas de DELETE bien definidas
- **Escalabilidad**: Diseño preparado para crecimiento

---

## 🌟 Sistema Listo para Producción

El sistema de gestión diaria está completamente implementado y listo para gestionar:

1. **Asistencia Diaria** → Control preciso de guardias
2. **Puestos por Cubrir** → Gestión de ausencias y PPC
3. **Turnos Extras** → Coberturas y refuerzos operativos
4. **Reporting Avanzado** → Datos estructurados para reportes

**✅ Todas las tablas creadas con éxito. Sistema operativo y de pagos listo.** 