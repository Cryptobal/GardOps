export async function login(email: string, password: string): Promise<void> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error('Credenciales incorrectas')
  }

  const data = await response.json()
  
  if (data.access_token) {
    // Guardar el token
    localStorage.setItem('auth_token', data.access_token)
    
    // Guardar información del usuario para fácil acceso
    if (data.user) {
      localStorage.setItem('current_user', JSON.stringify(data.user))
    }
  } else {
    throw new Error('Token no recibido')
  }
} 