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
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp > currentTime;
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

// Nueva función para verificar si el token está próximo a expirar (5 minutos antes)
export function isTokenExpiringSoon(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const token = getToken();
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    const fiveMinutesFromNow = currentTime + (5 * 60); // 5 minutos en segundos
    return payload.exp <= fiveMinutesFromNow;
  } catch {
    return false;
  }
}

// Nueva función para renovar el token automáticamente
export async function refreshTokenIfNeeded(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  // Solo renovar si el token está próximo a expirar
  if (!isTokenExpiringSoon()) {
    return true;
  }

  try {
    console.log('🔄 Renovando token automáticamente...');
    
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Token renovado exitosamente');
      return true;
    } else {
      console.log('❌ Error renovando token, redirigiendo a login');
      logout();
      return false;
    }
  } catch (error) {
    console.error('❌ Error en renovación de token:', error);
    logout();
    return false;
  }
}

// Función para configurar renovación automática
export function setupAutoTokenRefresh(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Verificar cada minuto si el token necesita renovación
  const interval = setInterval(async () => {
    if (isAuthenticated()) {
      await refreshTokenIfNeeded();
    } else {
      clearInterval(interval);
    }
  }, 60000); // 1 minuto

  // Limpiar intervalo cuando se cierre la página
  window.addEventListener('beforeunload', () => {
    clearInterval(interval);
  });
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


