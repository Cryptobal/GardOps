import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

// GET /api/afps - Obtener lista de AFPs
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API AFPs - Obteniendo lista de AFPs');
    
    const result = await query(`
      SELECT 
        codigo,
        nombre,
        comision,
        activo
      FROM sueldo_afp 
      WHERE activo = true
      ORDER BY nombre ASC
    `);

    const afps = result.rows.map(row => ({
      codigo: row.codigo,
      nombre: row.nombre,
      comision: row.comision,
      activo: row.activo
    }));

    console.log('✅ AFPs obtenidas exitosamente:', afps.length);

    return NextResponse.json({
      afps,
      success: true
    });

  } catch (error) {
    console.error('❌ Error obteniendo AFPs:', error);
    
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
