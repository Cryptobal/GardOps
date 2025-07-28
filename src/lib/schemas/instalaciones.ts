import { z } from 'zod';

// Schema para crear instalación
export const crearInstalacionSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  direccion: z.string().min(1, 'La dirección es requerida'),
  comuna: z.string().min(1, 'La comuna es requerida'),
  region: z.string().min(1, 'La región es requerida'),
  cliente_id: z.number().positive('El cliente es requerido'),
  tipo_instalacion: z.string().min(1, 'El tipo de instalación es requerido'),
  capacidad: z.number().positive('La capacidad debe ser un número positivo'),
  descripcion: z.string().optional(),
});

// Schema para actualizar instalación
export const actualizarInstalacionSchema = z.object({
  id: z.number().positive('El ID es requerido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  direccion: z.string().min(1, 'La dirección es requerida'),
  comuna: z.string().min(1, 'La comuna es requerida'),
  region: z.string().min(1, 'La región es requerida'),
  cliente_id: z.number().positive('El cliente es requerido'),
  tipo_instalacion: z.string().min(1, 'El tipo de instalación es requerido'),
  capacidad: z.number().positive('La capacidad debe ser un número positivo'),
  descripcion: z.string().optional(),
});

// Tipos TypeScript
export type CrearInstalacion = z.infer<typeof crearInstalacionSchema>;
export type ActualizarInstalacion = z.infer<typeof actualizarInstalacionSchema>;

// Tipo para instalación completa
export interface Instalacion {
  id: number;
  nombre: string;
  direccion: string;
  comuna: string;
  region: string;
  cliente_id: number;
  cliente_nombre?: string;
  cliente_rut?: string;
  tipo_instalacion: string;
  capacidad: number;
  descripcion?: string;
  activo: boolean;
  creado_en: Date;
  actualizado_en?: Date;
} 