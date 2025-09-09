import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// GET - Obtener esquema de las tablas
export async function GET(request: NextRequest) {
  try {
    // Obtener estructura de la tabla principal
    const mainTableSchema = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'sueldo_estructura_guardia'
      ORDER BY ordinal_position
    `;

    // Obtener estructura de la tabla de ítems
    const itemsTableSchema = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'sueldo_estructura_guardia_item'
      ORDER BY ordinal_position
    `;

    // Obtener constraints de la tabla principal
    const mainTableConstraints = await sql`
      SELECT constraint_name, constraint_type, table_name
      FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'sueldo_estructura_guardia'
    `;

    // Obtener algunos registros de ejemplo
    const sampleRecords = await sql`
      SELECT * FROM sueldo_estructura_guardia LIMIT 3
    `;

    return NextResponse.json({
      success: true,
      data: {
        mainTable: mainTableSchema.rows,
        itemsTable: itemsTableSchema.rows,
        constraints: mainTableConstraints.rows,
        sampleRecords: sampleRecords.rows
      }
    });

  } catch (error) {
    logger.error('Error al obtener esquema::', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
