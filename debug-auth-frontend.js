#!/usr/bin/env node

/**
 * Script para debuggear la autenticación del frontend en producción
 * Ejecutar en el navegador en la consola de https://ops.gard.cl/configuracion/seguridad/usuarios
 */

console.log('🔍 DEBUGGING FRONTEND AUTHENTICATION');
console.log('====================================');

// Verificar cookies
console.log('\n🍪 COOKIES:');
console.log('document.cookie:', document.cookie);

// Verificar localStorage
console.log('\n💾 LOCALSTORAGE:');
console.log('auth_token:', localStorage.getItem('auth_token'));
console.log('current_user:', localStorage.getItem('current_user'));

// Verificar variables de entorno
console.log('\n⚙️ ENVIRONMENT:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('NEXT_PUBLIC_DEV_USER_EMAIL:', process.env.NEXT_PUBLIC_DEV_USER_EMAIL);

// Verificar si estamos en producción
const isProduction = process.env.NODE_ENV === 'production';
console.log('Is Production:', isProduction);

// Verificar token JWT si existe
const authToken = localStorage.getItem('auth_token') || 
                  document.cookie.match(/(?:^|;\s*)auth_token=([^;]+)/)?.[1];

if (authToken) {
  console.log('\n🔑 JWT TOKEN:');
  console.log('Token:', authToken);
  
  try {
    const parts = authToken.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      console.log('Payload:', payload);
      console.log('User ID:', payload.user_id);
      console.log('Email:', payload.email);
      console.log('Role:', payload.rol);
      console.log('Tenant ID:', payload.tenant_id);
      console.log('Exp:', payload.exp ? new Date(payload.exp * 1000) : 'No expiration');
    }
  } catch (error) {
    console.log('Error parsing JWT:', error);
  }
}

// Verificar tenant cookie
const tenantCookie = document.cookie
  .split('; ')
  .find((row) => row.startsWith('tenant='))
  ?.split('=')[1];

if (tenantCookie) {
  console.log('\n🏢 TENANT COOKIE:');
  try {
    const tenantInfo = JSON.parse(decodeURIComponent(tenantCookie));
    console.log('Tenant Info:', tenantInfo);
    console.log('User ID:', tenantInfo.user_id);
    console.log('Email:', tenantInfo.email);
    console.log('Tenant ID:', tenantInfo.id);
  } catch (error) {
    console.log('Error parsing tenant cookie:', error);
  }
}

// Verificar si el usuario está autenticado según las funciones del sistema
console.log('\n✅ AUTH STATUS:');
try {
  // Verificar si las funciones de auth están disponibles
  if (typeof window !== 'undefined' && window.getCurrentUser) {
    const currentUser = window.getCurrentUser();
    console.log('getCurrentUser():', currentUser);
  }
  
  if (typeof window !== 'undefined' && window.isAuthenticated) {
    const isAuth = window.isAuthenticated();
    console.log('isAuthenticated():', isAuth);
  }
} catch (error) {
  console.log('Auth functions not available:', error);
}

// Verificar headers que se enviarían en una petición
console.log('\n📋 HEADERS QUE SE ENVIARÍAN:');
const headers = {
  'Content-Type': 'application/json'
};

// Intentar obtener email del usuario
let userEmail = null;

// Desde tenant cookie
if (tenantCookie) {
  try {
    const tenantInfo = JSON.parse(decodeURIComponent(tenantCookie));
    userEmail = tenantInfo.email;
  } catch {}
}

// Desde localStorage
if (!userEmail) {
  const currentUser = localStorage.getItem('current_user');
  if (currentUser) {
    try {
      const userInfo = JSON.parse(currentUser);
      userEmail = userInfo.email;
    } catch {}
  }
}

// Desde JWT
if (!userEmail && authToken) {
  try {
    const parts = authToken.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      userEmail = payload.email;
    }
  } catch {}
}

if (userEmail) {
  headers['x-user-email'] = userEmail;
  console.log('✅ x-user-email header:', userEmail);
} else {
  console.log('❌ No se pudo obtener email del usuario');
}

console.log('Headers finales:', headers);

// Verificar si las APIs RBAC están disponibles
console.log('\n🌐 RBAC APIs STATUS:');
const rbacApis = [
  '/api/admin/rbac/usuarios',
  '/api/admin/rbac/roles', 
  '/api/admin/rbac/permisos',
  '/api/admin/tenants'
];

rbacApis.forEach(api => {
  console.log(`${api}: ${window.location.origin}${api}`);
});

console.log('\n🎯 RECOMENDACIONES:');
if (!userEmail) {
  console.log('❌ PROBLEMA: No se puede obtener el email del usuario');
  console.log('💡 SOLUCIÓN: Verificar que el usuario esté autenticado correctamente');
  console.log('💡 SOLUCIÓN: Verificar que las cookies contengan la información necesaria');
} else {
  console.log('✅ Email del usuario obtenido:', userEmail);
  console.log('💡 Verificar que este email tenga permisos en el backend');
}

if (isProduction) {
  console.log('\n🚀 PRODUCCIÓN DETECTADA');
  console.log('💡 El middleware no inyecta x-user-email en producción');
  console.log('💡 El rbacClient no inyecta x-user-email en producción');
  console.log('💡 El usuario debe estar autenticado correctamente');
}

console.log('\n🔍 DEBUG COMPLETADO');
