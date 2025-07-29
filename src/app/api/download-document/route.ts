import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const documentId = searchParams.get("id");
    const modulo = searchParams.get("modulo");

    console.log("🔍 Descarga solicitada:", { documentId, modulo });

    if (!documentId || !modulo) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    let query = "";
    let params = [documentId];

    if (modulo === "clientes") {
      query = `
        SELECT archivo_url, nombre, tipo, contenido_archivo
        FROM documentos_clientes 
        WHERE id = $1
      `;
    } else {
      query = `
        SELECT url as archivo_url, nombre_original as nombre, tipo, contenido_archivo
        FROM documentos 
        WHERE id = $1
      `;
    }

    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      console.log("❌ Documento no encontrado");
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    const documento = result.rows[0];
    console.log("📄 Documento encontrado:", { 
      nombre: documento.nombre, 
      tieneContenido: !!documento.contenido_archivo 
    });

    // Si tenemos el contenido del archivo en la BD, servirlo directamente
    if (documento.contenido_archivo) {
      console.log("✅ Sirviendo desde BD");
      const buffer = Buffer.from(documento.contenido_archivo);
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': documento.tipo || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${documento.nombre}"`,
          'Content-Length': buffer.length.toString(),
        },
      });
    }

    // Si no tenemos contenido, devolver un error explicativo
    console.log("❌ No hay contenido almacenado");
    return NextResponse.json({ 
      error: "Archivo no disponible", 
      message: "El archivo no se pudo subir correctamente a R2 y no hay copia en la base de datos" 
    }, { status: 404 });

  } catch (error) {
    console.error("❌ Error descargando documento:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
} 