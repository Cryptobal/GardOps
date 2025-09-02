import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";

export async function GET(req: NextRequest) {
  try {
    console.log("🔍 Verificando documentos subidos recientemente...");

    // Verificar documentos subidos en la tabla documentos
    const documentos = await pool.query(`
      SELECT 
        id, tipo, url, nombre_original, tamaño, 
        guardia_id, tipo_documento_id, creado_en
      FROM documentos 
      ORDER BY creado_en DESC 
      LIMIT 10
    `);

    console.log(`📊 Documentos encontrados: ${documentos.rows.length}`);
    documentos.rows.forEach((doc: any) => {
      console.log(`  - ID: ${doc.id}, Tipo: ${doc.tipo}, Nombre: ${doc.nombre_original}, Guardia: ${doc.guardia_id}`);
    });

    // Verificar específicamente el documento del guardia de prueba
    const guardiaDocs = await pool.query(`
      SELECT 
        id, tipo, url, nombre_original, tamaño, 
        guardia_id, tipo_documento_id, creado_en
      FROM documentos 
      WHERE guardia_id = 'bfd63fe6-99f0-42a4-a016-6eb6627f7f82'
      ORDER BY creado_en DESC
    `);

    console.log(`📊 Documentos del guardia de prueba: ${guardiaDocs.rows.length}`);
    guardiaDocs.rows.forEach((doc: any) => {
      console.log(`  - ID: ${doc.id}, Tipo: ${doc.tipo}, Nombre: ${doc.nombre_original}`);
    });

    return NextResponse.json({
      success: true,
      totalDocumentos: documentos.rows.length,
      documentos: documentos.rows,
      guardiaDocumentos: guardiaDocs.rows
    });

  } catch (error: any) {
    console.error("❌ Error verificando documentos:", error);
    return NextResponse.json({
      success: false,
      error: "Error verificando documentos",
      detalles: error.message
    }, { status: 500 });
  }
}
