import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(req: NextRequest) {
  try {
    logger.debug("🔧 Iniciando migración de tabla documentos...");

    // Verificar si la tabla existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, ['documentos']);

    if (tableExists.rows[0].exists) {
      logger.debug("ℹ️ Tabla documentos ya existe");
    } else {
      // Crear tabla documentos con estructura corregida
      await pool.query(`
        CREATE TABLE documentos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          instalacion_id UUID,
          guardia_id UUID,
          cliente_id UUID,
          nombre_original TEXT,
          tipo TEXT,
          url TEXT,
          contenido_archivo BYTEA,
          tamaño BIGINT,
          tipo_documento_id UUID,
          fecha_vencimiento DATE,
          creado_en TIMESTAMP DEFAULT now(),
          actualizado_en TIMESTAMP DEFAULT now()
        )
      `);
      logger.debug("✅ Tabla documentos creada con estructura corregida");
    }

    // Crear índices solo si las columnas existen
    const structure = await pool.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'documentos'
    `);
    
    const existingColumns = structure.rows.map(col => col.column_name);
    
    if (existingColumns.includes('instalacion_id')) {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_documentos_instalacion 
        ON documentos(instalacion_id)
      `);
      logger.debug("✅ Índice en instalacion_id creado");
    }
    
    if (existingColumns.includes('guardia_id')) {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_documentos_guardia 
        ON documentos(guardia_id)
      `);
      logger.debug("✅ Índice en guardia_id creado");
    }
    
    if (existingColumns.includes('cliente_id')) {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_documentos_cliente 
        ON documentos(cliente_id)
      `);
      logger.debug("✅ Índice en cliente_id creado");
    }
    
    if (existingColumns.includes('creado_en')) {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_documentos_creado_en 
        ON documentos(creado_en DESC)
      `);
      logger.debug("✅ Índice en creado_en creado");
    }

    logger.debug("✅ Índices creados");

    // Verificar estructura
    const finalStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `, ['documentos']);

    logger.debug("📋 Estructura de tabla documentos:");
    finalStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

    return NextResponse.json({ 
      success: true, 
      message: "Migración de documentos completada con estructura corregida",
      structure: finalStructure.rows
    });

  } catch (error) {
    console.error("❌ Error en migración de documentos:", error);
    return NextResponse.json({ 
      error: "Error en migración", 
      details: error instanceof Error ? error.message : "Error desconocido" 
    }, { status: 500 });
  }
} 