import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";

export async function GET(req: NextRequest) {
  try {
    console.log("🔍 Verificando restricciones de la tabla documentos...");

    // Verificar restricciones de verificación en la columna tipo
    const checkConstraints = await pool.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'documentos'::regclass 
      AND contype = 'c'
    `);

    console.log("📋 Restricciones de verificación encontradas:");
    checkConstraints.rows.forEach((constraint: any) => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_definition}`);
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

    console.log("📋 Restricciones de clave foránea encontradas:");
    foreignKeyConstraints.rows.forEach((constraint: any) => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_definition}`);
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

    console.log("📋 Información de la columna tipo:");
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
