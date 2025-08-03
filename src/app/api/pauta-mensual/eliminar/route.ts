import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// DELETE: Eliminar una pauta mensual completa
export async function DELETE(request: NextRequest) {
  try {
    const { instalacion_id, anio, mes } = await request.json();

    if (!instalacion_id || !anio || !mes) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros requeridos: instalacion_id, anio, mes' },
        { status: 400 }
      );
    }

    // Eliminar todos los registros de la pauta mensual para la instalación, año y mes especificados
    const result = await query(`
      DELETE FROM as_turnos_pauta_mensual 
      WHERE instalacion_id = $1 
        AND anio = $2 
        AND mes = $3
    `, [instalacion_id, anio, mes]);

    console.log(`🗑️ Pauta mensual eliminada para instalación ${instalacion_id}, ${mes}/${anio} (${result.rowCount} registros)`);

    return NextResponse.json({
      success: true,
      message: 'Pauta mensual eliminada exitosamente',
      deleted_count: result.rowCount
    });

  } catch (error) {
    console.error('❌ Error eliminando pauta mensual:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor al eliminar la pauta mensual' },
      { status: 500 }
    );
  }
} 