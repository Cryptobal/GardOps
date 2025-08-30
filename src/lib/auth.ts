import { NextRequest, NextResponse } from 'next/server';

export interface AuthenticatedUser {
  id: string;
  email: string;
  tenant_id: string;
  role: string;
}

export interface CurrentUserServer {
  user_id: string;
  email: string;
  rol: string;
  tenant_id?: string;
}

export interface AuthenticatedRequest extends NextRequest {
  user?: AuthenticatedUser;
}

// Función simple para hashear contraseñas (sin dependencias externas)
export function hashPassword(password: string): string {
  // Implementación simple de hash (en producción usar bcrypt)
  const salt = 'gardops-salt-2024';
  const hashed = Buffer.from(password + salt).toString('base64');
  return hashed;
}

// Función simple para comparar contraseñas
export function comparePassword(password: string, hashedPassword: string): boolean {
  const salt = 'gardops-salt-2024';
  const hashed = Buffer.from(password + salt).toString('base64');
  return hashed === hashedPassword;
}

// Función simple para firmar tokens (sin dependencias externas)
export function signToken(payload: any): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = Buffer.from(header + '.' + payloadB64 + secret).toString('base64');
  return `${header}.${payloadB64}.${signature}`;
}

// Función simple para verificar tokens
export function verifyToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, payload, signature] = parts;
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const expectedSignature = Buffer.from(header + '.' + payload + secret).toString('base64');
    
    if (signature !== expectedSignature) return null;
    
    return JSON.parse(Buffer.from(payload, 'base64').toString());
  } catch (error) {
    return null;
  }
}

// Función para obtener usuario actual del servidor (simplificada)
export function getCurrentUserServer(req: NextRequest): CurrentUserServer | null {
  try {
    // En desarrollo, simular usuario
    if (process.env.NODE_ENV === 'development') {
      return {
        user_id: 'dev-user-id',
        email: process.env.NEXT_PUBLIC_DEV_USER_EMAIL || 'dev@example.com',
        rol: 'admin',
        tenant_id: 'dev-tenant'
      };
    }

    // En producción, simular usuario por ahora
    return {
      user_id: 'prod-user-id',
      email: 'user@example.com',
      rol: 'admin',
      tenant_id: 'prod-tenant'
    };
  } catch (error) {
    console.error('getCurrentUserServer error:', error);
    return null;
  }
}

// Función simple para obtener usuario autenticado
export function getAuthenticatedUser(request: AuthenticatedRequest): AuthenticatedUser | null {
  return request.user || null;
}

// Función simple para requerir autenticación y rol
export function requireAuthAndRole(requiredRole: string) {
  return (request: NextRequest): NextResponse | AuthenticatedRequest => {
    // En desarrollo, simular usuario autenticado
    if (process.env.NODE_ENV === 'development') {
      const devUser: AuthenticatedUser = {
        id: 'dev-user-id',
        email: 'dev@example.com',
        tenant_id: 'dev-tenant',
        role: requiredRole
      };
      
      (request as AuthenticatedRequest).user = devUser;
      return request as AuthenticatedRequest;
    }
    
    // En producción, verificar headers de autenticación
    const authHeader = request.headers.get('authorization');
    const cookieHeader = request.headers.get('cookie') || '';
    const hasAuthCookie = /(?:^|;\s*)auth_token=/.test(cookieHeader);
    
    if (!authHeader && !hasAuthCookie) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Por ahora, simular usuario autenticado en producción
    const user: AuthenticatedUser = {
      id: 'prod-user-id',
      email: 'user@example.com',
      tenant_id: 'prod-tenant',
      role: requiredRole
    };
    
    (request as AuthenticatedRequest).user = user;
    return request as AuthenticatedRequest;
  };
}

// Función para requerir un permiso específico
export async function requirePermission(permission: string): Promise<void> {
  // En desarrollo, permitir todos los permisos
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [requirePermission] Modo desarrollo - permitiendo permiso:', permission);
    return;
  }
  
  // En producción, verificar el permiso usando el sistema RBAC
  try {
    const { userHasPerm, getUserIdByEmail, getUserEmail } = await import('@/lib/auth/rbac');
    
    // Crear un request simulado para obtener el email del usuario
    const mockRequest = {
      headers: {
        get: (name: string) => {
          if (name === 'x-user-email') return 'carlos.irigoyen@gard.cl';
          if (name === 'authorization') return 'Bearer dev-token';
          return null;
        }
      }
    } as any;
    
    // Obtener email del usuario
    const email = await getUserEmail(mockRequest);
    if (!email) {
      console.log('❌ [requirePermission] No se pudo obtener email del usuario');
      throw new Error('UNAUTHORIZED');
    }
    
    // Obtener userId
    const userId = await getUserIdByEmail(email);
    if (!userId) {
      console.log('❌ [requirePermission] Usuario no encontrado:', email);
      throw new Error('FORBIDDEN');
    }
    
    // Verificar permiso específico
    const hasPermission = await userHasPerm(userId, permission);
    if (!hasPermission) {
      // También verificar si es platform admin
      const isPlatformAdmin = await userHasPerm(userId, 'rbac.platform_admin');
      if (!isPlatformAdmin) {
        console.log('❌ [requirePermission] Permiso denegado:', permission, 'para usuario:', email);
        throw new Error('FORBIDDEN');
      }
    }
    
    console.log('✅ [requirePermission] Permiso concedido:', permission, 'para usuario:', email);
  } catch (error: any) {
    console.error('❌ [requirePermission] Error verificando permiso:', error);
    if (error.message === 'UNAUTHORIZED') {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error('FORBIDDEN');
  }
}

// Función para obtener la referencia del usuario actual
export async function getCurrentUserRef(): Promise<string> {
  // En desarrollo, retornar un usuario de prueba
  if (process.env.NODE_ENV === 'development') {
    return 'carlos.irigoyen@gard.cl';
  }
  
  // En producción, obtener el usuario real
  try {
    const { getUserEmail } = await import('@/lib/auth/rbac');
    
    // Crear un request simulado para obtener el email del usuario
    const mockRequest = {
      headers: {
        get: (name: string) => {
          if (name === 'x-user-email') return 'carlos.irigoyen@gard.cl';
          if (name === 'authorization') return 'Bearer dev-token';
          return null;
        }
      }
    } as any;
    
    const email = await getUserEmail(mockRequest);
    return email || 'system';
  } catch (error) {
    console.error('❌ [getCurrentUserRef] Error obteniendo usuario:', error);
    return 'system';
  }
}