import jwt from 'jsonwebtoken';
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
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    window.location.href = '/login';
  }
}

export function isAuthenticated(): boolean {
  const token = getToken();
  
  if (!token) return false;
  
  try {
    // Decodificar el JWT para verificar expiración
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    
    return payload.exp > currentTime;
  } catch (error) {
    // Si hay error al decodificar, consideramos el token inválido
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