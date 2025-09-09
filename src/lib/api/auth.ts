export async function login(email: string, password: string): Promise<void> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // IMPORTANTE: Incluir cookies en la petición
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error('Credenciales incorrectas')
  }

  const data = await response.json()
  
  if (data.access_token) {
    // Las cookies ya se configuraron automáticamente por el servidor
    console.log('✅ Cookies configuradas automáticamente por el servidor')
    console.log('✅ Token recibido:', data.access_token.substring(0, 20) + '...')
    
    // Opcional: Guardar info del usuario en localStorage para UI
    if (data.user) {
      localStorage.setItem('current_user', JSON.stringify(data.user))
      console.log('✅ Info de usuario guardada para UI')
    }
  } else {
    throw new Error('Token no recibido')
  }
} 