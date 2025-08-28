import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guardiaId = params.id;
    
    // Verificar si la tabla pagos_turnos_extras existe, si no, crear datos de ejemplo
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'pagos_turnos_extras'
      );
    `);

    if (!tableExists.rows[0].exists) {
      // Si la tabla no existe, retornar array vacío
      return NextResponse.json({
        success: true,
        pagos: []
      });
    }

    const result = await query(`
      SELECT 
        id,
        guardia_id,
        fecha_pago,
        glosa,
        monto_total,
        created_at
      FROM pagos_turnos_extras
      WHERE guardia_id = $1
      ORDER BY fecha_pago DESC
    `, [guardiaId]);

    return NextResponse.json({
      success: true,
      pagos: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo pagos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 