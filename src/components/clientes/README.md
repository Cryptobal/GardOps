# Módulo de Clientes - GardOps

## 📋 Descripción
Módulo completo de gestión de clientes para el sistema GardOps. Permite realizar operaciones CRUD completas con una interfaz moderna y minimalista en modo oscuro.

## ✨ Características

### 🎨 Diseño
- **Tema oscuro premium** con colores consistentes
- **Interfaz minimalista** siguiendo principios UX modernos
- **Gradientes y animaciones** suaves para mejor experiencia
- **Responsive design** que funciona en móvil y desktop

### 🔧 Funcionalidades
- ✅ **Crear clientes** con validación completa
- ✅ **Editar clientes** existentes
- ✅ **Eliminar clientes** con confirmación modal
- ✅ **Listar clientes** en tabla ordenada
- ✅ **Autocompletado de direcciones** con Google Maps
- ✅ **Validaciones** en tiempo real
- ✅ **Notificaciones** (toasts) de éxito/error
- ✅ **Modales de confirmación** para acciones destructivas

### 🗄️ Base de Datos
La tabla `clientes` se crea automáticamente con:
```sql
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  rut_representante TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  latitud FLOAT,
  longitud FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 📊 Campos de Cliente
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `nombre` | TEXT | ✅ | Nombre del cliente |
| `rut_representante` | TEXT | ✅ | RUT del representante (formato: 12345678-9) |
| `email` | TEXT | ❌ | Email de contacto (validado) |
| `telefono` | TEXT | ❌ | Teléfono de contacto |
| `direccion` | TEXT | ❌ | Dirección completa con autocompletado |
| `latitud` | FLOAT | ❌ | Coordenada de latitud (Google Maps) |
| `longitud` | FLOAT | ❌ | Coordenada de longitud (Google Maps) |

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18** con hooks modernos
- **TypeScript** para tipado fuerte
- **Tailwind CSS** para estilos
- **Lucide React** para iconografía
- **shadcn/ui** como base de componentes

### Backend
- **Next.js 14** API Routes
- **PostgreSQL** con Neon
- **Zod** para validaciones
- **pg** para conexión a base de datos

### Componentes UI Personalizados
- `Modal` - Modal genérico con backdrop blur
- `useConfirmModal` - Hook para confirmaciones elegantes
- `Toast` y `useToast` - Sistema de notificaciones
- `Table` - Tabla con diseño oscuro moderno
- `InputDireccion` - Autocompletado de direcciones

## 🚀 Uso

### API Endpoints
```typescript
GET    /api/clientes          // Obtener todos los clientes
POST   /api/clientes          // Crear nuevo cliente  
PUT    /api/clientes          // Actualizar cliente existente
DELETE /api/clientes?id=uuid  // Eliminar cliente por ID
```

### Ejemplo de Uso en Componente
```typescript
import { Cliente } from "../../lib/schemas/clientes";

// Cargar clientes
const response = await fetch("/api/clientes");
const result = await response.json();
const clientes: Cliente[] = result.data;

// Crear cliente
const nuevoCliente = await fetch("/api/clientes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    nombre: "Empresa ACME",
    rut_representante: "12345678-9",
    email: "contacto@acme.cl",
    telefono: "+56 9 1234 5678",
    direccion: "Av. Principal 123, Santiago",
    latitud: -33.4569,
    longitud: -70.6483
  })
});
```

## 🔒 Validaciones

### Validaciones de Frontend
- **Nombre**: Mínimo 2 caracteres, máximo 100
- **RUT**: Formato chileno válido (12345678-9)
- **Email**: Formato de email válido (opcional)
- **Teléfono**: Campo libre (opcional)
- **Dirección**: Con autocompletado de Google Maps (opcional)

### Validaciones de Backend
Usando **Zod** schemas:
```typescript
const crearClienteSchema = z.object({
  nombre: z.string().min(2).max(100),
  rut_representante: z.string().regex(/^[0-9]+-[0-9kK]{1}$/),
  email: z.string().email().optional().or(z.literal("")),
  // ... más validaciones
});
```

## 🎯 Experiencia de Usuario

### Flujo de Creación
1. Usuario hace clic en "Nuevo Cliente"
2. Se abre modal con formulario
3. Campos se validan en tiempo real
4. Dirección se autocompleta con Google Maps
5. Al guardar: toast de éxito + recarga tabla

### Flujo de Edición
1. Usuario hace clic en ícono de editar
2. Modal se abre pre-llenado con datos
3. Mismas validaciones que creación
4. Al guardar: toast de éxito + actualización tabla

### Flujo de Eliminación
1. Usuario hace clic en ícono de eliminar
2. Modal de confirmación elegante aparece
3. Si confirma: eliminación + alert + recarga tabla
4. Si cancela: no pasa nada

## 🎨 Características de Diseño

### Colores
- **Primario**: Azul (#3B82F6) para acciones principales
- **Destructivo**: Rojo (#EF4444) para eliminaciones
- **Superficie**: Fondo semi-transparente con blur
- **Texto**: Gradientes para títulos, muted para secundarios

### Animaciones
- **Fade in**: Al cargar la página
- **Slide from bottom**: Elementos principales
- **Hover effects**: En botones y filas de tabla
- **Loading spinners**: Durante operaciones async

### Responsive
- **Desktop**: Formulario en 2 columnas
- **Mobile**: Formulario en 1 columna
- **Tabla**: Scroll horizontal automático

## 🔮 Preparado para Escalabilidad

Este módulo está diseñado como **base para la jerarquía**:
- Clientes → Instalaciones → Guardias

### Futuras Extensiones
- **Instalaciones** vinculadas a clientes
- **Contratos** con fechas y montos
- **Historial** de cambios
- **Archivos adjuntos** por cliente
- **Dashboard** con métricas

## 📝 Archivos Implementados

```
src/
├── app/
│   ├── api/clientes/route.ts        # API endpoints CRUD
│   └── clientes/page.tsx            # Página principal del módulo
├── components/ui/
│   ├── modal.tsx                    # Modal + useConfirmModal
│   ├── toast.tsx                    # Toast + useToast  
│   ├── table.tsx                    # Tabla personalizada
│   └── input-direccion.tsx          # (ya existía)
├── lib/
│   ├── api/clientes.ts              # Funciones de API
│   └── schemas/clientes.ts          # Validaciones Zod
```

## 🎉 Estado: ✅ COMPLETADO

El módulo está **100% funcional** y listo para producción con:
- ✅ CRUD completo
- ✅ Validaciones robustas  
- ✅ Diseño oscuro premium
- ✅ UX moderna y fluida
- ✅ Conectado a Neon
- ✅ Código limpio y modular
- ✅ Preparado para escalabilidad

**¡El módulo de Clientes ha sido creado exitosamente! 🚀** 