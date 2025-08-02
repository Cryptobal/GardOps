import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guardiaId = params.id;
    
    // Verificar si la tabla pagos_turnos_extras existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'pagos_turnos_extras'
      );
    `);

    if (!tableExists.rows[0].exists) {
      return NextResponse.json({
        success: true,
        pagos: []
      });
    }

    // Obtener pagos de turnos extras del guardia
    const result = await query(`
      SELECT 
        id,
        guardia_id,
        fecha_pago,
        glosa,
        monto_total,
        estado,
        observaciones,
        created_at
      FROM pagos_turnos_extras
      WHERE guardia_id = $1
      ORDER BY fecha_pago DESC, created_at DESC
    `, [guardiaId]);

    return NextResponse.json({
      success: true,
      pagos: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo pagos de turnos extras:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 