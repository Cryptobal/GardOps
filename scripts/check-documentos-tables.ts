import { query } from '../src/lib/database';

async function checkDocumentosTables() {
  try {
    console.log('🔍 Verificando tablas de documentos...');
    
    // Verificar si las tablas existen
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('documentos_clientes', 'documentos_instalacion', 'documentos_guardias', 'tipos_documentos')
      ORDER BY table_name
    `;
    
    const tablesResult = await query(tablesQuery);
    console.log('📋 Tablas encontradas:', tablesResult.rows.map((r: any) => r.table_name));
    
    // Verificar datos en cada tabla
    const checkTableData = async (tableName: string) => {
      try {
        const countQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
        const result = await query(countQuery);
        console.log(`📊 ${tableName}: ${result.rows[0].count} registros`);
        
        // Mostrar algunos ejemplos
        const sampleQuery = `SELECT * FROM ${tableName} LIMIT 3`;
        const sampleResult = await query(sampleQuery);
        console.log(`📄 Ejemplos de ${tableName}:`, sampleResult.rows);
        
      } catch (error) {
        console.error(`❌ Error verificando ${tableName}:`, error);
      }
    };
    
    for (const table of ['documentos_clientes', 'documentos_instalacion', 'documentos_guardias', 'tipos_documentos']) {
      await checkTableData(table);
    }
    
    // Verificar documentos con fechas de vencimiento
    console.log('\n📅 Verificando documentos con fechas de vencimiento...');
    
    const vencimientoQuery = `
      SELECT 
        'clientes' as modulo,
        COUNT(*) as total,
        COUNT(CASE WHEN fecha_vencimiento < CURRENT_DATE THEN 1 END) as vencidos,
        COUNT(CASE WHEN fecha_vencimiento >= CURRENT_DATE THEN 1 END) as vigentes
      FROM documentos_clientes
      WHERE fecha_vencimiento IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'instalaciones' as modulo,
        COUNT(*) as total,
        COUNT(CASE WHEN fecha_vencimiento < CURRENT_DATE THEN 1 END) as vencidos,
        COUNT(CASE WHEN fecha_vencimiento >= CURRENT_DATE THEN 1 END) as vigentes
      FROM documentos_instalacion
      WHERE fecha_vencimiento IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'guardias' as modulo,
        COUNT(*) as total,
        COUNT(CASE WHEN fecha_vencimiento < CURRENT_DATE THEN 1 END) as vencidos,
        COUNT(CASE WHEN fecha_vencimiento >= CURRENT_DATE THEN 1 END) as vigentes
      FROM documentos_guardias
      WHERE fecha_vencimiento IS NOT NULL
    `;
    
    const vencimientoResult = await query(vencimientoQuery);
    console.log('📊 Resumen de documentos con vencimiento:', vencimientoResult.rows);
    
  } catch (error) {
    console.error('❌ Error verificando tablas de documentos:', error);
  }
}

checkDocumentosTables(); 