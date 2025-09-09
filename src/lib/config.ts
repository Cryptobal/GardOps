/**
 * Configuración centralizada de la aplicación
 */

// URLs de la API
export const getApiBaseUrl = () => {
  // En el navegador, usar la URL actual
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // En el servidor, usar variables de entorno
  return process.env.NEXT_PUBLIC_API_URL || 
         process.env.NEXT_PUBLIC_API_BASE_URL || 
         process.env.NEXT_PUBLIC_BASE_URL || 
         'http://localhost:3000';
};

// URL del formulario de postulación
export const getFormularioUrl = (tenantId: string) => {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/postulacion/${tenantId}`;
};

// URL del webhook
export const getWebhookUrl = () => {
  return process.env.WEBHOOK_URL || null;
};

// Configuración de Cloudflare R2
export const getR2Config = () => ({
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  endpoint: process.env.R2_ENDPOINT!,
  bucket: process.env.R2_BUCKET!,
});

// Configuración de la base de datos
export const getDatabaseConfig = () => ({
  url: process.env.DATABASE_URL!,
});

// Configuración de JWT
export const getJWTConfig = () => ({
  secret: process.env.JWT_SECRET!,
});

// Configuración de Google Maps
export const getGoogleMapsConfig = () => ({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
});

// Verificar si estamos en producción
export const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

// Verificar si estamos en desarrollo
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

// Configuración de autenticación temporal en producción
export const getAuthConfig = () => ({
  // En producción, permitir acceso temporal a ciertas rutas
  allowTemporaryAccess: isProduction(),
  // Rutas que pueden ser accedidas temporalmente en producción
  publicRoutes: [
    '/api/configuracion/postulaciones',
    '/api/central-monitoring/kpis',
    '/api/central-monitoring/agenda'
  ],
  // Usuario temporal para producción (si es necesario)
  tempUserEmail: process.env.NEXT_PUBLIC_TEMP_USER_EMAIL || 'admin@gard.cl'
});
