import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logger } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  try {
    const { puesto_id, anio, mes, dia, guardia_id, estado } = await req.json();
    
    logger.debug('🔧 Creando PPC manualmente:', { puesto_id, anio, mes, dia, guardia_id, estado });
    
    // Validar parámetros requeridos
    if (!puesto_id || !anio || !mes || !dia) {
      return NextResponse.json(
        { success: false, error: 'puesto_id, anio, mes y dia son requeridos' },
        { status: 400 }
      );
    }
    
    // Verificar si ya existe un registro para este puesto en esta fecha
    const { rows: existing } = await query(`
      SELECT id, estado_puesto, tipo_cobertura FROM as_turnos_pauta_mensual 
      WHERE puesto_id = $1 AND anio = $2 AND mes = $3 AND dia = $4
    `, [puesto_id, anio, mes, dia]);
    
    if (existing.length > 0) {
      const existingRecord = existing[0];
      
      // VALIDACIÓN CRÍTICA: No permitir crear turno extra en puesto libre
      if (existingRecord.estado_puesto === 'libre') {
        logger.error('❌ Intento de crear turno extra en puesto libre:', {
          pauta_id: existingRecord.id,
          estado_puesto: existingRecord.estado_puesto,
          tipo_cobertura: existingRecord.tipo_cobertura
        });
        return NextResponse.json(
          { success: false, error: 'No se puede asignar turno extra a un puesto que está marcado como día libre' },
          { status: 400 }
        );
      }
      
      logger.debug('✅ PPC ya existe:', existingRecord);
      return NextResponse.json({
        success: true,
        pauta_id: existingRecord.id,
        message: 'PPC ya existe'
      });
    }
    
    // Crear el registro del PPC
    const { rows: newPPC } = await query(`
      INSERT INTO as_turnos_pauta_mensual (
        puesto_id, anio, mes, dia, guardia_id, estado, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id
    `, [puesto_id, anio, mes, dia, guardia_id || null, estado || 'planificado']);
    
    if (newPPC.length === 0) {
      throw new Error('No se pudo crear el PPC');
    }
    
    logger.debug('✅ PPC creado exitosamente:', newPPC[0]);
    
    return NextResponse.json({
      success: true,
      pauta_id: newPPC[0].id,
      message: 'PPC creado exitosamente'
    });
    
  } catch (error) {
    logger.error('❌ Error creando PPC:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
