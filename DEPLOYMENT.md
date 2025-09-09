# 🚀 Guía de Despliegue - GardOps

## 📋 Configuración de URLs para Producción

### 🔧 Variables de Entorno Requeridas

Para que la aplicación funcione correctamente en producción (`ops.gard.cl`), asegúrate de configurar estas variables de entorno en Vercel:

#### **URLs de la API (CRÍTICAS)**
```bash
NEXT_PUBLIC_API_URL=https://ops.gard.cl
NEXT_PUBLIC_API_BASE_URL=https://ops.gard.cl
NEXT_PUBLIC_BASE_URL=https://ops.gard.cl
```

#### **Base de Datos**
```bash
DATABASE_URL=postgresql://neondb_owner:password@ep-gentle-bush-ad6zia51-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

#### **JWT y NextAuth**
```bash
JWT_SECRET=gardops-super-secret-jwt-key-change-in-production-2024
NEXTAUTH_SECRET=gardops-super-secret-jwt-key-change-in-production-2024
```

#### **Google Maps**
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBHIoHJDp6StLJlUAQV_gK7woFsEYgbzHY
```

#### **Cloudflare R2**
```bash
R2_ACCESS_KEY_ID=7572bbb3853f3cb1e43640bf5ee85670
R2_SECRET_ACCESS_KEY=d95dada9bcf003fff528de9ea2ea5092b2e1961ef3d900b141f6ee9c97904fe2
R2_ENDPOINT=https://e56e6231ebbfb3ed318e5df0a7092bc.r2.cloudflarestorage.com
R2_BUCKET=gardops-docs
```

### 🚨 Problema Resuelto: URLs de localhost

**Antes:** La aplicación estaba configurada para usar `localhost:3000` en producción, causando errores.

**Después:** Ahora usa la configuración centralizada que detecta automáticamente el entorno:
- **Desarrollo:** `http://localhost:3000`
- **Producción:** `https://ops.gard.cl`

### 📁 Archivos de Configuración

1. **`.env.production`** - Configuración para producción
2. **`src/lib/config.ts`** - Configuración centralizada de la aplicación
3. **`vercel.json`** - Configuración específica de Vercel

### 🔄 Flujo de Despliegue

1. **Commit y Push:**
   ```bash
   git add .
   git commit -m "fix: Configurar URLs para producción"
   git push origin main
   ```

2. **Vercel se despliega automáticamente**

3. **Verificar en Vercel Dashboard:**
   - Variables de entorno configuradas correctamente
   - Build exitoso
   - Aplicación funcionando en `ops.gard.cl`

### ✅ Verificación Post-Despliegue

1. **Formulario de Postulación:**
   - Debe funcionar sin errores de CORS
   - Las peticiones deben ir a `ops.gard.cl/api/...`

2. **APIs:**
   - Todas las rutas `/api/*` deben responder correctamente
   - No debe haber errores de "localhost:3000"

3. **Documentos:**
   - Subida a Cloudflare R2 debe funcionar
   - URLs de descarga deben ser válidas

### 🐛 Troubleshooting

#### **Error: "localhost:3000" en producción**
- Verificar variables de entorno en Vercel
- Asegurar que `NEXT_PUBLIC_*` estén configuradas
- Revisar logs de build en Vercel

#### **Error de CORS**
- Verificar que las URLs de la API sean correctas
- Asegurar que `window.location.origin` funcione en el navegador

#### **Error de Base de Datos**
- Verificar `DATABASE_URL` en Vercel
- Asegurar que Neon esté accesible desde Vercel

### 📞 Soporte

Si persisten los problemas:
1. Revisar logs en Vercel Dashboard
2. Verificar variables de entorno
3. Comprobar que el build sea exitoso
4. Revisar la consola del navegador para errores específicos
