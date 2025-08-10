// Tipos compartidos para Pauta Diaria v2
export interface PautaRow {
  pauta_id: number;
  fecha: string;
  puesto_id: string;
  puesto_nombre?: string;
  instalacion_id: number;
  instalacion_nombre: string;
  estado: string;
  estado_ui: string; // Estado normalizado para UI: 'plan' | 'libre' | 'asistido' | 'reemplazo' | 'sin_cobertura', etc.
  meta: number;
  guardia_trabajo_id: number | null;
  guardia_trabajo_nombre: string | null;
  guardia_titular_id: number | null;
  guardia_titular_nombre: string | null;
  es_ppc: boolean;
  es_reemplazo: boolean;
  es_sin_cobertura: boolean;
  es_falta_sin_aviso: boolean;
  necesita_cobertura: boolean; // Flag para indicar si necesita cobertura (PPC libre o titular sin cobertura)
  hora_inicio: string | null;
  hora_fin: string | null;
  rol_nombre: string | null;
  reemplazo_guardia_nombre?: string | null;
}

export interface PautaDiariaV2Props {
  rows: PautaRow[];
  fecha: string;
  incluirLibres?: boolean;
}
