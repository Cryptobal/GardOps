# Pauta Diaria v2 - Feature Flag y Funciones Neon

## 📋 Resumen

La Pauta Diaria v2 ahora soporta un **rollout seguro** usando feature flags para alternar entre:
- **API Nueva**: Usa funciones almacenadas en Neon (PostgreSQL)
- **API Legacy**: Usa los endpoints existentes (fallback seguro)

## 🚀 Configuración del Feature Flag

### Variables de Entorno

```bash
# En .env.local o variables de entorno del servidor
USE_NEW_TURNOS_API=true           # Activa nueva API en servidor
NEXT_PUBLIC_USE_NEW_TURNOS_API=true  # Activa nueva API en cliente
```

### Cómo Alternar

1. **Activar Nueva API**:
   ```bash
   USE_NEW_TURNOS_API=true
   NEXT_PUBLIC_USE_NEW_TURNOS_API=true
   ```

2. **Desactivar (usar legacy)**:
   ```bash
   USE_NEW_TURNOS_API=false
   NEXT_PUBLIC_USE_NEW_TURNOS_API=false
   ```

3. **Verificar estado actual**:
   - En la UI aparecerá un badge: `API: NEW` o `API: LEGACY`
   - En la consola del navegador verás: `[API Adapter] Usando endpoints: NUEVOS (Neon)`

## 📊 Funciones de Neon Utilizadas

### 1. `as_turnos.fn_registrar_reemplazo`
**Propósito**: Registra un reemplazo cuando un titular no asiste.

**Parámetros**:
- `p_pauta_id` (bigint): ID de la pauta
- `p_cobertura_guardia_id` (uuid): ID del guardia que cubre
- `p_actor_ref` (text): Referencia del actor (ej: 'ui:pauta-diaria-v2')
- `p_motivo` (text, opcional): Motivo del reemplazo

**Retorna**: 
```sql
TABLE(ok boolean, pauta_id bigint, estado text, meta jsonb)
```

### 2. `as_turnos.fn_marcar_extra`
**Propósito**: Marca un turno extra para cubrir un PPC.

**Parámetros**:
- `p_fecha` (date): Fecha del turno
- `p_instalacion_id` (uuid): ID de la instalación
- `p_rol_id` (uuid): ID del rol
- `p_puesto_id` (uuid): ID del puesto
- `p_cobertura_guardia_id` (uuid): ID del guardia que cubre
- `p_origen` (text): Origen ('ppc' típicamente)
- `p_actor_ref` (text): Referencia del actor

**Retorna**:
```sql
TABLE(ok boolean, extra_uid text)
```

### 3. `as_turnos.fn_deshacer`
**Propósito**: Revierte el estado de una pauta a 'plan'.

**Parámetros**:
- `p_pauta_id` (bigint): ID de la pauta
- `p_actor_ref` (text): Referencia del actor

**Retorna**:
```sql
TABLE(ok boolean, pauta_id bigint, estado text)
```

### 4. `as_turnos.fn_guardias_disponibles`
**Propósito**: Obtiene guardias disponibles para una fecha y contexto específico.

**Parámetros**:
- `p_fecha` (date): Fecha a consultar
- `p_instalacion_id` (uuid): ID de la instalación
- `p_rol_id` (uuid, opcional): ID del rol a filtrar
- `p_excluir_guardia_id` (uuid, opcional): ID de guardia a excluir

**Retorna**:
```sql
TABLE(guardia_id uuid, nombre text)
```

**Filtros automáticos aplicados**:
- Solo guardias con `estado = 'activo'`
- Solo tipos: `'contratado'` o `'esporadico'`
- Excluye guardias ya asignados ese día

## 🔄 Flujo de Datos

### Con Flag ON (Nueva API):
```
UI (ClientTable.tsx) 
  → apiAdapter.ts (detecta flag ON)
  → /api/turnos/*-new/route.ts
  → Función Neon (as_turnos.fn_*)
  → Base de datos
```

### Con Flag OFF (Legacy):
```
UI (ClientTable.tsx)
  → apiAdapter.ts (detecta flag OFF)
  → /api/turnos/*/route.ts (endpoints existentes)
  → Queries directas SQL
  → Base de datos
```

## 🛠️ Endpoints y Adaptadores

### Endpoints Nuevos (solo con flag ON):
- `/api/turnos/asistencia-new`
- `/api/turnos/reemplazo-new`
- `/api/turnos/extra-new`
- `/api/turnos/deshacer-new`

### Endpoints Legacy (siempre disponibles):
- `/api/turnos/asistencia`
- `/api/turnos/inasistencia`
- `/api/turnos/ppc/cubrir`
- `/api/turnos/ppc/sin-cobertura`
- `/api/turnos/deshacer`

### Adaptador Central
`src/app/pauta-diaria-v2/apiAdapter.ts`:
- Detecta el feature flag
- Redirige a endpoints correctos
- Adapta payloads según versión
- Registra logs con `console.info`

## ✅ Verificaciones Manuales

### 1. Con Flag ON (Nueva API)

#### Titular:
- [ ] **Asistió**: Marca asistencia → estado cambia a 'asistido'
- [ ] **No asistió con cobertura**: Selecciona guardia → estado 'reemplazo', columna Cobertura muestra nombre
- [ ] **No asistió sin cobertura**: Sin seleccionar → estado 'sin_cobertura'
- [ ] **Deshacer**: Revierte cualquier estado → vuelve a 'plan'

#### PPC:
- [ ] **Cubrir**: Selecciona guardia → estado cambia, columna Cobertura muestra nombre
- [ ] **Sin cobertura**: Marca sin cobertura → estado actualizado
- [ ] **Deshacer**: Revierte a estado 'ppc_libre'

#### Integración:
- [ ] **Pauta Mensual**: Cambios se reflejan inmediatamente
- [ ] **CSV Turnos Extra**: Registros nuevos aparecen y se exportan correctamente
- [ ] **RBAC**: Usuario sin permisos → botones deshabilitados, API retorna 403

### 2. Con Flag OFF (Legacy)
- [ ] Todas las operaciones funcionan con endpoints existentes
- [ ] Sin errores ni cambios de comportamiento
- [ ] Log muestra "API: LEGACY"

## 🐛 Troubleshooting

### Error: "Función fn_* no encontrada"
**Solución**: Ejecutar script de instalación de funciones:
```bash
npx tsx scripts/create-turnos-functions-v2.sql
```

### Error: "500 en guardias disponibles"
**Causa**: Función no existe o error de permisos
**Solución**: 
1. Verificar funciones con: `npx tsx scripts/db-smoke-v2.ts`
2. Revisar logs del servidor

### Badge no aparece en UI
**Verificar**:
- Variable `NEXT_PUBLIC_USE_NEW_TURNOS_API` está definida
- Reiniciar servidor Next.js después de cambiar .env.local

## 📝 Scripts Útiles

### Verificar funciones instaladas:
```bash
npx tsx scripts/db-smoke-v2.ts
```

### Instalar funciones en Neon:
```bash
npx tsx scripts/create-turnos-functions-v2.sql
```

### Test simple de funciones:
```bash
npx tsx scripts/db-smoke-v2-simple.ts
```

## 🔒 Seguridad y Rollback

1. **Rollback instantáneo**: Cambiar flag a `false` revierte a legacy inmediatamente
2. **Sin pérdida de datos**: Ambas versiones usan las mismas tablas
3. **Logs completos**: Cada operación registra qué versión de API se usa
4. **Transacciones**: Funciones Neon usan transacciones para consistencia

## 📈 Monitoreo

### Logs a revisar:
- **Cliente**: `[API Adapter] Usando endpoints: ...`
- **Servidor**: `[turnos/new] ...` para nueva API
- **Función**: `[Neon] Guardias disponibles encontrados: ...`

### Métricas clave:
- Tiempo de respuesta de funciones vs queries directas
- Tasa de error por versión de API
- Uso de cada endpoint (new vs legacy)

## 🚦 Estado Actual

- ✅ Funciones Neon instaladas y probadas
- ✅ Endpoints -new implementados
- ✅ Feature flag configurado
- ✅ Adaptador funcionando
- ✅ UI actualizada con router.refresh()
- ✅ Guardias disponibles con función Neon
- ✅ Documentación completa

---

**Última actualización**: $(date)
**Versión**: 1.0.0
**Autor**: Sistema automatizado
