/**
 * Redondea un valor a enteros CLP
 * @param valor - Valor a redondear
 * @returns Valor redondeado a entero
 */
export function redondearCLP(valor: number): number {
  return Math.round(valor);
}

/**
 * Redondea todos los valores numéricos en un objeto a enteros CLP
 * @param objeto - Objeto con valores numéricos
 * @returns Objeto con valores redondeados
 */
export function redondearObjetoCLP<T extends Record<string, any>>(objeto: T): T {
  // Preservar Date tal cual
  if (objeto instanceof Date) {
    return objeto as unknown as T;
  }

  // Copia superficial para no mutar el original
  const resultado = Array.isArray(objeto) ? ([...objeto] as any) : ({ ...objeto } as any);

  for (const [clave, valor] of Object.entries(resultado)) {
    if (typeof valor === 'number') {
      resultado[clave] = redondearCLP(valor);
    } else if (valor instanceof Date) {
      // Mantener fechas sin modificaciones
      resultado[clave] = valor;
    } else if (Array.isArray(valor)) {
      // Procesar arrays recursivamente
      resultado[clave] = valor.map((v) =>
        typeof v === 'number'
          ? redondearCLP(v)
          : v instanceof Date
          ? v
          : typeof v === 'object' && v !== null
          ? redondearObjetoCLP(v as any)
          : v
      );
    } else if (typeof valor === 'object' && valor !== null) {
      resultado[clave] = redondearObjetoCLP(valor as any);
    }
  }

  return resultado as T;
}

/**
 * Redondea un array de valores a enteros CLP
 * @param valores - Array de valores numéricos
 * @returns Array con valores redondeados
 */
export function redondearArrayCLP(valores: number[]): number[] {
  return valores.map(valor => redondearCLP(valor));
}

/**
 * Formatea un valor como moneda CLP
 * @param valor - Valor a formatear
 * @returns String formateado como moneda CLP
 */
export function formatearCLP(valor: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

/**
 * Formatea un valor como número con separadores de miles
 * @param valor - Valor a formatear
 * @returns String formateado con separadores
 */
export function formatearNumero(valor: number): string {
  return new Intl.NumberFormat('es-CL').format(valor);
}
