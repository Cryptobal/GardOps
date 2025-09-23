import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 [VALIDAR-FECHA] Body recibido:', body);
    
    const { puesto_id, fecha_inicio } = body;

    if (!puesto_id || !fecha_inicio) {
      console.log('❌ [VALIDAR-FECHA] Campos faltantes:', { puesto_id, fecha_inicio });
      return NextResponse.json(
        { error: 'Faltan campos requeridos: puesto_id y fecha_inicio' },
        { status: 400 }
      );
    }

    console.log('🔍 [VALIDAR-FECHA] Verificando conflictos:', {
      puesto_id,
      fecha_inicio
    });
    
    logger.debug('🔍 [VALIDAR-FECHA] Verificando conflictos:', {
      puesto_id,
      fecha_inicio
    });

    // Verificar conflictos con pauta diaria
    console.log('🔍 [VALIDAR-FECHA] Ejecutando consulta SQL...');
    let conflictosResult;
    try {
      conflictosResult = await query(`
        SELECT 
          pd.fecha,
          pd.estado_ui,
          pd.estado_guardia,
          g.nombre as guardia_nombre,
          g.apellido_paterno,
          pd.guardia_id
        FROM as_turnos_pauta_diaria pd
        LEFT JOIN guardias g ON pd.guardia_id = g.id
        WHERE pd.puesto_id = $1 
          AND pd.fecha >= $2
          AND pd.estado_ui IN ('asistido', 'plan', 'trabajado', 'inasistencia')
          AND pd.guardia_id IS NOT NULL
        ORDER BY pd.fecha
      `, [puesto_id, fecha_inicio]);
      console.log('✅ [VALIDAR-FECHA] Consulta ejecutada exitosamente, filas:', conflictosResult.rows.length);
    } catch (sqlError) {
      console.error('❌ [VALIDAR-FECHA] Error en consulta SQL:', sqlError);
      throw sqlError;
    }

    const conflictos = conflictosResult.rows.map(row => ({
      fecha: row.fecha,
      estado: row.estado_ui,
      guardia_nombre: `${row.guardia_nombre} ${row.apellido_paterno}`.trim(),
      guardia_id: row.guardia_id
    }));

    logger.debug('🔍 [VALIDAR-FECHA] Conflictos encontrados:', conflictos);

    return NextResponse.json({
      success: true,
      tiene_conflictos: conflictos.length > 0,
      conflictos,
      mensaje: conflictos.length > 0 
        ? `El puesto ya tiene un guardia asignado con asistencia registrada en ${conflictos.length} día(s) desde ${fecha_inicio}`
        : 'Fecha disponible para asignación'
    });

  } catch (error) {
    console.error('❌ [VALIDAR-FECHA] Error completo:', error);
    logger.error('Error validando fecha de asignación:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
