// Tipos compartidos para Pauta Diaria v2
export interface PautaRow {
  pauta_id: string;
  fecha: string;
  puesto_id: string;
  puesto_nombre?: string;
  instalacion_id: string;
  instalacion_nombre: string;
  estado: string;
  estado_ui: string; // Estado normalizado para UI: 'plan' | 'libre' | 'asistido' | 'reemplazo' | 'sin_cobertura', etc.
  meta: any; // Metadatos JSON con cobertura_guardia_id, ausente_guardia_id, etc.
  guardia_trabajo_id: string | null;
  guardia_trabajo_nombre: string | null;
  guardia_titular_id: string | null;
  guardia_titular_nombre: string | null;
  es_ppc: boolean;
  es_reemplazo: boolean;
  es_sin_cobertura: boolean;
  es_falta_sin_aviso: boolean;
  necesita_cobertura: boolean; // Flag para indicar si necesita cobertura (PPC libre o titular sin cobertura)
  hora_inicio: string | null;
  hora_fin: string | null;
  rol_id?: string | null;
  rol_nombre: string | null;
  rol_alias?: string | null;
  reemplazo_guardia_nombre?: string | null;
  cobertura_guardia_nombre?: string | null; // Nombre del guardia que cubre (PPC o reemplazo)
  guardia_titular_telefono?: string | null; // Teléfono del guardia titular
  guardia_trabajo_telefono?: string | null; // Teléfono del guardia de trabajo
  cobertura_guardia_telefono?: string | null; // Teléfono del guardia de cobertura
  comentarios?: string | null; // Comentarios del turno
  estado_semaforo?: string | null; // Estado del semáforo (pendiente, en_camino, urgencia, completado)
  horas_extras?: number | null; // Monto de horas extras realizadas en este turno
  
  // NUEVA ESTRUCTURA DE ESTADOS
  tipo_turno?: string | null; // 'planificado' | 'libre'
  estado_puesto?: string | null; // 'asignado' | 'ppc' | 'libre'
  estado_guardia?: string | null; // 'asistido' | 'falta' | 'permiso' | 'vacaciones' | 'licencia'
  tipo_cobertura?: string | null; // 'sin_cobertura' | 'guardia_asignado' | 'turno_extra'
}

export interface PautaDiariaV2Props {
  rows: PautaRow[];
  fecha: string;
  incluirLibres?: boolean;
  onRecargarDatos?: (nuevoIncluirLibres?: boolean) => Promise<void>;
  activeTab?: string;
}
