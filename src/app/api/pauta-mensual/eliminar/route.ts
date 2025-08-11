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

    // Contar días protegidos (TE/cobertura)
    const { rows: protegidosRows } = await query(`
      SELECT COUNT(*)::int AS protegidos
      FROM as_turnos_pauta_mensual pm
      JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1
        AND pm.anio = $2
        AND pm.mes = $3
        AND (
          COALESCE(pm.estado_ui, '') = 'te'
          OR COALESCE(pm.meta->>'tipo', '') = 'turno_extra'
          OR COALESCE(pm.meta->>'cobertura_guardia_id', '') <> ''
        )
    `, [instalacion_id, anio, mes]);

    const protegidos = protegidosRows?.[0]?.protegidos ?? 0;

    // Eliminar pauta planificada, preservando TE/coberturas
    const result = await query(`
      DELETE FROM as_turnos_pauta_mensual pm
      USING as_turnos_puestos_operativos po
      WHERE pm.puesto_id = po.id 
        AND po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
        AND COALESCE(pm.estado_ui, '') <> 'te'
        AND COALESCE(pm.meta->>'tipo', '') <> 'turno_extra'
        AND COALESCE(pm.meta->>'cobertura_guardia_id', '') = ''
    `, [instalacion_id, anio, mes]);

    console.log(`🗑️ Pauta mensual eliminada para instalación ${instalacion_id}, ${mes}/${anio} (${result.rowCount} registros, protegidos ${protegidos})`);

    return NextResponse.json({
      success: true,
      message: 'Pauta mensual eliminada exitosamente (TE/coberturas preservados)',
      deleted_count: result.rowCount,
      preserved_te: protegidos
    });

  } catch (error) {
    console.error('❌ Error eliminando pauta mensual:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor al eliminar la pauta mensual' },
      { status: 500 }
    );
  }
} 