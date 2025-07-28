export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('current_user')
    window.location.href = '/login'
  }
}

export function isAuthenticated(): boolean {
  const token = getToken()
  
  if (!token) return false
  
  try {
    // Decodificar el JWT para verificar expiración
    const payload = JSON.parse(atob(token.split('.')[1]))
    const currentTime = Date.now() / 1000
    
    return payload.exp > currentTime
  } catch (error) {
    // Si hay error al decodificar, consideramos el token inválido
    return false
  }
}

export function requireAuth(): void {
  if (!isAuthenticated()) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }
}

// Nuevas funciones para obtener información del usuario
export function getUserInfo(): { 
  userId: string; 
  email: string; 
  rol: string; 
} | null {
  const token = getToken()
  
  if (!token) return null
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return {
      userId: payload.userId,
      email: payload.email,
      rol: payload.rol,
    }
  } catch (error) {
    return null
  }
}

export function getCurrentUser(): {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
} | null {
  if (typeof window === 'undefined') return null
  
  try {
    const storedUser = localStorage.getItem('current_user')
    return storedUser ? JSON.parse(storedUser) : null
  } catch {
    return null
  }
}

export function getUserRole(): string | null {
  const userInfo = getUserInfo()
  return userInfo?.rol || null
}

export function isAdmin(): boolean {
  return getUserRole() === 'admin'
}

export function isSupervisor(): boolean {
  return getUserRole() === 'supervisor'
}

export function isGuardia(): boolean {
  return getUserRole() === 'guardia'
} 