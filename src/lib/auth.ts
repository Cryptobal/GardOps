import 'server-only'
const jwt = require('jsonwebtoken');
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

// Se removieron helpers de cliente. Usar `@/lib/auth-client` en componentes cliente.

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
      const decoded = verifyToken(token);
      if (decoded && decoded.user_id) {
        try {
          console.debug('[auth] getCurrentUserRef decoded', {
            user_id: decoded.user_id,
            email: decoded.email,
          });
        } catch {}
        return decoded.user_id;
      }
    }
    
    // Fallback al header x-user si existe
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
    
    // Obtener el email del usuario, primero por la tabla y si no existe, desde el token
    let userEmail: string | null = null;
    const usuario = await query(`
      SELECT email FROM usuarios WHERE id = $1
    `, [userRef]);

    if (usuario.rows.length > 0) {
      userEmail = usuario.rows[0].email as string;
    } else {
      try {
        console.debug('[auth] userHas: usuario no encontrado por id', { userRef, permission });
      } catch {}
      // Fallback: email desde el token
      try {
        const mod = await import('next/headers');
        const token = mod.cookies?.()?.get?.('auth_token')?.value;
        if (token) {
          const decoded = verifyToken(token);
          if (decoded?.email) {
            userEmail = decoded.email;
            try {
              console.debug('[auth] userHas: usando email desde token como fallback', { userEmail, permission });
            } catch {}
          }
        }
      } catch {}
    }

    if (!userEmail) return false;
    
    // Intentar primero con la función legacy (que es la que está configurada)
    try {
      const result = await query(
        'select fn_usuario_tiene_permiso($1,$2) as ok',
        [userEmail, permission]
      );
      const ok = Boolean(result?.rows?.[0]?.ok);
      try {
        console.debug('[auth] userHas legacy', { userRef, userEmail, permission, ok });
      } catch {}
      return ok;
    } catch (e) {
      // Si falla, intentar con la función RBAC
      const result = await query(
        'select rbac_fn_usuario_tiene_permiso($1,$2) as ok',
        [userEmail, permission]
      );
      const ok = Boolean(result?.rows?.[0]?.ok);
      try {
        console.debug('[auth] userHas rbac', { userRef, userEmail, permission, ok });
      } catch {}
      return ok;
    }
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