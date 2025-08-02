import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guardiaId = params.id;
    
    const result = await query(`
      SELECT 
        g.id,
        g.banco,
        g.tipo_cuenta,
        g.numero_cuenta,
        b.nombre as banco_nombre
      FROM guardias g
      LEFT JOIN bancos b ON g.banco = b.id
      WHERE g.id = $1
    `, [guardiaId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo datos bancarios:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guardiaId = params.id;
    const { banco_id, tipo_cuenta, numero_cuenta } = await request.json();

    // Validar datos
    if (!numero_cuenta) {
      return NextResponse.json(
        { error: 'El número de cuenta es requerido' },
        { status: 400 }
      );
    }

    if (!tipo_cuenta) {
      return NextResponse.json(
        { error: 'El tipo de cuenta es requerido' },
        { status: 400 }
      );
    }

    // Actualizar datos bancarios
    const result = await query(`
      UPDATE guardias 
      SET 
        banco = $1,
        tipo_cuenta = $2,
        numero_cuenta = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, banco, tipo_cuenta, numero_cuenta
    `, [banco_id || null, tipo_cuenta, numero_cuenta, guardiaId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Datos bancarios actualizados correctamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error actualizando datos bancarios:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 