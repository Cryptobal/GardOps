export interface Instalacion {
  id: string;
  nombre: string;
  cliente_id: string;
  cliente_nombre?: string;
  direccion: string;
  latitud: number | null;
  longitud: number | null;
  ciudad: string;
  comuna: string;
  valor_turno_extra: number;
  estado: "Activo" | "Inactivo";
  created_at: string;
  updated_at: string;
}

export interface CrearInstalacionData {
  nombre: string;
  cliente_id: string;
  direccion: string;
  latitud: number | null;
  longitud: number | null;
  ciudad: string;
  comuna: string;
  valor_turno_extra: number;
  estado: "Activo" | "Inactivo";
}

export interface GuardiaAsignado {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  estado: string;
  asignado_desde: string;
}

export interface PuestoOperativo {
  id: string;
  nombre: string;
  descripcion: string;
  guardias_requeridos: number;
  guardias_asignados: number;
  ppc: number; // Puestos por cubrir
}

export interface DocumentoInstalacion {
  id: string;
  nombre: string;
  tipo: string;
  fecha_vencimiento: string;
  estado: string;
  url: string;
  created_at: string;
}

export interface LogInstalacion {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  detalles: string;
}

export interface Comuna {
  id: string;
  nombre: string;
  region: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  rut: string;
  estado: string;
}

export interface FiltrosInstalacion {
  busqueda: string;
  estado: string;
  cliente_id: string;
}

// Schemas de Zod para validación
import { z } from 'zod';

export const crearInstalacionSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(255, 'El nombre no puede exceder 255 caracteres'),
  cliente_id: z.string().uuid('ID de cliente inválido'),
  direccion: z.string().min(1, 'La dirección es requerida'),
  latitud: z.number().nullable(),
  longitud: z.number().nullable(),
  ciudad: z.string().optional(),
  comuna: z.string().optional(),
  valor_turno_extra: z.coerce.number().min(0, 'El valor de turno extra debe ser mayor o igual a 0'),
  estado: z.enum(['Activo', 'Inactivo']).default('Activo'),
});

export const actualizarInstalacionSchema = z.object({
  id: z.string().uuid('ID de instalación inválido'),
  nombre: z.string().min(1, 'El nombre es requerido').max(255, 'El nombre no puede exceder 255 caracteres').optional(),
  cliente_id: z.string().uuid('ID de cliente inválido').optional(),
  direccion: z.string().min(1, 'La dirección es requerida').optional(),
  latitud: z.number().nullable().optional(),
  longitud: z.number().nullable().optional(),
  ciudad: z.string().optional(),
  comuna: z.string().optional(),
  valor_turno_extra: z.coerce.number().min(0, 'El valor de turno extra debe ser mayor o igual a 0').optional(),
  estado: z.enum(['Activo', 'Inactivo']).optional(),
});

export interface RolServicio {
  id: string;
  nombre: string;
  dias_trabajo: number;
  dias_descanso: number;
  horas_turno: number;
  hora_inicio: string;
  hora_termino: string;
  estado: "Activo" | "Inactivo";
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TurnoInstalacion {
  id: string;
  instalacion_id: string;
  rol_servicio_id: string;
  cantidad_guardias: number;
  estado: "Activo" | "Inactivo";
  created_at: string;
  updated_at: string;
  // Campos calculados
  rol_servicio?: RolServicio;
  guardias_asignados?: number;
  ppc_pendientes?: number;
}

export interface CrearTurnoInstalacionData {
  instalacion_id: string;
  rol_servicio_id: string;
  cantidad_guardias: number;
}

export interface TurnoInstalacionConDetalles extends TurnoInstalacion {
  rol_servicio: RolServicio;
  guardias_asignados: number;
  ppc_pendientes: number;
} 