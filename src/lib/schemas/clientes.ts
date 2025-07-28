import { z } from "zod";

// Schema para crear cliente (mapeado a la estructura real)
export const crearClienteSchema = z.object({
  nombre: z.string() // Se mapea a nombre_fantasia en la UI
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  
  rut: z.string() // Se mapea a rut_empresa en la UI
    .min(1, "El RUT de la empresa es obligatorio")
    .regex(/^[0-9]+-[0-9kK]{1}$/, "Formato de RUT inválido (ej: 12345678-9)"),
  
  representante_legal: z.string() // Se mapea a nombre_completo en la UI
    .optional()
    .or(z.literal("")),
    
  rut_representante: z.string()
    .optional()
    .or(z.literal("")),
  
  email: z.string()
    .optional()
    .refine(
      (val) => !val || val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Formato de email inválido"
    ),
  
  telefono: z.string()
    .optional()
    .or(z.literal("")),
  
  direccion: z.string()
    .optional()
    .or(z.literal("")),
    
  latitud: z.number()
    .optional()
    .nullable(),
    
  longitud: z.number()
    .optional()
    .nullable(),
    
  razon_social: z.string()
    .optional()
    .or(z.literal("")),
    
  estado: z.enum(["Activo", "Inactivo"])
    .default("Activo"),
});

// Schema para actualizar cliente - más permisivo
export const actualizarClienteSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres")
    .optional(),
  
  rut: z.string()
    .regex(/^[0-9]+-[0-9kK]{1}$/, "Formato de RUT inválido (ej: 12345678-9)")
    .optional(),
  
  representante_legal: z.string()
    .optional()
    .nullable(),
    
  rut_representante: z.string()
    .optional()
    .nullable(),
  
  email: z.string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Formato de email inválido"
    ),
  
  telefono: z.string()
    .optional()
    .nullable(),
  
  direccion: z.string()
    .optional()
    .nullable(),
    
  latitud: z.number()
    .optional()
    .nullable(),
    
  longitud: z.number()
    .optional()
    .nullable(),
    
  razon_social: z.string()
    .optional()
    .nullable(),
    
  estado: z.enum(["Activo", "Inactivo"])
    .optional(),
});

// Schema para filtros
export const filtrosClienteSchema = z.object({
  busqueda: z.string().optional(),
  estado: z.enum(["Todos", "Activo", "Inactivo"]).default("Todos"),
});

// Types actualizados
export type CrearClienteData = z.infer<typeof crearClienteSchema>;
export type ActualizarClienteData = z.infer<typeof actualizarClienteSchema>;
export type FiltrosCliente = z.infer<typeof filtrosClienteSchema>;

export interface Cliente {
  id: string;
  // Campos reales de la DB
  nombre: string; // nombre_fantasia en la UI
  rut: string; // rut_empresa en la UI
  representante_legal?: string; // nombre_completo en la UI
  rut_representante?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  razon_social?: string;
  estado?: string;
  created_at: string;
  updated_at?: string;
  tenant_id?: string;
}

// Interface para documentos del cliente
export interface DocumentoCliente {
  id: string;
  cliente_id: string;
  nombre: string;
  tipo: string;
  archivo_url: string;
  tamaño: number;
  tipo_documento_id?: string;
  tipo_documento_nombre?: string;
  created_at: string;
}

// Schema para documentos
export const documentoClienteSchema = z.object({
  nombre: z.string().min(1, "El nombre del documento es obligatorio"),
  tipo: z.string().min(1, "El tipo de documento es obligatorio"),
  archivo_url: z.string().url("URL de archivo inválida"),
  tamaño: z.number().positive("El tamaño debe ser positivo"),
}); 