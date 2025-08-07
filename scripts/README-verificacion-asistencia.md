# 🔍 Verificación de Asistencia Diaria de Guardias

Este conjunto de scripts permite verificar si un guardia tiene asistencia registrada para la fecha actual en la tabla `as_turnos_pauta_mensual`.

## 📋 Archivos Incluidos

- `verificar-asistencia-guardia.ts` - Script principal de verificación individual
- `ejemplo-verificar-asistencia.ts` - Ejemplo de uso individual
- `listar-guardias-disponibles.ts` - Lista guardias disponibles para pruebas
- `verificar-multiples-guardias.ts` - Verifica asistencia de todos los guardias del día

## 🚀 Cómo Usar

### 1. Listar Guardias Disponibles

Primero, ejecuta este comando para ver qué guardias están disponibles:

```bash
npx ts-node scripts/listar-guardias-disponibles.ts
```

### 2. Verificar Asistencia de un Guardia

#### Opción A: Modificar el script principal

1. Edita `verificar-asistencia-guardia.ts`
2. Reemplaza `'REEMPLAZAR_ID_GUARDIA'` con el ID real del guardia
3. Ejecuta:

```bash
npx ts-node scripts/verificar-asistencia-guardia.ts
```

#### Opción B: Usar el script de ejemplo

1. Edita `ejemplo-verificar-asistencia.ts`
2. Reemplaza el ID de ejemplo con el ID real del guardia
3. Ejecuta:

```bash
npx ts-node scripts/ejemplo-verificar-asistencia.ts
```

### 3. Verificar Todos los Guardias del Día

Para ver la asistencia de todos los guardias registrados para hoy:

```bash
npx ts-node scripts/verificar-multiples-guardias.ts
```

## 📊 Resultados Esperados

### ✅ Si el guardia tiene asistencia registrada:

```
✅ Guardia con asistencia registrada hoy:
Estado: trabajado
Observaciones: Sin observaciones
Reemplazado por: null
```

### ❌ Si el guardia no tiene asistencia registrada:

```
❌ Guardia sin registro de asistencia para hoy
```

### 📋 Verificación múltiple:

```
✅ Se encontraron 4 guardias con asistencia registrada:

1. A Test Guardia
   ID: 7c84d4ad-dcb2-40f9-9d03-b7d1bf673220
   Estado: libre
   Observaciones: Sin observaciones
   Reemplazado por: Ninguno
   Puesto: Puesto #2
   Instalación: A Test

📊 Estadísticas por estado:
   - libre: 3 guardias
   - T: 1 guardias
```

## 🔧 Detalles Técnicos

### Consulta SQL Individual

```sql
SELECT 
  estado,
  observaciones,
  reemplazo_guardia_id,
  anio,
  mes,
  dia
FROM as_turnos_pauta_mensual 
WHERE guardia_id = $1 
  AND anio = $2 
  AND mes = $3 
  AND dia = $4
```

### Consulta SQL Múltiple

```sql
SELECT DISTINCT
  pm.guardia_id,
  g.nombre,
  g.apellido_paterno,
  g.apellido_materno,
  pm.estado,
  pm.observaciones,
  pm.reemplazo_guardia_id,
  po.nombre_puesto,
  i.nombre as instalacion_nombre
FROM as_turnos_pauta_mensual pm
LEFT JOIN guardias g ON pm.guardia_id = g.id
LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
LEFT JOIN instalaciones i ON po.instalacion_id = i.id
WHERE pm.anio = $1 
  AND pm.mes = $2 
  AND pm.dia = $3
ORDER BY g.nombre, g.apellido_paterno
```

### Campos Verificados

- **estado**: Estado del turno (trabajado, libre, permiso, T, etc.)
- **observaciones**: Observaciones del turno
- **reemplazo_guardia_id**: ID del guardia que reemplaza (si aplica)
- **nombre_puesto**: Nombre del puesto asignado
- **instalacion_nombre**: Nombre de la instalación

### Fecha de Verificación

El script usa `new Date()` para obtener la fecha actual y compara:
- `anio` con `getFullYear()`
- `mes` con `getMonth() + 1` (ajuste porque getMonth() devuelve 0-11)
- `dia` con `getDate()`

## 🛠️ Personalización

### Modificar la Consulta Individual

Si necesitas verificar campos adicionales, modifica la consulta SQL en `verificar-asistencia-guardia.ts`:

```typescript
const resultado = await query(`
  SELECT 
    estado,
    observaciones,
    reemplazo_guardia_id,
    // Agregar campos adicionales aquí
    anio,
    mes,
    dia
  FROM as_turnos_pauta_mensual 
  WHERE guardia_id = $1 
    AND anio = $2 
    AND mes = $3 
    AND dia = $4
`, [guardiaId, anio, mes, dia]);
```

### Verificar Fechas Específicas

Para verificar una fecha específica en lugar de hoy, modifica la función:

```typescript
async function verificarAsistenciaGuardia(guardiaId: string, fechaEspecifica?: Date) {
  const fecha = fechaEspecifica || new Date();
  // ... resto del código
}
```

### Filtrar por Estado

Para verificar solo guardias con un estado específico, modifica `verificar-multiples-guardias.ts`:

```typescript
// Agregar filtro por estado
WHERE pm.anio = $1 
  AND pm.mes = $2 
  AND pm.dia = $3
  AND pm.estado = 'trabajado'  // Solo guardias trabajando
```

## 🔍 Troubleshooting

### Error: "No hay guardias activos"

- Verifica que la tabla `guardias` tenga registros
- Asegúrate de que los guardias tengan `activo = true`

### Error: "Tabla as_turnos_pauta_mensual no existe"

- Verifica que la tabla esté creada en la base de datos
- Ejecuta los scripts de migración si es necesario

### Error de Conexión a Base de Datos

- Verifica que `DATABASE_URL` esté configurado en `.env`
- Asegúrate de que la base de datos esté accesible

### Guardias con ID null

Si ves guardias con "null null" en el nombre, significa que hay registros en `as_turnos_pauta_mensual` con `guardia_id` null. Esto puede ser normal para puestos PPC sin asignación.

## 📝 Notas Importantes

- El script verifica solo la fecha actual
- Los IDs de guardias son UUIDs
- La tabla `as_turnos_pauta_mensual` debe tener los campos: `estado`, `observaciones`, `reemplazo_guardia_id`
- El script maneja casos donde no hay registros para la fecha especificada
- Los estados pueden incluir: 'trabajado', 'libre', 'permiso', 'T', etc.
- El script de verificación múltiple incluye estadísticas por estado
