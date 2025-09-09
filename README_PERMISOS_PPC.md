# Sistema de Permisos y PPCs - GardOps

## 📋 Resumen Implementado

Se ha implementado exitosamente el sistema backend para manejar automáticamente el impacto de permisos y finiquitos en la pauta mensual y la generación de PPCs.

## 🏗️ Arquitectura Implementada

### 1. Funciones de Pauta Mensual (`src/lib/db/pautaMensual.ts`)

- **`aplicarPermisoEnPautaMensual`**: Aplica permisos (licencia, vacaciones, permisos) sobre la pauta del guardia
- **`obtenerPautaMensualGuardia`**: Obtiene la pauta mensual de un guardia en un rango de fechas
- **`verificarTurnosAsignados`**: Verifica si un guardia tiene turnos asignados en un rango de fechas

### 2. Funciones de PPC (`src/lib/db/ppc.ts`)

- **`procesarFiniquitoYGenerarPPC`**: Procesa finiquitos, elimina turnos de la pauta y genera PPCs automáticamente
- **`obtenerPPCsPendientes`**: Obtiene PPCs pendientes por instalación
- **`asignarGuardiaAPPC`**: Asigna un guardia a un PPC específico

### 3. Endpoint API (`src/app/api/guardias/permisos/route.ts`)

- **POST**: Recibe permisos y finiquitos desde la ficha del guardia
- **GET**: Obtiene permisos de un guardia en un rango de fechas

## 🔧 Tipos de Permisos Soportados

1. **Licencia**: Permisos médicos o administrativos
2. **Vacaciones**: Períodos de descanso anual
3. **Permiso con Goce**: Permisos que mantienen remuneración
4. **Permiso sin Goce**: Permisos sin remuneración
5. **Finiquito**: Terminación de contrato

## 📊 Flujo de Procesamiento

### Para Permisos (Licencia, Vacaciones, Permisos):
1. Se recibe la solicitud con `guardiaId`, `tipo`, `fechaInicio`, `fechaFin`
2. Se actualiza la pauta mensual marcando los días como el tipo de permiso correspondiente
3. Se registra la observación del permiso

### Para Finiquitos:
1. Se recibe la solicitud con `guardiaId`, `tipo: "finiquito"`, `fechaInicio`
2. Se obtienen todos los turnos asignados desde el día siguiente al finiquito
3. Se eliminan los turnos de la pauta mensual
4. Se generan PPCs automáticamente para cada turno eliminado
5. Los PPCs se crean con prioridad "Alta" y motivo "renuncia"

## 🧪 Pruebas Implementadas

### Scripts de Prueba:
- **`scripts/test-permisos-ppc.ts`**: Prueba las funciones de base de datos
- **`scripts/test-permisos-api.ts`**: Prueba el endpoint API

### Validaciones Implementadas:
- ✅ Validación de datos requeridos
- ✅ Validación de tipos de permiso permitidos
- ✅ Validación de fechas para permisos (requiere fechaInicio y fechaFin)
- ✅ Manejo de errores y respuestas apropiadas

## 📈 Resultados de Pruebas

```
✅ Tabla pautas_mensuales existe
✅ Tabla as_turnos_ppc existe
✅ Tabla as_turnos_requisitos existe
✅ Tabla guardias existe

✅ Permiso aplicado exitosamente
✅ Finiquito procesado exitosamente
✅ Permisos obtenidos exitosamente
✅ Validaciones funcionando correctamente
```

## 🚀 Próximos Pasos

1. **Frontend**: Crear formulario visual en la ficha del guardia para ingresar permisos
2. **Notificaciones**: Implementar notificaciones automáticas cuando se generen PPCs
3. **Reportes**: Crear reportes de permisos y PPCs generados
4. **Dashboard**: Mostrar estadísticas de permisos y PPCs pendientes

## 🔗 Endpoints Disponibles

### POST `/api/guardias/permisos`
```json
{
  "guardiaId": "uuid",
  "tipo": "vacaciones|licencia|permiso_con_goce|permiso_sin_goce|finiquito",
  "fechaInicio": "YYYY-MM-DD",
  "fechaFin": "YYYY-MM-DD", // Requerido excepto para finiquito
  "observaciones": "string"
}
```

### GET `/api/guardias/permisos?guardiaId=uuid&fechaDesde=YYYY-MM-DD&fechaHasta=YYYY-MM-DD`

## ✅ Estado Actual

**COMPLETADO**: Backend funcional para permisos y PPCs
- ✅ Funciones de base de datos
- ✅ Endpoint API
- ✅ Validaciones
- ✅ Pruebas automatizadas
- ✅ Manejo de errores

**PENDIENTE**: Frontend para interfaz de usuario

---

**Fecha de Implementación**: Agosto 2025
**Versión**: 1.0.0
**Estado**: ✅ Backend Completado 