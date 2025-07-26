# App Operaciones

Sistema de gestión operativa profesional construido con Next.js 14, TypeScript, TailwindCSS y shadcn/ui.

## 🚀 Características

- ✅ **Tema oscuro por defecto** con posibilidad de alternar a modo claro
- ✅ **Sidebar lateral izquierda** con navegación vertical estilizada
- ✅ **Navbar superior fija** con nombre "App Operaciones"
- ✅ **Zona central** que renderiza el contenido dinámicamente
- ✅ **Diseño responsive** optimizado para todos los dispositivos
- ✅ **Tipografía capitalizada** solo en la primera letra
- ✅ **Componentes modernos** con shadcn/ui y lucide-react
- ✅ **Animaciones suaves** con framer-motion
- ✅ **ThemeProvider y Toggle** para cambio de tema
- ✅ **Drawer lateral** para formularios con mejor UX
- ✅ **Autocompletado de direcciones reales** con Google Places API

## 🛠️ Tecnologías

- **Next.js 14** - Framework de React con App Router
- **TypeScript** - Tipado estático
- **TailwindCSS** - Framework de CSS utilitario
- **shadcn/ui** - Componentes UI modernos
- **framer-motion** - Biblioteca de animaciones
- **next-themes** - Manejo de temas
- **lucide-react** - Iconos
- **Google Maps API** - Autocompletado de direcciones y geolocalización

## 📁 Estructura del proyecto

```
GardApp/
├── app/
│   ├── globals.css          # Estilos globales y variables CSS
│   ├── layout.tsx          # Layout principal de la aplicación
│   ├── page.tsx            # Página de inicio
│   ├── clientes/page.tsx   # Página de clientes
│   ├── instalaciones/page.tsx # Página de instalaciones
│   └── configuracion/page.tsx # Página de configuración
├── components/
│   ├── ui/
│   │   ├── button.tsx      # Componente Button de shadcn/ui
│   │   ├── switch.tsx      # Componente Switch de shadcn/ui
│   │   └── drawer.tsx      # Componente Drawer lateral
│   ├── address-autocomplete.tsx # Autocompletado de direcciones con Google Places
│   ├── navbar.tsx          # Barra de navegación superior
│   ├── sidebar.tsx         # Barra lateral de navegación
│   ├── theme-provider.tsx  # Proveedor de temas
│   └── theme-toggle.tsx    # Toggle para cambiar tema
├── lib/
│   └── utils.ts           # Utilidades (cn function)
└── README.md
```

## 🚀 Instalación y uso

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y configura tus variables:

```bash
cp .env.example .env.local
```

Configura las siguientes variables en `.env.local`:

```bash
# Google Maps API para autocompletado de direcciones
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key_aqui

# Base de datos (opcional)
DATABASE_URL=postgresql://username:password@localhost:5432/gardapp
```

### 3. Configurar Google Maps API

1. Ve a [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/)
2. Habilita las APIs: **Places API** y **Maps JavaScript API**
3. Crea una API Key y agrégala a tu archivo `.env.local`

### 4. Ejecutar en modo desarrollo

```bash
npm run dev
```

### 5. Abrir en el navegador

Visita [http://localhost:3000](http://localhost:3000) para ver la aplicación.

## 🎨 Características del diseño

### Tema y colores
- **Tema por defecto**: Oscuro
- **Paleta de colores**: Definida con variables CSS para fácil personalización
- **Soporte completo**: Para modo claro y oscuro

### Layout responsivo
- **Sidebar**: Colapsable en dispositivos móviles
- **Grid**: Adaptativo según el tamaño de pantalla
- **Máximo ancho**: 7xl (1280px) centrado
- **Espaciado**: Consistente con px-6 py-8

### Componentes
- **Cards**: Bordes redondeados (rounded-2xl), sombras (shadow-xl)
- **Botones**: Variantes múltiples con estados hover/focus
- **Animaciones**: Sutiles y funcionales con framer-motion

## 📱 Navegación

La aplicación incluye las siguientes secciones:

1. **Inicio** (`/`) - Dashboard principal con estadísticas
2. **Clientes** (`/clientes`) - Gestión de clientes
3. **Instalaciones** (`/instalaciones`) - Control de instalaciones  
4. **Configuración** (`/configuracion`) - Ajustes de la aplicación

## 🔧 Personalización

### Modificar temas
Los temas se definen en `app/globals.css` usando variables CSS. Puedes personalizar:

- Colores primarios y secundarios
- Bordes y fondos
- Radio de bordes
- Paleta completa de colores

### Agregar nuevas páginas
1. Crear archivo en `app/nueva-pagina/page.tsx`
2. Agregar elemento al array `navigationItems` en `components/sidebar.tsx`
3. La navegación se actualizará automáticamente

## 📋 Scripts disponibles

- `npm run dev` - Ejecutar en modo desarrollo
- `npm run build` - Construir para producción
- `npm run start` - Ejecutar en modo producción
- `npm run lint` - Ejecutar linter

## 🔍 Características técnicas

- **TypeScript strict mode**: Habilitado para máxima seguridad de tipos
- **ESLint**: Configurado con reglas de Next.js
- **CSS Variables**: Para temas dinámicos
- **Optimización**: Imágenes y fuentes optimizadas automáticamente
- **SEO**: Metadata configurada correctamente

## 🆕 Nuevos Componentes

### Drawer

Componente deslizable lateral que reemplaza modales para mejor UX:

```tsx
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerFooter 
} from "@/components/ui/drawer"

<Drawer open={isOpen} onOpenChange={setIsOpen}>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Título del formulario</DrawerTitle>
    </DrawerHeader>
    {/* Contenido del formulario */}
    <DrawerFooter>
      {/* Botones de acción */}
    </DrawerFooter>
  </DrawerContent>
</Drawer>
```

### AddressAutocomplete

Componente para autocompletado de direcciones reales con Google Places API:

```tsx
import { AddressAutocomplete } from "@/components/address-autocomplete"

<AddressAutocomplete
  value={direccion}
  onChange={(address, placeDetails) => {
    setDireccion(address)
    // placeDetails contiene coordenadas y datos adicionales del lugar
    if (placeDetails?.geometry?.location) {
      const coordinates = {
        lat: placeDetails.geometry.location.lat(),
        lng: placeDetails.geometry.location.lng()
      }
    }
  }}
  label="Dirección"
  placeholder="Buscar dirección real..."
  required
/>
```

**Características del AddressAutocomplete:**
- 🌍 Autocompletado con direcciones reales de Google Places
- 🇨🇱 Restringido a Chile por defecto
- ⌨️ Navegación con teclado (flechas, Enter, Escape)
- 🎯 Debounce para optimizar las consultas
- 📍 Retorna coordenadas GPS del lugar seleccionado
- 🎨 Tema oscuro/claro automático

## 🛠️ Solución de Problemas

### Error: API de Google Maps no funciona
Si ves advertencias sobre AutocompleteService o PlacesService:
- Estas son advertencias de deprecación pero **siguen funcionando**
- Para usar las nuevas APIs (opcional):
  ```js
  // Cambiar a AutocompleteSuggestion (requiere actualización del código)
  // Ver: https://developers.google.com/maps/documentation/javascript/places-migration-overview
  ```

### Error: "could not determine data type of parameter"
Si falla al guardar instalaciones:
- Verifica que todos los campos del formulario tengan valores válidos
- Asegúrate de que no se envíen campos `null` o `undefined`

### Warning: value prop null en input
- Ya corregido: el componente AddressAutocomplete maneja valores seguros
- Siempre usa cadenas vacías en lugar de `null`

### Error 404 favicon.ico
- Ya corregido: favicon embebido como SVG en el metadata

### Warnings de accesibilidad en Drawer
- Ya corregido: agregada descripción requerida para lectores de pantalla

---

**Desarrollado con ❤️ usando las mejores prácticas de desarrollo moderno** 