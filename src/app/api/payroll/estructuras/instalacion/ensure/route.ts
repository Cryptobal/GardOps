import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// POST - Asegurar que existe una estructura de instalación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instalacion_id, rol_servicio_id, anio, mes } = body;

    // Validar datos requeridos
    if (!instalacion_id || !rol_servicio_id || anio === undefined || mes === undefined) {
      return NextResponse.json(
        { success: false, error: 'instalacion_id, rol_servicio_id, anio y mes son requeridos' },
        { status: 400 }
      );
    }

    // Calcular vigencia_desde como primer día del mes
    const vigenciaDesde = `${anio}-${mes.toString().padStart(2, '0')}-01`;

    // Iniciar transacción
    await query('BEGIN');

    try {
      // Buscar estructura existente vigente en la fecha especificada
      const estructuraQuery = `
        SELECT id, version, vigencia_desde, vigencia_hasta
        FROM sueldo_estructura_instalacion 
        WHERE instalacion_id = $1 
          AND rol_servicio_id = $2 
          AND activo = true
          AND vigencia_desde <= $3
          AND (vigencia_hasta IS NULL OR $3 <= vigencia_hasta)
        ORDER BY vigencia_desde DESC
        LIMIT 1
      `;
      
      const estructuraResult = await query(estructuraQuery, [instalacion_id, rol_servicio_id, vigenciaDesde]);
      let estructura = Array.isArray(estructuraResult) ? estructuraResult[0] : (estructuraResult.rows || [])[0];

      if (!estructura) {
        // Crear nueva estructura
        const nuevaEstructuraQuery = `
          INSERT INTO sueldo_estructura_instalacion (
            instalacion_id, rol_servicio_id, version, vigencia_desde, activo
          ) VALUES ($1, $2, 1, $3, true)
          RETURNING id, version, vigencia_desde
        `;
        
        const nuevaEstructuraResult = await query(nuevaEstructuraQuery, [instalacion_id, rol_servicio_id, vigenciaDesde]);
        estructura = Array.isArray(nuevaEstructuraResult) ? nuevaEstructuraResult[0] : (nuevaEstructuraResult.rows || [])[0];
      }

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        data: {
          estructura_id: estructura.id,
          version: estructura.version,
          vigencia_desde: estructura.vigencia_desde
        },
        message: 'Estructura asegurada correctamente'
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    logger.error('Error asegurando estructura de instalación::', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
