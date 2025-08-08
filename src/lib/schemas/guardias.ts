// Schemas y validaciones para guardias
import { z } from 'zod';

export interface Guardia {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  rut: string;
  email: string;
  telefono: string;
  direccion: string;
  latitud: number | null;
  longitud: number | null;
  ciudad: string | null;
  comuna: string | null;
  region: string | null;
  activo: boolean;
  estado: "Activo" | "Inactivo";
  tipo_guardia: "contratado" | "esporadico";
  instalacion_id?: string;
  instalacion_nombre?: string;
  instalacion_asignada?: string;
  rol_actual?: string;
  cliente_nombre?: string;
  nombre_completo?: string;
  fecha_os10?: string | null;
  rol_actual_detalle?: {
    nombre: string;
    turno: string;
    horario_inicio: string;
    horario_fin: string;
    dias_trabajo: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CrearGuardiaData {
  nombre: string;
  apellido: string;
  rut: string;
  email: string;
  telefono: string;
  direccion: string;
  latitud: number | null;
  longitud: number | null;
  ciudad: string | null;
  comuna: string | null;
  region: string | null;
  fecha_nacimiento: string;
  fecha_ingreso: string;
  estado: "Activo" | "Inactivo";
  tipo_guardia: "contratado" | "esporadico";
  tipo_contrato: "Indefinido" | "Plazo Fijo" | "Por Obra";
  sueldo_base: number;
  instalacion_id?: string;
}

export interface ActualizarGuardiaData {
  id: string;
  nombre?: string;
  apellido?: string;
  rut?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  latitud?: number | null;
  longitud?: number | null;
  ciudad?: string | null;
  comuna?: string | null;
  region?: string | null;
  fecha_nacimiento?: string;
  fecha_ingreso?: string;
  estado?: "Activo" | "Inactivo";
  tipo_guardia?: "contratado" | "esporadico";
  tipo_contrato?: "Indefinido" | "Plazo Fijo" | "Por Obra";
  sueldo_base?: number;
  instalacion_id?: string;
}

// Schemas de Zod para validación
export const crearGuardiaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(255, 'El nombre no puede exceder 255 caracteres'),
  apellido: z.string().min(1, 'El apellido es requerido').max(255, 'El apellido no puede exceder 255 caracteres'),
  rut: z.string().min(1, 'El RUT es requerido').regex(/^[0-9]+-[0-9kK]{1}$/, 'Formato de RUT inválido (ej: 12345678-9)'),
  email: z.string().email('Formato de email inválido').optional().or(z.literal('')),
  telefono: z.string().optional().or(z.literal('')),
  direccion: z.string().optional().or(z.literal('')),
  latitud: z.number().nullable().optional(),
  longitud: z.number().nullable().optional(),
  ciudad: z.string().nullable().optional(),
  comuna: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  fecha_nacimiento: z.string().min(1, 'La fecha de nacimiento es requerida'),
  fecha_ingreso: z.string().min(1, 'La fecha de ingreso es requerida'),
  estado: z.enum(['Activo', 'Inactivo']).default('Activo'),
  tipo_guardia: z.enum(['contratado', 'esporadico']).default('contratado'),
  tipo_contrato: z.enum(['Indefinido', 'Plazo Fijo', 'Por Obra']).default('Indefinido'),
  sueldo_base: z.coerce.number().min(0, 'El sueldo debe ser mayor o igual a 0'),
  instalacion_id: z.string().uuid('ID de instalación inválido').optional(),
});

export const actualizarGuardiaSchema = z.object({
  id: z.string().uuid('ID de guardia inválido'),
  nombre: z.string().min(1, 'El nombre es requerido').max(255, 'El nombre no puede exceder 255 caracteres').optional(),
  apellido: z.string().min(1, 'El apellido es requerido').max(255, 'El apellido no puede exceder 255 caracteres').optional(),
  rut: z.string().min(1, 'El RUT es requerido').regex(/^[0-9]+-[0-9kK]{1}$/, 'Formato de RUT inválido (ej: 12345678-9)').optional(),
  email: z.string().email('Formato de email inválido').optional().or(z.literal('')),
  telefono: z.string().optional().or(z.literal('')),
  direccion: z.string().optional().or(z.literal('')),
  latitud: z.number().nullable().optional(),
  longitud: z.number().nullable().optional(),
  ciudad: z.string().nullable().optional(),
  comuna: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  fecha_nacimiento: z.string().min(1, 'La fecha de nacimiento es requerida').optional(),
  fecha_ingreso: z.string().min(1, 'La fecha de ingreso es requerida').optional(),
  estado: z.enum(['Activo', 'Inactivo']).optional(),
  tipo_guardia: z.enum(['contratado', 'esporadico']).optional(),
  tipo_contrato: z.enum(['Indefinido', 'Plazo Fijo', 'Por Obra']).optional(),
  sueldo_base: z.coerce.number().min(0, 'El sueldo debe ser mayor o igual a 0').optional(),
  instalacion_id: z.string().uuid('ID de instalación inválido').optional(),
}); 