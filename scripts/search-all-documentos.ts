import { query } from '../src/lib/database';

async function searchAllDocumentos() {
  try {
    console.log('🔍 Buscando documentos en todas las tablas...');
    
    // Buscar todas las tablas que contengan 'documento' en el nombre
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%documento%'
      ORDER BY table_name
    `;
    
    const tablesResult = await query(tablesQuery);
    console.log('📋 Tablas con "documento" en el nombre:', tablesResult.rows.map((r: any) => r.table_name));
    
    // Buscar todas las tablas que contengan 'archivo' en el nombre
    const archivosQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%archivo%'
      ORDER BY table_name
    `;
    
    const archivosResult = await query(archivosQuery);
    console.log('📋 Tablas con "archivo" en el nombre:', archivosResult.rows.map((r: any) => r.table_name));
    
    // Buscar todas las tablas que contengan 'file' en el nombre
    const filesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%file%'
      ORDER BY table_name
    `;
    
    const filesResult = await query(filesQuery);
    console.log('📋 Tablas con "file" en el nombre:', filesResult.rows.map((r: any) => r.table_name));
    
    // Buscar en todas las tablas por columnas que contengan 'documento' o 'archivo'
    const columnsQuery = `
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND (column_name LIKE '%documento%' OR column_name LIKE '%archivo%' OR column_name LIKE '%file%')
      ORDER BY table_name, column_name
    `;
    
    const columnsResult = await query(columnsQuery);
    console.log('📋 Columnas relacionadas con documentos:', columnsResult.rows);
    
    // Buscar en todas las tablas por columnas que contengan 'url'
    const urlQuery = `
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND column_name LIKE '%url%'
      ORDER BY table_name, column_name
    `;
    
    const urlResult = await query(urlQuery);
    console.log('📋 Columnas con "url":', urlResult.rows);
    
    // Buscar en todas las tablas por columnas que contengan 'fecha_vencimiento'
    const vencimientoQuery = `
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND column_name LIKE '%vencimiento%'
      ORDER BY table_name, column_name
    `;
    
    const vencimientoResult = await query(vencimientoQuery);
    console.log('📋 Columnas con "vencimiento":', vencimientoResult.rows);
    
  } catch (error) {
    console.error('❌ Error buscando documentos:', error);
  }
}

searchAllDocumentos(); 