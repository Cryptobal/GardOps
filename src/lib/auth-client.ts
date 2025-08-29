'use client'

// Funciones del cliente (frontend) separadas para evitar importar código de servidor en el bundle del navegador

export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith('auth_token='))
      ?.split('=')[1];

    if (cookieValue) {
      const decodedValue = decodeURIComponent(cookieValue);
      return decodedValue;
    }
  } catch {
    // ignore
  }

  const localToken = localStorage.getItem('auth_token');
  return localToken;
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');

    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'tenant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    window.location.href = '/login';
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const token = getToken();
  if (!token) return false;

  try {
    // Verificar que el token tenga la estructura correcta
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Verificar que tenga los campos mínimos necesarios
    if (!payload.user_id || !payload.email) return false;
    
    // Si tiene campo exp, verificar expiración
    if (payload.exp) {
      const currentTime = Date.now() / 1000;
      if (payload.exp <= currentTime) return false;
    }
    
    // Si no tiene exp, asumir que es válido (para tokens simplificados)
    return true;
  } catch {
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
    const tenantCookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('tenant='))
      ?.split('=')[1];

    if (tenantCookie) {
      const decodedCookie = decodeURIComponent(tenantCookie);
      const tenantInfo = JSON.parse(decodedCookie);
      return {
        id: tenantInfo.user_id,
        email: tenantInfo.email,
        nombre: tenantInfo.nombre,
        apellido: '',
        rol: '',
        tenant_id: tenantInfo.id,
      };
    }
  } catch {
    // ignore
  }

  try {
    const storedUser = localStorage.getItem('current_user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
}

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


