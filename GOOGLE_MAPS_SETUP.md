# 🗺️ Configuración de Google Maps API

## 📋 Pasos para habilitar los mapas

### 1. Obtener API Key de Google Maps

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita las siguientes APIs:
   - **Places API** (para autocompletado de direcciones)
   - **Maps JavaScript API** (para mostrar mapas)

### 2. Crear API Key

1. Ve a **Credentials** > **Create Credentials** > **API Key**
2. Copia la API Key generada
3. **Importante**: Restringe la API Key por dominio para seguridad

### 3. Configurar en la aplicación

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key_aqui

# Ejemplo:
# NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBvOkBWvJMpS4YfXuSMyR8sKlW9B3hEgX0
```

### 4. Reiniciar la aplicación

```bash
npm run dev
```

## ✨ Funcionalidades que se habilitarán:

### 🏠 **En el formulario de instalaciones:**
- Autocompletado de direcciones reales de Chile
- Selección de ubicaciones precisas
- Coordenadas GPS automáticas

### 🗺️ **En la vista de instalaciones:**
- Botón 📍 en cada instalación con coordenadas
- Mapa interactivo con marcador rojo
- Vista de ubicación exacta

## 🔧 Solución de problemas

### ❌ **Error: "API Key no configurada"**
- Verifica que el archivo `.env.local` existe
- Confirma que la variable se llama exactamente `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Reinicia el servidor de desarrollo

### ❌ **Error: "Google Maps no carga"**
- Verifica que las APIs están habilitadas en Google Cloud Console
- Revisa que la API Key no tiene restricciones muy estrictas
- Asegúrate de que hay crédito disponible en Google Cloud

### ❌ **Sin coordenadas en instalaciones existentes**
- Las instalaciones creadas antes de habilitar Google Maps no tendrán coordenadas
- Edita y guarda las instalaciones para obtener coordenadas automáticamente

## 💰 Costos

Google Maps tiene una capa gratuita generosa:
- **Places API**: 17,000 solicitudes gratuitas/mes
- **Maps JavaScript API**: 28,000 cargas de mapa/mes

Para la mayoría de aplicaciones pequeñas y medianas, esto es suficiente.

## 🔐 Seguridad

**Importante**: Restringe tu API Key:

1. En Google Cloud Console > Credentials
2. Edita tu API Key
3. En "Application restrictions" selecciona "HTTP referrers"
4. Agrega:
   - `http://localhost:3000/*` (desarrollo)
   - `https://tudominio.com/*` (producción)

---

**¡Con esto tendrás mapas completamente funcionales! 🎉** 