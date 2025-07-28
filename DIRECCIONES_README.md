# Sistema de Autocompletado de Direcciones - Google Maps API

## 📍 Resumen de Implementación

Se ha implementado un sistema completo de autocompletado de direcciones utilizando la API oficial de Google Maps Places. El sistema incluye:

### ✅ Componentes Implementados

1. **Hook Global** - `src/lib/useAddressAutocomplete.ts`
   - Integración con Google Maps Places API
   - Manejo de estados de carga y errores
   - Búsqueda de sugerencias con debounce
   - Extracción de coordenadas y componentes de dirección

2. **Componente Input Base** - `src/components/ui/input.tsx`
   - Componente base siguiendo el patrón shadcn/ui
   - Estilos consistentes con el diseño del sistema

3. **Componente InputDireccion** - `src/components/ui/input-direccion.tsx`
   - Input con autocompletado inteligente
   - Dropdown de sugerencias con diseño moderno
   - Indicadores de carga y estado
   - Campos ocultos automáticos para datos geográficos

4. **Componente GoogleMap** - `src/components/ui/google-map.tsx`
   - Mapa interactivo de Google Maps
   - Marcadores dinámicos con información
   - Controles completos (zoom, vista de calle, pantalla completa)
   - Eventos de click y centrado automático

### 🚀 Características

- ✅ **SDK Oficial de Google Maps**: Utiliza `@googlemaps/js-api-loader`
- ✅ **API Key Configurada**: `AIzaSyBHIoHJDp6StLJlUAQV_gK7woFsEYgbzHY`
- ✅ **Datos Completos**: Devuelve dirección, lat/lng, y componentes
- ✅ **Restringido a Chile**: Búsquedas limitadas al territorio chileno
- ✅ **Campos Automáticos**: Genera campos ocultos para formularios
- ✅ **Estilo Moderno**: Diseño consistente con shadcn/ui y Tailwind
- ✅ **TypeScript**: Completamente tipado
- ✅ **Responsive**: Funciona en móvil y desktop

## 🔧 Instalación

```bash
npm install @googlemaps/js-api-loader
npm install --save-dev @types/google.maps
```

## 📖 Uso Básico

### Importación
```typescript
import { InputDireccion, type AddressData } from "@/components/ui/input-direccion";
```

### Implementación en Formulario
```tsx
const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);

const handleAddressSelect = (address: AddressData) => {
  setSelectedAddress(address);
  console.log("Dirección seleccionada:", address);
};

return (
  <form>
    <InputDireccion
      name="direccion"
      placeholder="Buscar dirección..."
      onAddressSelect={handleAddressSelect}
      required
    />
  </form>
);
```

### Implementación con Mapa
```tsx
import GoogleMap from "@/components/ui/google-map";

const [mapCenter, setMapCenter] = useState({ lat: -33.4489, lng: -70.6693 });
const [mapMarkers, setMapMarkers] = useState([]);

const handleAddressSelect = (address: AddressData) => {
  // Actualizar el centro del mapa
  setMapCenter({ lat: address.latitud, lng: address.longitud });
  
  // Agregar marcador
  setMapMarkers([{
    position: { lat: address.latitud, lng: address.longitud },
    title: "Dirección seleccionada",
    info: address.direccionCompleta
  }]);
};

return (
  <div>
    <InputDireccion onAddressSelect={handleAddressSelect} />
    <GoogleMap
      center={mapCenter}
      markers={mapMarkers}
      zoom={16}
      height="400px"
    />
  </div>
);
```

## 📊 Datos Devueltos

El componente devuelve un objeto `AddressData` con:

```typescript
interface AddressData {
  direccionCompleta: string;     // "Av. Providencia 1234, Santiago, Chile"
  latitud: number;               // -33.431564
  longitud: number;              // -70.605326
  componentes: {
    ciudad: string;              // "Santiago"
    comuna: string;              // "Providencia"  
    region: string;              // "Región Metropolitana"
    pais: string;                // "Chile"
    codigoPostal: string;        // "7500000"
  }
}
```

## 🔒 Campos Ocultos Automáticos

El componente genera automáticamente estos campos ocultos:
- `{name}_latitud`
- `{name}_longitud` 
- `{name}_ciudad`
- `{name}_comuna`
- `{name}_region`

## 🎯 Casos de Uso

### Para Clientes
```tsx
<InputDireccion
  name="direccion_cliente"
  placeholder="Dirección del cliente..."
  onAddressSelect={(address) => {
    setFormData(prev => ({
      ...prev,
      direccion: address.direccionCompleta,
      latitud: address.latitud,
      longitud: address.longitud,
      ciudad: address.componentes.ciudad
    }));
  }}
/>
```

### Para Instalaciones
```tsx
<InputDireccion
  name="direccion_instalacion"
  placeholder="Ubicación de la instalación..."
  onAddressSelect={(address) => {
    setInstalacion(prev => ({
      ...prev,
      ubicacion: address,
      zona: address.componentes.comuna
    }));
  }}
/>
```

### Para Guardias (Domicilio)
```tsx
<InputDireccion
  name="domicilio_guardia"
  placeholder="Domicilio del guardia..."
  onAddressSelect={(address) => {
    setGuardia(prev => ({
      ...prev,
      domicilio: address.direccionCompleta,
      coordenadas: {
        lat: address.latitud,
        lng: address.longitud
      }
    }));
  }}
/>
```

## 🗺️ Componente GoogleMap

### Props del GoogleMap
```typescript
interface GoogleMapProps {
  center?: { lat: number; lng: number };        // Centro del mapa
  zoom?: number;                               // Nivel de zoom (1-20)
  markers?: Array<{                           // Marcadores a mostrar
    position: { lat: number; lng: number };
    title?: string;
    info?: string;
  }>;
  className?: string;                         // Clases CSS adicionales
  height?: string;                           // Altura del mapa
  onMapClick?: (position: { lat: number; lng: number }) => void; // Callback para clicks
}
```

### Ejemplo de Uso del Mapa
```tsx
<GoogleMap
  center={{ lat: -33.4489, lng: -70.6693 }}
  zoom={13}
  markers={[
    {
      position: { lat: -33.4372, lng: -70.6506 },
      title: "Las Condes",
      info: "Av. Apoquindo 1234, Las Condes, Santiago"
    }
  ]}
  height="500px"
  onMapClick={(pos) => console.log("Clicked at:", pos)}
/>
```

## 🧪 Página de Prueba

Visita `/test-direccion` para probar el componente y ver todos los datos que captura, incluyendo el mapa interactivo.

## ⚙️ Configuración Avanzada

### Personalizar Restricciones de País
```typescript
// En useAddressAutocomplete.ts, línea 85
componentRestrictions: { country: 'cl' }, // Cambiar según necesidad
```

### Personalizar Tipos de Lugares
```typescript
// En useAddressAutocomplete.ts, línea 86
types: ['address'], // Opciones: 'establishment', 'geocode', etc.
```

## 🔍 Debugging

El sistema incluye logs detallados:
```javascript
console.log("Google Maps API cargada correctamente");
console.log("Autocomplete Google Maps integrado con éxito");
```

## 📱 Responsive Design

El componente es completamente responsive:
- **Desktop**: Dropdown completo con información detallada
- **Mobile**: Dropdown compacto optimizado para pantallas pequeñas
- **Touch**: Optimizado para interacciones táctiles

## 🎨 Personalización de Estilos

Usa las props `className` para personalizar:
```tsx
<InputDireccion
  className="w-full max-w-md"
  placeholder="Dirección personalizada..."
/>
```

## 🚦 Estados del Componente

- **Loading**: Muestra spinner mientras busca
- **Empty**: Estado inicial sin sugerencias
- **Results**: Lista de sugerencias disponibles
- **Selected**: Dirección seleccionada con datos completos
- **Error**: Manejo de errores de la API

## 📋 Lista de Verificación

- [x] Hook de autocompletado implementado
- [x] Componente InputDireccion creado
- [x] Componente GoogleMap implementado
- [x] Integración con Google Maps API
- [x] Mapa siempre visible en test
- [x] Marcadores dinámicos funcionando
- [x] Página de prueba funcional
- [x] Documentación completa
- [x] TypeScript configurado
- [x] Estilos responsive
- [x] Campos ocultos automáticos
- [x] Manejo de errores
- [x] Estados de carga

## 🎉 Mensaje de Éxito

```javascript
console.log("Autocomplete Google Maps integrado con éxito");
```

¡El sistema de autocompletado de direcciones está listo para ser utilizado en los formularios de Clientes, Instalaciones y Guardias! 