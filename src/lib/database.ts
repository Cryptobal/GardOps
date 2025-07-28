import { Pool } from 'pg';

// Configuración de la conexión PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default pool;

export async function query(text: string, params?: any[]): Promise<any> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
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
    const result = await query(`SELECT COUNT(*) FROM ${tableName} LIMIT 1`);
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    console.error(`❌ Error verificando datos en ${tableName}:`, error);
    return false;
  }
} 