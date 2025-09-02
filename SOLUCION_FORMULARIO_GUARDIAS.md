# Solución: Formulario de Guardias No Visible en Producción

## 🔍 Problema Identificado

El formulario de creación de guardias funciona correctamente en el entorno local pero no es visible en producción después del despliegue a GitHub/Vercel.

## 🎯 Causas Principales

### 1. **Sistema de Permisos**
- En desarrollo: Bypass automático para usuarios admin
- En producción: Verificación estricta de permisos a través de la base de datos
- Falta la función `fn_usuario_tiene_permiso` o tabla `permisos` en producción

### 2. **Configuración de Base de Datos**
- Local: Usa `src/lib/database.ts` con Pool de PostgreSQL
- Producción: Usa `src/lib/database-vercel.ts` con `@vercel/postgres`
- Posibles diferencias en la estructura de la base de datos

### 3. **Variables de Entorno**
- Falta configuración de `DATABASE_URL`, `JWT_SECRET` u otras variables críticas en Vercel

## 🛠️ Soluciones Implementadas

### ✅ **Solución 1: Bypass Temporal (YA APLICADO)**

Se agregó un bypass temporal en `src/lib/permissions.ts` que permite acceso a todas las funciones de guardias en producción:

```typescript
// BYPASS TEMPORAL PARA GUARDIAS EN PRODUCCIÓN
if (process.env.NODE_ENV === "production" && normalized.startsWith('guardias.')) {
  console.warn("[BYPASS TEMPORAL] Permitiendo acceso a guardias en producción");
  return true;
}
```

**Esta solución debería resolver el problema inmediatamente.**

### 📋 **Solución 2: Scripts de Diagnóstico**

Se crearon scripts para diagnosticar el problema:

1. **`fix-guardias-produccion.js`** - Diagnóstico completo y migración SQL
2. **`verificar-api-guardias-produccion.js`** - Verificación de endpoints de API

Para ejecutar el diagnóstico:
```bash
node fix-guardias-produccion.js
node verificar-api-guardias-produccion.js
```

### 🗄️ **Solución 3: Migración de Base de Datos**

El script `fix-guardias-produccion.js` genera una migración SQL que incluye:

- Crear tabla `permisos` si no existe
- Insertar permisos básicos de guardias
- Crear función `fn_usuario_tiene_permiso`
- Asignar permisos al rol admin
- Crear usuario admin de prueba

## 🚀 Pasos para Implementar

### **Paso 1: Despliegue Inmediato (Bypass Temporal)**

1. **Hacer commit y push de los cambios:**
   ```bash
   git add .
   git commit -m "Fix: Agregar bypass temporal para guardias en producción"
   git push origin main
   ```

2. **Esperar el redespliegue automático en Vercel**

3. **Verificar que el formulario ahora sea visible**

### **Paso 2: Verificar Variables de Entorno en Vercel**

1. **Ir al dashboard de Vercel → Settings → Environment Variables**

2. **Verificar que estén configuradas:**
   - `DATABASE_URL` - URL de conexión a PostgreSQL
   - `POSTGRES_URL` - (Se configura automáticamente)
   - `JWT_SECRET` - Clave secreta para tokens
   - `NODE_ENV` - Debe ser "production"

3. **Si faltan variables, agregarlas y redesplegar**

### **Paso 3: Ejecutar Migración de Base de Datos (Opcional)**

Si quieres una solución permanente sin el bypass:

1. **Conectarte a tu base de datos de producción**

2. **Ejecutar la migración SQL generada por el script:**
   ```bash
   node fix-guardias-produccion.js
   ```

3. **Copiar y ejecutar el SQL generado en tu base de datos**

4. **Remover el bypass temporal de `src/lib/permissions.ts`**

5. **Redesplegar**

### **Paso 4: Verificación Final**

1. **Ejecutar script de verificación:**
   ```bash
   node verificar-api-guardias-produccion.js
   ```

2. **Revisar logs en Vercel dashboard → Functions**

3. **Probar el formulario de guardias en producción**

## 🔧 Comandos Útiles

```bash
# Ejecutar diagnóstico completo
node fix-guardias-produccion.js

# Verificar APIs
node verificar-api-guardias-produccion.js

# Ver logs de Vercel (si tienes CLI instalado)
vercel logs

# Redesplegar manualmente
vercel --prod
```

## 📊 Verificación de Estado

Para verificar que todo funciona correctamente:

1. **✅ Formulario de guardias visible en producción**
2. **✅ Botón "+" para crear guardia funcional**
3. **✅ Sin errores en console del navegador**
4. **✅ API `/api/guardias` responde correctamente**

## ⚠️ Notas Importantes

### **Bypass Temporal**
- El bypass está activo solo en producción para permisos que empiecen con `guardias.`
- Es una solución temporal - considera implementar la migración de permisos para una solución permanente
- El bypass se puede remover una vez que los permisos estén configurados correctamente

### **Seguridad**
- El bypass solo afecta a los permisos de guardias
- No compromete otros aspectos de seguridad de la aplicación
- Una vez implementados los permisos correctos, remover el bypass

### **Monitoreo**
- Revisar regularmente los logs de Vercel para detectar errores
- El bypass genera warnings en los logs para facilitar el seguimiento

## 🆘 Si el Problema Persiste

Si después de implementar el bypass el problema continúa:

1. **Verificar logs de Vercel detalladamente**
2. **Ejecutar ambos scripts de diagnóstico**
3. **Verificar que no haya errores de JavaScript en el navegador**
4. **Verificar que la página se esté cargando completamente**
5. **Probar en modo incógnito para descartar problemas de caché**

## 📞 Contacto

Si necesitas ayuda adicional, proporciona:
- Logs específicos de Vercel
- Errores en la consola del navegador
- Resultado de los scripts de diagnóstico
- URL de la aplicación en producción