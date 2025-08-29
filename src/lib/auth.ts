import { NextRequest, NextResponse } from 'next/server';

export interface AuthenticatedUser {
  id: string;
  email: string;
  tenant_id: string;
  role: string;
}

export interface AuthenticatedRequest extends NextRequest {
  user?: AuthenticatedUser;
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