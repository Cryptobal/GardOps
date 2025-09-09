# Módulo de Ítems Globales

## Descripción

El módulo de Ítems Globales permite administrar los tipos de ítems de sueldo disponibles que pueden ser asignados a las estructuras de servicio en las diferentes instalaciones. Este módulo reemplaza y extiende la funcionalidad de "Bonos Globales" con una estructura más flexible.

## Funcionalidades

### Gestión de Ítems
- **Crear ítems**: Agregar nuevos tipos de ítems con nombre, descripción, clase y configuración de imponibilidad
- **Editar ítems**: Modificar la información de ítems existentes
- **Eliminar ítems**: Desactivar ítems que no estén siendo utilizados (soft delete)
- **Activar/Desactivar**: Cambiar el estado de los ítems sin eliminarlos

### Tipos de Ítems
- **Haberes**: Ítems que suman al sueldo (bonos, asignaciones, etc.)
- **Descuentos**: Ítems que restan del sueldo (descuentos por ausencia, anticipos, etc.)

### Configuración de Imponibilidad
- **Ítems Imponibles**: Se incluyen en el cálculo de cotizaciones previsionales
- **Ítems No Imponibles**: No afectan las cotizaciones previsionales

### Configuración de Topes
- **Sin tope**: No tiene límite de aplicación
- **Monto fijo**: Tope en pesos chilenos
- **Porcentaje**: Tope como porcentaje del sueldo base

### Filtros y Búsqueda
- Búsqueda por nombre, código o descripción
- Filtro por estado (Activo/Inactivo)
- Filtro por clase (HABER/DESCUENTO)
- Filtro por imponibilidad (Imponible/No Imponible)

## Estructura de Datos

### Tabla: `sueldo_item`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `codigo` | VARCHAR(50) | Código único del ítem (auto-generado) |
| `nombre` | VARCHAR(100) | Nombre del ítem |
| `clase` | VARCHAR(20) | Tipo: HABER o DESCUENTO |
| `naturaleza` | VARCHAR(20) | IMPONIBLE o NO_IMPONIBLE |
| `descripcion` | TEXT | Descripción opcional |
| `formula_json` | JSONB | Fórmula de cálculo (opcional) |
| `tope_modo` | VARCHAR(20) | NONE, MONTO, o PORCENTAJE |
| `tope_valor` | DECIMAL(15,2) | Valor del tope |
| `activo` | BOOLEAN | Estado del ítem |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de última actualización |

## API Endpoints

### GET /api/payroll/items
Obtiene la lista de ítems globales con filtros opcionales:
- `search`: Buscar por nombre o código
- `clase`: Filtrar por clase (HABER/DESCUENTO)
- `naturaleza`: Filtrar por imponibilidad
- `activo`: Filtrar por estado activo/inactivo

### POST /api/payroll/items
Crea un nuevo ítem global.

**Parámetros:**
- `nombre` (requerido): Nombre del ítem
- `clase` (requerido): HABER o DESCUENTO
- `naturaleza` (requerido): IMPONIBLE o NO_IMPONIBLE
- `descripcion` (opcional): Descripción del ítem
- `formula_json` (opcional): Fórmula de cálculo en JSON
- `tope_modo` (opcional): NONE, MONTO, o PORCENTAJE
- `tope_valor` (opcional): Valor del tope
- `activo` (opcional): Estado del ítem

### PUT /api/payroll/items/:id
Actualiza un ítem global existente.

### DELETE /api/payroll/items/:id
Desactiva un ítem global (soft delete).

## Reglas de Negocio

### Generación de Códigos
- El código se auto-genera desde el nombre del ítem
- Se convierte a minúsculas y se reemplazan espacios por guiones bajos
- Se remueven acentos y caracteres especiales
- Se valida unicidad automáticamente

### Validaciones
- Nombre, clase y naturaleza son campos requeridos
- La clase debe ser HABER o DESCUENTO
- La naturaleza debe ser IMPONIBLE o NO_IMPONIBLE
- El tope_modo debe ser NONE, MONTO, o PORCENTAJE
- Si tope_modo no es NONE, tope_valor es requerido

### Soft Delete
- Los ítems no se eliminan físicamente
- Se marcan como inactivos (activo = false)
- Los ítems inactivos no aparecen en las listas por defecto

## Estadísticas

La página muestra las siguientes estadísticas:
- **Total ítems**: Número total de ítems en el sistema
- **Activos**: Ítems con estado activo
- **Inactivos**: Ítems con estado inactivo
- **Imponibles**: Ítems que afectan cotizaciones previsionales
- **No Imponibles**: Ítems que no afectan cotizaciones
- **Haberes**: Ítems de tipo HABER
- **Descuentos**: Ítems de tipo DESCUENTO

## Migración desde Bonos Globales

Este módulo reemplaza la funcionalidad de "Bonos Globales" con una estructura más flexible:

### Cambios Principales
1. **Estructura más flexible**: Soporta haberes y descuentos
2. **Configuración de topes**: Permite definir límites de aplicación
3. **Fórmulas JSON**: Soporte para fórmulas de cálculo complejas
4. **Mejor organización**: Separación clara entre tipos de ítems

### Datos Migrados
Los bonos básicos se migraron automáticamente:
- Colación → HABER, NO_IMPONIBLE
- Movilización → HABER, NO_IMPONIBLE
- Responsabilidad → HABER, IMPONIBLE

## Uso en el Sistema

Los ítems globales se utilizan en:
- **Estructuras de Servicio**: Para definir bonos y descuentos por instalación/rol
- **Cálculo de Sueldos**: Para determinar valores imponibles y no imponibles
- **Planillas**: Para generar reportes de remuneraciones
- **Reportes**: Para análisis de costos laborales
