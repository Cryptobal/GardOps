# Validación de Clientes con Instalaciones Activas

## Descripción

Se ha implementado una validación que impide inactivar clientes que tienen instalaciones activas. Esta funcionalidad asegura la integridad de los datos y previene inconsistencias en el sistema.

## Funcionalidad

### Validación Backend

La validación se ejecuta en el backend cuando se intenta cambiar el estado de un cliente a "Inactivo":

1. **API Endpoint**: `/api/clientes/[id]` (PUT)
2. **API Endpoint**: `/api/clientes` (PUT)

### Lógica de Validación

```sql
-- Verificar si el cliente tiene instalaciones activas
SELECT COUNT(*) as count 
FROM instalaciones 
WHERE cliente_id = $1 AND estado = 'Activo'
```

Si el cliente tiene instalaciones activas:
- Se bloquea la operación
- Se devuelve un error HTTP 400
- Se incluye información detallada de las instalaciones

### Respuesta de Error

```json
{
  "success": false,
  "error": "No se puede inactivar el cliente porque tiene instalaciones activas. Primero debe inactivar todas las instalaciones asociadas.",
  "instalacionesActivas": [
    {
      "id": "uuid",
      "nombre": "Instalación A",
      "estado": "Activo"
    }
  ],
  "instalacionesInactivas": [
    {
      "id": "uuid",
      "nombre": "Instalación B", 
      "estado": "Inactivo"
    }
  ],
  "clienteId": "uuid"
}
```

## Frontend

### Componentes Actualizados

1. **Página de Detalle del Cliente** (`src/app/clientes/[id]/page.tsx`)
   - Maneja el error de instalaciones activas
   - Muestra modal de confirmación
   - Muestra modal de error con detalles

2. **Página de Test de Clientes** (`src/app/clientes/test-page.tsx`)
   - Maneja el error en el toggle de estado
   - Muestra modal de error con detalles

### Modal de Error

Se utiliza el componente `ErrorModal` (`src/components/ui/error-modal.tsx`) que muestra:

- **Título**: "No se puede inactivar el cliente"
- **Mensaje**: Explicación del problema
- **Detalles**: Lista de instalaciones activas e inactivas
- **Solución**: Instrucciones para resolver el problema

## Casos de Uso

### Caso 1: Cliente con Instalaciones Activas
1. Usuario intenta inactivar un cliente
2. Sistema verifica instalaciones activas
3. Se muestra modal de error con detalles
4. Operación se cancela

### Caso 2: Cliente sin Instalaciones Activas
1. Usuario intenta inactivar un cliente
2. Sistema verifica instalaciones activas
3. No hay instalaciones activas
4. Cliente se inactiva correctamente

### Caso 3: Cliente sin Instalaciones
1. Usuario intenta inactivar un cliente
2. Sistema verifica instalaciones activas
3. No hay instalaciones
4. Cliente se inactiva correctamente

## Archivos Modificados

### Backend
- `src/app/api/clientes/[id]/route.ts` - Validación en endpoint específico
- `src/lib/api/clientes.ts` - Validación en función de actualización

### Frontend
- `src/app/clientes/[id]/page.tsx` - Manejo de error y modal
- `src/app/clientes/test-page.tsx` - Manejo de error y modal

### Componentes
- `src/components/ui/error-modal.tsx` - Modal de error (ya existía)

## Pruebas

### Script de Prueba
Se ha creado un script para probar la funcionalidad:

```bash
npx tsx scripts/test-validacion-clientes.ts
```

Este script:
1. Busca clientes con instalaciones activas
2. Intenta inactivar un cliente con instalaciones activas
3. Verifica que la validación funcione
4. Prueba con clientes sin instalaciones activas

### Pruebas Manuales

1. **Crear un cliente con instalaciones activas**:
   - Crear un cliente
   - Crear una instalación asociada
   - Intentar inactivar el cliente
   - Verificar que se muestre el modal de error

2. **Inactivar instalaciones primero**:
   - Inactivar todas las instalaciones del cliente
   - Intentar inactivar el cliente
   - Verificar que se inactive correctamente

## Consideraciones

### Rendimiento
- La validación se ejecuta solo cuando se intenta inactivar un cliente
- Se utiliza una consulta optimizada con COUNT
- Se incluye información detallada solo cuando es necesario

### Seguridad
- La validación se ejecuta en el backend
- No se puede eludir desde el frontend
- Se mantiene la integridad de los datos

### UX/UI
- Mensaje claro y específico
- Información detallada de las instalaciones
- Instrucciones para resolver el problema
- Modal no intrusivo y fácil de cerrar

## Mantenimiento

### Agregar Validación a Nuevos Endpoints
Si se crean nuevos endpoints para cambiar el estado de clientes, agregar la validación:

```typescript
// Verificar si se está intentando inactivar el cliente
if (body.estado === 'Inactivo') {
  // Verificar si el cliente tiene instalaciones activas
  const instalacionesActivas = await query(`
    SELECT COUNT(*) as count 
    FROM instalaciones 
    WHERE cliente_id = $1 AND estado = 'Activo'
  `, [clienteId]);

  if (instalacionesActivas.rows[0].count > 0) {
    // Obtener información detallada y devolver error
    // ...
  }
}
```

### Modificar Mensajes
Los mensajes de error se pueden personalizar en:
- `src/app/api/clientes/[id]/route.ts`
- `src/lib/api/clientes.ts`
- Componentes del frontend 