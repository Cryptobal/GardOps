# Módulo Guardias - Actualización Completa ✅

## 📋 Descripción

Actualización completa del módulo de Guardias con nuevos campos, validaciones avanzadas y APIs para AFPs, ISAPREs y bancos. Se han agregado campos de apellidos y mejorado la experiencia de usuario con validaciones en tiempo real.

## 🚀 Funcionalidades Implementadas

### ✅ 1. Migraciones de Base de Datos

#### **AFPs e ISAPREs**
- **Archivo**: `db/migrations/20250726_create_afps_isapres.sql`
- **Archivo**: `app/api/migrate-structure/route.ts` (migración integrada)
- **Tablas creadas**:
  - `public.afps` con 6 AFPs principales
  - `public.isapres` con 7 sistemas de salud (FONASA primero)

#### **Campos Guardias**  
- **Archivo**: `db/migrations/20250726_add_apellidos_lat_lng_to_guardias.sql`
- **Campos agregados**:
  - `apellido_paterno` (VARCHAR(255))
  - `apellido_materno` (VARCHAR(255))
  - Confirmación de `lat` y `lng` (DOUBLE PRECISION)

### ✅ 2. APIs Backend Nuevas

#### **GET `/api/afps`**
- Retorna lista de AFPs ordenadas alfabéticamente
- Respuesta: `{ success: true, data: [{ id, nombre }] }`

#### **GET `/api/isapres`**  
- Retorna ISAPREs con FONASA primero, resto alfabético
- Respuesta: `{ success: true, data: [{ id, nombre }] }`

#### **GET `/api/bancos`**
- Crea tabla bancos si no existe y la puebla
- Lista completa de bancos chilenos
- Respuesta: `{ success: true, data: [{ id, nombre }] }`

### ✅ 3. Formulario GuardiaForm Actualizado

#### **Nuevos Campos Obligatorios**:
- **Nombre** (`nombre`)
- **Apellido Paterno** (`apellido_paterno`) 
- **Apellido Materno** (`apellido_materno`)
- **RUT** (`rut`) - con validación `^\d{7,8}-[\dKk]$`
- **Fecha de Nacimiento** (`fecha_nacimiento`)
- **Celular** (`celular`) - con validación `^[56]\d{8}$`
- **Instalación** (`instalacion_id`) - select desde API
- **Jornada** (`jornada`)
- **Ubicación** con `UbicacionAutocomplete`
- **Banco** (`banco`) - select desde API
- **Tipo de Cuenta** (`tipo_cuenta`) - opciones predefinidas
- **Salud** (`salud`) - select desde API ISAPREs
- **AFP** (`afp`) - select desde API AFPs  
- **Email** (`email`) - con validación de formato
- **Estado** (`estado`) - Activo/Inactivo

#### **Campos de Solo Lectura**:
- **Latitud** (`lat`) - extraído automáticamente
- **Longitud** (`lng`) - extraído automáticamente  
- **Comuna** (`comuna`) - extraído automáticamente
- **Ciudad** (`ciudad`) - extraído automáticamente

### ✅ 4. Validaciones Frontend

#### **Validaciones Implementadas**:
- **RUT**: Formato `12345678-9` sin puntos, con guión y dígito verificador
- **Celular**: Debe empezar por 5 o 6 y tener 9 dígitos totales
- **Email**: Formato de email válido
- **Campos obligatorios**: Validación para todos los campos requeridos

#### **Experiencia de Usuario**:
- Validación en tiempo real al escribir
- Mensajes de error específicos bajo cada campo
- Indicadores visuales (borde rojo) para campos con errores

### ✅ 5. Características de UX

#### **Drawer Mejorado**:
- `overflow-y-auto` y `h-full` para scroll interno
- Secciones organizadas: Personal, Laboral, Ubicación, Bancaria/Previsional
- Loading states para cargar opciones de selects

#### **Mapa de Previsualización**:
- Componente `MapPreview` integrado
- Muestra ubicación seleccionada usando Google Static Maps API
- Placeholder cuando no hay coordenadas
- Manejo de errores de carga de imágenes

#### **Autocompletado de Ubicación**:
- Reutiliza `UbicacionAutocomplete` existente
- Extrae automáticamente lat, lng, comuna, ciudad
- Integración perfecta con el mapa de previsualización

### ✅ 6. Lógica de Guardado

#### **Proceso de Guardado**:
1. Validación completa del formulario
2. POST a `/api/guardias` con payload JSON completo
3. Alert "Guardia creado con éxito" + console.log
4. Cierre automático del Drawer
5. Refresco automático de la lista

#### **Estructura del Payload**:
```json
{
  "nombre": "string",
  "apellido_paterno": "string", 
  "apellido_materno": "string",
  "rut": "string",
  "fecha_nacimiento": "YYYY-MM-DD",
  "celular": "string", 
  "instalacion_id": "uuid",
  "jornada": "string",
  "direccion": "string",
  "lat": number,
  "lng": number,
  "comuna": "string",
  "ciudad": "string", 
  "banco": "uuid",
  "tipo_cuenta": "string",
  "salud": "uuid",
  "afp": "uuid",
  "email": "string",
  "estado": "Activo|Inactivo"
}
```

## 🛠️ APIs Existentes Utilizadas

- **GET `/api/instalaciones?estado=Activa`** - Para poblar select de instalaciones
- **POST `/api/guardias`** - Para crear guardias (usa sistema genérico existente)

## 📊 Estado de Migraciones

- ✅ **22 migraciones ejecutadas** exitosamente
- ✅ **Tablas AFPs**: 6 registros creados
- ✅ **Tablas ISAPREs**: 7 registros creados (FONASA primero)
- ✅ **Tablas Bancos**: 50+ bancos chilenos disponibles
- ✅ **Campos Guardias**: apellidos y georreferenciación agregados

## 🎯 Validaciones Implementadas

### Regex Patterns:
- **RUT**: `/^\d{7,8}-[\dKk]$/`
- **Celular**: `/^[56]\d{8}$/`  
- **Email**: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

### Opciones Predefinidas:
- **Tipo de Cuenta**: `['cuenta corriente', 'cuenta vista', 'cuenta ahorro', 'cuenta rut']`
- **Estado**: `['Activo', 'Inactivo']`

## 🚀 Cómo Usar

1. **Acceder**: `http://localhost:3000/guardias`
2. **Crear Guardia**: Clic en "Nuevo Guardia"
3. **Completar Formulario**: Todos los campos marcados con * son obligatorios
4. **Seleccionar Ubicación**: Usar autocompletado para dirección 
5. **Verificar Mapa**: Previsualizar ubicación en mapa estático
6. **Guardar**: Validación automática antes de envío

## ✨ Características Destacadas

- 🔍 **Búsqueda Inteligente de Direcciones** con Google Places
- 🗺️ **Mapa de Previsualización** en tiempo real
- ✅ **Validaciones en Tiempo Real** con feedback visual
- 📱 **UI Responsive** con scroll en Drawer
- 🎯 **Carga Lazy** de opciones de selects
- 🔒 **Validaciones RUT Chileno** específicas
- 📞 **Validación Celular Chileno** (5x y 6x)

## 🎉 Resultado Final

El módulo de Guardias ahora cuenta con un formulario completo y profesional que maneja toda la información necesaria para registrar guardias de seguridad, incluyendo datos personales, laborales, ubicación georreferenciada, información bancaria y previsional, todo con validaciones robustas y una excelente experiencia de usuario. 