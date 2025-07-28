import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWTPayload } from '../lib/auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export function requireAuth() {
  return (request: NextRequest): NextResponse | AuthenticatedRequest => {
    try {
      // Extraer token del header Authorization
      const authHeader = request.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Token de autorización requerido' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7); // Remover "Bearer "
      
      // Verificar el JWT
      const decoded = verifyToken(token);
      
      if (!decoded) {
        return NextResponse.json(
          { error: 'Token inválido o expirado' },
          { status: 401 }
        );
      }

      // Inyectar el usuario autenticado en el request
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = decoded;
      
      return authenticatedRequest;
    } catch (error) {
      console.error('Error en requireAuth:', error);
      return NextResponse.json(
        { error: 'Error de autenticación' },
        { status: 401 }
      );
    }
  };
}

export function requireRole(requiredRole: 'admin' | 'supervisor' | 'guardia') {
  return (authenticatedRequest: AuthenticatedRequest): NextResponse | AuthenticatedRequest => {
    try {
      const user = authenticatedRequest.user;
      
      if (!user) {
        return NextResponse.json(
          { error: 'Usuario no autenticado' },
          { status: 401 }
        );
      }

      // Verificar que el rol del usuario coincida con el requerido
      if (user.rol !== requiredRole) {
        // Los admin pueden acceder a todo
        if (user.rol !== 'admin') {
          return NextResponse.json(
            { error: `Acceso denegado. Se requiere rol: ${requiredRole}` },
            { status: 403 }
          );
        }
      }

      return authenticatedRequest;
    } catch (error) {
      console.error('Error en requireRole:', error);
      return NextResponse.json(
        { error: 'Error de autorización' },
        { status: 403 }
      );
    }
  };
}

// Función helper para aplicar ambos middlewares
export function requireAuthAndRole(requiredRole: 'admin' | 'supervisor' | 'guardia') {
  return (request: NextRequest) => {
    const authResult = requireAuth()(request);
    
    // Si hay error en autenticación, devolver la respuesta de error
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    // Aplicar verificación de rol
    return requireRole(requiredRole)(authResult);
  };
}

// Función helper para extraer el usuario de una request autenticada
export function getAuthenticatedUser(request: AuthenticatedRequest): JWTPayload | null {
  return request.user || null;
} 