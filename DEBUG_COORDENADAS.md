# 🐛 Debug: Coordenadas de Instalaciones

## ✅ **Correcciones aplicadas:**

### 🔧 **1. Filtro de coordenadas corregido**
- **Problema**: Las coordenadas `null` se filtraban antes de enviar al API
- **Solución**: Ahora `lat` y `lng` siempre se incluyen (incluso si son `null`)

### 🔧 **2. Logging mejorado**
- ✅ Console.log cuando se obtienen coordenadas
- ⚠️ Console.log cuando NO se obtienen coordenadas
- 🚀 Console.log de datos enviados al API
- 📝 Console.log del formData original

### 🔧 **3. Botón de prueba agregado**
- 🧪 Botón "Probar coordenadas (Santiago)" en el formulario
- 📍 Indicador visual de coordenadas establecidas

## 🧪 **Cómo probar las correcciones:**

### **Paso 1: Abrir instalaciones**
- Ve a: http://localhost:3000/instalaciones
- Haz clic en "Nueva instalación" o edita "Caicoma"

### **Paso 2: Probar coordenadas manuales**
1. En el formulario, haz clic en **"🧪 Probar coordenadas (Santiago)"**
2. Deberías ver: `📍 Coordenadas: -33.448900, -70.669300`
3. **Guarda la instalación**
4. Abre la **consola del navegador** (F12)
5. Verifica los logs:
   ```
   🧪 Coordenadas de prueba establecidas: {lat: -33.4489, lng: -70.6693}
   🚀 Datos a enviar al API: {nombre: "...", lat: -33.4489, lng: -70.6693, ...}
   ```

### **Paso 3: Verificar en base de datos**
- Ve a: https://console.neon.tech
- Abre tu proyecto > Tables > instalaciones
- Busca el registro actualizado
- Verifica que `lat` y `lng` **NO sean NULL**

### **Paso 4: Probar el mapa**
1. En la tabla de instalaciones, busca el botón **📍**
2. Haz clic para ver el mapa
3. Debería mostrarse un mapa con marcador rojo

### **Paso 5: Probar AddressAutocomplete**
- **Sin Google Maps API**: Funciona como input normal (sin coordenadas)
- **Con Google Maps API**: Autocompleta y obtiene coordenadas automáticamente

## 🔧 **Qué buscar en la consola:**

### ✅ **Funcionando correctamente:**
```javascript
🧪 Coordenadas de prueba establecidas: {lat: -33.4489, lng: -70.6693}
🚀 Datos a enviar al API: {nombre: "Test", lat: -33.4489, lng: -70.6693}
```

### ⚠️ **Sin coordenadas (normal sin Google Maps):**
```javascript
⚠️ Sin coordenadas disponibles - placeDetails: false address: "Mi dirección"
🚀 Datos a enviar al API: {nombre: "Test", lat: null, lng: null}
```

### ❌ **Error (revisar API):**
```javascript
Error submitting form: ...
```

## 🗺️ **Para habilitar Google Maps completo:**
- Lee: `GOOGLE_MAPS_SETUP.md`
- Configura: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en `.env.local`
- Reinicia: `npm run dev`

---

**🎯 Con estas correcciones, las coordenadas deberían guardarse correctamente!** 