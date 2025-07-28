export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token')
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