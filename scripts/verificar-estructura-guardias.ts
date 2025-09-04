import 'dotenv/config';
import { query } from '../src/lib/database';

async function verificarEstructuraGuardias() {
  try {
    console.log('🔍 Verificando estructura de la tabla guardias...');
    
    // Obtener información de las columnas
    const result = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Columnas de la tabla guardias:');
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Verificar si existen los campos que estamos intentando actualizar
    const camposProblematicos = ['latitud', 'longitud', 'region'];
    
    console.log('\n🔍 Verificando campos problemáticos:');
    for (const campo of camposProblematicos) {
      const existe = result.rows.some((row: any) => row.column_name === campo);
      console.log(`  - ${campo}: ${existe ? '✅ Existe' : '❌ No existe'}`);
    }
    
  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
  } finally {
    process.exit(0);
  }
}

verificarEstructuraGuardias();