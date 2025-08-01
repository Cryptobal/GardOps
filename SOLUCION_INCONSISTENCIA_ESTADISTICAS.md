# Solución: Inconsistencia en Estadísticas de Instalaciones

## Problema Identificado

El usuario reportó una inconsistencia en las estadísticas mostradas en la página de instalaciones:

- **Realidad**: La instalación "A Test" tiene 2 tipos de turnos con 4 y 3 puestos respectivamente (7 puestos totales) y 2 PPC pendientes
- **Mostrado**: La página mostraba "2 | 2" en lugar de "7 | 2"

## Diagnóstico

Se identificó que el problema estaba en las consultas SQL de los endpoints de la API:

### Problema Principal
- **Antes**: Los endpoints contaban **requisitos** (`COUNT(*)`) en lugar de sumar **guardias** (`SUM(cantidad_guardias)`)
- **Resultado**: Se mostraban 2 requisitos en lugar de 7 guardias totales

### Archivos Afectados
1. `src/app/api/instalaciones/route.ts` - Endpoint principal de instalaciones
2. `src/app/api/instalaciones/[id]/estadisticas/route.ts` - Endpoint de estadísticas individuales

## Solución Implementada

### 1. Corrección de Consultas SQL

**Antes:**
```sql
COUNT(DISTINCT tr.id) as puestos_creados
```

**Después:**
```sql
SUM(tr.cantidad_guardias) as puestos_creados
```

### 2. Mejoras en la Interfaz de Usuario

#### Tooltip Hover
- Se agregó un tooltip que aparece al pasar el mouse sobre las estadísticas
- Muestra detalles completos: Total Puestos, PPC Pendientes, PPC Totales
- Incluye una flecha indicativa y transiciones suaves

#### Mejoras en la Tabla
- La columna de estadísticas ahora muestra correctamente "7 | 2" en lugar de "2 | 2"
- Cursor tipo "help" para indicar que hay información adicional disponible

#### Mejoras en Tarjetas Móviles
- Las tarjetas móviles también incluyen el tooltip hover
- Mantienen la misma funcionalidad que la versión de escritorio

### 3. Verificación de Corrección

Se crearon scripts de diagnóstico para verificar que los cambios funcionan correctamente:

- `scripts/diagnosticar-inconsistencia-estadisticas.ts` - Diagnóstico inicial
- `scripts/verificar-estadisticas-corregidas.ts` - Verificación post-corrección

## Resultados

### Antes de la Corrección
```
📈 Estadísticas actuales del endpoint:
   Puestos creados: 2 ❌ (incorrecto)
   PPC pendientes: 2 ✅ (correcto)
```

### Después de la Corrección
```
📈 Estadísticas corregidas del endpoint:
   Puestos creados: 7 ✅ (correcto)
   PPC pendientes: 2 ✅ (correcto)
```

## Archivos Modificados

1. **`src/app/api/instalaciones/route.ts`**
   - Corregida consulta SQL para sumar `cantidad_guardias` en lugar de contar requisitos
   - Aplicado tanto para `withAllData=true` como para `withStats=true`

2. **`src/app/api/instalaciones/[id]/estadisticas/route.ts`**
   - Corregida consulta SQL para estadísticas individuales
   - Mejorado manejo de errores y formato de respuesta

3. **`src/app/instalaciones/page.tsx`**
   - Agregado tooltip hover con detalles completos de estadísticas
   - Mejorada la experiencia de usuario en tabla y tarjetas móviles
   - Incluido `ppcTotales` en las estadísticas mostradas

## Beneficios de la Solución

1. **Precisión**: Las estadísticas ahora reflejan correctamente la realidad de los datos
2. **Transparencia**: Los usuarios pueden ver el desglose completo al hacer hover
3. **Consistencia**: Los datos son consistentes entre diferentes vistas de la aplicación
4. **Experiencia de Usuario**: Mejor información visual y tooltips informativos

## Verificación

La solución ha sido verificada y confirmada:
- ✅ Puestos creados: 7 (correcto)
- ✅ PPC pendientes: 2 (correcto)  
- ✅ PPC totales: 2 (correcto)
- ✅ Tooltip hover funcionando
- ✅ Compatible con móviles

La página de instalaciones ahora muestra correctamente "7 | 2" para la instalación "A Test", resolviendo completamente la inconsistencia reportada. 