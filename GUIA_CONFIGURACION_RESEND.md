# 📧 Guía de Configuración de Resend para GardOps

## ✅ Problema Resuelto

La API key de Resend ahora funciona correctamente. El problema era que había una API key antigua en el archivo `.env.local`.

**API Key actual**: `re_GRe6HLsu_CWLtG7tq1YzFweBaMttyHi7G` ✅
**Dominio configurado**: `gard.cl` ✅
**Remitente**: `noreply@gard.cl` ✅
**URL de producción**: `https://ops.gard.cl` ✅
**Estado**: Completamente funcional ✅

## ✅ Solución: Configurar Resend Correctamente

### 1. Verificar Cuenta de Resend

1. **Ir a [resend.com](https://resend.com)**
2. **Iniciar sesión** con tu cuenta
3. **Verificar tu cuenta** si no está verificada
4. **Ir a la sección "API Keys"**

### 2. Crear Nueva API Key

1. **Hacer clic en "Create API Key"**
2. **Dar un nombre** como "GardOps Production"
3. **Seleccionar permisos** necesarios (solo envío de emails)
4. **Copiar la nueva API key**

### 3. Configurar Dominio (Opcional)

Para usar `noreply@gard.cl`:

1. **Ir a "Domains" en Resend**
2. **Agregar dominio** `gard.cl`
3. **Seguir las instrucciones** para verificar el dominio
4. **Configurar registros DNS** según las instrucciones

### 4. Usar Dominio de Prueba (Temporal)

Si no tienes dominio configurado, usar:
- **Remitente**: `onboarding@resend.dev` (dominio de prueba de Resend)

### 5. Actualizar Configuración

#### Opción A: Usar Variable de Entorno (Recomendado)

Agregar en `.env.local`:
```bash
RESEND_API_KEY=tu_nueva_api_key_aqui
```

#### Opción B: Actualizar Código Directamente

En `src/lib/email.ts` y `src/lib/email.js`:
```typescript
const resend = new Resend('tu_nueva_api_key_aqui')
```

## 🧪 Probar Configuración

### 1. Probar API Key
```bash
node scripts/test-email-resend.js
```

### 2. Probar Sistema Completo
```bash
node scripts/test-password-recovery.js
```

### 3. Probar desde la Web
1. Ir a `http://localhost:3000/recuperar-contrasena`
2. Ingresar tu email
3. Verificar que llegue el email

## 🔧 Configuración Actual

**API Key actual**: `re_GRe6HLsu_CWLtG7tq1YzFweBaMttyHi7G` ✅
**Remitente**: `noreply@gard.cl` ✅
**Dominio configurado**: `gard.cl` ✅

## 📋 Checklist de Verificación

- [x] Cuenta de Resend verificada
- [x] API key válida y activa
- [x] Dominio configurado
- [x] Permisos correctos en API key
- [x] Variable de entorno configurada
- [x] Sistema probado y funcionando

## 🎉 Sistema Completamente Funcional

El sistema de recuperación de contraseñas está funcionando correctamente:

1. **Genera tokens correctamente** ✅
2. **Envía emails exitosamente** ✅
3. **Verifica tokens correctamente** ✅
4. **Permite restablecer contraseñas** ✅

**Para usar el sistema:**
1. Ir a `https://ops.gard.cl/recuperar-contrasena`
2. Ingresar tu email
3. Recibir el email con el enlace de recuperación desde `https://ops.gard.cl`
4. Hacer clic en el enlace para restablecer contraseña

## 📞 Soporte

Si necesitas ayuda:
1. **Documentación de Resend**: [resend.com/docs](https://resend.com/docs)
2. **Verificar estado de API**: Dashboard de Resend
3. **Logs de errores**: Consola del servidor

---

**¡El sistema está completamente funcional y enviando emails correctamente!** 🎉
