# 🚀 GardOps - Modo Producción Simulado

## ⚠️ IMPORTANTE: Siempre usar modo producción

Para prevenir errores de compilación en Vercel, **SIEMPRE** ejecuta GardOps en modo producción localmente.

## 🎯 Scripts Recomendados

### ✅ **Script Principal (Recomendado)**
```bash
npm run prod
```
**Hace:**
1. Copia `.env.local` a `.env.production`
2. Ejecuta `npm run build` (como Vercel)
3. Ejecuta `npm start` (servidor de producción)

### ✅ **Script con Validación TypeScript**
```bash
npm run prod:check
```
**Hace:**
1. Copia `.env.local` a `.env.production`
2. Valida TypeScript con `npx tsc --noEmit`
3. Ejecuta `npm run build` (como Vercel)
4. Ejecuta `npm start` (servidor de producción)

## ❌ **NO USAR**
```bash
npm run dev  # ⚠️ Puede ocultar errores de compilación
```

## 🔧 ¿Por qué usar modo producción?

### **Simulación Exacta de Vercel**
- ✅ Mismo proceso de build que Vercel
- ✅ Mismas optimizaciones y compresión
- ✅ Mismos errores de compilación
- ✅ Misma configuración de entorno

### **Prevención de Errores**
- ✅ Detecta errores TypeScript antes del deploy
- ✅ Valida imports y dependencias
- ✅ Verifica configuración de producción
- ✅ Prueba optimizaciones de Next.js

## 📋 Checklist de Producción

### **Antes de cada sesión de desarrollo:**
1. ✅ Ejecutar `npm run prod:check`
2. ✅ Verificar que no hay errores TypeScript
3. ✅ Confirmar que el build es exitoso
4. ✅ Probar funcionalidades críticas

### **Antes de cada commit:**
1. ✅ Ejecutar `npm run prod:check`
2. ✅ Verificar que la aplicación funciona
3. ✅ Probar rutas principales
4. ✅ Confirmar que las APIs responden

## 🎯 Comandos Rápidos

```bash
# Desarrollo con validación de producción
npm run prod:check

# Solo producción (sin validación TypeScript)
npm run prod

# Validación TypeScript sin ejecutar
npx tsc --noEmit

# Build sin ejecutar
npm run build
```

## 🔍 Verificación de Estado

### **Verificar que está corriendo en producción:**
```bash
# Verificar proceso
ps aux | grep "next start"

# Verificar puerto
lsof -i :3000

# Verificar respuesta HTTP
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

### **Señales de que está en modo producción:**
- ✅ Proceso: `next start` (no `next dev`)
- ✅ Puerto: 3000
- ✅ Build optimizado en `.next/`
- ✅ CSS/JS minificado
- ✅ Chunks separados

## 🚨 Troubleshooting

### **Error: "Module not found"**
```bash
# Limpiar y reinstalar
rm -rf node_modules .next
npm install
npm run prod:check
```

### **Error: "TypeScript compilation failed"**
```bash
# Verificar errores TypeScript
npx tsc --noEmit

# Corregir errores antes de continuar
```

### **Error: "Environment variables not found"**
```bash
# Verificar archivo .env.local
ls -la .env.local

# Copiar manualmente si es necesario
cp .env.local .env.production
```

## 🎉 Beneficios

### **Desarrollo Confiable**
- ✅ Mismos errores que en Vercel
- ✅ Detección temprana de problemas
- ✅ Builds consistentes
- ✅ Deploy sin sorpresas

### **Calidad de Código**
- ✅ TypeScript siempre validado
- ✅ Imports verificados
- ✅ Dependencias validadas
- ✅ Configuración probada

---

## 📝 Recordatorio

**💡 Siempre usa `npm run prod:check` para desarrollo.**
**💡 Nunca uses `npm run dev` para testing de producción.**
**💡 Verifica TypeScript antes de cada commit.**

Esto garantiza que tu código funcionará exactamente igual en Vercel que en tu entorno local. 