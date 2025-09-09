export interface SueldoItem {
  id: string;
  codigo: string;
  nombre: string;
  clase: 'HABER' | 'DESCUENTO';
  naturaleza: 'IMPONIBLE' | 'NO_IMPONIBLE';
  descripcion?: string;
  formula_json?: any;
  tope_modo: 'NONE' | 'MONTO' | 'PORCENTAJE';
  tope_valor?: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface SueldoItemFormData {
  nombre: string;
  clase: 'HABER' | 'DESCUENTO';
  naturaleza: 'IMPONIBLE' | 'NO_IMPONIBLE';
  descripcion?: string;
  formula_json?: any;
  tope_modo: 'NONE' | 'MONTO' | 'PORCENTAJE';
  tope_valor?: number;
  activo: boolean;
}

export interface SueldoItemStats {
  totalItems: number;
  itemsActivos: number;
  itemsInactivos: number;
  itemsImponibles: number;
  itemsNoImponibles: number;
  itemsHaberes: number;
  itemsDescuentos: number;
}

export interface SueldoItemFilters {
  search?: string;
  clase?: 'HABER' | 'DESCUENTO' | 'all';
  naturaleza?: 'IMPONIBLE' | 'NO_IMPONIBLE' | 'all';
  activo?: boolean | 'all';
}
