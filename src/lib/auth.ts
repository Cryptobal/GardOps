import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

// Función para hashear contraseñas
export function hashPassword(password: string): string {
  const saltRounds = 10;
  return bcrypt.hashSync(password, saltRounds);
}

// Función para comparar contraseñas
export function comparePassword(password: string, hashedPassword: string): boolean {
  return bcrypt.compareSync(password, hashedPassword);
}

// Función para firmar tokens JWT
export function signToken(payload: any): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.sign(payload, secret, { expiresIn: '24h' });
}

// Función para verificar tokens JWT
export function verifyToken(token: string): any {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  try {
    return jwt.verify(token, secret);
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