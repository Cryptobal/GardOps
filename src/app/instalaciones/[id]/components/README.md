# Componentes de Instalaciones - Turnos y PPCs

## Funcionalidades Implementadas

### 1. Gestión de Turnos
- **Crear turnos**: Permite crear nuevos turnos con roles de servicio y cantidad de guardias
- **Eliminar turnos**: Elimina turnos completos con confirmación
- **Visualización mejorada**: Muestra información clara sobre puestos, asignaciones y PPCs

### 2. Gestión de PPCs (Puestos Pendientes por Cubrir)
- **Asignación directa**: Selector dropdown para asignar guardias disponibles directamente desde cada PPC
- **Desasignación**: Botón para desasignar guardias de puestos asignados
- **Estados visuales**: Colores diferenciados para puestos asignados (verde) y pendientes (rojo)

### 3. Guardias Disponibles
- **Filtrado automático**: Solo muestra guardias que no tienen asignación activa
- **Información completa**: Nombre completo, RUT y comuna del guardia
- **Actualización en tiempo real**: Se actualiza automáticamente al asignar/desasignar

### 4. Lógica de Números Corregida
- **Total Puestos**: Número total de puestos creados para el turno
- **Asignados**: Puestos que tienen un guardia asignado
- **PPCs**: Puestos Pendientes por Cubrir (sin guardia asignado)

## Componentes Principales

### TurnosInstalacion.tsx
Componente principal que maneja toda la lógica de turnos y PPCs.

**Funcionalidades:**
- Carga de datos de turnos, roles, PPCs y guardias disponibles
- Creación y eliminación de turnos
- Asignación y desasignación de guardias
- Visualización mejorada con contadores correctos

### InfoTurnos.tsx
Componente informativo que explica la lógica de los números.

**Características:**
- Explicación clara de cada contador
- Visualización de estadísticas generales
- Notas informativas sobre el funcionamiento

### AsignarGuardiaModal.tsx
Modal para asignación de guardias (mantenido para compatibilidad).

### ConfirmDeleteModal.tsx
Modal de confirmación para eliminaciones.

## APIs Implementadas

### `/api/guardias/disponibles`
Obtiene guardias que no tienen asignación activa.

### `/api/instalaciones/[id]/ppc/[ppcId]/desasignar`
Desasigna un guardia de un PPC específico.

## Flujo de Trabajo

1. **Crear Turno**: Se crea un turno con X cantidad de guardias
2. **Generar PPCs**: Se crean automáticamente X PPCs (uno por cada guardia requerido)
3. **Asignar Guardias**: Se pueden asignar guardias disponibles a cada PPC individualmente
4. **Desasignar**: Se puede desasignar un guardia, convirtiendo el puesto en PPC nuevamente

## Mejoras Implementadas

### ✅ Problemas Resueltos
- **Números confusos**: Ahora se muestran claramente "Total Puestos", "Asignados" y "PPCs"
- **Asignación sin modal**: Selector dropdown directo en cada PPC
- **Desasignación**: Botón para quitar guardias de puestos asignados
- **Guardias disponibles**: Solo muestra guardias sin asignación activa

### 🔧 Funcionalidades Nuevas
- Información explicativa sobre la lógica de números
- Contadores en tiempo real
- Estados visuales mejorados
- Confirmaciones para acciones destructivas

## Uso

1. **Ver turnos**: Los turnos se muestran con contadores claros
2. **Asignar guardia**: Usar el dropdown en PPCs pendientes
3. **Desasignar guardia**: Usar el botón "Desasignar" en PPCs asignados
4. **Crear turno**: Usar el formulario al final de la página
5. **Eliminar turno**: Usar el botón de papelera en cada turno 