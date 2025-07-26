# Módulo Guardias - Documentación Completa

## 📋 Descripción

Módulo completo para la gestión de guardias de seguridad con funcionalidades de georreferenciación, integrado con Google Maps API para autocompletado de direcciones y extracción automática de coordenadas, comuna y ciudad.

## 🚀 Funcionalidades Implementadas

### ✅ 1. Migración de Base de Datos
- **Archivo**: `db/migrations/20250726_add_lat_lng_to_guardias.sql`
- **Archivo**: `app/api/migrate-structure/route.ts` (migración integrada)
- **Campos agregados**: 
  - `lat` (DOUBLE PRECISION) - Latitud
  - `lng` (DOUBLE PRECISION) - Longitud
- **Índice creado**: `idx_guardias_location` para optimizar búsquedas por ubicación

### ✅ 2. Componente de Ubicación Reutilizable
- **Archivo**: `components/UbicacionAutocomplete.tsx`
- **Funcionalidades**:
  - Autocompletado con Google Places API
  - Extracción automática de coordenadas (lat, lng)
  - Extracción de comuna y ciudad desde `address_components`
  - Restricción a Chile (`country: 'cl'`)
  - Validación y manejo de errores
  - Soporte para modo oscuro

### ✅ 3. Formulario de Guardias con Drawer
- **Archivo**: `components/GuardiaForm.tsx`
- **Características**:
  - Drawer lateral derecho (`side="right"`)
  - Modo oscuro (`dark:bg-black`)
  - Formulario completo con todos los campos de la tabla `guardias`
  - Validación de campos requeridos
  - Integración con `UbicacionAutocomplete`
  - Soporte para crear y editar guardias
  - Campos de solo lectura para coordenadas, comuna y ciudad

### ✅ 4. Página Principal de Guardias
- **Archivo**: `app/guardias/page.tsx`
- **Funcionalidades**:
  - Botón "Nuevo Guardia" con icono
  - Integración con `DatabaseTableViewer`
  - Manejo de edición personalizada
  - Refresco automático de datos tras operaciones

### ✅ 5. API Backend
- **Endpoint**: `/api/table-data/guardias`
- **Métodos soportados**:
  - `GET` - Listar guardias con paginación
  - `POST` - Crear nuevo guardia
  - `PUT` - Actualizar guardia existente
- **Campos de auditoría automáticos**: `created_at`, `updated_at`

## 📊 Campos del Formulario

### Información Personal
- **Nombre** *(requerido)*
- **RUT** *(requerido)*
- **Fecha de Nacimiento**
- **Celular**
- **Email** (con validación)
- **Estado** (Activo/Inactivo)

### Información Laboral
- **Instalación** *(requerido)* - Select cargado desde API
- **Jornada**
- **Fecha de Contrato**
- **Fecha Finiquito**

### Información Bancaria y Previsional
- **Banco**
- **Tipo de Cuenta**
- **Número de Cuenta**
- **Salud**
- **AFP**

### Ubicación (Georreferenciación)
- **Dirección** - Campo con autocompletado
- **Latitud** *(solo lectura)*
- **Longitud** *(solo lectura)*
- **Comuna** *(solo lectura)*
- **Ciudad** *(solo lectura)*

## 🔧 Configuración Requerida

### Variables de Entorno
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
DATABASE_URL=tu_conexion_postgresql
```

### APIs de Google Maps Requeridas
1. **Places API** - Para autocompletado de direcciones
2. **Maps JavaScript API** - Para servicios de geolocalización

## 🛠️ Instalación y Uso

### 1. Ejecutar Migraciones
```bash
curl -X POST http://localhost:3000/api/migrate-structure
```

### 2. Configurar Google Maps
1. Ir a [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/)
2. Habilitar "Places API" y "Maps JavaScript API"
3. Crear API Key y configurar restricciones
4. Agregar la API Key a `.env.local`

### 3. Usar el Módulo
```tsx
import { GuardiaForm } from '@/components/GuardiaForm'

// En tu componente
<GuardiaForm
  open={isOpen}
  onOpenChange={setIsOpen}
  editData={guardia} // Para editar, null para crear
  onSuccess={() => {
    // Callback al guardar exitosamente
    console.log('Guardia guardado')
  }}
/>
```

## 📱 Flujo de Usuario

1. **Crear Guardia**:
   - Hacer clic en "Nuevo Guardia"
   - Completar campos requeridos
   - Buscar dirección con autocompletado
   - Las coordenadas, comuna y ciudad se completan automáticamente
   - Guardar guardia

2. **Editar Guardia**:
   - Hacer clic en el botón de editar en la tabla
   - Se abre el formulario con datos precargados
   - Modificar campos necesarios
   - Actualizar guardia

3. **Georreferenciación**:
   - Al escribir en el campo dirección, aparecen sugerencias
   - Seleccionar una dirección
   - Automáticamente se extraen: lat, lng, comuna, ciudad

## 🎨 Características de UI/UX

- **Modo Oscuro**: Soporte completo con clases `dark:`
- **Responsive**: Formulario adaptable a diferentes tamaños
- **Validación**: Mensajes de error claros
- **Loading States**: Indicadores de carga
- **Accesibilidad**: Labels, roles y navegación por teclado
- **Animaciones**: Transiciones suaves con shadcn/ui

## 📝 Ejemplo de Uso de la API

### Crear Guardia
```bash
curl -X POST http://localhost:3000/api/table-data/guardias \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "rut": "12345678-9",
    "instalacion_id": "uuid-instalacion",
    "direccion": "Av. Providencia 1234, Providencia, Chile",
    "lat": -33.4372,
    "lng": -70.6506,
    "comuna": "Providencia",
    "ciudad": "Santiago",
    "celular": "+56912345678",
    "email": "juan@email.com",
    "estado": "Activo"
  }'
```

### Respuesta Exitosa
```json
{
  "success": true,
  "data": {
    "id": "uuid-generated",
    "nombre": "Juan Pérez",
    "rut": "12345678-9",
    "lat": -33.4372,
    "lng": -70.6506,
    "comuna": "Providencia",
    "ciudad": "Santiago",
    "created_at": "2025-01-26T10:00:00Z",
    "updated_at": "2025-01-26T10:00:00Z"
  },
  "message": "Registro creado exitosamente"
}
```

## 🔍 Análisis de Distancia (Futuro)

Los campos `lat` y `lng` almacenados permiten análisis futuros como:
- Calcular distancia entre guardia e instalación
- Optimización de rutas
- Análisis geográfico de cobertura
- Reportes de proximidad

## 🐛 Solución de Problemas

### Error: Google Maps API no configurada
- Verificar que `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` esté en `.env.local`
- Confirmar que las APIs estén habilitadas en Google Cloud Console

### Error: Campos lat/lng no se guardan
- Verificar que la migración se haya ejecutado correctamente
- Confirmar estructura de la tabla con: `\d guardias` en psql

### Formulario no se abre
- Verificar que los componentes de shadcn/ui estén instalados
- Comprobar imports y rutas de componentes

## 📚 Dependencias

- **React 18+**
- **Next.js 14+**
- **shadcn/ui**: Button, Input, Label, Select, Drawer
- **Google Maps JavaScript API**
- **PostgreSQL 12+**
- **Lucide React**: Iconos

## 🔐 Consideraciones de Seguridad

- La API Key de Google Maps es pública (`NEXT_PUBLIC_*`)
- Configurar restricciones de dominio en Google Cloud Console
- Validar datos del lado del servidor
- Sanitizar inputs antes de guardar en base de datos 