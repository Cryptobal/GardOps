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
    const extension = file.name.split(".").pop();
    const uuid = randomUUID();
    const key = `${modulo}/${uuid}.${extension}`;

    let r2Success = false;
    // Intentar subir a R2, si falla, continuar sin R2
    try {
      await s3.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      }));
      r2Success = true;
      console.log('✅ Archivo subido a R2:', key);
    } catch (r2Error) {
      console.warn("⚠️ Error subiendo a R2, guardando contenido en BD:", r2Error);
      // Continuar sin R2, guardaremos el contenido en la base de datos
    }

    // Usar la tabla correcta según el módulo
    let tableName = "documentos";
    let insertQuery = "";
    let insertParams: (string | number | Buffer | null)[] = [];

    if (modulo === "clientes") {
      tableName = "documentos_clientes";
      
      // Asegurar que la tabla tenga la columna fecha_vencimiento
      try {
        await pool.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE`);
        console.log('✅ Columna fecha_vencimiento verificada en documentos_clientes');
      } catch (alterError) {
        console.warn("Columna fecha_vencimiento podría ya existir:", alterError);
      }

      if (r2Success) {
        insertQuery = `
          INSERT INTO ${tableName} (cliente_id, nombre, tipo, archivo_url, tamaño, tipo_documento_id, fecha_vencimiento)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, nombre, fecha_vencimiento
        `;
        insertParams = [entidad_id, file.name, file.type, key, file.size, tipo_documento_id, fecha_vencimiento || null];
      } else {
        // Intentar agregar la columna contenido_archivo si no existe
        try {
          await pool.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS contenido_archivo BYTEA`);
        } catch (alterError) {
          console.warn("Column contenido_archivo might already exist:", alterError);
        }
        
        insertQuery = `
          INSERT INTO ${tableName} (cliente_id, nombre, tipo, archivo_url, tamaño, tipo_documento_id, contenido_archivo, fecha_vencimiento)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, nombre, fecha_vencimiento
        `;
        insertParams = [entidad_id, file.name, file.type, key, file.size, tipo_documento_id, buffer, fecha_vencimiento || null];
      }
    } else {
      if (r2Success) {
        insertQuery = `
          INSERT INTO ${tableName} (modulo, entidad_id, nombre_original, tipo, url, tipo_documento_id, fecha_vencimiento)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, nombre_original as nombre, fecha_vencimiento
        `;
        insertParams = [modulo, entidad_id, file.name, file.type, key, tipo_documento_id, fecha_vencimiento || null];
      } else {
        // Intentar agregar la columna si no existe
        try {
          await pool.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS contenido_archivo BYTEA`);
        } catch (alterError) {
          console.warn("Column contenido_archivo might already exist:", alterError);
        }
        
        insertQuery = `
          INSERT INTO ${tableName} (modulo, entidad_id, nombre_original, tipo, url, tipo_documento_id, contenido_archivo, fecha_vencimiento)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, nombre_original as nombre, fecha_vencimiento
        `;
        insertParams = [modulo, entidad_id, file.name, file.type, key, tipo_documento_id, buffer, fecha_vencimiento || null];
      }
    }

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