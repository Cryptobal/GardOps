import { query } from '../src/lib/database';

async function testDocumentosQuery() {
  try {
    console.log('🔍 Probando query de documentos globales...');
    
    // Query simplificada para probar
    const testQuery = `
      WITH documentos_unidos AS (
        -- Documentos de clientes
        SELECT 
          d.id,
          d.nombre as nombre,
          d.tamaño,
          d.created_at,
          d.fecha_vencimiento,
          td.nombre as tipo_documento_nombre,
          td.id as tipo_documento_id,
          'clientes' as modulo,
          c.nombre as entidad_nombre,
          c.id as entidad_id,
          d.archivo_url as url,
          CASE 
            WHEN d.fecha_vencimiento IS NULL THEN 'sin_vencimiento'
            WHEN d.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
            WHEN d.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days' THEN 'por_vencer'
            ELSE 'vigente'
          END as estado
        FROM documentos_clientes d
        LEFT JOIN tipos_documentos td ON d.tipo_documento_id = td.id
        LEFT JOIN clientes c ON d.cliente_id = c.id
        
        UNION ALL
        
        -- Documentos generales (tabla documentos)
        SELECT 
          d.id,
          d.tipo as nombre,
          0 as tamaño,
          d.creado_en as created_at,
          d.fecha_vencimiento,
          td.nombre as tipo_documento_nombre,
          td.id as tipo_documento_id,
          CASE 
            WHEN d.instalacion_id IS NOT NULL THEN 'instalaciones'
            WHEN d.guardia_id IS NOT NULL THEN 'guardias'
            ELSE 'otros'
          END as modulo,
          COALESCE(i.nombre, CONCAT(g.nombre, ' ', g.apellido), 'Sin entidad') as entidad_nombre,
          COALESCE(d.instalacion_id::text, d.guardia_id::text) as entidad_id,
          d.url,
          CASE 
            WHEN d.fecha_vencimiento IS NULL THEN 'sin_vencimiento'
            WHEN d.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
            WHEN d.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days' THEN 'por_vencer'
            ELSE 'vigente'
          END as estado
        FROM documentos d
        LEFT JOIN tipos_documentos td ON d.tipo_documento_id = td.id
        LEFT JOIN instalaciones i ON d.instalacion_id = i.id
        LEFT JOIN guardias g ON d.guardia_id = g.id
      )
      SELECT * FROM documentos_unidos
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    const result = await query(testQuery);
    console.log('✅ Query exitosa. Resultados:', result.rows.length);
    console.log('📋 Primeros 3 resultados:', result.rows.slice(0, 3));
    
    // Probar estadísticas
    const statsQuery = `
      WITH documentos_unidos AS (
        SELECT 
          d.fecha_vencimiento,
          CASE 
            WHEN d.fecha_vencimiento IS NULL THEN 'sin_vencimiento'
            WHEN d.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
            WHEN d.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days' THEN 'por_vencer'
            ELSE 'vigente'
          END as estado
        FROM documentos_clientes d
        
        UNION ALL
        
        SELECT 
          d.fecha_vencimiento,
          CASE 
            WHEN d.fecha_vencimiento IS NULL THEN 'sin_vencimiento'
            WHEN d.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
            WHEN d.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days' THEN 'por_vencer'
            ELSE 'vigente'
          END as estado
        FROM documentos d
      )
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'vigente' THEN 1 END) as vigentes,
        COUNT(CASE WHEN estado = 'por_vencer' THEN 1 END) as por_vencer,
        COUNT(CASE WHEN estado = 'vencido' THEN 1 END) as vencidos,
        COUNT(CASE WHEN estado = 'sin_vencimiento' THEN 1 END) as sin_vencimiento
      FROM documentos_unidos
    `;
    
    const statsResult = await query(statsQuery);
    console.log('📊 Estadísticas:', statsResult.rows[0]);
    
  } catch (error) {
    console.error('❌ Error en query:', error);
  }
}

testDocumentosQuery(); 