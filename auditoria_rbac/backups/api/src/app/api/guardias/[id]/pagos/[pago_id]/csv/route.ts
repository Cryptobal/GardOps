import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; pago_id: string } }
) {
  try {
    const { id: guardiaId, pago_id } = params;
    
    // Verificar si la tabla pagos_turnos_extras existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'pagos_turnos_extras'
      );
    `);

    if (!tableExists.rows[0].exists) {
      return NextResponse.json(
        { error: 'Tabla de pagos no existe' },
        { status: 404 }
      );
    }

    // Obtener datos del pago
    const result = await query(`
      SELECT 
        p.id,
        p.fecha_pago,
        p.glosa,
        p.monto_total,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        g.rut
      FROM pagos_turnos_extras p
      INNER JOIN guardias g ON p.guardia_id = g.id
      WHERE p.id = $1 AND p.guardia_id = $2
    `, [pago_id, guardiaId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    const pago = result.rows[0];
    
    // Crear contenido CSV
    const csvContent = [
      'Fecha de Pago,Glosa,Monto Total,Guardia,RUT',
      `${pago.fecha_pago},"${pago.glosa}",${pago.monto_total},"${pago.nombre} ${pago.apellido_paterno} ${pago.apellido_materno}",${pago.rut}`
    ].join('\n');

    // Crear respuesta con headers para descarga
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="pago_${pago_id}_${pago.fecha_pago}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generando CSV:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 