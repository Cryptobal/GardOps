# 🚀 Optimización de Carga de Permisos - GardOps

## 📋 Resumen del Problema

El usuario reportó que al entrar a la aplicación como Carlos Irigoyen, la página de inicio mostraba "permiso denegado" temporalmente antes de cargar correctamente. Esto ocurría porque:

1. **Múltiples llamadas a la API**: Cada componente verificaba permisos de forma independiente
2. **Estado de carga inicial**: Los componentes mostraban "denegado" antes de que se resolvieran los permisos
3. **Falta de caché global**: No había un sistema centralizado para compartir permisos entre componentes

## 🎯 Solución Implementada

### 1. **Contexto Global de Permisos** (`src/lib/permissions-context.tsx`)

```typescript
// Precarga permisos comunes al inicializar la aplicación
const COMMON_PERMISSIONS = [
  'home.view',
  'clientes.view',
  'instalaciones.view',
  'guardias.view',
  'pautas.view',
  'pauta-diaria.view',
  'pauta-mensual.view',
  'turnos.view',
  'payroll.view',
  'sueldos.view',
  'ppc.view',
  'documentos.view',
  'reportes.view',
  'asignaciones.view',
  'config.view',
  'rbac.platform_admin'
];
```

**Características:**
- ✅ **Precarga en paralelo**: Todos los permisos comunes se cargan al mismo tiempo
- ✅ **Bypass para admins**: Los usuarios admin obtienen acceso instantáneo
- ✅ **Caché en memoria**: Los permisos se almacenan en un Map para acceso rápido
- ✅ **Estado de inicialización**: Controla cuándo la aplicación está lista

### 2. **Hook Optimizado** (`src/lib/use-permissions.ts`)

```typescript
export function usePermissions(perm?: string) {
  // Usa el contexto global primero
  // Fallback a carga individual si es necesario
  // Caché local para permisos no comunes
}
```

**Mejoras:**
- ✅ **Prioridad al contexto**: Usa el contexto global cuando está disponible
- ✅ **Caché local**: Para permisos no precargados
- ✅ **Carga inteligente**: Solo carga individualmente si es necesario
- ✅ **Compatibilidad**: Mantiene la misma API que `useCan`

### 3. **Componente de Loading Global** (`src/components/layout/permissions-loading.tsx`)

```typescript
export function PermissionsLoading({ children, fallback }: PermissionsLoadingProps) {
  const { loading, initialized } = usePermissionsContext();
  
  if (initialized) return <>{children}</>;
  if (loading) return fallback || <LoadingSpinner />;
  return <>{children}</>;
}
```

**Beneficios:**
- ✅ **Loading centralizado**: Muestra un spinner mientras cargan los permisos
- ✅ **Sin "denegado" prematuro**: Evita mostrar mensajes de error antes de tiempo
- ✅ **UX mejorada**: Experiencia más fluida para el usuario

### 4. **Integración en el Layout** (`src/app/layout.tsx`)

```typescript
<ErrorBoundary>
  <PermissionsProvider>
    <PermissionsLoading>
      <AuthWrapper>
        {children}
      </AuthWrapper>
    </PermissionsLoading>
  </PermissionsProvider>
  <ToastContainer />
</ErrorBoundary>
```

## 📊 Resultados Esperados

### Antes de la Optimización:
- ❌ **Múltiples llamadas API**: Cada componente hacía su propia verificación
- ❌ **"Denegado" temporal**: Se mostraba antes de que se resolvieran los permisos
- ❌ **Tiempo de carga lento**: Especialmente en conexiones lentas
- ❌ **Experiencia inconsistente**: Diferentes estados de carga por componente

### Después de la Optimización:
- ✅ **Una sola carga inicial**: Permisos comunes se cargan una vez al inicio
- ✅ **Acceso instantáneo**: Para admins y permisos ya cargados
- ✅ **Loading consistente**: Estado de carga global y uniforme
- ✅ **Mejor UX**: Sin mensajes de "denegado" prematuros

## 🔧 Archivos Modificados

### Nuevos Archivos:
- `src/lib/permissions-context.tsx` - Contexto global de permisos
- `src/lib/use-permissions.ts` - Hook optimizado
- `src/components/layout/permissions-loading.tsx` - Componente de loading
- `scripts/test-permissions-performance.ts` - Script de pruebas

### Archivos Modificados:
- `src/app/layout.tsx` - Integración del contexto global
- `src/app/page.tsx` - Uso del hook optimizado
- `src/components/layout/navigation-item-wrapper.tsx` - Hook optimizado
- `src/lib/permissions.ts` - Mejoras en el hook original

## 🧪 Pruebas

### Script de Rendimiento:
```bash
npx tsx scripts/test-permissions-performance.ts
```

Este script simula y compara:
- Sistema actual vs sistema optimizado
- Tiempo de carga de permisos
- Número de llamadas a la API
- Experiencia del usuario

## 🚀 Beneficios para el Usuario

1. **Carga más rápida**: Los permisos se cargan una vez al inicio
2. **Sin "denegado" temporal**: Loading consistente mientras se verifican permisos
3. **Mejor experiencia**: Especialmente para usuarios admin
4. **Menos llamadas al servidor**: Reduce la carga en la base de datos
5. **Caché inteligente**: Permisos se mantienen en memoria

## 🔄 Compatibilidad

- ✅ **Backward compatible**: El hook `useCan` sigue funcionando
- ✅ **Migración gradual**: Los componentes pueden migrar uno por uno
- ✅ **Fallback automático**: Si el contexto falla, usa el sistema original
- ✅ **Sin breaking changes**: No afecta funcionalidad existente

## 📈 Métricas de Mejora

**Tiempo de carga esperado:**
- **Antes**: 500-1500ms (múltiples llamadas secuenciales)
- **Después**: 100-300ms (carga paralela + caché)

**Número de llamadas API:**
- **Antes**: 15+ llamadas (una por componente)
- **Después**: 1 llamada inicial + llamadas bajo demanda

**Experiencia del usuario:**
- **Antes**: "Denegado" → "Cargando" → "Contenido"
- **Después**: "Cargando permisos" → "Contenido"
