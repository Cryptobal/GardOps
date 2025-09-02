import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";

export async function GET(req: NextRequest) {
  try {
    console.log("🧪 Probando conexión a base de datos...");

    // Verificar si la tabla documentos existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'documentos'
      )
    `);

    if (!tableExists.rows[0].exists) {
      console.log("📋 Tabla documentos no existe, creándola...");
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS documentos (
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
      
      console.log("✅ Tabla documentos creada");
    } else {
      console.log("✅ Tabla documentos ya existe");
    }

    // Verificar estructura de la tabla
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'documentos' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log("📋 Estructura de tabla documentos:");
    structure.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Verificar si hay tipos de documentos
    const tiposExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tipos_documentos'
      )
    `);

    if (!tiposExists.rows[0].exists) {
      console.log("📋 Tabla tipos_documentos no existe, creándola...");
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tipos_documentos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          modulo TEXT NOT NULL,
          nombre TEXT NOT NULL,
          activo BOOLEAN DEFAULT true,
          creado_en TIMESTAMP DEFAULT now()
        )
      `);
      
      // Insertar tipos por defecto
      await pool.query(`
        INSERT INTO tipos_documentos (modulo, nombre) VALUES
        ('clientes', 'Contrato'),
        ('clientes', 'Factura'),
        ('instalaciones', 'Plano'),
        ('instalaciones', 'Permiso'),
        ('guardias', 'Certificado'),
        ('guardias', 'Licencia')
        ON CONFLICT DO NOTHING
      `);
      
      console.log("✅ Tabla tipos_documentos creada con datos por defecto");
    } else {
      console.log("✅ Tabla tipos_documentos ya existe");
    }

    return NextResponse.json({ 
      success: true, 
      message: "Base de datos verificada y configurada correctamente",
      documentos_table: tableExists.rows[0].exists,
      tipos_table: tiposExists.rows[0].exists
    });

  } catch (error) {
    console.error("❌ Error en prueba:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Error en prueba", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
