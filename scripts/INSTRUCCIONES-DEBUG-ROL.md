# 🔧 Instrucciones para Debuggear Asignación de Roles

## 🎯 Problema Reportado
**"selecciono el rol para el usuario pero no me deja guardarlo"**

## ✅ Estado del Sistema
- **Backend**: ✅ Funcionando correctamente
- **Base de datos**: ✅ Limpia y operativa
- **Permisos**: ✅ Usuario tiene Platform Admin
- **Endpoints**: ✅ GET y POST funcionando

## 🔍 Pasos para Diagnosticar

### 1. **Abrir las Herramientas de Desarrollador**
1. Ve a `http://localhost:3000/configuracion/seguridad/usuarios`
2. Presiona `F12` o `Cmd+Option+I` (Mac)
3. Ve a la pestaña **Console**

### 2. **Probar la Funcionalidad**
1. Haz click en el ícono ⚙️ en la columna "Roles" de cualquier usuario
2. Observa los logs en la consola
3. Selecciona un rol diferente con los radio buttons
4. Observa si aparecen logs de `RadioGroup onValueChange`

### 3. **Logs Esperados**
Deberías ver logs como:
```
Abriendo modal para usuario: cl@cl.cl
Cargando roles del usuario: 6eab801e-ff4d-42da-a4ca-bcf502ed4d9f
Respuesta del servidor: {ok: true, roles: [...]}
Rol actual del usuario: 06e03d2f-a1f3-4894-8a46-26c525d337cb
RadioGroup onValueChange llamado con: de3672a6-2d5a-4333-b6f3-ba3f37455f0d
Asignando rol: de3672a6-2d5a-4333-b6f3-ba3f37455f0d al usuario: 6eab801e-ff4d-42da-a4ca-bcf502ed4d9f
Rol asignado exitosamente
```

### 4. **Verificar Network Tab**
1. Ve a la pestaña **Network**
2. Filtra por **Fetch/XHR**
3. Selecciona un rol
4. Busca la llamada POST a `/api/admin/rbac/usuarios/[id]/roles`
5. Verifica el **Status Code** (debería ser 200)

## 🚨 Posibles Problemas y Soluciones

### **Problema 1: No aparecen logs en Console**
**Síntomas**: No ves los logs de `RadioGroup onValueChange`
**Causa**: El componente RadioGroup no está funcionando
**Solución**: 
- Verificar que no hay errores JavaScript
- Revisar que el componente se está renderizando

### **Problema 2: Error 400 en Network**
**Síntomas**: Status 400 en la llamada POST
**Causa**: Datos incorrectos en el request
**Solución**:
- Verificar que `rol_id` y `action` están en el body
- Verificar que el `rol_id` es válido

### **Problema 3: Error 403 en Network**
**Síntomas**: Status 403 en la llamada POST
**Causa**: Usuario no tiene permisos Platform Admin
**Solución**:
- Ejecutar: `npx tsx scripts/restaurar-platform-admin.ts`

### **Problema 4: Error 500 en Network**
**Síntomas**: Status 500 en la llamada POST
**Causa**: Error interno del servidor
**Solución**:
- Revisar logs del servidor en la terminal
- Verificar que la base de datos está accesible

## 🧪 Scripts de Prueba Disponibles

### **Verificar Sistema Completo**
```bash
npx tsx scripts/verificar-sistema-roles.ts
```

### **Probar Asignación de Roles**
```bash
npx tsx scripts/test-asignacion-rol.ts
```

### **Probar Flujo Frontend**
```bash
npx tsx scripts/test-frontend-rol.ts
```

### **Restaurar Permisos Admin**
```bash
npx tsx scripts/restaurar-platform-admin.ts
```

## 📋 Checklist de Verificación

- [ ] **Console del navegador abierta**
- [ ] **No hay errores JavaScript en Console**
- [ ] **Logs aparecen al abrir modal**
- [ ] **Logs aparecen al seleccionar rol**
- [ ] **Network tab muestra llamada POST**
- [ ] **Status code es 200**
- [ ] **Toast de éxito aparece**
- [ ] **Rol se actualiza en la interfaz**

## 🆘 Si Nada Funciona

### **Opción 1: Reiniciar el Servidor**
```bash
# Matar proceso en puerto 3000
lsof -ti:3000 | xargs kill -9

# Reiniciar servidor
npm run dev
```

### **Opción 2: Limpiar Cache del Navegador**
1. Presiona `Cmd+Shift+R` (Mac) o `Ctrl+Shift+R` (Windows)
2. O abre las herramientas de desarrollador y haz click derecho en el botón de refresh
3. Selecciona "Empty Cache and Hard Reload"

### **Opción 3: Verificar Base de Datos**
```bash
npx tsx scripts/verificar-sistema-roles.ts
```

## 📞 Información para Reportar

Si el problema persiste, proporciona:

1. **Screenshots** de la Console del navegador
2. **Screenshots** de la Network tab
3. **Logs** del servidor (terminal donde corre `npm run dev`)
4. **Pasos exactos** que seguiste
5. **Navegador** y **versión** que estás usando

## 🎯 Estado Actual Confirmado

✅ **Backend funcionando**: Endpoints GET y POST operativos  
✅ **Base de datos limpia**: Usuarios con máximo 1 rol  
✅ **Permisos correctos**: Usuario tiene Platform Admin  
✅ **Lógica implementada**: Radio buttons para selección única  
✅ **Scripts de prueba**: Todos funcionando correctamente  

**El problema está en el frontend y requiere debugging en el navegador.**

---

**Fecha**: Diciembre 2024  
**Versión**: 2.0.0 (Rol Único)  
**Estado**: Backend ✅ | Frontend 🔧 (requiere debugging)
