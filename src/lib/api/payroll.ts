import { 
  PayrollItemExtra, 
  CreatePayrollItemExtraData, 
  UpdatePayrollItemExtraData,
  SueldoItem
} from '../schemas/payroll';

const API_BASE = '/api/payroll';

// Servicio para ítems extras de payroll
export const payrollItemsExtrasApi = {
  // Obtener ítems extras
  async getItems(params: {
    payroll_run_id?: string;
    instalacion_id?: string;
    mes?: number;
    anio?: number;
    q?: string; // Parámetro de búsqueda
  }) {
    const searchParams = new URLSearchParams();
    
    if (params.payroll_run_id) {
      searchParams.append('payroll_run_id', params.payroll_run_id);
    }
    if (params.instalacion_id) {
      searchParams.append('instalacion_id', params.instalacion_id);
    }
    if (params.mes) {
      searchParams.append('mes', params.mes.toString());
    }
    if (params.anio) {
      searchParams.append('anio', params.anio.toString());
    }
    if (params.q) {
      searchParams.append('q', params.q);
    }

    const response = await fetch(`${API_BASE}/items-extras?${searchParams}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener ítems extras');
    }

    return response.json();
  },

  // Crear ítem extra
  async createItem(data: CreatePayrollItemExtraData) {
    const response = await fetch(`${API_BASE}/items-extras`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear ítem extra');
    }

    return response.json();
  },

  // Actualizar ítem extra
  async updateItem(id: string, data: UpdatePayrollItemExtraData) {
    const response = await fetch(`${API_BASE}/items-extras/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al actualizar ítem extra');
    }

    return response.json();
  },

  // Eliminar ítem extra
  async deleteItem(id: string) {
    const response = await fetch(`${API_BASE}/items-extras/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar ítem extra');
    }

    return response.json();
  },
};

// Servicio para el catálogo de ítems
export const sueldoItemsApi = {
  // Obtener catálogo de ítems
  async getItems(params?: {
    clase?: string;
    naturaleza?: string;
    activo?: boolean;
    q?: string;
  }) {
    const searchParams = new URLSearchParams();
    
    if (params?.clase) {
      searchParams.append('clase', params.clase);
    }
    if (params?.naturaleza) {
      searchParams.append('naturaleza', params.naturaleza);
    }
    if (params?.activo !== undefined) {
      searchParams.append('activo', params.activo.toString());
    }
    if (params?.q) {
      searchParams.append('q', params.q);
    }

    const response = await fetch(`${API_BASE}/sueldo-items?${searchParams}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener catálogo de ítems');
    }

    return response.json();
  },
};

// Servicio para instalaciones
export const instalacionesApi = {
  async getInstalaciones() {
    const response = await fetch(`${API_BASE}/instalaciones`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener instalaciones');
    }

    return response.json();
  },
};

// Servicio para guardias
export const guardiasApi = {
  async getGuardias(instalacionId: string) {
    const response = await fetch(`${API_BASE}/guardias?instalacion_id=${instalacionId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener guardias');
    }

    return response.json();
  },
};
