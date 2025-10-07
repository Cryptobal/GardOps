import { Pool } from 'pg';
import * as dotenv from 'dotenv';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

// Verificar que DATABASE_URL esté configurada
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no está configurada');
  throw new Error('DATABASE_URL no está configurada');
}

// Log de conexión (sin credenciales)
try {
  const u = new URL(process.env.DATABASE_URL);
  logger.debug('[DB]', u.host, u.pathname);
} catch {}

// Configuración optimizada de la conexión PostgreSQL para resolver timeouts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // Configuraciones optimizadas para estabilidad y rendimiento
  max: 10, // Reducir más el máximo número de conexiones para evitar sobrecarga
  idleTimeoutMillis: 10000, // Reducir tiempo de inactividad para liberar conexiones más rápido
  connectionTimeoutMillis: 10000, // Reducir tiempo de conexión para fallar más rápido
  maxUses: 1000, // Reducir número máximo de usos por conexión
  
  // Configuraciones para queries lentas y timeouts
  statement_timeout: 30000, // 30 segundos timeout para statements (más estricto)
  query_timeout: 30000, // 30 segundos timeout para queries (más estricto)
  
  // Configuraciones adicionales para estabilidad
  allowExitOnIdle: false,
  
  // Configuraciones específicas para Neon - más agresivas
  keepAlive: true,
  keepAliveInitialDelayMillis: 5000, // Reducir delay inicial
});

// Manejar eventos del pool para debugging
pool.on('connect', (client) => {
  logger.debug('🔌 Nueva conexión establecida');
});

pool.on('error', (err, client) => {
  console.error('❌ Error en el pool de conexiones:', err);
});

pool.on('remove', (client) => {
  logger.debug('🔌 Conexión removida del pool');
});

// Health check periódico para detectar conexiones problemáticas
setInterval(async () => {
  try {
    const result = await pool.query('SELECT 1');
    logger.debug('💚 Health check BD: OK');
  } catch (error) {
    console.error('❌ Health check BD falló:', error instanceof Error ? error.message : 'Error desconocido');
    // Si el health check falla, intentar limpiar el pool
    try {
      await pool.end();
      console.log('🔄 Pool de conexiones reiniciado');
    } catch (cleanupError) {
      console.error('❌ Error limpiando pool:', cleanupError);
    }
  }
}, 60000); // Cada minuto

export default pool;
export { pool };
export const db = pool;

// Función para obtener un cliente del pool
export async function getClient() {
  return await pool.connect();
}

export async function query(text: string, params?: any[], retries: number = 3): Promise<any> {
  let client;
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      client = await pool.connect();
      const startTime = Date.now();
      const result = await client.query(text, params);
      const duration = Date.now() - startTime;
      
      // Log solo queries lentos para debugging
      if (duration > 2000) {
        console.log(`🐌 Query muy lento (${duration}ms): ${text.substring(0, 100)}...`);
      } else if (duration > 1000) {
        console.log(`🐌 Query lento (${duration}ms): ${text.substring(0, 100)}...`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      console.error(`❌ Error en query (intento ${attempt}/${retries}): ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      // Si es un timeout y no es el último intento, esperar antes de reintentar
      if (attempt < retries && error instanceof Error && 
          (error.message.includes('ETIMEDOUT') || error.message.includes('timeout'))) {
        console.log(`🔄 Reintentando query en 1 segundo... (intento ${attempt + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      // Si no es timeout o es el último intento, mostrar detalles del error
      console.error(`Query: ${text.substring(0, 200)}...`);
      if (params) {
        console.error(`Params: ${JSON.stringify(params).substring(0, 200)}...`);
      }
      
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }
  
  // Si llegamos aquí, todos los intentos fallaron
  throw lastError;
}

export async function checkConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a la base de datos:', error);
    return false;
  }
}

export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [tableName]);
    return result.rows[0].exists;
  } catch (error) {
    console.error(`❌ Error verificando tabla ${tableName}:`, error);
    return false;
  }
}

export async function getColumnType(tableName: string, columnName: string): Promise<string | null> {
  try {
    const result = await query(`
      SELECT data_type, udt_name
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1 
      AND column_name = $2
    `, [tableName, columnName]);
    
    if (result.rows.length === 0) return null;
    
    const { data_type, udt_name } = result.rows[0];
    return data_type === 'USER-DEFINED' ? udt_name : data_type;
  } catch (error) {
    console.error(`❌ Error obteniendo tipo de columna ${tableName}.${columnName}:`, error);
    return null;
  }
}

export async function hasData(tableName: string): Promise<boolean> {
  try {
    const result = await query(`SELECT COUNT(*) FROM ${tableName}`);
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    console.error(`❌ Error verificando datos en ${tableName}:`, error);
    return false;
  }
}

// Función para cerrar el pool de conexiones (útil para tests)
export async function closePool(): Promise<void> {
  await pool.end();
} 