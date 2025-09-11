# 📋 Especificación de Estados de Turnos - GardOps

## 🎯 Objetivo

Este documento define la estructura y lógica de estados para el sistema de turnos de GardOps, separando claramente los conceptos de tipo de turno, estado del puesto, estado del guardia y tipo de cobertura.

## 🏗️ Arquitectura de Estados

### 1. **TIPO DE TURNO** (Qué tipo de día es)
- `planificado` - Turno planificado en pauta mensual
- `libre` - Día libre del guardia

### 2. **ESTADO DEL PUESTO** (Qué pasó con ese puesto ese día)
- `asignado` - Puesto tiene guardia asignado
- `ppc` - Puesto Por Cubrir (sin guardia asignado)
- `libre` - Puesto libre (no se trabaja)

### 3. **ESTADO DEL GUARDIA** (Qué pasó con el guardia asignado)
**IMPORTANTE**: Solo aplica si hay guardia asignado (`estado_puesto = 'asignado'`)
- `asistido` - Guardia asistió
- `falta` - Guardia no asistió
- `permiso` - Guardia con permiso
- `vacaciones` - Guardia en vacaciones
- `licencia` - Guardia con licencia

### 4. **TIPO DE COBERTURA** (Cómo se cubrió el puesto)
**IMPORTANTE**: Solo aplica si hay guardia asignado (`estado_puesto = 'asignado'`)
- `sin_cobertura` - No hubo cobertura
- `guardia_asignado` - Lo cubrió el guardia asignado (asistió normalmente)
- `turno_extra` - Lo cubrió un turno extra

## 🗄️ Estructura de Base de Datos

### Tabla Principal: `as_turnos_pauta_mensual`

```sql
CREATE TABLE as_turnos_pauta_mensual (
  id BIGINT PRIMARY KEY,
  puesto_id UUID,
  guardia_id UUID, -- Guardia titular (puede ser NULL para PPC)
  fecha DATE,
  
  -- TIPO DE TURNO (qué tipo de día es)
  tipo_turno TEXT CHECK (tipo_turno IN ('planificado', 'libre')),
  
  -- ESTADO DEL PUESTO (qué pasó con el puesto)
  estado_puesto TEXT CHECK (estado_puesto IN (
    'asignado', 'ppc', 'libre'
  )),
  
  -- ESTADO DEL GUARDIA (qué pasó con el guardia asignado - SOLO si hay guardia asignado)
  estado_guardia TEXT CHECK (estado_guardia IN (
    'asistido', 'falta', 'permiso', 'vacaciones', 'licencia'
  )),
  
  -- TIPO DE COBERTURA (cómo se cubrió el puesto - SOLO si hay guardia asignado)
  tipo_cobertura TEXT CHECK (tipo_cobertura IN (
    'sin_cobertura', 'guardia_asignado', 'turno_extra'
  )),
  
  -- Guardia que trabajó (titular o cobertura)
  guardia_trabajo_id UUID,
  
  -- Metadatos
  meta JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Tabla de Turnos Extras: `TE_turnos_extras`

```sql
CREATE TABLE TE_turnos_extras (
  id UUID PRIMARY KEY,
  pauta_id BIGINT REFERENCES as_turnos_pauta_mensual(id),
  guardia_id UUID REFERENCES guardias(id),
  tipo TEXT CHECK (tipo IN ('reemplazo', 'ppc')), -- Solo para auditoría
  valor NUMERIC,
  created_at TIMESTAMP
);
```

## 🎨 Estados para Frontend

### Estados de Visualización (Pauta Mensual y Diaria)

| Estado | Icono | Color | Descripción |
|--------|-------|-------|-------------|
| `planificado` | ● | Azul | Aún no ejecutado |
| `asistido` | ✓ | Verde | Guardia asistió |
| `turno_extra` | TE | Morado | Hubo turno extra |
| `sin_cobertura` | ✗ | Rojo | No hubo cobertura |
| `libre` | ○ | Gris | Día libre |

## 🔄 Lógica de Mapeo

### Función de Mapeo a Estado UI

```typescript
function mapearAEstadoUI(
  tipo_turno: string, 
  estado_puesto: string, 
  estado_guardia: string, 
  tipo_cobertura: string
): string {
  // Si es día libre
  if (tipo_turno === 'libre') return 'libre';
  
  // Si no se ha ejecutado
  if (!estado_puesto) return 'planificado';
  
  // Si el puesto es libre
  if (estado_puesto === 'libre') return 'libre';
  
  // Si el puesto es PPC
  if (estado_puesto === 'ppc') {
    // Si hubo turno extra
    if (tipo_cobertura === 'turno_extra') {
      return 'turno_extra';
    }
    // Si no hubo cobertura
    return 'sin_cobertura';
  }
  
  // Si el puesto tiene guardia asignado
  if (estado_puesto === 'asignado') {
    // Si hubo turno extra
    if (tipo_cobertura === 'turno_extra') {
      return 'turno_extra';
    }
    // Si no hubo cobertura
    if (tipo_cobertura === 'sin_cobertura') {
      return 'sin_cobertura';
    }
    // Si lo cubrió el guardia asignado
    if (tipo_cobertura === 'guardia_asignado') {
      return 'asistido';
    }
  }
  
  return 'planificado';
}
```

## 📝 Casos de Uso

### Caso 1: Guardia Normal Asiste
```yaml
tipo_turno: 'planificado'
estado_puesto: 'asignado'
estado_guardia: 'asistido'
tipo_cobertura: 'guardia_asignado'
Resultado UI: 'asistido' (✓ verde)
```

### Caso 2: Guardia Hace Turno Extra (Reemplazo)
```yaml
tipo_turno: 'planificado'
estado_puesto: 'asignado'
estado_guardia: 'falta'  # El titular faltó
tipo_cobertura: 'turno_extra'
Resultado UI: 'turno_extra' (TE morado)
```

### Caso 3: PPC Cubierto con Turno Extra
```yaml
tipo_turno: 'planificado'
estado_puesto: 'ppc'
estado_guardia: null  # No hay guardia asignado
tipo_cobertura: 'turno_extra'
Resultado UI: 'turno_extra' (TE morado)
```

### Caso 4: Falta Sin Cobertura
```yaml
tipo_turno: 'planificado'
estado_puesto: 'asignado'
estado_guardia: 'falta'
tipo_cobertura: 'sin_cobertura'
Resultado UI: 'sin_cobertura' (✗ rojo)
```

### Caso 5: PPC Sin Cobertura
```yaml
tipo_turno: 'planificado'
estado_puesto: 'ppc'
estado_guardia: null  # No hay guardia asignado
tipo_cobertura: 'sin_cobertura'
Resultado UI: 'sin_cobertura' (✗ rojo)
```

### Caso 6: Día Libre
```yaml
tipo_turno: 'libre'
estado_puesto: 'libre'
estado_guardia: null  # No hay guardia asignado
tipo_cobertura: null  # No hay cobertura
Resultado UI: 'libre' (○ gris)
```

## ⚠️ Reglas de Validación

### Regla 1: Día Libre
- Si `tipo_turno = 'libre'` → No puede haber `estado_guardia` ni `tipo_cobertura`

### Regla 2: PPC
- Si `estado_puesto = 'ppc'` → No puede haber `estado_guardia` (no hay guardia asignado)

### Regla 3: Puesto Asignado
- Si `estado_puesto = 'asignado'` → Debe haber `estado_guardia` y `tipo_cobertura`

### Regla 4: Consistencia de Estados
- Los estados de frontend son los mismos para pauta mensual y diaria
- La diferencia está en la ejecución: mensual = planificación, diaria = ejecución

## 🔍 Diferencias Clave

### Reemplazo vs PPC
- **REEMPLAZO**: Guardia titular faltó, otro guardia hizo turno extra
- **PPC**: No había guardia titular, otro guardia hizo turno extra
- **RESULTADO**: Ambos son `tipo_cobertura = 'turno_extra'` en la UI

### Pauta Mensual vs Pauta Diaria
- **PAUTA MENSUAL**: Muestra la planificación (estados iniciales)
- **PAUTA DIARIA**: Muestra la ejecución (estados finales)
- **UI**: Mismos estados de visualización para ambas

## 📊 Tabla de Transiciones

| Estado Inicial | Acción | Estado Final | UI Resultante |
|----------------|--------|--------------|---------------|
| `planificado` | Guardia asiste | `asistido` | ✓ Verde |
| `planificado` | Guardia falta | `falta` | ✗ Rojo |
| `planificado` | Se asigna turno extra | `turno_extra` | TE Morado |
| `ppc` | Se asigna turno extra | `turno_extra` | TE Morado |
| `ppc` | Sin cobertura | `sin_cobertura` | ✗ Rojo |

## 🚀 Implementación

### Fase 1: Migración de Datos
1. Crear nuevas columnas en `as_turnos_pauta_mensual`
2. Migrar datos existentes según la nueva lógica
3. Validar consistencia de datos

### Fase 2: Actualización de Vistas
1. Actualizar `as_turnos_v_pauta_diaria_unificada`
2. Implementar nueva lógica de mapeo
3. Actualizar funciones de resolución de estados

### Fase 3: Frontend
1. Actualizar componentes de pauta mensual
2. Actualizar componentes de pauta diaria
3. Implementar nueva lógica de `canUndo`

### Fase 4: APIs
1. Actualizar endpoints de creación de turnos extras
2. Actualizar función `fn_deshacer`
3. Implementar validaciones de consistencia

---

**Versión**: 1.0  
**Fecha**: 2025-01-11  
**Autor**: Sistema GardOps  
**Estado**: Propuesta

