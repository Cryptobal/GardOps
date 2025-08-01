import { query } from '../src/lib/database';

async function checkDocumentosGeneral() {
  try {
    console.log('🔍 Verificando tabla documentos general...');
    
    // Verificar estructura de la tabla documentos
    const structureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'documentos' 
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    const structureResult = await query(structureQuery);
    console.log('📋 Estructura de tabla documentos:', structureResult.rows);
    
    // Verificar datos en la tabla documentos
    const dataQuery = `
      SELECT 
        d.*,
        td.nombre as tipo_documento_nombre
      FROM documentos d
      LEFT JOIN tipos_documentos td ON d.tipo_documento_id = td.id
      ORDER BY d.creado_en DESC
    `;
    
    const dataResult = await query(dataQuery);
    console.log('📋 Datos en tabla documentos:', dataResult.rows);
    
    // Buscar documentos relacionados con instalaciones
    const instalacionesQuery = `
      SELECT 
        d.*,
        td.nombre as tipo_documento_nombre,
        i.nombre as instalacion_nombre
      FROM documentos d
      LEFT JOIN tipos_documentos td ON d.tipo_documento_id = td.id
      LEFT JOIN instalaciones i ON d.instalacion_id = i.id
      WHERE d.instalacion_id IS NOT NULL
      ORDER BY d.creado_en DESC
    `;
    
    const instalacionesResult = await query(instalacionesQuery);
    console.log('📋 Documentos de instalaciones:', instalacionesResult.rows);
    
    // Buscar documentos con fechas de vencimiento
    const vencimientoQuery = `
      SELECT 
        d.*,
        td.nombre as tipo_documento_nombre,
        i.nombre as instalacion_nombre,
        (d.fecha_vencimiento::date - CURRENT_DATE) as dias_restantes
      FROM documentos d
      LEFT JOIN tipos_documentos td ON d.tipo_documento_id = td.id
      LEFT JOIN instalaciones i ON d.instalacion_id = i.id
      WHERE d.fecha_vencimiento IS NOT NULL
      ORDER BY d.fecha_vencimiento ASC
    `;
    
    const vencimientoResult = await query(vencimientoQuery);
    console.log('📋 Documentos con fechas de vencimiento:', vencimientoResult.rows);
    
  } catch (error) {
    console.error('❌ Error verificando tabla documentos:', error);
  }
}

checkDocumentosGeneral(); 