import { NextRequest, NextResponse } from "next/server";
import { query } from "../../../lib/database";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(req: NextRequest) {
  try {
    logger.debug("🔧 Iniciando migración de tabla logs_clientes...");

    // Verificar si la tabla existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, ['logs_clientes']);

    if (tableExists.rows[0].exists) {
      logger.debug("ℹ️ Tabla logs_clientes ya existe");
    } else {
      // Crear tabla logs_clientes
      await query(`
        CREATE TABLE logs_clientes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          cliente_id UUID NOT NULL REFERENCES clientes(id),
          accion TEXT NOT NULL,
          usuario TEXT NOT NULL,
          tipo TEXT DEFAULT 'manual',
          contexto TEXT DEFAULT NULL,
          fecha TIMESTAMP DEFAULT now()
        )
      `);
      logger.debug("✅ Tabla logs_clientes creada");
    }

    // Crear índices para mejorar rendimiento
    await query(`
      CREATE INDEX IF NOT EXISTS idx_logs_clientes_cliente_id 
      ON logs_clientes(cliente_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_logs_clientes_fecha 
      ON logs_clientes(fecha DESC)
    `);

    logger.debug("✅ Índices creados");

    // Verificar estructura
    const structure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `, ['logs_clientes']);

    logger.debug("📋 Estructura de tabla logs_clientes:");
    structure.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

    return NextResponse.json({ 
      success: true, 
      message: "Migración de logs_clientes completada",
      structure: structure.rows
    });

  } catch (error) {
    console.error("❌ Error en migración de logs_clientes:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Error en la migración",
      error: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
} 