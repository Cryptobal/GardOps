/**
 * Cliente de base de datos compartido
 * Usa @vercel/postgres para conectarse a la base de datos
 */

import { sql } from '@vercel/postgres';

// Re-exportamos sql para uso directo
export { sql };

// Helper para logging de queries en desarrollo
export async function executeQuery<T = any>(
  query: ReturnType<typeof sql>,
  context?: string
): Promise<T[]> {
  try {
    if (process.env.NODE_ENV === 'development' && context) {
      console.info(`[DB Query] ${context}`);
    }
    
    const result = await query;
    return result.rows as T[];
  } catch (error) {
    console.error(`[DB Error] ${context ?? 'Unknown query'}:`, error);
    throw error;
  }
}