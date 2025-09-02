import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";

export async function GET(req: NextRequest) {
  try {
    console.log("🔧 Corrigiendo restricción de clave foránea de tipo_documento_id...");

    // Corregir la restricción de clave foránea de tipo_documento_id
    try {
      // Primero eliminar la restricción existente
      await pool.query(`
        ALTER TABLE documentos 
        DROP CONSTRAINT IF EXISTS documentos_tipo_documento_id_fkey
      `);
      console.log("✅ Restricción de clave foránea anterior eliminada");

      // Crear nueva restricción que apunte a tipos_documentos_postulacion
      await pool.query(`
        ALTER TABLE documentos 
        ADD CONSTRAINT documentos_tipo_documento_id_fkey 
        FOREIGN KEY (tipo_documento_id) REFERENCES tipos_documentos_postulacion(id)
      `);
      console.log("✅ Nueva restricción de clave foránea creada apuntando a tipos_documentos_postulacion");
    } catch (error: any) {
      console.log("⚠️ Error corrigiendo restricción de clave foránea:", error.message);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Restricción de clave foránea corregida exitosamente"
    });

  } catch (error: any) {
    console.error("❌ Error corrigiendo restricción de clave foránea:", error);
    return NextResponse.json({
      success: false,
      error: "Error corrigiendo restricción de clave foránea",
      detalles: error.message
    }, { status: 500 });
  }
}
