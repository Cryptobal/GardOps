import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";

export async function GET(req: NextRequest) {
  try {
    console.log("🧹 Limpiando datos problemáticos de la tabla documentos...");

    // Eliminar registros con tipo_documento_id que no existe en tipos_documentos_postulacion
    const deleteResult = await pool.query(`
      DELETE FROM documentos 
      WHERE tipo_documento_id IS NOT NULL 
      AND tipo_documento_id NOT IN (
        SELECT id FROM tipos_documentos_postulacion
      )
    `);

    console.log(`✅ Registros eliminados: ${deleteResult.rowCount}`);

    // Verificar que no queden registros problemáticos
    const remainingInvalid = await pool.query(`
      SELECT COUNT(*) as count
      FROM documentos d
      LEFT JOIN tipos_documentos_postulacion tdp ON d.tipo_documento_id = tdp.id
      WHERE d.tipo_documento_id IS NOT NULL 
      AND tdp.id IS NULL
    `);

    console.log(`📊 Registros problemáticos restantes: ${remainingInvalid.rows[0].count}`);

    return NextResponse.json({
      success: true,
      message: "Datos problemáticos limpiados exitosamente",
      deletedCount: deleteResult.rowCount,
      remainingInvalid: remainingInvalid.rows[0].count
    });

  } catch (error: any) {
    console.error("❌ Error limpiando datos:", error);
    return NextResponse.json({
      success: false,
      error: "Error limpiando datos",
      detalles: error.message
    }, { status: 500 });
  }
}
