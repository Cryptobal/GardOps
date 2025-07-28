import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const modulo = searchParams.get("modulo");
    const entidad_id = searchParams.get("entidad_id");

    if (!modulo || !entidad_id) {
      return NextResponse.json({ error: "Faltan parámetros modulo y entidad_id" }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT id, modulo, entidad_id, nombre_original, tipo, url, creado_en
       FROM documentos 
       WHERE modulo = $1 AND entidad_id = $2
       ORDER BY creado_en DESC`,
      [modulo, entidad_id]
    );

    return NextResponse.json({ documentos: result.rows });
  } catch (error) {
    console.error("Error obteniendo documentos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Falta parámetro id" }, { status: 400 });
    }

    // Primero obtenemos la información del documento para eliminar de R2
    const docResult = await pool.query(
      "SELECT url FROM documentos WHERE id = $1",
      [id]
    );

    if (docResult.rows.length === 0) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    const { url } = docResult.rows[0];

    // Eliminamos de la base de datos
    await pool.query("DELETE FROM documentos WHERE id = $1", [id]);

    // TODO: Aquí podrías agregar la eliminación del archivo en R2 si es necesario
    // Por ahora solo eliminamos el registro de la base de datos

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error eliminando documento:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
} 