# 🔍 Auditoría de Guardias - GardOps

## Objetivo
Validar que la tabla `guardias`, relaciones y módulo frontend estén listos antes de continuar con optimización de asignaciones.

## Ejecución

### Opción 1: Usando npm script (Recomendado)
```bash
npm run audit:guardias
```

### Opción 2: Ejecución directa
```bash
npx ts-node scripts/audit-guardias.ts
```

## Qué verifica el script

### 📊 Métricas Base
- Total de guardias en la base de datos
- Guardias sin coordenadas geográficas
- Guardias sin instalación asignada
- Número de instalaciones distintas con guardias

### 🔍 Duplicados de RUT
- Detecta RUTs duplicados en la tabla guardias
- Muestra los 5 duplicados más frecuentes

### 🔗 Integridad de Claves Foráneas
- Verifica que todas las instalaciones referenciadas existan
- Detecta guardias con instalaciones órfanas

### 🗺️ Índices Espaciales
- Verifica existencia de índices en latitud/longitud
- Recomienda creación de índices GiST si faltan

### 🏗️ Estructura de Tabla
- Valida que existan columnas críticas:
  - `latitud` y `longitud`
  - `instalacion_id`
  - `rut` y `email`

### 🖼️ Auditoría Frontend
- Verifica existencia de página `/guardias`
- Verifica existencia de componente `GuardDetailModal.tsx`
- Verifica existencia de API `/api/guardias`

### 📈 Estadísticas Adicionales
- Distribución por estado (Activo/Inactivo)
- Distribución por tipo de contrato
- Sueldo promedio de guardias

## Resultados de la Auditoría Actual

### ✅ Estado Actual (Ejecutado el 2024-12-19)

**📊 Métricas Base:**
- **Total de guardias:** 220
- **Sin coordenadas:** 220 (100%)
- **Sin instalación:** No aplicable (columna no existe)

**🏗️ Estructura de Tabla:**
- ✅ `latitud` y `longitud` - PRESENTES
- ❌ `instalacion_id` - FALTA
- ❌ `rut` - FALTA
- ✅ `email` - PRESENTE

**🗺️ Índices Espaciales:**
- ✅ `idx_guardias_location` - PRESENTE

**🖼️ Frontend:**
- ✅ Página `/guardias` - PRESENTE
- ❌ `GuardDetailModal.tsx` - FALTA
- ✅ API `/api/guardias` - PRESENTE

**📈 Estadísticas:**
- **Guardias Activos:** 220
- **Guardias Inactivos:** 0

### ⚠️ Problemas Detectados

1. **Completar coordenadas:** 220 guardias sin latitud/longitud
2. **Agregar columna instalacion_id** a la tabla guardias
3. **Agregar columna rut** a la tabla guardias
4. **Crear componente GuardDetailModal.tsx**

## Interpretación de Resultados

### ✅ Todo OK
Si el script muestra "Todo OK. Puede avanzar con optimización de asignaciones 🤝", significa que:
- No hay problemas críticos detectados
- La estructura está lista para optimización
- Puedes proceder con confianza

### ⚠️ Problemas Detectados
El script listará acciones específicas a realizar:

1. **Completar coordenadas**: Guardias sin latitud/longitud
2. **Crear índices**: Para optimizar búsquedas geográficas
3. **Corregir instalaciones órfanas**: Referencias a instalaciones inexistentes
4. **Crear componentes frontend**: Archivos faltantes
5. **Resolver duplicados**: RUTs duplicados en la base de datos

## Ejemplo de Salida Real

```
🔍  AUDITORÍA DE GUARDIAS

🏗️  ESTRUCTURA DE TABLA
Columnas encontradas en tabla guardias:
   • id (uuid, NOT NULL)
   • tenant_id (uuid, NULL)
   • nombre (text, NOT NULL)
   • apellido (text, NOT NULL)
   • email (text, NULL)
   • telefono (text, NULL)
   • activo (boolean, NULL)
   • created_at (timestamp without time zone, NULL)
   • usuario_id (uuid, NULL)
   • updated_at (timestamp without time zone, NULL)
   • latitud (numeric, NULL)
   • longitud (numeric, NULL)
   • ciudad (character varying, NULL)
   • comuna (character varying, NULL)
   • region (character varying, NULL)

📊  MÉTRICAS BASE
┌────────────┬────────┐
│ (index)    │ Values │
├────────────┼────────┤
│ total      │ '220'  │
│ sin_coords │ '220'  │
└────────────┴────────┘

🔍  DUPLICADOS DE RUT
⚠️  No se puede verificar - columna rut no existe

🔗  INTEGRIDAD DE CLAVES FORÁNEAS
⚠️  No se puede verificar - columna instalacion_id no existe

🗺️  ÍNDICES ESPACIALES
✅  Índices de ubicación presentes:
   • idx_guardias_location

🔍  COLUMNAS CRÍTICAS
✅  latitud
✅  longitud
❌  instalacion_id - FALTA
❌  rut - FALTA
✅  email

🖼️  AUDITORÍA FRONTEND
✅  Página /guardias presente
❌  Falta GuardDetailModal.tsx
✅  API /api/guardias presente

📋  ACCIONES RECOMENDADAS
⚠️  Problemas detectados:
   • Completar latitud/longitud en 220 guardias
   • Agregar columna instalacion_id a la tabla guardias
   • Agregar columna rut a la tabla guardias
   • Crear componente GuardDetailModal.tsx

📈  ESTADÍSTICAS ADICIONALES
┌────────────────────┬────────┐
│ (index)            │ Values │
├────────────────────┼────────┤
│ Guardias Activos   │ '220'  │
│ Guardias Inactivos │ '0'    │
└────────────────────┴────────┘

🏁 Auditoría completada – revise el resumen anterior
```

## Solución de Problemas Comunes

### Error de Conexión
```bash
❌ Error durante la auditoría: connect ECONNREFUSED
```
**Solución**: Verificar que la base de datos esté ejecutándose y que `DATABASE_URL` esté configurado en `.env.local`

### Tabla No Existe
```bash
❌ Error durante la auditoría: relation "guardias" does not exist
```
**Solución**: Ejecutar las migraciones de base de datos primero

### Permisos de Archivo
```bash
❌ Error: EACCES: permission denied
```
**Solución**: Dar permisos de ejecución al script:
```bash
chmod +x scripts/audit-guardias.ts
```

## Próximos Pasos

1. **Ejecutar auditoría**: `npm run audit:guardias`
2. **Revisar resultados**: Corregir problemas marcados con ❌
3. **Re-ejecutar**: Hasta que muestre "Todo OK"
4. **Proceder**: Con optimización de asignaciones

## Mantenimiento

- Ejecutar antes de cada sprint de optimización
- Ejecutar después de migraciones importantes
- Ejecutar como parte del proceso de CI/CD

## Estado Actual del Proyecto

**Prioridad Alta:**
- ✅ Script de auditoría funcional
- ✅ Conexión a base de datos Neon establecida
- ✅ Página de guardias implementada
- ✅ API de guardias disponible

**Pendiente:**
- 🔄 Completar coordenadas de 220 guardias
- 🔄 Agregar columnas `rut` e `instalacion_id`
- 🔄 Crear componente `GuardDetailModal.tsx`
- 🔄 Implementar optimización de asignaciones 