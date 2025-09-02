import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 AUDITORÍA DE LA TABLA DOCUMENTOS...');
    
    // 1. Verificar si la tabla existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'documentos'
      );
    `);
    
    if (!tableExists.rows[0]?.exists) {
      return NextResponse.json({
        success: false,
        error: 'La tabla documentos no existe'
      });
    }
    
    // 2. Obtener estructura de columnas
    const columns = await query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'documentos' 
      ORDER BY ordinal_position;
    `);
    
    // 3. Obtener índices
    const indexes = await query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'documentos';
    `);
    
    // 4. Obtener restricciones
    const constraints = await query(`
      SELECT 
        conname,
        contype,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'documentos'::regclass;
    `);
    
    // 5. Obtener muestra de datos
    const sampleData = await query(`
      SELECT * FROM documentos LIMIT 3;
    `);
    
    // 6. Contar registros por tipo
    const counts = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN cliente_id IS NOT NULL THEN 1 END) as con_cliente_id,
        COUNT(CASE WHEN guardia_id IS NOT NULL THEN 1 END) as con_guardia_id,
        COUNT(CASE WHEN instalacion_id IS NOT NULL THEN 1 END) as con_instalacion_id
      FROM documentos;
    `);
    
    const result = {
      success: true,
      tableExists: tableExists.rows[0]?.exists,
      columns: columns.rows,
      indexes: indexes.rows,
      constraints: constraints.rows,
      sampleData: sampleData.rows,
      counts: counts.rows[0] || {},
      summary: {
        totalColumns: columns.rows.length,
        totalIndexes: indexes.rows.length,
        totalConstraints: constraints.rows.length,
        totalRecords: counts.rows[0]?.total || 0
      }
    };
    
    console.log('✅ AUDITORÍA COMPLETA DE LA TABLA DOCUMENTOS');
    console.log('📊 Resumen:', result.summary);
    console.log('🏗️ Columnas:', result.columns.map(c => c.column_name).join(', '));
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ Error en auditoría de documentos:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
