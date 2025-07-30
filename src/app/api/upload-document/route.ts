import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import pool from "@/lib/database";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File;
    const modulo = form.get("modulo") as string;
    const entidad_id = form.get("entidad_id") as string;
    const tipo_documento_id = form.get("tipo_documento_id") as string;
    const fecha_vencimiento = form.get("fecha_vencimiento") as string;

    if (!file || !modulo || !entidad_id || !tipo_documento_id) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    console.log('📤 Subiendo documento:', {
      archivo: file.name,
      modulo,
      entidad_id,
      tipo_documento_id,
      fecha_vencimiento: fecha_vencimiento || 'sin fecha'
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileExtension = file.name.split(".").pop();
    const uuid = randomUUID();
    const key = `${modulo}/${uuid}.${fileExtension}`;

    // Por ahora, guardar directamente en la base de datos sin R2
    let r2Success = false;
    console.log('📁 Guardando archivo directamente en la base de datos');

    // Usar la tabla documentos con la estructura actual
    let insertQuery = "";
    let insertParams: (string | number | Buffer | null)[] = [];

    // Determinar el campo de entidad según el módulo
    let entidadField = "";
    if (modulo === "instalaciones") {
      entidadField = "instalacion_id";
    } else if (modulo === "clientes") {
      // Los clientes no tienen documentos directos, usar instalacion_id
      entidadField = "instalacion_id";
    } else if (modulo === "guardias") {
      entidadField = "guardia_id";
    } else {
      entidadField = "entidad_id";
    }

    // Usar 'otros' como tipo por defecto - el tipo real se determina por el tipo_documento_id
    // que viene del frontend, no por la extensión del archivo
    const tipoDocumento = 'otros';
    
    // Construir la consulta específica según el módulo
    if (modulo === "clientes" || modulo === "instalaciones") {
      insertQuery = `
        INSERT INTO documentos (
          tipo, url, instalacion_id, tipo_documento_id, 
          contenido_archivo, fecha_vencimiento, creado_en
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, url as nombre, fecha_vencimiento
      `;
      insertParams = [
        tipoDocumento,
        key,
        entidad_id,
        tipo_documento_id,
        buffer,
        fecha_vencimiento || null,
        new Date()
      ];
    } else if (modulo === "guardias") {
      insertQuery = `
        INSERT INTO documentos (
          tipo, url, guardia_id, tipo_documento_id, 
          contenido_archivo, fecha_vencimiento, creado_en
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, url as nombre, fecha_vencimiento
      `;
      insertParams = [
        tipoDocumento,
        key,
        entidad_id,
        tipo_documento_id,
        buffer,
        fecha_vencimiento || null,
        new Date()
      ];
    } else {
      return NextResponse.json({ error: "Módulo no válido" }, { status: 400 });
    }

    console.log('🔍 Ejecutando query:', insertQuery);
    console.log('📋 Parámetros:', insertParams.map(p => typeof p === 'object' ? '[Buffer]' : p));
    
    const result = await pool.query(insertQuery, insertParams);
    const documentoCreado = result.rows[0];

    console.log('✅ Documento guardado en BD:', {
      id: documentoCreado.id,
      nombre: documentoCreado.nombre,
      fecha_vencimiento: documentoCreado.fecha_vencimiento
    });

    return NextResponse.json({ 
      success: true, 
      key: key,
      nombre_original: file.name,
      documento_id: documentoCreado.id,
      fecha_vencimiento: documentoCreado.fecha_vencimiento
    });
  } catch (error) {
    console.error("❌ Error subiendo documento:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
} 