import { Pool } from 'pg';

// Cargar variables de entorno solo en desarrollo
if (process.env.NODE_ENV !== 'production') {
  try {
    const dotenv = require('dotenv');
    dotenv.config({ path: '.env.local' });
  } catch (error) {
    console.log('dotenv no disponible en producción');
  }
}

// Verificar que DATABASE_URL esté configurada
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no está configurada');
  throw new Error('DATABASE_URL no está configurada');
}

// Log de conexión (sin credenciales)
try {
  const u = new URL(process.env.DATABASE_URL);
  console.log('[DB]', u.host, u.pathname);
} catch {}

// Configuración optimizada de la conexión PostgreSQL para resolver timeouts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // Configuraciones optimizadas para estabilidad y rendimiento
  max: 20, // Reducir máximo número de conexiones para evitar sobrecarga
  idleTimeoutMillis: 30000, // Reducir tiempo de inactividad
  connectionTimeoutMillis: 15000, // Aumentar tiempo de conexión
  maxUses: 5000, // Reducir número máximo de usos por conexión
  
  // Configuraciones para queries lentas y timeouts
  statement_timeout: 60000, // 60 segundos timeout para statements
  query_timeout: 60000, // 60 segundos timeout para queries
  
  // Configuraciones adicionales para estabilidad
  allowExitOnIdle: false,
  
  // Configuraciones específicas para Neon
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Manejar eventos del pool para debugging
pool.on('connect', (client) => {
  console.log('🔌 Nueva conexión establecida');
});

pool.on('error', (err, client) => {
  console.error('❌ Error en el pool de conexiones:', err);
});

pool.on('remove', (client) => {
  console.log('🔌 Conexión removida del pool');
});

export default pool;

// Función para obtener un cliente del pool
export async function getClient() {
  return await pool.connect();
}

export async function query(text: string, params?: any[]): Promise<any> {
  const client = await pool.connect();
  try {
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
    console.error(`❌ Error en query: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    console.error(`Query: ${text.substring(0, 200)}...`);
    if (params) {
      console.error(`Params: ${JSON.stringify(params).substring(0, 200)}...`);
    }
    throw error;
  } finally {
    client.release();
  }
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
    const result = await query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
      [tableName]
    );
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

// Exportar funciones específicas para compatibilidad
export { pool };
export { query as vercelSql }; 