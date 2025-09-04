import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

// GET /api/isapres - Obtener lista de ISAPREs y FONASA
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API ISAPREs - Obteniendo lista de ISAPREs');
    
    const result = await query(`
      SELECT 
        codigo,
        nombre,
        activo
      FROM sueldo_isapre 
      WHERE activo = true
      ORDER BY 
        CASE WHEN codigo = 'fonasa' THEN 0 ELSE 1 END,
        nombre ASC
    `);

    const isapres = result.rows.map(row => ({
      codigo: row.codigo,
      nombre: row.nombre,
      activo: row.activo
    }));

    console.log('✅ ISAPREs obtenidas exitosamente:', isapres.length);

    return NextResponse.json({
      isapres,
      success: true
    });

  } catch (error) {
    console.error('❌ Error obteniendo ISAPREs:', error);
    
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
