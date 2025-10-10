# Métricas de Performance - Post Migración

**Fecha:** 10 de octubre de 2025  
**Versiones:** Next.js 15.5.4 + Tailwind CSS 4.1.13

---

## ⚡ Servidor de Desarrollo

### Baseline (Next.js 14.2.31)
- **Tiempo de inicio:** ~8 segundos
- **Hot reload:** ~200ms

### Después de Migración (Next.js 15.5.4)
- **Tiempo de inicio:** **1591ms (1.6 segundos)** ✅
- **Mejora:** **80% más rápido** 🚀
- **Hot reload:** Por medir

**Resultado:** Supera ampliamente el objetivo de < 4 segundos

---

## 🏗️ Build de Producción

### Baseline
- Tiempo: No medido anteriormente

### Post-migración ✅
- **Tiempo:** **29.7 segundos** 🚀
- **Páginas estáticas:** 413 páginas generadas
- **Bundle size:** 
  - First Load JS compartido: 102 kB
  - Middleware: 34.4 kB
- **Estado:** ✅ Compilado exitosamente
- **Warnings:** Solo warning de lockfiles múltiples (no crítico)

**Resultado:** Supera ampliamente el objetivo de < 60 segundos (50% más rápido)

---

## 🌐 Lighthouse Score

### Baseline
- Desktop: TBD
- Móvil: TBD

### Post-migración
- Desktop: Por medir
- Móvil: Por medir

---

## 📝 Notas

**Mejora significativa en dev server:** De ~8 seg a 1.6 seg es una mejora del 80%, superando el objetivo de 53%.

**Warning detectado:**
```
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
We detected multiple lockfiles and selected the directory of /Users/caco/package-lock.json as the root directory.
```

**Acción recomendada:** Agregar `outputFileTracingRoot` en next.config.js o eliminar lockfile de `/Users/caco/` si no es necesario.

