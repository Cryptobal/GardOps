import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";

export async function GET(req: NextRequest) {
  try {
    console.log("🔧 Iniciando migración de tipos de documentos de postulación...");

    // Crear tabla tipos_documentos_postulacion
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tipos_documentos_postulacion (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        obligatorio BOOLEAN DEFAULT true,
        formato_permitido VARCHAR(50) DEFAULT 'PDF,IMAGEN',
        orden INTEGER DEFAULT 0,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log("✅ Tabla tipos_documentos_postulacion creada/verificada");

    // Insertar tipos de documentos predefinidos
    const tiposDefault = [
      { nombre: 'Certificado OS10', descripcion: 'Certificado de salud ocupacional', obligatorio: true, formato_permitido: 'PDF,IMAGEN', orden: 1 },
      { nombre: 'Carnet Identidad Frontal', descripcion: 'Foto frontal del carnet de identidad', obligatorio: true, formato_permitido: 'IMAGEN', orden: 2 },
      { nombre: 'Carnet Identidad Reverso', descripcion: 'Foto del reverso del carnet de identidad', obligatorio: true, formato_permitido: 'IMAGEN', orden: 3 },
      { nombre: 'Certificado Antecedentes', descripcion: 'Certificado de antecedentes penales', obligatorio: true, formato_permitido: 'PDF,IMAGEN', orden: 4 },
      { nombre: 'Certificado Enseñanza Media', descripcion: 'Certificado de estudios secundarios', obligatorio: true, formato_permitido: 'PDF,IMAGEN', orden: 5 },
      { nombre: 'Certificado AFP', descripcion: 'Certificado de afiliación AFP', obligatorio: true, formato_permitido: 'PDF,IMAGEN', orden: 6 },
      { nombre: 'Certificado AFC', descripcion: 'Certificado de afiliación AFC', obligatorio: true, formato_permitido: 'PDF,IMAGEN', orden: 7 },
      { nombre: 'Certificado FONASA/ISAPRE', descripcion: 'Certificado de afiliación de salud', obligatorio: true, formato_permitido: 'PDF,IMAGEN', orden: 8 }
    ];

    for (const tipo of tiposDefault) {
      try {
        await pool.query(`
          INSERT INTO tipos_documentos_postulacion (nombre, descripcion, obligatorio, formato_permitido, orden)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (nombre) DO NOTHING
        `, [tipo.nombre, tipo.descripcion, tipo.obligatorio, tipo.formato_permitido, tipo.orden]);
      } catch (error) {
        console.log(`⚠️ Error insertando tipo ${tipo.nombre}:`, error);
      }
    }

    console.log("✅ Tipos de documentos de postulación insertados");

    // Verificar estructura final
    const finalStructure = await pool.query(`
      SELECT nombre, descripcion, obligatorio, formato_permitido, orden, activo
      FROM tipos_documentos_postulacion 
      ORDER BY orden
    `);

    console.log("📋 Tipos de documentos de postulación disponibles:");
    finalStructure.rows.forEach((tipo: any) => {
      console.log(`  - ${tipo.nombre}: ${tipo.descripcion} (${tipo.formato_permitido})`);
    });

    return NextResponse.json({
      success: true,
      message: "Migración de tipos de documentos de postulación completada",
      tipos: finalStructure.rows
    });

  } catch (error: any) {
    console.error("❌ Error en migración de tipos de documentos de postulación:", error);
    return NextResponse.json({
      success: false,
      error: "Error en migración",
      detalles: error.message
    }, { status: 500 });
  }
}
