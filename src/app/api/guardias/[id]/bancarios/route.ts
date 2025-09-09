import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(
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

    // Validar que el guardia existe
    const guardiaExists = await query(`
      SELECT id FROM guardias WHERE id = $1
    `, [guardiaId]);

    if (guardiaExists.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
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

    return NextResponse.json({
      success: true,
      message: 'Datos bancarios actualizados correctamente',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error actualizando datos bancarios::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 