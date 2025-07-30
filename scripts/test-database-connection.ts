import * as dotenv from 'dotenv';

// Cargar variables de entorno desde .env.local
dotenv.config({ path: '.env.local' });

console.log('🔍 Verificando configuración de base de datos...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada' : 'No configurada');

if (process.env.DATABASE_URL) {
  // Extraer información de la URL de conexión
  const url = process.env.DATABASE_URL;
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)/);
  
  if (match) {
    const [, user, password, host, database] = match;
    console.log('Usuario:', user);
    console.log('Host:', host);
    console.log('Base de datos:', database);
    console.log('Contraseña:', password ? 'Configurada' : 'No configurada');
  }
}

// Probar conexión
import { query } from '../src/lib/database';

async function testConnection() {
  try {
    console.log('\n🔗 Probando conexión...');
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Conexión exitosa');
    console.log('Hora actual de la base de datos:', result.rows[0].current_time);
    
    // Verificar si la tabla guardias existe
    const tableResult = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'guardias'
      )
    `);
    
    if (tableResult.rows[0].exists) {
      console.log('✅ Tabla guardias existe');
      
      // Contar registros existentes
      const countResult = await query('SELECT COUNT(*) as total FROM guardias');
      console.log('📊 Total de guardias en la base de datos:', countResult.rows[0].total);
    } else {
      console.log('❌ Tabla guardias no existe');
    }
    
  } catch (error) {
    console.error('❌ Error de conexión:', error);
  }
}

testConnection(); 