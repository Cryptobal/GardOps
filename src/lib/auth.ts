import 'server-only'
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'gardops-secret-key-change-in-production';

export interface JWTPayload {
  user_id: string;
  email: string;
  rol: 'admin' | 'supervisor' | 'guardia';
  tenant_id: string;
  is_platform_admin?: boolean;
  iat: number;
  exp: number;
}

// Implementación compatible con Edge Runtime usando Web Crypto API
async function signTokenEdge(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const data = { ...payload, iat: now, exp: now + 1800 }; // 30 minutos
  
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header));
  const payloadB64 = btoa(JSON.stringify(data));
  const signature = await crypto.subtle.importKey(
    'raw',
    encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  ).then(key => crypto.subtle.sign('HMAC', key, encoder.encode(`${headerB64}.${payloadB64}`)))
  .then(sig => btoa(String.fromCharCode(...Array.from(new Uint8Array(sig)))));
  
  return `${headerB64}.${payloadB64}.${signature}`;
}

async function verifyTokenEdge(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [headerB64, payloadB64, signature] = parts;
    const encoder = new TextEncoder();
    
    // Verificar firma
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      new Uint8Array(atob(signature).split('').map(c => c.charCodeAt(0))),
      encoder.encode(`${headerB64}.${payloadB64}`)
    );
    
    if (!isValid) return null;
    
    // Decodificar payload
    const payload = JSON.parse(atob(payloadB64));
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp < now) return null;
    
    return payload;
  } catch (error) {
    return null;
  }
}

// Funciones del servidor (backend) - compatibles con Edge Runtime
export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return await signTokenEdge(payload);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  return await verifyTokenEdge(token);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(plainPassword: string, hashedPassword: string): boolean {
  return bcrypt.compareSync(plainPassword, hashedPassword);
}

// Se removieron helpers de cliente. Usar `@/lib/auth-client` en componentes cliente.

export async function getCurrentUserServer(request: Request): Promise<{
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
  tenant_id: string;
} | null> {
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
    const decoded = await verifyToken(token);
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
 * Obtiene la referencia del usuario actual desde el token JWT.
 * Si no existe o no puede acceder a headers() (por entorno de test/cliente),
 * usa `process.env.DEV_USER_REF ?? null` como fallback.
 */
export async function getCurrentUserRef(): Promise<string | null> {
  // Evitar romper en cliente o entorno de test sin Next runtime
  try {
    const mod = await import('next/headers');
    const cookiesStore = mod.cookies?.();
    const token = cookiesStore?.get?.('auth_token')?.value;
    
    if (token) {
      const decoded = await verifyToken(token);
      return decoded?.user_id ?? null;
    }
  } catch (error) {
    console.log('No se pudo obtener token de cookies, usando fallback');
  }
  
  // Fallback para desarrollo/testing
  return process.env.DEV_USER_REF ?? null;
}

// Exportar funciones específicas para compatibilidad
export const authOptions = {
  providers: [],
  secret: JWT_SECRET,
};

export const isAuthenticated = async (request: Request) => {
  return await getCurrentUserServer(request) !== null;
};

export const getUserInfo = async (request: Request) => {
  return await getCurrentUserServer(request);
};

// Función de compatibilidad para requirePermission
export async function requirePermission(permission: string): Promise<void> {
  // Implementación básica - se puede expandir según necesidades
  console.log(`Permission check for: ${permission}`);
  // Por ahora siempre permite - implementar lógica real según sea necesario
}