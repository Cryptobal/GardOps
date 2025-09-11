# 🔍 ANÁLISIS 360° - CAMBIO DE ESTRUCTURA DE ESTADOS DE TURNOS

## 📋 RESUMEN EJECUTIVO

Se ha realizado un análisis exhaustivo de **todos los módulos** que podrían verse afectados por el cambio de estructura de estados de turnos. El cambio propuesto es **CRÍTICO** y afectará **8 módulos principales** del sistema.

---

## 🚨 IMPACTO CRÍTICO IDENTIFICADO

### **MÓDULOS DIRECTAMENTE AFECTADOS (8)**

| Módulo | Impacto | Archivos Afectados | Riesgo |
|--------|---------|-------------------|--------|
| **Pauta Mensual** | 🔴 CRÍTICO | 15+ archivos | Alto |
| **Pauta Diaria** | 🔴 CRÍTICO | 12+ archivos | Alto |
| **Turnos Extras** | 🔴 CRÍTICO | 8+ archivos | Alto |
| **Funciones DB** | 🔴 CRÍTICO | 6+ funciones | Alto |
| **Planillas/Sueldos** | 🟡 MEDIO | 5+ archivos | Medio |
| **Reportes** | 🟡 MEDIO | 10+ archivos | Medio |
| **Logs/Auditoría** | 🟡 MEDIO | 3+ archivos | Medio |
| **Exportaciones** | 🟡 MEDIO | 8+ archivos | Medio |

---

## 📊 ANÁLISIS DETALLADO POR MÓDULO

### 1. **PAUTA MENSUAL** 🔴 CRÍTICO

#### **Archivos Afectados:**
- `src/app/api/pauta-mensual/route.ts` - Lógica de mapeo de estados
- `src/app/api/pauta-mensual/guardar/route.ts` - Guardado de estados
- `src/app/pauta-mensual/components/PautaTable.tsx` - Renderizado de estados
- `src/app/pauta-mensual/components/PautaTableMobile.tsx` - Renderizado móvil
- `src/app/pauta-mensual/[id]/page.tsx` - Lógica principal

#### **Cambios Requeridos:**
```typescript
// ANTES (problemático)
function mapearEstadoOperacionALegacy(estado: string): string {
  switch (estado) {
    case 'asistido': return 'A';
    case 'reemplazo': return 'R';
    case 'sin_cobertura': return 'S';
    // ... lógica inconsistente
  }
}

// DESPUÉS (nuevo)
function mapearEstadoOperacionALegacy(estado: EstadoTurno): string {
  const estadoUI = mapearAEstadoUI(estado);
  switch (estadoUI.estado) {
    case 'asistido': return 'A';
    case 'turno_extra': return 'R';
    case 'sin_cobertura': return 'S';
    // ... lógica consistente
  }
}
```

#### **Riesgos:**
- **Alto**: Pauta mensual podría mostrar estados incorrectos
- **Alto**: Planificación mensual podría fallar
- **Medio**: Exportaciones PDF/Excel podrían fallar

---

### 2. **PAUTA DIARIA** 🔴 CRÍTICO

#### **Archivos Afectados:**
- `src/app/pauta-diaria-v2/ClientTable.tsx` - Lógica principal
- `src/app/api/pauta-diaria/route.ts` - API de datos
- `src/app/pauta-diaria/[fecha]/page.tsx` - Página principal
- `db/create-pauta-diaria-view-unificada.sql` - Vista de BD

#### **Cambios Requeridos:**
```typescript
// ANTES (problemático)
const renderEstado = (row: PautaRow) => {
  if (estadoUI === 'extra' || estadoUI === 'reemplazo') {
    return <span className="text-fuchsia-600">TE</span>;
  }
  // ... lógica inconsistente
};

// DESPUÉS (nuevo)
const renderEstado = (row: PautaRow) => {
  const estado = mapearAEstadoUI(row);
  return <span className={estado.color}>{estado.icono}</span>;
};
```

#### **Riesgos:**
- **Alto**: Estados incorrectos en pauta diaria
- **Alto**: Botón "Deshacer" podría no funcionar
- **Alto**: Turnos extras podrían no mostrarse correctamente

---

### 3. **TURNOS EXTRAS** 🔴 CRÍTICO

#### **Archivos Afectados:**
- `src/app/api/pauta-diaria/turno-extra/route.ts` - API principal
- `src/app/pauta-diaria/turnos-extras/page.tsx` - Página principal
- `src/app/guardias/[id]/components/TurnosExtrasGuardia.tsx` - Componente
- `db/create-turnos-extras-table.sql` - Estructura de BD

#### **Cambios Requeridos:**
```typescript
// ANTES (problemático)
// Múltiples tablas: TE_turnos_extras, turnos_extras
// Estados inconsistentes: 'reemplazo', 'ppc', 'extra'

// DESPUÉS (nuevo)
// Una tabla: TE_turnos_extras
// Estados consistentes: 'turno_extra' para ambos casos
```

#### **Riesgos:**
- **Alto**: Cálculo de valores incorrecto
- **Alto**: Reportes de turnos extras incorrectos
- **Medio**: Exportaciones CSV podrían fallar

---

### 4. **FUNCIONES DE BASE DE DATOS** 🔴 CRÍTICO

#### **Funciones Afectadas:**
- `as_turnos.fn_deshacer` - Revertir turnos
- `as_turnos.fn_marcar_extra` - Marcar turnos extras
- `as_turnos.fn_registrar_reemplazo` - Registrar reemplazos

#### **Cambios Requeridos:**
```sql
-- ANTES (problemático)
CREATE OR REPLACE FUNCTION as_turnos.fn_deshacer(
    p_pauta_id bigint,
    p_actor_ref text
) RETURNS TABLE (
    ok boolean,
    pauta_id bigint,
    estado text
) AS $$
BEGIN
    UPDATE as_turnos_pauta_mensual
    SET estado = 'planificado',
        estado_ui = 'plan'
    WHERE id = p_pauta_id;
    -- NO elimina TE_turnos_extras
END;
$$;

-- DESPUÉS (nuevo)
CREATE OR REPLACE FUNCTION as_turnos.fn_deshacer(
    p_pauta_id bigint,
    p_actor_ref text
) RETURNS TABLE (
    ok boolean,
    pauta_id bigint,
    estado text
) AS $$
BEGIN
    UPDATE as_turnos_pauta_mensual
    SET tipo_turno = 'planificado',
        estado_puesto = 'asignado',
        estado_guardia = NULL,
        tipo_cobertura = NULL
    WHERE id = p_pauta_id;
    
    -- ELIMINAR turnos extras relacionados
    DELETE FROM TE_turnos_extras WHERE pauta_id = p_pauta_id;
END;
$$;
```

#### **Riesgos:**
- **Alto**: Función deshacer podría no funcionar
- **Alto**: Turnos extras podrían quedar "fantasma"
- **Alto**: Inconsistencias en base de datos

---

### 5. **PLANILLAS/SUELDOS** 🟡 MEDIO

#### **Archivos Afectados:**
- `src/lib/sueldo/integracion/planillas.ts` - Cálculo de sueldos
- `src/app/api/sueldos/planilla/route.ts` - API de planillas
- `src/lib/sueldo/calcularSueldo.ts` - Lógica de cálculo

#### **Cambios Requeridos:**
```typescript
// ANTES (problemático)
async function calcularTurnosExtrasMes(guardiaId: number, mes: number, anio: number) {
  // Consulta a múltiples tablas con estados inconsistentes
  const query = `
    SELECT * FROM TE_turnos_extras te
    LEFT JOIN as_turnos_pauta_mensual pm ON te.pauta_id = pm.id
    WHERE te.guardia_id = $1 
    AND pm.estado IN ('reemplazo', 'trabajado')
  `;
}

// DESPUÉS (nuevo)
async function calcularTurnosExtrasMes(guardiaId: number, mes: number, anio: number) {
  // Consulta consistente con nueva estructura
  const query = `
    SELECT * FROM TE_turnos_extras te
    LEFT JOIN as_turnos_pauta_mensual pm ON te.pauta_id = pm.id
    WHERE te.guardia_id = $1 
    AND pm.tipo_cobertura = 'turno_extra'
  `;
}
```

#### **Riesgos:**
- **Medio**: Cálculo de sueldos incorrecto
- **Medio**: Planillas con valores incorrectos
- **Bajo**: Reportes de nómina incorrectos

---

### 6. **REPORTES Y EXPORTACIONES** 🟡 MEDIO

#### **Archivos Afectados:**
- `src/lib/export-utils.ts` - Utilidades de exportación
- `src/app/api/pauta-mensual/exportar-xlsx/route.ts` - Exportación Excel
- `src/app/api/pauta-diaria/turno-extra/exportar/route.ts` - Exportación CSV

#### **Cambios Requeridos:**
```typescript
// ANTES (problemático)
const estadisticas = {
  asignados: puestos.filter(p => p.estado === 'planificado').length,
  trabajados: puestos.filter(p => p.estado === 'trabajado').length,
  reemplazos: puestos.filter(p => p.estado === 'reemplazo').length,
  sin_cobertura: puestos.filter(p => p.estado === 'sin_cobertura').length
};

// DESPUÉS (nuevo)
const estadisticas = {
  planificados: puestos.filter(p => p.tipo_turno === 'planificado' && !p.estado_puesto).length,
  asistidos: puestos.filter(p => p.tipo_cobertura === 'guardia_asignado').length,
  turnos_extras: puestos.filter(p => p.tipo_cobertura === 'turno_extra').length,
  sin_cobertura: puestos.filter(p => p.tipo_cobertura === 'sin_cobertura').length
};
```

#### **Riesgos:**
- **Medio**: Reportes con estadísticas incorrectas
- **Medio**: Exportaciones con datos incorrectos
- **Bajo**: Dashboards con métricas incorrectas

---

### 7. **LOGS Y AUDITORÍA** 🟡 MEDIO

#### **Archivos Afectados:**
- `src/lib/logging.ts` - Sistema de logs
- `src/app/api/logs/route.ts` - API de logs
- `db/logs.sql` - Estructura de logs

#### **Cambios Requeridos:**
```typescript
// ANTES (problemático)
await logEvent('pauta_mensual', pautaId, 'estado_cambiado', usuario, {
  estado_anterior: 'planificado',
  estado_nuevo: 'reemplazo'
});

// DESPUÉS (nuevo)
await logEvent('pauta_mensual', pautaId, 'estado_cambiado', usuario, {
  tipo_turno_anterior: 'planificado',
  tipo_turno_nuevo: 'planificado',
  estado_puesto_anterior: 'asignado',
  estado_puesto_nuevo: 'asignado',
  estado_guardia_anterior: null,
  estado_guardia_nuevo: 'falta',
  tipo_cobertura_anterior: null,
  tipo_cobertura_nuevo: 'turno_extra'
});
```

#### **Riesgos:**
- **Medio**: Logs con información incompleta
- **Medio**: Auditoría con datos inconsistentes
- **Bajo**: Trazabilidad limitada

---

## ⚠️ RIESGOS CRÍTICOS IDENTIFICADOS

### **RIESGO 1: INCONSISTENCIA DE DATOS** 🔴
- **Descripción**: Estados antiguos y nuevos coexistiendo
- **Impacto**: Datos incorrectos en toda la aplicación
- **Mitigación**: Migración completa y validación exhaustiva

### **RIESGO 2: FUNCIONES DB ROTAS** 🔴
- **Descripción**: Funciones que no manejan nueva estructura
- **Impacto**: Operaciones críticas fallando
- **Mitigación**: Actualizar todas las funciones antes del despliegue

### **RIESGO 3: FRONTEND INCONSISTENTE** 🔴
- **Descripción**: Componentes mostrando estados incorrectos
- **Impacto**: Usuarios viendo información incorrecta
- **Mitigación**: Actualizar todos los componentes de frontend

### **RIESGO 4: TURNOS EXTRAS FANTASMA** 🔴
- **Descripción**: Registros en TE_turnos_extras sin limpiar
- **Impacto**: Cálculos de sueldos incorrectos
- **Mitigación**: Función deshacer que limpie ambas tablas

---

## 🛠️ PLAN DE MIGRACIÓN RECOMENDADO

### **FASE 1: PREPARACIÓN (2-3 días)**
1. **Backup completo** de base de datos
2. **Crear scripts de migración** con rollback
3. **Validar scripts** en ambiente de desarrollo
4. **Documentar todos los cambios** requeridos

### **FASE 2: BASE DE DATOS (1-2 días)**
1. **Agregar nuevas columnas** a `as_turnos_pauta_mensual`
2. **Migrar datos existentes** según nueva lógica
3. **Actualizar vistas** de base de datos
4. **Actualizar funciones** de base de datos

### **FASE 3: BACKEND (3-4 días)**
1. **Actualizar APIs** de pauta mensual
2. **Actualizar APIs** de pauta diaria
3. **Actualizar APIs** de turnos extras
4. **Implementar nueva lógica** de mapeo

### **FASE 4: FRONTEND (2-3 días)**
1. **Actualizar componentes** de pauta mensual
2. **Actualizar componentes** de pauta diaria
3. **Actualizar lógica** de renderizado
4. **Implementar nueva lógica** de canUndo

### **FASE 5: TESTING (2-3 días)**
1. **Pruebas unitarias** de todas las funciones
2. **Pruebas de integración** end-to-end
3. **Pruebas de regresión** con datos reales
4. **Validación de consistencia** de datos

### **FASE 6: DESPLIEGUE (1 día)**
1. **Despliegue en staging** para pruebas finales
2. **Despliegue en producción** con monitoreo
3. **Validación post-despliegue** de funcionalidades críticas
4. **Comunicación a usuarios** sobre cambios

---

## 📊 ESTIMACIÓN DE ESFUERZO

| Fase | Tiempo Estimado | Complejidad | Riesgo |
|------|----------------|-------------|--------|
| Preparación | 2-3 días | Media | Bajo |
| Base de Datos | 1-2 días | Alta | Alto |
| Backend | 3-4 días | Alta | Alto |
| Frontend | 2-3 días | Media | Medio |
| Testing | 2-3 días | Media | Medio |
| Despliegue | 1 día | Baja | Alto |
| **TOTAL** | **11-16 días** | **Alta** | **Alto** |

---

## 🎯 RECOMENDACIONES FINALES

### **✅ PROSIGUIR CON EL CAMBIO**
- **Beneficio**: Solución definitiva a inconsistencias
- **Beneficio**: Estructura clara y mantenible
- **Beneficio**: Base sólida para futuras funcionalidades

### **⚠️ CONSIDERACIONES CRÍTICAS**
- **Riesgo Alto**: Requiere planificación exhaustiva
- **Tiempo**: 2-3 semanas de desarrollo
- **Testing**: Pruebas exhaustivas obligatorias

### **🚀 ESTRATEGIA RECOMENDADA**
1. **Implementar en ambiente de desarrollo** primero
2. **Migrar datos de prueba** y validar
3. **Realizar pruebas exhaustivas** antes de producción
4. **Planificar rollback** en caso de problemas
5. **Comunicar cambios** a usuarios finales

---

## 📋 CHECKLIST DE VALIDACIÓN

### **Antes de Implementar:**
- [ ] Backup completo de base de datos
- [ ] Scripts de migración probados
- [ ] Plan de rollback definido
- [ ] Equipo de desarrollo alineado
- [ ] Ventana de mantenimiento programada

### **Durante la Implementación:**
- [ ] Migración de datos exitosa
- [ ] Todas las funciones actualizadas
- [ ] APIs funcionando correctamente
- [ ] Frontend mostrando estados correctos
- [ ] Logs funcionando correctamente

### **Después de la Implementación:**
- [ ] Validación de datos consistente
- [ ] Funcionalidades críticas funcionando
- [ ] Reportes generando datos correctos
- [ ] Usuarios confirmando funcionamiento
- [ ] Monitoreo de errores activo

---

**Versión**: 1.0  
**Fecha**: 2025-01-11  
**Autor**: Sistema GardOps  
**Estado**: Análisis Completo
