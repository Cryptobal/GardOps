import { query } from '../src/lib/database';

async function checkGuardiasStructure() {
  try {
    console.log('🔍 Verificando estructura de tabla guardias...');
    
    const structureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    const structureResult = await query(structureQuery);
    console.log('📋 Estructura de tabla guardias:', structureResult.rows);
    
    // Verificar algunos datos de ejemplo
    const sampleQuery = `
      SELECT * FROM guardias LIMIT 3
    `;
    
    const sampleResult = await query(sampleQuery);
    console.log('📋 Ejemplos de guardias:', sampleResult.rows);
    
  } catch (error) {
    console.error('❌ Error verificando estructura de guardias:', error);
  }
}

checkGuardiasStructure(); 