import { z } from "zod";

// Esquema para el catálogo de ítems
export const SueldoItemSchema = z.object({
  id: z.string().uuid(),
  codigo: z.string().min(1).max(50),
  nombre: z.string().min(1).max(100),
  clase: z.enum(['HABER', 'DESCUENTO']),
  naturaleza: z.enum(['IMPONIBLE', 'NO_IMPONIBLE']),
  descripcion: z.string().nullable().optional(),
  formula_json: z.any().nullable().optional(),
  tope_modo: z.enum(['NONE', 'MONTO', 'PORCENTAJE']).default('NONE'),
  tope_valor: z.number().nullable().optional(),
  activo: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// Esquema para PayrollRun
export const PayrollRunSchema = z.object({
  id: z.string().uuid().optional(),
  instalacion_id: z.string().uuid(),
  mes: z.number().min(1).max(12),
  anio: z.number().min(2020),
  estado: z.enum(['borrador', 'procesando', 'completado', 'cancelado']).default('borrador'),
  fecha_creacion: z.string().optional(),
  fecha_procesamiento: z.string().nullable().optional(),
  usuario_creacion: z.string().uuid().nullable().optional(),
  observaciones: z.string().nullable().optional(),
  tenant_id: z.string().uuid().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// Esquema para PayrollItemExtra
export const PayrollItemExtraSchema = z.object({
  id: z.string().uuid().optional(),
  payroll_run_id: z.string().uuid(),
  guardia_id: z.string().uuid(),
  item_id: z.string().uuid().optional(), // Referencia al catálogo
  tipo: z.enum(['haber_imponible', 'haber_no_imponible', 'descuento']),
  nombre: z.string().min(1).max(100),
  monto: z.number().min(-999999999.99).max(999999999.99),
  glosa: z.string().nullable().optional(),
  tenant_id: z.string().uuid().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  // Campos adicionales de la respuesta de la API
  guardia_nombre: z.string().optional(),
  guardia_apellido_paterno: z.string().optional(),
  guardia_apellido_materno: z.string().optional(),
  guardia_rut: z.string().optional(),
  guardia_nombre_completo: z.string().optional(),
  instalacion_nombre: z.string().optional(),
  item_nombre: z.string().optional(), // Nombre del ítem del catálogo
  item_clase: z.string().optional(), // Clase del ítem del catálogo
  item_naturaleza: z.string().optional(), // Naturaleza del ítem del catálogo
});

// Esquema para crear un PayrollRun
export const CreatePayrollRunSchema = PayrollRunSchema.omit({
  id: true,
  fecha_creacion: true,
  fecha_procesamiento: true,
  created_at: true,
  updated_at: true,
});

// Esquema para crear un PayrollItemExtra
export const CreatePayrollItemExtraSchema = PayrollItemExtraSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  instalacion_id: z.string().uuid().optional(),
  mes: z.number().min(1).max(12).optional(),
  anio: z.number().min(2020).optional(),
});

// Esquema para actualizar un PayrollItemExtra
export const UpdatePayrollItemExtraSchema = PayrollItemExtraSchema.partial().omit({
  id: true,
  payroll_run_id: true,
  created_at: true,
  updated_at: true,
});

// Tipos exportados
export type PayrollRun = z.infer<typeof PayrollRunSchema>;
export type PayrollItemExtra = z.infer<typeof PayrollItemExtraSchema>;
export type CreatePayrollRunData = z.infer<typeof CreatePayrollRunSchema>;
export type CreatePayrollItemExtraData = z.infer<typeof CreatePayrollItemExtraSchema>;
export type UpdatePayrollItemExtraData = z.infer<typeof UpdatePayrollItemExtraSchema>;
export type SueldoItem = z.infer<typeof SueldoItemSchema>;

// Esquema para filtros de búsqueda
export const PayrollFiltersSchema = z.object({
  instalacion_id: z.string().uuid().optional(),
  mes: z.number().min(1).max(12).optional(),
  anio: z.number().min(2020).optional(),
  estado: z.enum(['borrador', 'procesando', 'completado', 'cancelado']).optional(),
});

export type PayrollFilters = z.infer<typeof PayrollFiltersSchema>;
