import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";

export async function GET(req: NextRequest) {
  try {
    console.log("🔍 Verificando datos existentes en la tabla documentos...");

    // Verificar cuántos registros hay
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM documentos
    `);
    const total = countResult.rows[0].total;
    console.log(`📊 Total de registros en documentos: ${total}`);

    // Verificar registros con tipo_documento_id que no existe en tipos_documentos_postulacion
    const invalidReferences = await pool.query(`
      SELECT d.id, d.tipo, d.tipo_documento_id, d.nombre_original
      FROM documentos d
      LEFT JOIN tipos_documentos_postulacion tdp ON d.tipo_documento_id = tdp.id
      WHERE d.tipo_documento_id IS NOT NULL 
      AND tdp.id IS NULL
    `);

    console.log(`⚠️ Registros con tipo_documento_id inválido: ${invalidReferences.rows.length}`);
    invalidReferences.rows.forEach((row: any) => {
      console.log(`  - ID: ${row.id}, Tipo: ${row.tipo}, tipo_documento_id: ${row.tipo_documento_id}, Nombre: ${row.nombre_original}`);
    });

    // Verificar registros con tipo que no está en la lista permitida
    const invalidTypes = await pool.query(`
      SELECT id, tipo, nombre_original
      FROM documentos
      WHERE tipo NOT IN (
        'contrato', 'finiquito', 'f30', 'f30-1', 'directiva', 'otros',
        'Certificado OS10', 'Carnet Identidad Frontal', 'Carnet Identidad Reverso',
        'Certificado Antecedentes', 'Certificado Enseñanza Media',
        'Certificado AFP', 'Certificado AFC', 'Certificado FONASA/ISAPRE'
      )
    `);

    console.log(`⚠️ Registros con tipo inválido: ${invalidTypes.rows.length}`);
    invalidTypes.rows.forEach((row: any) => {
      console.log(`  - ID: ${row.id}, Tipo: ${row.tipo}, Nombre: ${row.nombre_original}`);
    });

    return NextResponse.json({
      success: true,
      total: total,
      invalidReferences: invalidReferences.rows,
      invalidTypes: invalidTypes.rows
    });

  } catch (error: any) {
    console.error("❌ Error verificando datos:", error);
    return NextResponse.json({
      success: false,
      error: "Error verificando datos",
      detalles: error.message
    }, { status: 500 });
  }
}
