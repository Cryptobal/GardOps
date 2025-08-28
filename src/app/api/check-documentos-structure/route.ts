import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const tables = ['documentos', 'documentos_clientes', 'documentos_instalacion', 'documentos_guardias', 'documentos_tipos'];
    const results: Record<string, any> = {};

    for (const tableName of tables) {
      try {
        const result = await query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);
        
        results[tableName] = {
          exists: true,
          columns: result.rows
        };
      } catch (error) {
        results[tableName] = {
          exists: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }

    return NextResponse.json({
      success: true,
      tables: results
    });

  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error verificando estructura',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
