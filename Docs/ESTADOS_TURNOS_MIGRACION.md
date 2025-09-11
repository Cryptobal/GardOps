# 🔄 Plan de Migración - Estados de Turnos

## 🎯 Objetivo

Migrar el sistema actual de estados de turnos a la nueva estructura definida en `ESTADOS_TURNOS_ESPECIFICACION.md`.

## 📊 Estado Actual vs Estado Objetivo

### Estado Actual (Problemático)
```sql
-- Tabla actual
as_turnos_pauta_mensual (
  estado TEXT,           -- Mezcla conceptos
  estado_ui TEXT,        -- Valores duplicados y contradictorios
  meta JSONB            -- Información dispersa
)
```

### Estado Objetivo (Nuevo)
```sql
-- Tabla nueva
as_turnos_pauta_mensual (
  tipo_turno TEXT,       -- 'planificado' | 'libre'
  estado_puesto TEXT,    -- 'asignado' | 'ppc' | 'libre'
  estado_guardia TEXT,   -- 'asistido' | 'falta' | 'permiso' | 'vacaciones' | 'licencia'
  tipo_cobertura TEXT,   -- 'sin_cobertura' | 'guardia_asignado' | 'turno_extra'
  guardia_trabajo_id UUID,
  meta JSONB
)
```

## 🗺️ Mapeo de Migración

### Mapeo de `estado` → `tipo_turno` + `estado_puesto`

| Estado Actual | Tipo Turno | Estado Puesto |
|---------------|------------|---------------|
| `planificado` | `planificado` | `asignado` |
| `libre` | `libre` | `libre` |
| `trabajado` | `planificado` | `asignado` |
| `reemplazo` | `planificado` | `asignado` |
| `inasistencia` | `planificado` | `asignado` |
| `permiso` | `planificado` | `asignado` |
| `vacaciones` | `planificado` | `asignado` |
| `licencia` | `planificado` | `asignado` |

### Mapeo de `estado` → `estado_guardia`

| Estado Actual | Estado Guardia |
|---------------|----------------|
| `trabajado` | `asistido` |
| `reemplazo` | `falta` |
| `inasistencia` | `falta` |
| `permiso` | `permiso` |
| `vacaciones` | `vacaciones` |
| `licencia` | `licencia` |

### Mapeo de `estado_ui` + `meta` → `tipo_cobertura`

| Estado UI Actual | Meta | Tipo Cobertura |
|------------------|------|----------------|
| `asistido` | Sin cobertura | `guardia_asignado` |
| `reemplazo` | Con cobertura | `turno_extra` |
| `extra` | Con cobertura | `turno_extra` |
| `te` | Con cobertura | `turno_extra` |
| `turno_extra` | Con cobertura | `turno_extra` |
| `sin_cobertura` | Sin cobertura | `sin_cobertura` |
| `inasistencia` | Sin cobertura | `sin_cobertura` |

## 📋 Scripts de Migración

### Script 1: Agregar Nuevas Columnas

```sql
-- Agregar nuevas columnas
ALTER TABLE as_turnos_pauta_mensual 
ADD COLUMN IF NOT EXISTS tipo_turno TEXT,
ADD COLUMN IF NOT EXISTS estado_puesto TEXT,
ADD COLUMN IF NOT EXISTS estado_guardia TEXT,
ADD COLUMN IF NOT EXISTS tipo_cobertura TEXT,
ADD COLUMN IF NOT EXISTS guardia_trabajo_id UUID;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_pauta_tipo_turno ON as_turnos_pauta_mensual(tipo_turno);
CREATE INDEX IF NOT EXISTS idx_pauta_estado_puesto ON as_turnos_pauta_mensual(estado_puesto);
CREATE INDEX IF NOT EXISTS idx_pauta_estado_guardia ON as_turnos_pauta_mensual(estado_guardia);
CREATE INDEX IF NOT EXISTS idx_pauta_tipo_cobertura ON as_turnos_pauta_mensual(tipo_cobertura);
```

### Script 2: Migrar Datos Existentes

```sql
-- Migrar datos existentes
UPDATE as_turnos_pauta_mensual 
SET 
  tipo_turno = CASE 
    WHEN estado = 'libre' THEN 'libre'
    ELSE 'planificado'
  END,
  
  estado_puesto = CASE 
    WHEN estado = 'libre' THEN 'libre'
    WHEN guardia_id IS NULL THEN 'ppc'
    ELSE 'asignado'
  END,
  
  estado_guardia = CASE 
    WHEN estado = 'trabajado' THEN 'asistido'
    WHEN estado = 'reemplazo' THEN 'falta'
    WHEN estado = 'inasistencia' THEN 'falta'
    WHEN estado = 'permiso' THEN 'permiso'
    WHEN estado = 'vacaciones' THEN 'vacaciones'
    WHEN estado = 'licencia' THEN 'licencia'
    ELSE NULL
  END,
  
  tipo_cobertura = CASE 
    WHEN estado_ui = 'asistido' AND (meta->>'cobertura_guardia_id' IS NULL) THEN 'guardia_asignado'
    WHEN estado_ui IN ('reemplazo', 'extra', 'te', 'turno_extra') OR (meta->>'cobertura_guardia_id' IS NOT NULL) THEN 'turno_extra'
    WHEN estado_ui IN ('sin_cobertura', 'inasistencia') THEN 'sin_cobertura'
    ELSE NULL
  END,
  
  guardia_trabajo_id = CASE 
    WHEN meta->>'cobertura_guardia_id' IS NOT NULL THEN (meta->>'cobertura_guardia_id')::UUID
    ELSE guardia_id
  END
WHERE tipo_turno IS NULL;
```

### Script 3: Validar Migración

```sql
-- Validar migración
SELECT 
  'Total registros' as tipo,
  COUNT(*) as cantidad
FROM as_turnos_pauta_mensual
UNION ALL
SELECT 
  'Con tipo_turno' as tipo,
  COUNT(*) as cantidad
FROM as_turnos_pauta_mensual
WHERE tipo_turno IS NOT NULL
UNION ALL
SELECT 
  'Con estado_puesto' as tipo,
  COUNT(*) as cantidad
FROM as_turnos_pauta_mensual
WHERE estado_puesto IS NOT NULL
UNION ALL
SELECT 
  'Con estado_guardia' as tipo,
  COUNT(*) as cantidad
FROM as_turnos_pauta_mensual
WHERE estado_guardia IS NOT NULL
UNION ALL
SELECT 
  'Con tipo_cobertura' as tipo,
  COUNT(*) as cantidad
FROM as_turnos_pauta_mensual
WHERE tipo_cobertura IS NOT NULL;
```

## 🔧 Actualización de Vistas

### Vista: `as_turnos_v_pauta_diaria_unificada`

```sql
-- Actualizar vista con nueva lógica
CREATE OR REPLACE VIEW as_turnos_v_pauta_diaria_unificada AS
SELECT 
  pd.pauta_id,
  pd.fecha::text,
  pd.puesto_id::text,
  pd.puesto_nombre,
  pd.instalacion_id::text,
  pd.instalacion_nombre,
  pd.instalacion_telefono,
  
  -- Estado UI usando nueva lógica
  CASE 
    WHEN pd.tipo_turno = 'libre' THEN 'libre'
    WHEN pd.estado_puesto IS NULL THEN 'planificado'
    WHEN pd.estado_puesto = 'libre' THEN 'libre'
    WHEN pd.estado_puesto = 'ppc' AND pd.tipo_cobertura = 'turno_extra' THEN 'extra'
    WHEN pd.estado_puesto = 'ppc' AND pd.tipo_cobertura = 'sin_cobertura' THEN 'sin_cobertura'
    WHEN pd.estado_puesto = 'asignado' AND pd.tipo_cobertura = 'turno_extra' THEN 'extra'
    WHEN pd.estado_puesto = 'asignado' AND pd.tipo_cobertura = 'sin_cobertura' THEN 'sin_cobertura'
    WHEN pd.estado_puesto = 'asignado' AND pd.tipo_cobertura = 'guardia_asignado' THEN 'asistido'
    ELSE 'planificado'
  END as estado_ui,
  
  -- Resto de campos...
  pd.guardia_trabajo_id::text,
  pd.guardia_trabajo_nombre,
  -- ... otros campos
FROM as_turnos_pauta_mensual pd
-- ... resto de la vista
```

## 🚀 Plan de Implementación

### Fase 1: Preparación (1-2 días)
- [ ] Crear documentación completa
- [ ] Preparar scripts de migración
- [ ] Crear backup de datos existentes
- [ ] Validar scripts en ambiente de desarrollo

### Fase 2: Migración de Base de Datos (1 día)
- [ ] Ejecutar Script 1: Agregar nuevas columnas
- [ ] Ejecutar Script 2: Migrar datos existentes
- [ ] Ejecutar Script 3: Validar migración
- [ ] Crear nuevas vistas y funciones

### Fase 3: Actualización de Backend (2-3 días)
- [ ] Actualizar APIs de pauta mensual
- [ ] Actualizar APIs de pauta diaria
- [ ] Actualizar función `fn_deshacer`
- [ ] Actualizar funciones de turnos extras

### Fase 4: Actualización de Frontend (2-3 días)
- [ ] Actualizar componentes de pauta mensual
- [ ] Actualizar componentes de pauta diaria
- [ ] Actualizar lógica de `canUndo`
- [ ] Actualizar función `renderEstado`

### Fase 5: Testing y Validación (2-3 días)
- [ ] Pruebas unitarias
- [ ] Pruebas de integración
- [ ] Pruebas de regresión
- [ ] Validación con datos reales

### Fase 6: Despliegue (1 día)
- [ ] Despliegue en staging
- [ ] Pruebas de aceptación
- [ ] Despliegue en producción
- [ ] Monitoreo post-despliegue

## ⚠️ Riesgos y Mitigaciones

### Riesgo 1: Pérdida de Datos
**Mitigación**: Backup completo antes de migración

### Riesgo 2: Inconsistencias en Migración
**Mitigación**: Scripts de validación exhaustivos

### Riesgo 3: Problemas de Performance
**Mitigación**: Índices optimizados y monitoreo

### Riesgo 4: Regresiones en Frontend
**Mitigación**: Pruebas exhaustivas y rollback plan

## 📊 Métricas de Éxito

- [ ] 100% de registros migrados correctamente
- [ ] 0 errores en validación de datos
- [ ] Performance igual o mejor que antes
- [ ] Todas las funcionalidades existentes funcionando
- [ ] Nuevos casos de uso funcionando correctamente

## 🔄 Rollback Plan

En caso de problemas:

1. **Rollback de Base de Datos**: Restaurar backup
2. **Rollback de Código**: Revertir commits
3. **Rollback de Frontend**: Revertir deployment
4. **Comunicación**: Notificar a usuarios

---

**Versión**: 1.0  
**Fecha**: 2025-01-11  
**Autor**: Sistema GardOps  
**Estado**: Plan de Migración

