# BuscadorEntidades

Componente reutilizable para buscar guardias e instalaciones con filtrado inteligente por nombre, apellido, RUT y dirección.

## Características

- **Búsqueda inteligente**: Filtra por primeras letras/números de nombre, apellido, RUT y dirección
- **Filtrado por tipo**: Permite mostrar solo guardias, solo instalaciones, o ambos
- **Debounce automático**: Optimiza las búsquedas con delay de 200ms
- **Interfaz consistente**: Sigue el diseño de GardOps con iconos diferenciados
- **Información detallada**: Muestra información adicional como RUT, dirección, cliente, etc.
- **Estados de carga**: Indicadores visuales durante la carga de datos

## Props

### BuscadorEntidadesProps

```typescript
interface BuscadorEntidadesProps {
  placeholder?: string;                    // Placeholder del input
  className?: string;                      // Clases CSS adicionales
  onEntitySelect?: (entity: EntityOption) => void;  // Callback al seleccionar
  onSearchChange?: (query: string) => void;         // Callback al cambiar búsqueda
  value?: string;                          // Valor controlado del input
  defaultValue?: string;                   // Valor por defecto
  required?: boolean;                      // Campo requerido
  disabled?: boolean;                      // Campo deshabilitado
  readOnly?: boolean;                      // Solo lectura
  name?: string;                           // Nombre del campo
  id?: string;                             // ID del campo
  showClearButton?: boolean;               // Mostrar botón de limpiar
  showGuardias?: boolean;                  // Mostrar guardias en resultados
  showInstalaciones?: boolean;             // Mostrar instalaciones en resultados
  guardias?: EntityOption[];               // Array de guardias
  instalaciones?: EntityOption[];          // Array de instalaciones
  isLoading?: boolean;                     // Estado de carga
  filterByRut?: boolean;                   // Habilitar filtrado por RUT
  filterByApellido?: boolean;              // Habilitar filtrado por apellido
}
```

### EntityOption

```typescript
interface EntityOption {
  id: string;
  nombre: string;
  apellido?: string;
  rut?: string;
  direccion?: string;
  ciudad?: string;
  comuna?: string;
  email?: string;
  telefono?: string;
  cliente_nombre?: string;
  valor_turno_extra?: number;
  tipo: 'guardia' | 'instalacion';
}
```

## Uso

### Ejemplo básico

```tsx
import { BuscadorEntidades, EntityOption } from '@/components/ui/buscador-entidades';

function MiComponente() {
  const [busqueda, setBusqueda] = useState('');
  const [entidadSeleccionada, setEntidadSeleccionada] = useState<EntityOption | null>(null);

  const guardias = [
    {
      id: '1',
      nombre: 'Juan',
      apellido: 'Pérez',
      rut: '12345678-9',
      direccion: 'Av. Principal 123',
      tipo: 'guardia' as const
    }
  ];

  const instalaciones = [
    {
      id: '1',
      nombre: 'Edificio Central',
      direccion: 'Calle Comercial 456',
      cliente_nombre: 'Empresa ABC',
      tipo: 'instalacion' as const
    }
  ];

  return (
    <BuscadorEntidades
      placeholder="Buscar guardias o instalaciones..."
      value={busqueda}
      onSearchChange={setBusqueda}
      onEntitySelect={setEntidadSeleccionada}
      guardias={guardias}
      instalaciones={instalaciones}
      showGuardias={true}
      showInstalaciones={true}
      filterByRut={true}
      filterByApellido={true}
    />
  );
}
```

### Ejemplo con filtros específicos

```tsx
// Solo mostrar guardias
<BuscadorEntidades
  placeholder="Buscar guardia..."
  showGuardias={true}
  showInstalaciones={false}
  guardias={guardias}
  onEntitySelect={handleGuardiaSelect}
/>

// Solo mostrar instalaciones
<BuscadorEntidades
  placeholder="Buscar instalación..."
  showGuardias={false}
  showInstalaciones={true}
  instalaciones={instalaciones}
  onEntitySelect={handleInstalacionSelect}
/>
```

## Funcionalidades de búsqueda

### Filtrado por nombre
- Busca coincidencias parciales en el nombre
- No distingue entre mayúsculas y minúsculas
- Funciona con las primeras letras

### Filtrado por apellido (guardias)
- Busca en el campo `apellido` de los guardias
- Se puede habilitar/deshabilitar con `filterByApellido`

### Filtrado por RUT (guardias)
- Busca coincidencias exactas en el RUT
- Se puede habilitar/deshabilitar con `filterByRut`

### Filtrado por dirección
- Busca en el campo `direccion` de ambas entidades
- Siempre activo

## Visualización

### Guardias
- Icono: 👤 (User)
- Color: Azul
- Información mostrada: Nombre completo, RUT, dirección

### Instalaciones
- Icono: 🏢 (Building2)
- Color: Verde
- Información mostrada: Nombre, cliente, dirección

## Estados

### Carga
- Muestra spinner durante `isLoading={true}`
- Deshabilita el input automáticamente

### Sin resultados
- No muestra sugerencias si no hay coincidencias
- Mantiene el input funcional para nuevas búsquedas

### Selección
- Actualiza el valor del input con el nombre seleccionado
- Llama a `onEntitySelect` con la entidad completa
- Cierra automáticamente las sugerencias

## Integración con GardOps

Este componente está diseñado específicamente para integrarse con:

- **Sistema de autenticación**: Usa el tenant ID para filtrar datos
- **APIs existentes**: Compatible con `/api/guardias-con-coordenadas` y `/api/instalaciones-con-coordenadas`
- **Diseño consistente**: Usa los mismos estilos y componentes de UI que el resto de GardOps
- **Tipos TypeScript**: Compatible con las interfaces existentes de guardias e instalaciones

## Consideraciones de rendimiento

- **Debounce**: 200ms para evitar búsquedas excesivas
- **Límite de resultados**: Máximo 10 sugerencias mostradas
- **Memoización**: Los datos se procesan eficientemente con `useMemo`
- **Cleanup**: Manejo adecuado de timeouts y event listeners 