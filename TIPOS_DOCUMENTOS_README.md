# 📄 Sistema de Tipos de Documentos - GardOps

## 🎯 Descripción

El sistema de tipos de documentos permite categorizar y organizar los documentos subidos en GardOps por módulo (clientes, guardias, instalaciones, etc.). Esto mejora la organización y facilita la búsqueda y gestión de documentos.

## 🗄️ Estructura de Base de Datos

### Tabla: `tipos_documentos`
```sql
CREATE TABLE tipos_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo TEXT NOT NULL, -- 'clientes', 'guardias', 'instalaciones'
  nombre TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT now()
);
```

### Modificación: `documentos`
```sql
ALTER TABLE documentos ADD COLUMN tipo_documento_id UUID REFERENCES tipos_documentos(id);
```

## 🧩 Componentes Implementados

### 1. Página de Configuración
- **Ruta**: `/configuracion/tipos-documentos`
- **Funcionalidades**:
  - Lista todos los tipos de documentos por módulo
  - Filtros por módulo
  - Crear nuevos tipos
  - Editar tipos existentes
  - Activar/desactivar tipos
  - Eliminar tipos (soft delete)

### 2. API REST
- **Base**: `/api/tipos-documentos`
- **Endpoints**:
  - `GET /api/tipos-documentos?modulo=clientes` - Obtener tipos por módulo
  - `POST /api/tipos-documentos` - Crear nuevo tipo
  - `PUT /api/tipos-documentos/:id` - Actualizar tipo
  - `DELETE /api/tipos-documentos/:id` - Eliminar tipo (soft delete)

### 3. DocumentUploader Mejorado
- **Ubicación**: `src/components/DocumentUploader.tsx`
- **Nuevas funcionalidades**:
  - Select dinámico de tipos de documentos
  - Carga automática de tipos según el módulo
  - Validación de tipo requerido

### 4. DocumentList Mejorado
- **Ubicación**: `src/components/DocumentList.tsx`
- **Nuevas funcionalidades**:
  - Muestra el tipo de documento en cada archivo
  - Badge visual para el tipo
  - Información completa del documento

## 🚀 Uso

### Para Administradores

1. **Configurar Tipos de Documentos**:
   - Ir a Configuración > Tipos de Documentos
   - Crear tipos específicos para cada módulo
   - Ejemplo: "Contrato", "Identificación", "Certificado" para clientes

2. **Gestionar Tipos**:
   - Activar/desactivar tipos según necesidades
   - Editar nombres si es necesario
   - Eliminar tipos obsoletos

### Para Usuarios

1. **Subir Documentos**:
   - Al subir un documento, seleccionar el tipo correspondiente
   - El sistema validará que se seleccione un tipo

2. **Ver Documentos**:
   - Los documentos se muestran con su tipo en un badge
   - Fácil identificación visual del tipo de documento

## 📋 Tipos Predefinidos

El sistema incluye 15 tipos predefinidos por módulo:

### Clientes
- Contrato
- Identificación
- Certificado
- Factura
- Otros

### Guardias
- Contrato Laboral
- Certificado de Capacitación
- Identificación
- Certificado Médico
- Otros

### Instalaciones
- Plano
- Certificado de Seguridad
- Licencia Municipal
- Contrato de Arriendo
- Otros

## 🔧 Configuración Técnica

### Variables de Entorno
No se requieren variables adicionales.

### Dependencias
- `@radix-ui/react-select` - Para el componente Select

### Migración
La migración se ejecuta automáticamente en:
```
GET /api/migrate-tipos-documentos
```

## 🎨 Diseño

### Características del UI
- **Tema**: Dark mode profesional
- **Responsive**: Adaptable a móvil y desktop
- **Accesibilidad**: Navegación por teclado y lectores de pantalla
- **Feedback**: Toast notifications para todas las acciones

### Componentes Utilizados
- `Card` - Contenedores principales
- `Button` - Acciones
- `Badge` - Etiquetas de tipo
- `Select` - Selector de tipos
- `Modal` - Formularios de creación/edición
- `Toast` - Notificaciones

## 🔄 Flujo de Datos

1. **Carga de Tipos**: Al montar DocumentUploader, se cargan los tipos del módulo
2. **Selección**: Usuario selecciona tipo antes de subir
3. **Validación**: API valida que el tipo existe y está activo
4. **Almacenamiento**: Documento se guarda con referencia al tipo
5. **Visualización**: DocumentList muestra el tipo con badge

## 🐛 Solución de Problemas

### Error: "No se pudieron cargar los tipos de documentos"
- Verificar que la tabla `tipos_documentos` existe
- Ejecutar migración: `/api/migrate-tipos-documentos`

### Error: "Faltan campos requeridos"
- Asegurar que se selecciona un tipo de documento
- Verificar que el módulo es válido

### Tipos no aparecen en el selector
- Verificar que el módulo coincide
- Comprobar que los tipos están activos

## 📈 Próximas Mejoras

- [ ] Búsqueda de documentos por tipo
- [ ] Filtros avanzados en DocumentList
- [ ] Estadísticas de documentos por tipo
- [ ] Exportación de documentos por tipo
- [ ] Plantillas de documentos por tipo

## ✅ Estado de Implementación

- ✅ Tabla de base de datos creada
- ✅ API REST implementada
- ✅ Página de configuración funcional
- ✅ DocumentUploader actualizado
- ✅ DocumentList mejorado
- ✅ Migración automática
- ✅ Tipos predefinidos creados
- ✅ UI/UX profesional implementada

---

**¡Sistema de tipos de documentos implementado con éxito! 🎉** 