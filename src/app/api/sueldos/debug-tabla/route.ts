import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database-vercel';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tabla = searchParams.get('tabla') || 'sueldo_afp';

    logger.debug(`🔍 Debuggeando tabla: ${tabla}`);

    // Obtener estructura de la tabla
    const estructura = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = ${tabla}
      ORDER BY ordinal_position
    `;

    // Obtener algunos datos de ejemplo (usando query dinámico)
    let datos;
    if (tabla === 'sueldo_afp') {
      datos = await sql`
        SELECT * FROM sueldo_afp 
        WHERE periodo = '2025-08' 
        LIMIT 5
      `;
    } else if (tabla === 'sueldo_parametros_generales') {
      datos = await sql`
        SELECT * FROM sueldo_parametros_generales 
        WHERE periodo = '2025-08' 
        LIMIT 5
      `;
    } else if (tabla === 'sueldo_tramos_impuesto') {
      datos = await sql`
        SELECT * FROM sueldo_tramos_impuesto 
        WHERE periodo = '2025-08' 
        LIMIT 5
      `;
    } else if (tabla === 'sueldo_asignacion_familiar') {
      datos = await sql`
        SELECT * FROM sueldo_asignacion_familiar 
        WHERE periodo = '2025-08' 
        LIMIT 5
      `;
    } else {
      datos = { rows: [] };
    }

    // Contar registros totales
    let total;
    if (tabla === 'sueldo_afp') {
      total = await sql`SELECT COUNT(*) as count FROM sueldo_afp`;
    } else if (tabla === 'sueldo_parametros_generales') {
      total = await sql`SELECT COUNT(*) as count FROM sueldo_parametros_generales`;
    } else if (tabla === 'sueldo_tramos_impuesto') {
      total = await sql`SELECT COUNT(*) as count FROM sueldo_tramos_impuesto`;
    } else if (tabla === 'sueldo_asignacion_familiar') {
      total = await sql`SELECT COUNT(*) as count FROM sueldo_asignacion_familiar`;
    } else {
      total = { rows: [{ count: 0 }] };
    }

    // Contar registros por período
    let porPeriodo;
    if (tabla === 'sueldo_afp') {
      porPeriodo = await sql`
        SELECT periodo, COUNT(*) as count 
        FROM sueldo_afp 
        GROUP BY periodo 
        ORDER BY periodo
      `;
    } else if (tabla === 'sueldo_parametros_generales') {
      porPeriodo = await sql`
        SELECT periodo, COUNT(*) as count 
        FROM sueldo_parametros_generales 
        GROUP BY periodo 
        ORDER BY periodo
      `;
    } else if (tabla === 'sueldo_tramos_impuesto') {
      porPeriodo = await sql`
        SELECT periodo, COUNT(*) as count 
        FROM sueldo_tramos_impuesto 
        GROUP BY periodo 
        ORDER BY periodo
      `;
    } else if (tabla === 'sueldo_asignacion_familiar') {
      porPeriodo = await sql`
        SELECT periodo, COUNT(*) as count 
        FROM sueldo_asignacion_familiar 
        GROUP BY periodo 
        ORDER BY periodo
      `;
    } else {
      porPeriodo = { rows: [] };
    }

    return NextResponse.json({
      success: true,
      tabla,
      estructura: estructura.rows,
      datos: datos.rows,
      total: total.rows[0].count,
      porPeriodo: porPeriodo.rows
    });

  } catch (error) {
    console.error('❌ Error debuggeando tabla:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error debuggeando tabla',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
