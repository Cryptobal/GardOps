import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(req: NextRequest) {
  try {
    logger.debug("🔧 Corrigiendo restricción de verificación de la tabla documentos...");

    // Corregir la restricción de verificación de la columna tipo
    try {
      // Primero eliminar la restricción existente
      await pool.query(`
        ALTER TABLE documentos 
        DROP CONSTRAINT IF EXISTS documentos_tipo_check
      `);
      logger.debug("✅ Restricción de verificación anterior eliminada");

      // Crear nueva restricción que incluya tipos de postulación
      await pool.query(`
        ALTER TABLE documentos 
        ADD CONSTRAINT documentos_tipo_check 
        CHECK (tipo = ANY (ARRAY[
          'contrato', 'finiquito', 'f30', 'f30-1', 'directiva', 'otros',
          'Certificado OS10', 'Carnet Identidad Frontal', 'Carnet Identidad Reverso',
          'Certificado Antecedentes', 'Certificado Enseñanza Media',
          'Certificado AFP', 'Certificado AFC', 'Certificado FONASA/ISAPRE'
        ]))
      `);
      logger.debug("✅ Nueva restricción de verificación creada con tipos de postulación");
    } catch (error: any) {
      logger.debug("⚠️ Error corrigiendo restricción de verificación:", error.message);
      throw error;
    }

    // Crear restricción única para (guardia_id, tipo_documento_id) si no existe
    try {
      await pool.query(`
        ALTER TABLE documentos 
        ADD CONSTRAINT unique_guardia_tipo_documento 
        UNIQUE (guardia_id, tipo_documento_id)
      `);
      console.log("✅ Restricción única (guardia_id, tipo_documento_id) creada");
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        logger.debug("ℹ️ Restricción única ya existe");
      } else {
        logger.debug("⚠️ Error creando restricción única:", error.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Restricción de verificación corregida exitosamente"
    });

  } catch (error: any) {
    console.error("❌ Error corrigiendo restricción:", error);
    return NextResponse.json({
      success: false,
      error: "Error corrigiendo restricción",
      detalles: error.message
    }, { status: 500 });
  }
}
