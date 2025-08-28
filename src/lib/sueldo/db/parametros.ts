import { sql } from '@/lib/database-vercel';

export interface ParametroGeneral {
  id: number;
  periodo: string;
  parametro: string;
  valor: string;
  descripcion?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface AFP {
  id: number;
  periodo: string;
  codigo: string;
  nombre: string;
  tasa: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface TramoImpuesto {
  id: number;
  periodo: string;
  tramo: number;
  desde: number;
  hasta: number;
  factor: number;
  rebaja: number;
  tasa_max?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface AsignacionFamiliar {
  id: number;
  periodo: string;
  tramo: string;
  desde: number;
  hasta: number;
  monto: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface ValorUF {
  id: number;
  fecha: string;
  valor: number;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Obtiene parámetros generales del último período disponible
 */
export async function obtenerParametrosMensuales(fecha?: string): Promise<any[]> {
  const periodo = fecha || await obtenerUltimoPeriodoDisponible();
  
  const result = await sql`
    SELECT * FROM sueldo_parametros_generales 
    WHERE periodo = ${periodo}
    ORDER BY parametro
  `;
  
  return result.rows;
}

/**
 * Obtiene AFPs del último período disponible
 */
export async function obtenerAFPsMensuales(fecha?: string): Promise<any[]> {
  const periodo = fecha || await obtenerUltimoPeriodoDisponible();
  
  const result = await sql`
    SELECT 
      id,
      periodo,
      codigo,
      nombre,
      tasa
    FROM sueldo_afp 
    WHERE periodo = ${periodo}
    ORDER BY nombre
  `;
  
  return result.rows;
}

/**
 * Obtiene tramos de impuesto del último período disponible
 */
export async function obtenerTramosImpuesto(fecha?: string): Promise<any[]> {
  const periodo = fecha || await obtenerUltimoPeriodoDisponible();
  
  const result = await sql`
    SELECT * FROM sueldo_tramos_impuesto 
    WHERE periodo = ${periodo}
    ORDER BY tramo
  `;
  
  return result.rows;
}

/**
 * Obtiene asignación familiar del último período disponible
 */
export async function obtenerAsignacionFamiliar(fecha?: string): Promise<any[]> {
  const periodo = fecha || await obtenerUltimoPeriodoDisponible();
  
  const result = await sql`
    SELECT * FROM sueldo_asignacion_familiar 
    WHERE periodo = ${periodo}
    ORDER BY tramo
  `;
  
  return result.rows;
}

/**
 * Obtiene el último período disponible con datos
 */
export async function obtenerUltimoPeriodoDisponible(): Promise<string> {
  const result = await sql`
    SELECT DISTINCT periodo 
    FROM (
      SELECT periodo FROM sueldo_parametros_generales
      UNION
      SELECT periodo FROM sueldo_afp
      UNION
      SELECT periodo FROM sueldo_tramos_impuesto
      UNION
      SELECT periodo FROM sueldo_asignacion_familiar
    ) AS periodos
    ORDER BY periodo DESC
    LIMIT 1
  `;
  
  return result.rows[0]?.periodo || '2025-08';
}

/**
 * Obtiene todos los períodos disponibles
 */
export async function obtenerPeriodosDisponibles(): Promise<string[]> {
  const result = await sql`
    SELECT DISTINCT periodo 
    FROM (
      SELECT periodo FROM sueldo_parametros_generales
      UNION
      SELECT periodo FROM sueldo_afp
      UNION
      SELECT periodo FROM sueldo_tramos_impuesto
      UNION
      SELECT periodo FROM sueldo_asignacion_familiar
    ) AS periodos
    ORDER BY periodo DESC
  `;
  
  return result.rows.map(row => row.periodo);
}

/**
 * Copia parámetros de un período a otro
 */
export async function copiarParametrosMes(origen: string, destino: string): Promise<void> {
  // Copiar parámetros generales
  await sql`
    INSERT INTO sueldo_parametros_generales (periodo, parametro, valor, descripcion)
    SELECT ${destino}, parametro, valor, descripcion
    FROM sueldo_parametros_generales
    WHERE periodo = ${origen}
    ON CONFLICT (periodo, parametro) DO UPDATE SET
      valor = EXCLUDED.valor,
      descripcion = EXCLUDED.descripcion,
      updated_at = CURRENT_TIMESTAMP
  `;

  // Copiar AFPs
  await sql`
    INSERT INTO sueldo_afp (periodo, codigo, nombre, tasa)
    SELECT ${destino}, codigo, nombre, tasa
    FROM sueldo_afp
    WHERE periodo = ${origen}
    ON CONFLICT (periodo, codigo) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      tasa = EXCLUDED.tasa,
      updated_at = CURRENT_TIMESTAMP
  `;

  // Copiar tramos de impuesto
  await sql`
    INSERT INTO sueldo_tramos_impuesto (periodo, tramo, desde, hasta, factor, rebaja, tasa_max)
    SELECT ${destino}, tramo, desde, hasta, factor, rebaja, tasa_max
    FROM sueldo_tramos_impuesto
    WHERE periodo = ${origen}
    ON CONFLICT (periodo, tramo) DO UPDATE SET
      desde = EXCLUDED.desde,
      hasta = EXCLUDED.hasta,
      factor = EXCLUDED.factor,
      rebaja = EXCLUDED.rebaja,
      tasa_max = EXCLUDED.tasa_max,
      updated_at = CURRENT_TIMESTAMP
  `;

  // Copiar asignación familiar
  await sql`
    INSERT INTO sueldo_asignacion_familiar (periodo, tramo, desde, hasta, monto)
    SELECT ${destino}, tramo, desde, hasta, monto
    FROM sueldo_asignacion_familiar
    WHERE periodo = ${origen}
    ON CONFLICT (periodo, tramo) DO UPDATE SET
      desde = EXCLUDED.desde,
      hasta = EXCLUDED.hasta,
      monto = EXCLUDED.monto,
      updated_at = CURRENT_TIMESTAMP
  `;
}

/**
 * Valida que todos los parámetros estén presentes en un período
 */
export async function validarConsistenciaParametros(periodo: string): Promise<{
  valido: boolean;
  errores: string[];
}> {
  const errores: string[] = [];

  // Verificar parámetros generales
  const parametrosGenerales = await sql`
    SELECT COUNT(*) as count FROM sueldo_parametros_generales WHERE periodo = ${periodo}
  `;
  if (parseInt(parametrosGenerales.rows[0].count) === 0) {
    errores.push('No hay parámetros generales para este período');
  }

  // Verificar AFPs
  const afps = await sql`
    SELECT COUNT(*) as count FROM sueldo_afp WHERE periodo = ${periodo}
  `;
  if (parseInt(afps.rows[0].count) === 0) {
    errores.push('No hay AFPs para este período');
  }

  // Verificar tramos de impuesto
  const tramosImpuesto = await sql`
    SELECT COUNT(*) as count FROM sueldo_tramos_impuesto WHERE periodo = ${periodo}
  `;
  if (parseInt(tramosImpuesto.rows[0].count) === 0) {
    errores.push('No hay tramos de impuesto para este período');
  }

  // Verificar asignación familiar
  const asignacionFamiliar = await sql`
    SELECT COUNT(*) as count FROM sueldo_asignacion_familiar WHERE periodo = ${periodo}
  `;
  if (parseInt(asignacionFamiliar.rows[0].count) === 0) {
    errores.push('No hay asignación familiar para este período');
  }

  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Actualiza un parámetro general
 */
export async function actualizarParametroGeneral(
  periodo: string, 
  parametro: string, 
  valor: string, 
  descripcion?: string
): Promise<void> {
  await sql`
    INSERT INTO sueldo_parametros_generales (periodo, parametro, valor, descripcion)
    VALUES (${periodo}, ${parametro}, ${valor}, ${descripcion})
    ON CONFLICT (periodo, parametro) DO UPDATE SET
      valor = EXCLUDED.valor,
      descripcion = EXCLUDED.descripcion,
      updated_at = CURRENT_TIMESTAMP
  `;
}

/**
 * Actualiza una AFP
 */
export async function actualizarAFP(
  periodo: string, 
  codigo: string, 
  nombre: string, 
  tasa: number
): Promise<void> {
  await sql`
    INSERT INTO sueldo_afp (periodo, codigo, nombre, tasa)
    VALUES (${periodo}, ${codigo}, ${nombre}, ${tasa})
    ON CONFLICT (periodo, codigo) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      tasa = EXCLUDED.tasa,
      updated_at = CURRENT_TIMESTAMP
  `;
}

/**
 * Actualiza un tramo de impuesto
 */
export async function actualizarTramoImpuesto(
  periodo: string,
  tramo: number,
  desde: number,
  hasta: number,
  factor: number,
  rebaja: number,
  tasa_max: number
): Promise<void> {
  await sql`
    INSERT INTO sueldo_tramos_impuesto (periodo, tramo, desde, hasta, factor, rebaja, tasa_max)
    VALUES (${periodo}, ${tramo}, ${desde}, ${hasta}, ${factor}, ${rebaja}, ${tasa_max})
    ON CONFLICT (periodo, tramo) DO UPDATE SET
      desde = EXCLUDED.desde,
      hasta = EXCLUDED.hasta,
      factor = EXCLUDED.factor,
      rebaja = EXCLUDED.rebaja,
      tasa_max = EXCLUDED.tasa_max,
      updated_at = CURRENT_TIMESTAMP
  `;
}

/**
 * Actualiza un tramo de asignación familiar
 */
export async function actualizarAsignacionFamiliar(
  periodo: string,
  tramo: string,
  desde: number,
  hasta: number,
  monto: number
): Promise<void> {
  await sql`
    INSERT INTO sueldo_asignacion_familiar (periodo, tramo, desde, hasta, monto)
    VALUES (${periodo}, ${tramo}, ${desde}, ${hasta}, ${monto})
    ON CONFLICT (periodo, tramo) DO UPDATE SET
      desde = EXCLUDED.desde,
      hasta = EXCLUDED.hasta,
      monto = EXCLUDED.monto,
      updated_at = CURRENT_TIMESTAMP
  `;
}

/**
 * Obtiene valores de UF ordenados por fecha
 */
export async function obtenerValoresUF(): Promise<any[]> {
  try {
    const result = await sql`
      SELECT 
        fecha,
        valor
      FROM sueldo_valor_uf 
      ORDER BY fecha DESC
    `;
    
    return result.rows;
  } catch (error) {
    console.error('❌ obtenerValoresUF: Error en consulta:', error);
    throw error;
  }
}

/**
 * Agrega o actualiza un valor de UF
 */
export async function actualizarValorUF(
  fecha: string, 
  valor: number
): Promise<void> {
  await sql`
    INSERT INTO sueldo_valor_uf (fecha, valor)
    VALUES (${fecha}, ${valor})
    ON CONFLICT (fecha) DO UPDATE SET
      valor = EXCLUDED.valor,
      updated_at = CURRENT_TIMESTAMP
  `;
}

/**
 * Elimina un valor de UF
 */
export async function eliminarValorUF(fecha: string): Promise<void> {
  await sql`
    DELETE FROM sueldo_valor_uf 
    WHERE fecha = ${fecha}
  `;
}

/**
 * Actualiza un valor de UF existente
 */
export async function actualizarValorUFExistente(
  fecha: string, 
  valor: number
): Promise<void> {
  await sql`
    UPDATE sueldo_valor_uf 
    SET valor = ${valor}
    WHERE fecha = ${fecha}
  `;
}
