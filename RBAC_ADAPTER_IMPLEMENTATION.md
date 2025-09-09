# Adaptador de Permisos RBAC con Fallback Legacy

## 📋 Resumen

Se ha implementado un adaptador de permisos que integra el nuevo sistema RBAC con el sistema legacy existente, garantizando cero disrupciones en la aplicación.

## 🏗️ Arquitectura

### 1. Sistema de Capas

```
┌─────────────────────────────────────┐
│     Componentes React (UI)          │
├─────────────────────────────────────┤
│   useCan() / fetchCan() / can()     │  ← src/lib/permissions.ts
├─────────────────────────────────────┤
│      Intentar RBAC primero          │
│   /api/rbac/can → fn_usuario_tiene_ │  ← Nuevo endpoint
│         permiso() en BD             │
├─────────────────────────────────────┤
│    Fallback si falla (404/5xx)      │
│  /api/me/permissions → Sistema      │  ← Legacy endpoint
│           Legacy                    │
└─────────────────────────────────────┘
```

### 2. Archivos Creados/Modificados

#### ✅ **src/lib/permissions.ts** (NUEVO)
- Función `can(userId, permiso)`: Cliente con RBAC + fallback
- Hook `useCan(permiso)`: Compatible con el existente
- Función `fetchCan(permiso)`: Compatible con API legacy
- Logs discretos con prefijo `[rbac]`

#### ✅ **src/app/api/rbac/can/route.ts** (NUEVO)
- GET: `/api/rbac/can?permiso=xxx`
- POST: Body con `{ permiso, userId? }`
- Llama a `fn_usuario_tiene_permiso()` en BD
- Retorna `{ ok: true, allowed: boolean }`

#### ✅ **src/lib/can.ts** (MODIFICADO)
- Ahora re-exporta desde `src/lib/permissions.ts`
- Mantiene compatibilidad 100% backward
- Función `fetchCanLegacy()` para debug

#### ✅ **scripts/test-rbac-adapter.ts** (NUEVO)
- Script de verificación del sistema
- Ejecutar con: `npm run test:rbac-adapter`

## 🔄 Flujo de Permisos

### Flujo Principal (Happy Path):
1. Componente llama `useCan('turnos.edit')`
2. Hook hace fetch a `/api/rbac/can?permiso=turnos.edit`
3. Endpoint obtiene userId de headers (`x-user`)
4. Ejecuta `fn_usuario_tiene_permiso(userId, 'turnos.edit')`
5. Retorna resultado al componente
6. Log: `[rbac] can(turnos.edit)=true (new)`

### Flujo de Fallback (Si RBAC falla):
1. Si `/api/rbac/can` retorna 404 o 5xx
2. Automáticamente llama a `/api/me/permissions?perm=xxx`
3. Usa lógica legacy existente
4. Log: `[rbac] can(turnos.edit)=true (legacy)`

## 🚀 Uso

### En Componentes React:
```tsx
// No requiere cambios - importación existente funciona
import { useCan } from '@/lib/can';

function MyComponent() {
  const { allowed, loading } = useCan('turnos.marcar_asistencia');
  
  if (loading) return <div>Verificando permisos...</div>;
  if (!allowed) return <div>Sin permisos</div>;
  
  return <div>Contenido autorizado</div>;
}
```

### En Server Components o API Routes:
```ts
import { can } from '@/lib/permissions';

// En un API route
export async function POST(request: Request) {
  const allowed = await can(userId, 'turnos.edit');
  if (!allowed) {
    return new Response('Forbidden', { status: 403 });
  }
  // ... continuar
}
```

## 📊 Logs del Sistema

Los logs son discretos y usan el prefijo `[rbac]`:

```
[rbac] can(turnos.edit)=true (new)        ← Usando RBAC
[rbac] can(turnos.edit)=false (legacy)    ← Usando fallback
[rbac] fallback to legacy for turnos.edit (status=500)
[rbac] Permiso verificado: usuario=test@example.com, permiso=turnos.edit, allowed=true
```

## ⚙️ Configuración

### Variables de Entorno:
- `DEV_USER_REF`: Usuario de desarrollo (fallback si no hay headers)

### Estrategia de Cache:
- `cache: 'no-store'` en todos los fetch para evitar cache stale
- Hook React maneja su propio estado con `useEffect`

## 🧪 Testing

### Verificar instalación:
```bash
# Verificar que todo está configurado
npm run test:rbac-adapter
```

### Test manual:
1. Iniciar servidor: `npm run dev`
2. Verificar logs en consola del navegador
3. Buscar logs con prefijo `[rbac]`

## 🔒 Seguridad

- El userId se obtiene de headers seguros (`x-user`)
- No se expone información sensible en logs
- Fallback automático garantiza disponibilidad
- Sin cambios breaking en la API existente

## 🎯 Beneficios

1. **Zero Downtime**: Fallback automático si RBAC no está disponible
2. **Compatibilidad Total**: No requiere cambios en componentes existentes
3. **Migración Gradual**: Permite migrar permisos uno por uno
4. **Observabilidad**: Logs claros indican qué sistema se usa
5. **Resiliente**: Si la BD falla, usa el sistema legacy

## 📝 Notas Importantes

- **NO se modificó** Pauta Diaria ni Turnos Extra
- **NO se rompió** ninguna funcionalidad existente
- Los componentes existentes funcionan sin cambios
- El sistema es completamente retrocompatible

## 🔄 Próximos Pasos

1. Monitorear logs para ver adopción del nuevo sistema
2. Migrar permisos gradualmente al sistema RBAC
3. Una vez estable, considerar deprecar el endpoint legacy
4. Agregar métricas de uso (new vs legacy)

## 📞 Soporte

Si encuentras algún problema:
1. Verificar logs con prefijo `[rbac]`
2. Ejecutar `npm run test:rbac-adapter`
3. Verificar que `fn_usuario_tiene_permiso` existe en BD
4. El sistema siempre hace fallback a legacy si hay problemas
