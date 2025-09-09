# Componente PautaTable

## Descripción
Componente para la gestión de pautas mensuales de guardias con funcionalidades simplificadas y mejoradas.

## Funcionalidades Implementadas

### 1. Estados Simplificados
- **Solo dos estados**: `TRABAJA` y `LIBRE`
- Eliminados estados: Licencia, Vacaciones, Permiso con goce, Permiso sin goce, PPC
- Estos estados se gestionan desde la ficha del guardia o pauta diaria

### 2. Interacción con Click Izquierdo
- **Alternancia directa**: Si el día está marcado como `TRABAJA`, lo cambia a `LIBRE`, y viceversa
- Actualiza el estado local y el backend automáticamente
- Muestra `console.log("Edición de pauta mensual actualizada exitosamente")` al guardar cambios

### 3. Click Derecho - Modal de Autocompletado
- Abre modal `ModalAutocompletarPauta` con:
  - `id_guardia`
  - `rol_servicio.patron_turno` (ej: 4x4)
  - Día donde inicia el ciclo
- Muestra el ciclo completo (ej: T, T, T, T, L, L, L, L)
- Usuario selecciona con qué día comienza el ciclo
- Aplica patrón desde el día seleccionado hacia adelante
- **No modifica días anteriores**

### 4. Modal de Autocompletado
- Muestra patrón derivado del rol asignado (4x4, 5x2, etc.)
- Casillas con visualización del ciclo completo
- Usuario hace clic en la casilla que representa el día 1 del ciclo
- Al confirmar, aplica la serie hacia adelante desde el día seleccionado

### 5. Ícono de Eliminación
- Ícono 🗑️ al inicio de cada fila (guardia)
- Elimina toda la pauta del guardia con confirmación (`alert()`)
- Limpia todos los días de la fila seleccionada

### 6. Leyenda Simplificada
- 🟩 = Trabajado
- ⚪️ = Libre
- Estilos limpios y minimalistas

### 7. Backend
- Acepta solo los nuevos estados: `"TRABAJA"`, `"LIBRE"`
- Compatible con la nueva estructura de datos

## Estructura de Datos

```typescript
interface PautaGuardia {
  id_guardia: string;
  nombre: string;
  rol_servicio: {
    patron_turno: string; // ej: "4x4", "5x2"
  };
  dias: string[]; // Array de estados: "TRABAJA" | "LIBRE" | ""
}
```

## Props del Componente

```typescript
interface PautaTableProps {
  pautaData: PautaGuardia[];
  diasDelMes: number[];
  diasSemana: {dia: number, diaSemana: string, esFeriado: boolean}[];
  onUpdatePauta: (guardiaIndex: number, diaIndex: number, nuevoEstado: string) => void;
  onDeleteGuardia: (guardiaIndex: number) => void;
}
```

## Uso

```tsx
import PautaTable from './components/PautaTable';

// En el componente padre
<PautaTable
  pautaData={pautaData}
  diasDelMes={diasDelMes}
  diasSemana={diasSemana}
  onUpdatePauta={handleUpdatePauta}
  onDeleteGuardia={handleDeleteGuardia}
/>
```

## Patrones Soportados

- **4x4**: 4 días trabajo + 4 días libre
- **5x2**: 5 días trabajo + 2 días libre  
- **7x7**: 7 días trabajo + 7 días libre
- **6x1**: 6 días trabajo + 1 día libre

## Características Técnicas

- **Responsive**: Adaptable a diferentes tamaños de pantalla
- **Dark Mode**: Compatible con tema oscuro
- **Accesibilidad**: Tooltips y navegación por teclado
- **Performance**: Optimizado para renderizado eficiente
- **TypeScript**: Tipado completo para mejor desarrollo 