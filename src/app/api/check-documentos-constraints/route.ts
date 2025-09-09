import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(req: NextRequest) {
  try {
    logger.debug("🔍 Verificando restricciones de la tabla documentos...");

    // Verificar restricciones de verificación en la columna tipo
    const checkConstraints = await pool.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'documentos'::regclass 
      AND contype = 'c'
    `);

    logger.debug("📋 Restricciones de verificación encontradas:");
    checkConstraints.rows.forEach((constraint: any) => {
      logger.debug(`  - ${constraint.constraint_name}: ${constraint.constraint_definition}`);
    });

    // Verificar restricciones de clave foránea
    const foreignKeyConstraints = await pool.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'documentos'::regclass 
      AND contype = 'f'
    `);

    logger.debug("📋 Restricciones de clave foránea encontradas:");
    foreignKeyConstraints.rows.forEach((constraint: any) => {
      logger.debug(`  - ${constraint.constraint_name}: ${constraint.constraint_definition}`);
    });

    // Verificar estructura de la columna tipo
    const columnInfo = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'documentos' 
      AND column_name = 'tipo'
    `);

    logger.debug("📋 Información de la columna tipo:");
    columnInfo.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    return NextResponse.json({
      success: true,
      checkConstraints: checkConstraints.rows,
      foreignKeyConstraints: foreignKeyConstraints.rows,
      columnInfo: columnInfo.rows
    });

  } catch (error: any) {
    console.error("❌ Error verificando restricciones:", error);
    return NextResponse.json({
      success: false,
      error: "Error verificando restricciones",
      detalles: error.message
    }, { status: 500 });
  }
}
