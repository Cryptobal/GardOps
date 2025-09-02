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

    // Determinar si estamos en producción o desarrollo
    const isProduction = process.env.NODE_ENV === 'production';
    const hasR2Config = process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY;

    let r2Url = null;
    let r2Success = false;

    // En producción, intentar cargar en Cloudflare R2
    if (isProduction && hasR2Config) {
      try {
        console.log('☁️ Subiendo archivo a Cloudflare R2...');
        
        const uploadCommand = new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME || 'gardops-documents',
          Key: key,
          Body: buffer,
          ContentType: file.type || 'application/octet-stream',
          Metadata: {
            originalName: file.name,
            modulo: modulo,
            entidadId: entidad_id,
            tipoDocumentoId: tipo_documento_id
          }
        });

        await s3.send(uploadCommand);
        r2Success = true;
        r2Url = `${process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT}/${key}`;
        
        console.log('✅ Archivo subido exitosamente a R2:', r2Url);
      } catch (r2Error) {
        console.error('❌ Error subiendo a R2:', r2Error);
        console.log('🔄 Fallback: Guardando en base de datos');
      }
    }

    // Si no estamos en producción o falló R2, guardar en base de datos
    if (!r2Success) {
      console.log('📁 Guardando archivo en la base de datos (modo desarrollo/fallback)');
    }

    // Construir la consulta según el módulo
    let insertQuery = "";
    let insertParams: (string | number | Buffer | null)[] = [];

    if (modulo === "clientes" || modulo === "instalaciones") {
      // Para clientes e instalaciones, usar instalacion_id
      insertQuery = `
        INSERT INTO documentos (
          nombre_original, tipo, url, instalacion_id, tipo_documento_id, 
          contenido_archivo, tamaño, fecha_vencimiento
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, url as nombre, fecha_vencimiento
      `;
      
      insertParams = [
        file.name,                    // nombre_original
        'otros',                      // tipo
        r2Success ? r2Url : key,     // url (R2 URL o key local)
        entidad_id,                   // instalacion_id
        tipo_documento_id,            // tipo_documento_id
        r2Success ? null : buffer,    // contenido_archivo (solo si no está en R2)
        file.size,                    // tamaño
        fecha_vencimiento || null     // fecha_vencimiento
      ];
      
    } else if (modulo === "guardias") {
      // Para guardias, usar guardia_id
      insertQuery = `
        INSERT INTO documentos (
          nombre_original, tipo, url, guardia_id, tipo_documento_id, 
          contenido_archivo, tamaño, fecha_vencimiento
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, url as nombre, fecha_vencimiento
      `;
      
      insertParams = [
        file.name,                    // nombre_original
        'otros',                      // tipo
        r2Success ? r2Url : key,     // url (R2 URL o key local)
        entidad_id,                   // guardia_id
        tipo_documento_id,            // tipo_documento_id
        r2Success ? null : buffer,    // contenido_archivo (solo si no está en R2)
        file.size,                    // tamaño
        fecha_vencimiento || null     // fecha_vencimiento
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
      fecha_vencimiento: documentoCreado.fecha_vencimiento,
      r2Success,
      r2Url
    });

    return NextResponse.json({ 
      success: true, 
      key: key,
      nombre_original: file.name,
      documento_id: documentoCreado.id,
      fecha_vencimiento: documentoCreado.fecha_vencimiento,
      r2Success,
      r2Url,
      storage: r2Success ? 'cloudflare-r2' : 'database'
    });

  } catch (error) {
    console.error("❌ Error subiendo documento:", error);
    return NextResponse.json({ 
      error: "Error interno del servidor", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 