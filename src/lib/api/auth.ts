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
    localStorage.setItem('auth_token', data.access_token)
  } else {
    throw new Error('Token no recibido')
  }
} 