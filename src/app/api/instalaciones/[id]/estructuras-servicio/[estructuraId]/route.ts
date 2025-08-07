import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// PUT - Actualizar estructura de servicio
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; estructuraId: string } }
) {
  try {
    const { estructuraId } = params;
    const body = await request.json();
    const { nombre_bono, monto, imponible } = body;
    
    // Validar datos requeridos
    if (!nombre_bono || monto === undefined) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }
    
    // Actualizar estructura
    const rows = await query(`
      UPDATE sueldo_estructuras_servicio
      SET 
        nombre_bono = $1,
        monto = $2,
        imponible = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [nombre_bono, monto, imponible !== false, estructuraId]);
    
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Estructura no encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error actualizando estructura de servicio:', error);
    return NextResponse.json(
      { error: 'Error al actualizar estructura de servicio' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar estructura de servicio
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; estructuraId: string } }
) {
  try {
    const { estructuraId } = params;
    
    const rows = await query(`
      DELETE FROM sueldo_estructuras_servicio
      WHERE id = $1
      RETURNING id
    `, [estructuraId]);
    
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Estructura no encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, deleted: estructuraId });
  } catch (error) {
    console.error('Error eliminando estructura de servicio:', error);
    return NextResponse.json(
      { error: 'Error al eliminar estructura de servicio' },
      { status: 500 }
    );
  }
}
