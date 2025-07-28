# Sistema de Gestión de Documentos

## Descripción
Sistema completo para subir, almacenar y gestionar documentos usando Cloudflare R2 como almacenamiento y PostgreSQL para metadatos.

## Características
- ✅ Subida de archivos a Cloudflare R2
- ✅ URLs temporales para descarga (10 minutos)
- ✅ Metadatos almacenados en PostgreSQL
- ✅ Componente reutilizable para cualquier módulo
- ✅ Interfaz moderna y responsive
- ✅ Gestión completa (subir, descargar, eliminar)

## Endpoints API

### POST /api/upload-document
Sube un documento a R2 y guarda metadatos en la base de datos.

**Parámetros:**
- `file`: Archivo a subir
- `modulo`: Módulo del sistema (ej: "guardias", "clientes")
- `entidad_id`: ID de la entidad relacionada

**Respuesta:**
```json
{
  "success": true,
  "key": "guardias/uuid.pdf",
  "nombre_original": "documento.pdf"
}
```

### POST /api/document-url
Genera una URL temporal para descargar un documento.

**Body:**
```json
{
  "key": "guardias/uuid.pdf"
}
```

**Respuesta:**
```json
{
  "url": "https://r2.cloudflare.com/temp-url..."
}
```

### GET /api/documents
Lista documentos de una entidad específica.

**Query params:**
- `modulo`: Módulo del sistema
- `entidad_id`: ID de la entidad

**Respuesta:**
```json
{
  "documentos": [
    {
      "id": "uuid",
      "nombre_original": "documento.pdf",
      "tipo": "application/pdf",
      "url": "guardias/uuid.pdf",
      "creado_en": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### DELETE /api/documents
Elimina un documento.

**Query params:**
- `id`: ID del documento

## Componente DocumentManager

### Uso básico
```tsx
import { DocumentManager } from "@/components/ui/document-manager";

function MiComponente() {
  return (
    <DocumentManager 
      modulo="guardias"
      entidad_id="uuid-del-guardia"
      onDocumentUploaded={() => console.log("Documento subido")}
    />
  );
}
```

### Props
- `modulo`: Módulo del sistema (string)
- `entidad_id`: ID de la entidad (string)
- `onDocumentUploaded`: Callback opcional cuando se sube un documento

## Estructura de Base de Datos

```sql
CREATE TABLE documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo TEXT NOT NULL,
  entidad_id UUID NOT NULL,
  nombre_original TEXT,
  tipo TEXT,
  url TEXT,
  creado_en TIMESTAMP DEFAULT now()
);

-- Índices para rendimiento
CREATE INDEX idx_documentos_modulo_entidad ON documentos(modulo, entidad_id);
CREATE INDEX idx_documentos_creado_en ON documentos(creado_en DESC);
```

## Configuración

### Variables de entorno (.env.local)
```env
R2_ACCESS_KEY_ID=7572bbb3853f3cb1e43640bf5ee85670
R2_SECRET_ACCESS_KEY=d95dada9bcf003fff528de9ea2ea5092b2e1961ef3d900b141f6ee9c97904fe2
R2_ENDPOINT=https://e56e6231ebbfb3ed318e5df0a7092bc.r2.cloudflarestorage.com
R2_BUCKET=gardops-docs
```

## Migración

Para crear la tabla de documentos, visita:
```
GET /api/migrate-documentos
```

## Ejemplos de uso por módulo

### Guardias
```tsx
<DocumentManager modulo="guardias" entidad_id={guardia.id} />
```

### Clientes
```tsx
<DocumentManager modulo="clientes" entidad_id={cliente.id} />
```

### Instalaciones
```tsx
<DocumentManager modulo="instalaciones" entidad_id={instalacion.id} />
```

## Seguridad

- URLs temporales con expiración de 10 minutos
- Validación de tipos de archivo en el frontend
- Autenticación requerida (middleware)
- Sanitización de nombres de archivo
- UUIDs únicos para evitar colisiones

## Limitaciones

- Tamaño máximo de archivo: Configurado en R2
- Tipos de archivo: Cualquier tipo soportado por el navegador
- Duración de URLs: 10 minutos (configurable)
- Almacenamiento: Limitado por el plan de R2 