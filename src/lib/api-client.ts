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
        return headers;
      }
    }

    // En producción, obtener el email del usuario autenticado
    try {
      // Intentar obtener desde cookies
      if (typeof document !== 'undefined') {
        const tenantCookie = document.cookie
          .split('; ')
          .find((row) => row.startsWith('tenant='))
          ?.split('=')[1];

        if (tenantCookie) {
          const tenantInfo = JSON.parse(decodeURIComponent(tenantCookie));
          if (tenantInfo.email) {
            headers['x-user-email'] = tenantInfo.email;
            return headers;
          }
        }

        // Intentar obtener desde localStorage
        const currentUser = localStorage.getItem('current_user');
        if (currentUser) {
          const userInfo = JSON.parse(currentUser);
          if (userInfo.email) {
            headers['x-user-email'] = userInfo.email;
            return headers;
          }
        }
      }
    } catch (error) {
      console.warn('Error obteniendo email del usuario:', error);
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const authHeaders = await this.getAuthHeaders();
    
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
};

export default apiClient;
