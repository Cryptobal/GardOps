# 🚀 Rollout Seguro - Pauta Diaria v2

## 📋 Estado de Implementación

### ✅ Completado
1. **Integración apiAdapter.ts**
   - ✅ Funciones helper: `marcarAsistencia`, `registrarInasistencia`, `registrarReemplazo`, `marcarTurnoExtra`, `marcarSinCoberturaPPC`, `deshacerMarcado`
   - ✅ Detección automática de endpoints según feature flag
   - ✅ Logging en cada acción con `console.info`

2. **Actualización ClientTable.tsx**
   - ✅ Importación y uso de apiAdapter
   - ✅ Reemplazo de todas las llamadas fetch con funciones del adapter
   - ✅ Badge de estado de API en header (verde "API: NEW" / gris "API: LEGACY")

3. **Endpoints disponibles**
   - ✅ `/api/turnos/asistencia-new` - Nuevo endpoint para marcar asistencia
   - ✅ `/api/turnos/reemplazo-new` - Nuevo endpoint para registrar reemplazos
   - ✅ `/api/turnos/extra-new` - Nuevo endpoint para turnos extras
   - ✅ Endpoints legacy intactos como fallback

## 🔧 Configuración del Feature Flag

### Para activar la nueva API:
```bash
# En archivo .env.local
NEXT_PUBLIC_USE_NEW_TURNOS_API=true
USE_NEW_TURNOS_API=true
```

### Para desactivar y usar legacy:
```bash
# En archivo .env.local
NEXT_PUBLIC_USE_NEW_TURNOS_API=false
USE_NEW_TURNOS_API=false
```

## 📊 Estado Actual del Sistema

### ⚠️ Pendientes en Base de Datos
Las siguientes funciones de Neon necesitan ser creadas:
- `as_turnos.fn_registrar_reemplazo` - Para registrar guardias de reemplazo
- `as_turnos.fn_marcar_extra` - Para marcar turnos extras

### ⚠️ Variables de Entorno Requeridas
Para el correcto funcionamiento necesitas:
```bash
POSTGRES_URL=tu_conexion_a_neon
NEXT_PUBLIC_USE_NEW_TURNOS_API=true  # Para activar nueva API
```

## 🧪 Testing

### Ejecutar smoke test:
```bash
# Test completo
npx tsx scripts/smoke-test-new-api.ts

# Solo endpoints HTTP
npx tsx scripts/smoke-test-new-api.ts --endpoints

# Solo funciones de Neon
npx tsx scripts/smoke-test-new-api.ts --functions

# Ver comandos curl de ejemplo
npx tsx scripts/smoke-test-new-api.ts --curl
```

## 📝 Verificaciones en UI

### Con API LEGACY (NEXT_PUBLIC_USE_NEW_TURNOS_API=false):

#### ✅ Titular
- [ ] Asistió - Marca asistencia correctamente
- [ ] No asistió con cobertura - Registra inasistencia con guardia de reemplazo
- [ ] No asistió sin cobertura - Registra inasistencia sin reemplazo
- [ ] Deshacer - Revierte el estado a plan

#### ✅ PPC
- [ ] Cubrir - Asigna guardia al turno PPC
- [ ] Sin cobertura - Marca PPC sin cobertura
- [ ] Deshacer - Revierte el estado

#### ✅ Guardias disponibles
- [ ] Lista filtrada sin duplicados
- [ ] No muestra guardias inactivos
- [ ] Búsqueda por nombre funciona

#### ✅ RBAC
- [ ] Usuarios sin permiso ven botones deshabilitados
- [ ] Error 403 si intenta forzar acción sin permiso

### Con API NEW (NEXT_PUBLIC_USE_NEW_TURNOS_API=true):
- [ ] Badge muestra "API: NEW" en verde
- [ ] Console muestra logs con endpoints nuevos
- [ ] Mismas funcionalidades que legacy pero usando nuevos endpoints

## 🔍 Logs de Debugging

Cuando está activa la nueva API, verás en la consola del navegador:
```
[API Adapter] Usando endpoints: NUEVOS (Neon)
🔍 [marcarAsistencia] Usando endpoint: /api/turnos/asistencia-new
🔍 [registrarReemplazo] Usando endpoint: /api/turnos/reemplazo-new
🔍 [marcarTurnoExtra] Usando endpoint: /api/turnos/extra-new
```

Cuando está en modo legacy:
```
[API Adapter] Usando endpoints: EXISTENTES (fallback)
🔍 [marcarAsistencia] Usando endpoint: /api/turnos/asistencia
🔍 [registrarReemplazo] Usando endpoint: /api/turnos/ppc/cubrir
```

## 🚦 Proceso de Rollout

1. **Fase 1 - Desarrollo** (actual)
   - Feature flag desactivado por defecto
   - Testing con flag activado localmente

2. **Fase 2 - Staging**
   - Activar flag en ambiente de staging
   - Monitorear logs y métricas
   - Validar todas las funcionalidades

3. **Fase 3 - Producción (Canary)**
   - Activar para 10% de usuarios
   - Monitorear errores y performance
   - Incrementar gradualmente

4. **Fase 4 - Producción (100%)**
   - Activar para todos los usuarios
   - Mantener flag por 2 semanas para rollback rápido
   - Deprecar endpoints legacy

## ⚡ Rollback Rápido

Si se detectan problemas en producción:
```bash
# Cambiar inmediatamente en Vercel Environment Variables:
NEXT_PUBLIC_USE_NEW_TURNOS_API=false
```

El sistema volverá a usar los endpoints legacy sin necesidad de redeploy.

## 📊 Métricas a Monitorear

- Tasa de errores en endpoints nuevos vs legacy
- Tiempo de respuesta de funciones de Neon
- Logs de error en consola del navegador
- Feedback de usuarios sobre performance

## 🔗 Enlaces Relacionados

- [Documentación de funciones Neon](./docs/neon-functions.md)
- [Script de smoke test](./scripts/smoke-test-new-api.ts)
- [Adapter de API](./src/app/pauta-diaria-v2/apiAdapter.ts)
