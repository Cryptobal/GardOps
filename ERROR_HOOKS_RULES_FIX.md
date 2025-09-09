# Error: "Rendered more hooks than during the previous render" - Solución

## 🚨 **Error Identificado**

```
Error: Rendered more hooks than during the previous render.
Call Stack: NavigationItemWrapper -> useMemo
```

## 🔍 **Causa del Problema**

Este error ocurre cuando **el número de hooks ejecutados en un renderizado es diferente al número de hooks ejecutados en el renderizado anterior**. Esto viola las **Reglas de los Hooks** de React.

### **Problema Específico en NavigationItemWrapper:**

El componente tenía **returns tempranos** (`return null`) que estaban **después** de que se ejecutaran algunos hooks, pero **antes** de que se ejecutaran otros hooks:

```typescript
// ❌ PROBLEMÁTICO - Hooks mezclados con lógica condicional
const { allowed: checkedAllowed, loading } = useCan(shouldCheck ? perm : undefined);

// Lógica condicional que puede hacer return antes de otros hooks
if (shouldCheck && loading) {
  return null; // ← Esto causa el error
}

// Más hooks después del return condicional
const visibleChildren = useMemo(() => { ... }, []);
const linkContent = useMemo(() => { ... }, []);
```

## ✅ **Solución Implementada**

### **Regla Fundamental:**
**TODOS los hooks deben ejecutarse AL INICIO del componente, ANTES de cualquier lógica condicional.**

### **Código Corregido:**

```typescript
export const NavigationItemWrapper = React.memo(function NavigationItemWrapper({
  item,
  level = 0,
  isCollapsed = false,
  pathname = "",
  onItemClick,
  expandedItems = [],
  onToggleExpanded
}: NavigationItemWrapperProps) {
  // ✅ TODOS LOS HOOKS VAN AL INICIO
  const perm = (item.permission || '').trim();
  const shouldCheck = !!perm;
  const { allowed: checkedAllowed, loading } = useCan(shouldCheck ? perm : undefined);
  const adoV2On = useFlag('ado_v2');
  
  // Convertir lógica imperativa a hook
  const adminBypass = useMemo(() => {
    try {
      if (typeof document !== 'undefined') {
        const m = (document.cookie || '').match(/(?:^|;\s*)auth_token=([^;]+)/);
        const token = m?.[1] ? decodeURIComponent(m[1]) : null;
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1] || '')) || {};
          return payload?.rol === 'admin';
        }
      }
    } catch {}
    return false;
  }, []);
  
  const allowed = shouldCheck ? checkedAllowed : true;

  // Más hooks...
  const visibleChildren = useMemo(() => { ... }, [item.children]);
  const linkContent = useMemo(() => { ... }, [dependencies]);

  // ✅ AHORA SÍ PODEMOS HACER RETURNS CONDICIONALES
  if (adminBypass) {
    // continuar
  } else if (shouldCheck && loading) {
    return null; // ← Ahora es seguro
  }

  if (!adminBypass && shouldCheck && !allowed) {
    return null; // ← Ahora es seguro
  }

  return (
    // JSX del componente
  );
});
```

## 📋 **Reglas de los Hooks - Resumen**

### ✅ **Lo que SÍ se puede hacer:**
1. **Llamar hooks al inicio** del componente
2. **Llamar hooks en el mismo orden** en cada renderizado
3. **Usar hooks solo en componentes de React** o custom hooks
4. **Hacer returns condicionales DESPUÉS** de todos los hooks

### ❌ **Lo que NO se puede hacer:**
1. **Llamar hooks dentro de loops, condiciones o funciones anidadas**
2. **Llamar hooks después de returns tempranos**
3. **Llamar hooks en diferentes órdenes** entre renderizados
4. **Llamar hooks fuera de componentes de React**

## 🔧 **Patrón Recomendado**

```typescript
function MiComponente() {
  // 1. TODOS los hooks van aquí
  const [state, setState] = useState();
  const memoizedValue = useMemo(() => {}, []);
  const callback = useCallback(() => {}, []);
  
  // 2. Lógica derivada
  const derivedValue = useMemo(() => {
    // cálculos complejos
  }, [state]);
  
  // 3. AHORA sí returns condicionales
  if (condition) {
    return <Loading />;
  }
  
  if (error) {
    return <Error />;
  }
  
  // 4. Renderizado normal
  return <div>...</div>;
}
```

## 🎯 **Beneficios de la Corrección**

1. **Elimina el error** de hooks inconsistentes
2. **Mejora el rendimiento** al evitar re-renderizados innecesarios
3. **Código más predecible** y fácil de mantener
4. **Cumple con las mejores prácticas** de React
5. **Evita bugs sutiles** relacionados con el estado de los hooks

## 📝 **Archivos Afectados**

- `src/components/layout/navigation-item-wrapper.tsx` ✅ **Corregido**

## 🚀 **Próximos Pasos**

1. **Verificar** que el error se haya resuelto
2. **Revisar otros componentes** para patrones similares
3. **Implementar ESLint rules** para detectar violaciones de hooks
4. **Documentar** las mejores prácticas para el equipo

## 🔍 **Herramientas de Detección**

### **ESLint Rules Recomendadas:**
```json
{
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### **React DevTools:**
- Usar el profiler para detectar re-renderizados innecesarios
- Verificar el orden de ejecución de hooks

---

**Nota:** Este error es crítico y debe resolverse inmediatamente, ya que puede causar comportamientos inesperados y bugs difíciles de reproducir.

