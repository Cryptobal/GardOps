import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

// GET /api/afps - Obtener lista de AFPs
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API AFPs - Obteniendo lista de AFPs');
    
    // Primero verificar qué columnas tiene la tabla
    const columnsResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sueldo_afp'
      ORDER BY ordinal_position
    `);
    
    console.log('🔍 Columnas en sueldo_afp:', columnsResult.rows.map(r => r.column_name));
    
    const result = await query(`
      SELECT 
        codigo,
        nombre,
        tasa
      FROM sueldo_afp 
      ORDER BY nombre ASC
    `);

    const afps = result.rows.map(row => ({
      codigo: row.codigo || row.nombre.toLowerCase().replace(/afp\s+/i, '').replace(/\s+/g, ''),
      nombre: row.nombre,
      tasa: row.tasa,
      activo: true // Asumimos que todas las AFPs están activas
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
