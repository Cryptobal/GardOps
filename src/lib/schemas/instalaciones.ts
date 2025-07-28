import { z } from 'zod';

// Schema para crear instalación
export const crearInstalacionSchema = z.object({
  nombre: z.string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  
  cliente_id: z.string()
    .min(1, "El cliente es obligatorio"),
  
  direccion: z.string()
    .min(1, "La dirección es obligatoria"),
    
  latitud: z.number()
    .optional()
    .nullable(),
    
  longitud: z.number()
    .optional()
    .nullable(),
    
  region: z.string()
    .optional()
    .or(z.literal("")),
    
  ciudad: z.string()
    .optional()
    .or(z.literal("")),
    
  comuna: z.string()
    .min(1, "La comuna es obligatoria"),
    
  estado: z.enum(["Activo", "Inactivo"])
    .default("Activo"),
});

// Schema para actualizar instalación
export const actualizarInstalacionSchema = z.object({
  id: z.string(),
  nombre: z.string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  
  cliente_id: z.string()
    .min(1, "El cliente es obligatorio"),
  
  direccion: z.string()
    .min(1, "La dirección es obligatoria"),
    
  latitud: z.number()
    .optional()
    .nullable(),
    
  longitud: z.number()
    .optional()
    .nullable(),
    
  region: z.string()
    .optional()
    .or(z.literal("")),
    
  ciudad: z.string()
    .optional()
    .or(z.literal("")),
    
  comuna: z.string()
    .min(1, "La comuna es obligatoria"),
    
  estado: z.enum(["Activo", "Inactivo"])
    .default("Activo"),
});

// Tipos TypeScript
export type CrearInstalacionData = z.infer<typeof crearInstalacionSchema>;
export type ActualizarInstalacionData = z.infer<typeof actualizarInstalacionSchema>;

// Tipo para instalación completa
export interface Instalacion {
  id: string;
  nombre: string;
  cliente_id: string;
  cliente_nombre?: string;
  cliente_rut?: string;
  direccion?: string;
  latitud?: number | null;
  longitud?: number | null;
  region?: string;
  ciudad?: string;
  comuna?: string;
  estado?: string;
  guardias_asignados?: number;
  puestos_cubiertos?: number;
  puestos_por_cubrir?: number;
  created_at?: Date;
  updated_at?: Date;
  tenant_id?: string;
}

// Schema para filtros
export interface FiltrosInstalacion {
  busqueda: string;
  cliente: string;
  comuna: string;
}

// Schema de documentos para instalaciones
export interface DocumentoInstalacion {
  id: string;
  instalacion_id: string;
  tipo_documento_id: string;
  tipo_documento_nombre?: string;
  nombre_archivo: string;
  nombre_original: string;
  ruta_archivo: string;
  fecha_subida: Date;
  fecha_vencimiento?: Date;
  alertar_vencimiento: boolean;
  dias_antes_alerta?: number;
  estado: "Vigente" | "Vencido" | "Por vencer";
  created_at: Date;
  updated_at?: Date;
} 