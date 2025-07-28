# DocumentUploader Component

## Descripción
Componente simple y directo para subir documentos a Cloudflare R2. Ideal para formularios donde solo necesitas subir un archivo sin gestión completa.

## Características
- ✅ Subida directa de archivos
- ✅ Interfaz drag & drop
- ✅ Estados visuales (idle, uploading, success, error)
- ✅ Diseño moderno y responsive
- ✅ Soporte para PDF, JPG, PNG

## Uso Básico

```tsx
import DocumentUploader from "@/components/DocumentUploader";

<DocumentUploader 
  modulo="guardias" 
  entidadId="uuid-del-guardia" 
/>
```

## Props

| Prop | Tipo | Descripción |
|------|------|-------------|
| `modulo` | `string` | Módulo del sistema (ej: "guardias", "clientes") |
| `entidadId` | `string` | ID de la entidad relacionada |

## Estados

- **idle**: Estado inicial, esperando archivo
- **uploading**: Subiendo archivo
- **success**: Archivo subido exitosamente
- **error**: Error en la subida

## Archivos Soportados

- `.pdf` - Documentos PDF
- `.jpg` - Imágenes JPEG
- `.png` - Imágenes PNG

## Ejemplo Completo

```tsx
"use client";

import DocumentUploader from "@/components/DocumentUploader";

export default function GuardiaForm() {
  const guardiaId = "123e4567-e89b-12d3-a456-426614174000";

  return (
    <div className="space-y-6">
      <h2>Información del Guardia</h2>
      
      {/* Otros campos del formulario */}
      
      <div>
        <h3>Documentos</h3>
        <DocumentUploader 
          modulo="guardias" 
          entidadId={guardiaId} 
        />
      </div>
    </div>
  );
}
```

## Diferencias con DocumentManager

| Característica | DocumentUploader | DocumentManager |
|----------------|------------------|-----------------|
| **Complejidad** | Simple | Completo |
| **Gestión** | Solo subida | Subida + Lista + Descarga + Eliminación |
| **Uso** | Formularios | Páginas de gestión |
| **Tamaño** | Compacto | Completo |
| **Interacción** | Un archivo a la vez | Múltiples archivos |

## Notas Técnicas

- Usa el endpoint `/api/upload-document`
- Los archivos se almacenan en Cloudflare R2
- Los metadatos se guardan en PostgreSQL
- URLs temporales de 10 minutos para descarga 