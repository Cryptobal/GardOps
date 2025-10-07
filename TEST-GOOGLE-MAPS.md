# 🗺️ TEST: Google Maps Autocomplete - Comuna y Ciudad

## Problema Reportado
- **❌ No se ve la comuna y ciudad al seleccionar la dirección**
- **❌ En modo noche no se ve el botón de calendario**

## Soluciones Implementadas

### 1. Google Maps - Extracción de Comuna y Ciudad
**Archivo:** `src/components/ui/google-maps-autocomplete.tsx`

**Cambios:**
- ✅ Simplificado el listener de `place_changed`
- ✅ Ahora pasa el objeto `place` completo con `address_components` al callback `onPlaceSelect`
- ✅ Agregados logs de debug para ver los datos extraídos

**Código antes:**
```typescript
// Llamar callbacks
onChange(fullAddress);
setInputValue(fullAddress);
if (onPlaceSelect) {
  onPlaceSelect(place);
}
```

**Código después:**
```typescript
// Usar la dirección formateada de Google Maps si está disponible
const fullAddress = place.formatted_address || '';

logger.debug('🗺️ Lugar seleccionado:', {
  formatted_address: place.formatted_address,
  address_components: place.address_components,
  name: place.name
});

// Llamar callbacks
onChange(fullAddress);
setInputValue(fullAddress);

// IMPORTANTE: Pasar el place completo con todos sus componentes
if (onPlaceSelect && place.address_components) {
  onPlaceSelect(place);
}
```

**Función de extracción en el formulario:**
```typescript
const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
  if (place.address_components && place.formatted_address) {
    let comuna = '';
    let ciudad = '';

    // Extraer comuna y ciudad de los componentes de la dirección
    for (const component of place.address_components) {
      const types = component.types;
      
      // Buscar comuna en diferentes tipos
      if (types.includes('sublocality_level_1') || 
          types.includes('sublocality') || 
          types.includes('administrative_area_level_3')) {
        comuna = component.long_name;
      }
      // Buscar ciudad en diferentes tipos
      if (types.includes('locality') || 
          types.includes('administrative_area_level_2')) {
        if (!ciudad) ciudad = component.long_name;
      }
      // Si no hay ciudad, usar administrative_area_level_1 (región)
      if (!ciudad && types.includes('administrative_area_level_1')) {
        ciudad = component.long_name;
      }
    }

    logger.debug('Google Maps - Place:', place);
    logger.debug('Google Maps - Dirección:', place.formatted_address);
    logger.debug('Google Maps - Comuna:', comuna, 'Ciudad:', ciudad);

    // Actualizar dirección, comuna y ciudad
    setFormData(prev => ({
      ...prev,
      direccion: place.formatted_address || prev.direccion,
      comuna: comuna || 'No encontrada',
      ciudad: ciudad || 'No encontrada'
    }));
  }
};
```

### 2. Calendario en Modo Oscuro
**Archivo:** `src/components/ui/input.tsx`

**Cambios:**
- ✅ Agregado `dark:[color-scheme:dark]` para que el navegador use el picker nativo en modo oscuro
- ✅ Agregadas clases `dark:text-foreground` y `dark:bg-card` específicamente para inputs tipo `date`

**Código:**
```typescript
className={cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  // Estilos específicos para input type="date" en dark mode
  type === "date" && "dark:text-foreground dark:bg-card dark:[color-scheme:dark]",
  className
)}
```

### 3. Campos de Comuna y Ciudad - Mejora Visual
**Archivo:** `src/app/postulacion/[tenantId]/page.tsx`

**Cambios:**
- ✅ Cambiado de `disabled` a `readOnly` para mejor accesibilidad
- ✅ Mejorados los colores en dark mode: `dark:bg-gray-800` y `dark:text-gray-200`
- ✅ Agregado `font-medium` para mejor legibilidad
- ✅ Mejorados los textos de ayuda con `dark:text-gray-400`

**Antes:**
```typescript
<Input
  id="comuna"
  placeholder="Se extrae automáticamente"
  value={formData.comuna}
  onChange={(e) => handleInputChange('comuna', e.target.value)}
  disabled
  className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
/>
```

**Después:**
```typescript
<Input
  id="comuna"
  placeholder="Se extrae automáticamente"
  value={formData.comuna}
  readOnly
  className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 cursor-not-allowed font-medium"
/>
```

### 4. CSS Global - Tema Claro/Oscuro
**Archivo:** `src/app/globals.css`

**Cambios:**
- ✅ Invertidos los temas: `:root` ahora es modo claro (por defecto)
- ✅ `.dark` ahora contiene las variables de modo oscuro

**Antes:**
```css
/* Tema oscuro por defecto */
:root {
  --background: 222.2 84% 4.9%; /* Oscuro */
  /* ... */
}

.light {
  --background: 0 0% 100%; /* Claro */
  /* ... */
}
```

**Después:**
```css
/* Tema claro por defecto */
:root {
  --background: 0 0% 100%; /* Claro */
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%; /* Oscuro */
  /* ... */
}
```

## Cómo Probar

1. **Recarga la página:** http://localhost:3000/postulacion/[tenantId]
2. **Abre la consola del navegador** (F12 o Cmd+Option+I en Mac)
3. **Busca una dirección** en el campo "Dirección" usando Google Maps autocomplete
4. **Selecciona una dirección** de las sugerencias
5. **Verifica en la consola** los logs de debug:
   ```
   🗺️ Lugar seleccionado: { formatted_address: ..., address_components: [...], name: ... }
   Google Maps - Place: { ... }
   Google Maps - Dirección: "La Deesa 121, ..."
   Google Maps - Comuna: "Las Condes", Ciudad: "Santiago"
   ```
6. **Verifica visualmente** que los campos "Comuna" y "Ciudad" se llenan automáticamente
7. **Prueba el modo oscuro** haciendo clic en el botón ☀️/🌙 en la esquina superior derecha
8. **Verifica el calendario** haciendo clic en el input "Fecha Nacimiento" - debe mostrarse el picker nativo

## Ejemplo de Direcciones para Probar

- `La Deesa 121, Las Condes, Santiago`
- `Avenida Providencia 1234, Providencia, Santiago`
- `Calle San Martín 567, Viña del Mar, Valparaíso`

## Resultado Esperado

✅ **Comuna y Ciudad se llenan automáticamente** al seleccionar una dirección de Google Maps
✅ **Los campos Comuna y Ciudad se ven claramente** con fondo gris claro/oscuro según el tema
✅ **El calendario nativo se ve correctamente** tanto en modo claro como oscuro
✅ **Los logs de debug aparecen** en la consola del navegador para depuración

## Archivos Modificados

1. `src/components/ui/google-maps-autocomplete.tsx` - Simplificado y mejorado el paso de datos
2. `src/components/ui/input.tsx` - Agregados estilos para input type="date" en dark mode
3. `src/app/postulacion/[tenantId]/page.tsx` - Mejorados campos Comuna/Ciudad
4. `src/app/globals.css` - Corregida estructura de temas claro/oscuro

