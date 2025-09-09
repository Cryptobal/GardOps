# DocumentManager Component

Componente para gestionar documentos de diferentes entidades (guardias, clientes, instalaciones).

## Uso

```tsx
import { DocumentManager } from '@/components/shared/document-manager';

<DocumentManager 
  modulo="guardias" 
  entidadId={guardia.id} 
  onDocumentUploaded={() => console.log('Documento subido')}
/>
```

## Props

- `modulo`: Tipo de entidad ("guardias", "clientes", "instalaciones")
- `entidadId`: ID de la entidad (string)
- `onDocumentUploaded`: Callback opcional cuando se sube un documento

## Estructura de Base de Datos

```sql
CREATE TABLE documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instalacion_id UUID,
  guardia_id UUID,
  cliente_id UUID,
  nombre_original TEXT,
  tipo TEXT,
  url TEXT,
  contenido_archivo BYTEA,
  tamaño BIGINT,
  tipo_documento_id UUID,
  fecha_vencimiento DATE,
  creado_en TIMESTAMP DEFAULT now(),
  actualizado_en TIMESTAMP DEFAULT now()
);

-- Índices para rendimiento
CREATE INDEX idx_documentos_instalacion ON documentos(instalacion_id);
CREATE INDEX idx_documentos_guardia ON documentos(guardia_id);
CREATE INDEX idx_documentos_cliente ON documentos(cliente_id);
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
<DocumentManager modulo="guardias" entidadId={guardia.id} />
```

### Clientes
```tsx
<DocumentManager modulo="clientes" entidadId={cliente.id} />
```

### Instalaciones
```tsx
<DocumentManager modulo="instalaciones" entidadId={instalacion.id} />
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