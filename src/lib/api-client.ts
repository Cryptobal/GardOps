// Cliente HTTP personalizado que incluye automáticamente el header x-user-email
// para todas las peticiones a las APIs

interface ApiClientOptions {
  baseURL?: string;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(options: ApiClientOptions = {}) {
    this.baseURL = options.baseURL || '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers = { ...this.defaultHeaders };

    // En desarrollo, usar la variable de entorno
    if (process.env.NODE_ENV === 'development') {
      const devEmail = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
      if (devEmail) {
        headers['x-user-email'] = devEmail;
        console.log('🔧 Dev mode: usando email de entorno:', devEmail);
        return headers;
      }
    }

    // En producción, obtener el email del usuario autenticado
    try {
      // Verificar si estamos en el navegador
      if (typeof document !== 'undefined') {
        console.log('🌐 Cliente API ejecutándose en navegador');
        
        // Intentar obtener desde cookies
        const tenantCookie = document.cookie
          .split('; ')
          .find((row) => row.startsWith('tenant='))
          ?.split('=')[1];

        if (tenantCookie) {
          try {
            const tenantInfo = JSON.parse(decodeURIComponent(tenantCookie));
            console.log('🍪 Cookie tenant encontrada:', tenantInfo);
            if (tenantInfo.email) {
              headers['x-user-email'] = tenantInfo.email;
              console.log('✅ Email obtenido de cookie tenant:', tenantInfo.email);
              return headers;
            }
          } catch (parseError) {
            console.warn('⚠️ Error parseando cookie tenant:', parseError);
          }
        } else {
          console.log('❌ Cookie tenant no encontrada');
        }

        // Intentar obtener desde localStorage
        const currentUser = localStorage.getItem('current_user');
        if (currentUser) {
          try {
            const userInfo = JSON.parse(currentUser);
            console.log('💾 localStorage current_user encontrado:', userInfo);
            if (userInfo.email) {
              headers['x-user-email'] = userInfo.email;
              console.log('✅ Email obtenido de localStorage:', userInfo.email);
              return headers;
            }
          } catch (parseError) {
            console.warn('⚠️ Error parseando localStorage current_user:', parseError);
          }
        } else {
          console.log('❌ localStorage current_user no encontrado');
        }

        // Verificar si hay auth_token cookie
        const authToken = document.cookie
          .split('; ')
          .find((row) => row.startsWith('auth_token='))
          ?.split('=')[1];
        
        if (authToken) {
          console.log('🔑 Cookie auth_token encontrada');
        } else {
          console.log('❌ Cookie auth_token no encontrada');
        }

        console.log('📋 Estado de cookies completo:', document.cookie);
      } else {
        console.log('🖥️ Cliente API ejecutándose en servidor');
      }
    } catch (error) {
      console.error('❌ Error obteniendo email del usuario:', error);
    }

    console.warn('⚠️ No se pudo obtener email del usuario, enviando petición sin x-user-email');
    return headers;
  }

  // Método para obtener headers de autenticación de forma síncrona
  // Esto es útil cuando se necesita el header inmediatamente
  private getAuthHeadersSync(): Record<string, string> {
    const headers = { ...this.defaultHeaders };

    // En desarrollo, usar la variable de entorno
    if (process.env.NODE_ENV === 'development') {
      const devEmail = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
      if (devEmail) {
        headers['x-user-email'] = devEmail;
        return headers;
      }
    }

    // En producción, obtener el email del usuario autenticado
    try {
      // Verificar si estamos en el navegador
      if (typeof document !== 'undefined') {
        // Intentar obtener desde cookies
        const tenantCookie = document.cookie
          .split('; ')
          .find((row) => row.startsWith('tenant='))
          ?.split('=')[1];

        if (tenantCookie) {
          try {
            const tenantInfo = JSON.parse(decodeURIComponent(tenantCookie));
            if (tenantInfo.email) {
              headers['x-user-email'] = tenantInfo.email;
              return headers;
            }
          } catch (parseError) {
            // Silenciar error de parsing
          }
        }

        // Intentar obtener desde localStorage
        const currentUser = localStorage.getItem('current_user');
        if (currentUser) {
          try {
            const userInfo = JSON.parse(currentUser);
            if (userInfo.email) {
              headers['x-user-email'] = userInfo.email;
              return headers;
            }
          } catch (parseError) {
            // Silenciar error de parsing
          }
        }
      }
    } catch (error) {
      // Silenciar error
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Usar versión síncrona para evitar problemas de timing
    const authHeaders = this.getAuthHeadersSync();
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers,
      },
    };

    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    console.log(`🔑 Headers:`, config.headers);

    const response = await fetch(url, config);
    
    console.log(`📡 API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error ${response.status}:`, errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      } catch {
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    }

    const data = await response.json();
    return data;
  }

  async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  async patch<T>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

// Instancia global del cliente API
export const apiClient = new ApiClient();

// Funciones de conveniencia para las APIs principales
export const api = {
  // Clientes
  clientes: {
    getAll: () => apiClient.get('/api/clientes'),
    getById: (id: string) => apiClient.get(`/api/clientes/${id}`),
    create: (data: any) => apiClient.post('/api/clientes', data),
    update: (id: string, data: any) => apiClient.put(`/api/clientes/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/clientes/${id}`),
  },

  // Guardias
  guardias: {
    getAll: () => apiClient.get('/api/guardias'),
    getById: (id: string) => apiClient.get(`/api/guardias/${id}`),
    search: (params: Record<string, string>) => {
      const searchParams = new URLSearchParams(params);
      return apiClient.get(`/api/guardias/buscar?${searchParams.toString()}`);
    },
    disponibles: (params: Record<string, string>) => {
      const searchParams = new URLSearchParams(params);
      return apiClient.get(`/api/guardias/disponibles?${searchParams.toString()}`);
    },
    create: (data: any) => apiClient.post('/api/guardias', data),
    update: (id: string, data: any) => apiClient.put(`/api/guardias/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/guardias/${id}`),
  },

  // Instalaciones
  instalaciones: {
    getAll: (params?: Record<string, string>) => {
      if (params) {
        const searchParams = new URLSearchParams(params);
        return apiClient.get(`/api/instalaciones?${searchParams.toString()}`);
      }
      return apiClient.get('/api/instalaciones');
    },
    getById: (id: string) => apiClient.get(`/api/instalaciones/${id}`),
    getCompleta: (id: string) => apiClient.get(`/api/instalaciones/${id}/completa`),
    create: (data: any) => apiClient.post('/api/instalaciones', data),
    update: (id: string, data: any) => apiClient.put(`/api/instalaciones/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/instalaciones/${id}`),
  },

  // Permisos
  permissions: {
    check: (permission: string) => apiClient.get(`/api/me/permissions?perm=${permission}`),
  },

  // Usuario
  user: {
    profile: () => apiClient.get('/api/me/profile'),
    updatePassword: (data: any) => apiClient.post('/api/me/password', data),
  },

  // Debug
  debug: {
    headers: () => apiClient.get('/api/debug-headers'),
    clientesAuth: () => apiClient.get('/api/debug-clientes-auth'),
  },
};

export default apiClient;
