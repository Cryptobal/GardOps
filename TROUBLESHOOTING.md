# Guía de Resolución de Problemas - GardOps

## Errores Comunes y Soluciones

### 1. Errores 404 en archivos estáticos

**Síntomas:**
```
Failed to load resource: the server responded with a status of 404 (Not Found)
```

**Causas comunes:**
- Caché corrupta de Next.js
- Problemas de compilación
- Servidor no iniciado correctamente

**Soluciones:**

#### Opción 1: Limpiar caché y reiniciar
```bash
# Limpiar caché
npm run clean

# Reiniciar servidor
npm run dev
```

#### Opción 2: Reset completo
```bash
# Reset completo del proyecto
npm run reset
```

#### Opción 3: Verificar diagnóstico
```bash
# Ejecutar diagnóstico automático
npm run diagnostic
```

### 2. Error 500 en icono

**Síntomas:**
```
/icon?2ee941ceddcb3435:1 Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

**Causas:**
- Problemas con el runtime Edge
- Errores en el archivo `src/app/icon.tsx`

**Soluciones:**
1. Verificar que el archivo `src/app/icon.tsx` esté correcto
2. Limpiar caché y reiniciar
3. Verificar que Next.js esté actualizado

### 3. Problemas de compilación

**Síntomas:**
- Errores de TypeScript
- Fallos en la compilación de Next.js

**Soluciones:**
```bash
# Verificar errores de TypeScript
npx tsc --noEmit

# Verificar linting
npm run lint

# Limpiar y reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### 4. Problemas de dependencias

**Síntomas:**
- Vulnerabilidades de seguridad
- Conflictos de versiones

**Soluciones:**
```bash
# Verificar vulnerabilidades
npm audit

# Corregir vulnerabilidades automáticamente
npm audit fix

# Forzar corrección (puede actualizar versiones)
npm audit fix --force
```

### 5. Problemas de rendimiento

**Síntomas:**
- Carga lenta de la aplicación
- Archivos estáticos grandes

**Soluciones:**
```bash
# Analizar bundle
npm run build
# Revisar el output para archivos grandes

# Optimizar imágenes y assets
# Usar next/image para imágenes
# Comprimir assets estáticos
```

## Scripts Útiles

### Diagnóstico Automático
```bash
npm run diagnostic
```
Ejecuta un diagnóstico completo del servidor y verifica:
- Estado del servidor
- Respuesta HTTP
- Archivos estáticos
- Compilación TypeScript
- Vulnerabilidades

### Limpieza de Caché
```bash
npm run clean
```
Elimina la caché de Next.js y node_modules

### Reset Completo
```bash
npm run reset
```
Limpia caché, reinstala dependencias e inicia el servidor

## Verificación Manual

### 1. Verificar estado del servidor
```bash
ps aux | grep "next dev" | grep -v grep
```

### 2. Verificar respuesta del servidor
```bash
curl -I http://localhost:3000
```

### 3. Verificar archivos específicos
```bash
curl -I http://localhost:3000/_next/static/chunks/main-app.js
curl -I http://localhost:3000/icon
```

### 4. Verificar logs del servidor
```bash
npm run dev
# Revisar la salida en consola para errores
```

## Prevención

### 1. Mantener Next.js actualizado
```bash
npm update next
```

### 2. Verificar dependencias regularmente
```bash
npm audit
```

### 3. Usar TypeScript strict mode
```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

### 4. Configurar linting
```bash
npm run lint
```

## Contacto

Si los problemas persisten después de intentar estas soluciones, revisa:
1. Los logs del servidor de desarrollo
2. La consola del navegador
3. Los logs de errores del sistema

Para problemas específicos, consulta la documentación oficial de Next.js o crea un issue en el repositorio del proyecto. 