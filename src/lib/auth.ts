const jwt = require('jsonwebtoken');
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'gardops-secret-key-change-in-production';

export interface JWTPayload {
  user_id: string;
  email: string;
  rol: 'admin' | 'supervisor' | 'guardia';
  tenant_id: string;
  iat: number;
  exp: number;
}

// Funciones del servidor (backend)
export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30m' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(plainPassword: string, hashedPassword: string): boolean {
  return bcrypt.compareSync(plainPassword, hashedPassword);
}

// Funciones del cliente (frontend)
export function getToken(): string | null {
  if (typeof window === 'undefined') {
    console.log('🔍 getToken: Ejecutando en servidor, retornando null');
    return null;
  }
  
  // Intentar obtener de cookies primero (nuevo sistema)
  try {
    console.log('🔍 getToken: Cookies disponibles:', document.cookie);
    
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth_token='))
      ?.split('=')[1];
    
    console.log('🔍 getToken: Cookie auth_token encontrada:', cookieValue ? 'SÍ' : 'NO');
    
    if (cookieValue) {
      // Decodificar si está URL-encoded
      const decodedValue = decodeURIComponent(cookieValue);
      console.log('🔍 getToken: Token decodificado:', decodedValue.substring(0, 20) + '...');
      return decodedValue;
    }
  } catch (error) {
    console.log('❌ getToken: Error leyendo cookie:', error);
  }
  
  // Fallback a localStorage (sistema anterior)
  const localToken = localStorage.getItem('auth_token');
  console.log('🔍 getToken: localStorage token:', localToken ? 'SÍ' : 'NO');
  return localToken;
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    // Limpiar localStorage (sistema anterior)
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    
    // Limpiar cookies (nuevo sistema)
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'tenant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    window.location.href = '/login';
  }
}

export function isAuthenticated(): boolean {
  // Verificar si estamos en el servidor
  if (typeof window === 'undefined') {
    console.log('🔍 isAuthenticated: Ejecutando en servidor, retornando false');
    return false;
  }
  
  const token = getToken();
  console.log(`🔍 isAuthenticated: Token encontrado: ${token ? 'SÍ (' + token.substring(0, 20) + '...)' : 'NO'}`);
  
  if (!token) {
    console.log(`❌ isAuthenticated: No hay token`);
    return false;
  }
  
  try {
    // Decodificar el JWT para verificar expiración
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    const isValid = payload.exp > currentTime;
    
    console.log(`🔍 isAuthenticated: Token expira en ${payload.exp}, tiempo actual ${currentTime}, válido: ${isValid}`);
    return isValid;
  } catch (error) {
    // Si hay error al decodificar, consideramos el token inválido
    console.log(`❌ isAuthenticated: Error decodificando token:`, error);
    return false;
  }
}

export function requireAuth(): void {
  if (!isAuthenticated()) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
}

// Nuevas funciones para obtener información del usuario
export function getUserInfo(): { 
  user_id: string; 
  email: string; 
  rol: string; 
  tenant_id: string;
} | null {
  const token = getToken();
  
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      user_id: payload.user_id,
      email: payload.email,
      rol: payload.rol,
      tenant_id: payload.tenant_id,
    };
  } catch (error) {
    return null;
  }
}

export function getCurrentUser(): {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
  tenant_id: string;
} | null {
  if (typeof window === 'undefined') return null;
  
  // Intentar obtener de cookies primero (nuevo sistema)
  try {
    const tenantCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('tenant='))
      ?.split('=')[1];
    
    if (tenantCookie) {
      const decodedCookie = decodeURIComponent(tenantCookie);
      const tenantInfo = JSON.parse(decodedCookie);
      return {
        id: tenantInfo.user_id,
        email: tenantInfo.email,
        nombre: tenantInfo.nombre,
        apellido: '', // No está en la cookie tenant
        rol: '', // Se puede obtener del JWT
        tenant_id: tenantInfo.id
      };
    }
  } catch (error) {
    console.log('Error leyendo cookie tenant, intentando localStorage...');
  }
  
  // Fallback a localStorage (sistema anterior)
  try {
    const storedUser = localStorage.getItem('current_user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
}

export function getUserRole(): string | null {
  const userInfo = getUserInfo();
  return userInfo?.rol || null;
}

export function getTenantId(): string | null {
  const userInfo = getUserInfo();
  return userInfo?.tenant_id || null;
}

export function isAdmin(): boolean {
  return getUserRole() === 'admin';
}

export function isSupervisor(): boolean {
  return getUserRole() === 'supervisor';
}

export function isGuardia(): boolean {
  return getUserRole() === 'guardia';
} 

export function getCurrentUserServer(request: Request): {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
  tenant_id: string;
} | null {
  try {
    // Obtener el token de las cookies
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return null;
    
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    const token = cookies.auth_token;
    if (!token) return null;
    
    // Verificar y decodificar el token
    const decoded = verifyToken(token);
    if (!decoded) return null;
    
    // Obtener información adicional del usuario desde la base de datos
    // Por ahora retornamos la información básica del token
    return {
      id: decoded.user_id,
      email: decoded.email,
      nombre: '', // Se puede obtener de la base de datos si es necesario
      apellido: '', // Se puede obtener de la base de datos si es necesario
      rol: decoded.rol,
      tenant_id: decoded.tenant_id
    };
  } catch (error) {
    console.error('Error obteniendo usuario del servidor:', error);
    return null;
  }
} 

// =====================
// Server-side helpers (RBAC)
// =====================

/**
 * Obtiene la referencia del usuario actual desde headers `x-user`.
 * Si no existe o no puede acceder a headers() (por entorno de test/cliente),
 * usa `process.env.DEV_USER_REF ?? null` como fallback.
 */
export async function getCurrentUserRef(): Promise<string | null> {
  // Evitar romper en cliente o entorno de test sin Next runtime
  try {
    const mod = await import('next/headers');
    const h = mod.headers?.();
    const userFromHeader = h?.get?.('x-user') ?? null;
    if (userFromHeader) return userFromHeader;
  } catch {
    // ignore
  }
  return process.env.DEV_USER_REF ?? null;
}

/**
 * Verifica si el usuario actual posee el permiso indicado usando función RBAC en la BD.
 */
export async function userHas(permission: string): Promise<boolean> {
  const userRef = await getCurrentUserRef();
  if (!userRef) return false;
  try {
    const { query } = await import('@/lib/database');
    const result = await query(
      'select rbac_fn_usuario_tiene_permiso($1,$2) as ok',
      [userRef, permission]
    );
    return Boolean(result?.rows?.[0]?.ok);
  } catch (e) {
    return false;
  }
}

/**
 * Exige que el usuario tenga el permiso; lanza Error('FORBIDDEN') si no.
 */
export async function requirePermission(permission: string): Promise<void> {
  const ok = await userHas(permission);
  if (!ok) {
    throw new Error('FORBIDDEN');
  }
}