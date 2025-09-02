import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/database';
import { logCRUD, logError } from '@/lib/logging';
import { randomUUID } from "crypto";

// Función para subir archivo usando fetch nativo (más robusto para SSL)
async function uploadToR2WithFetch(buffer: Buffer, key: string, contentType: string, metadata: any) {
  const endpoint = process.env.R2_ENDPOINT;
  const bucket = process.env.R2_BUCKET;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('Configuración R2 incompleta');
  }

  // Construir URL completa
  const url = `${endpoint}/${bucket}/${key}`;
  
  // Crear headers de autenticación
  const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = date.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  
  // Crear canonical request
  const canonicalRequest = [
    'PUT',
    `/${key}`,
    '',
    'content-type:' + contentType,
    'host:' + new URL(endpoint).host,
    'x-amz-date:' + date,
    '',
    'content-type;host;x-amz-date',
    require('crypto').createHash('sha256').update(buffer).digest('hex')
  ].join('\n');
  
  // Crear string to sign
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    date,
    `${dateStamp}/${region}/${service}/aws4_request`,
    require('crypto').createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');
  
  // Calcular signature
  const kDate = require('crypto').createHmac('sha256', 'AWS4' + secretAccessKey).update(dateStamp).digest();
  const kRegion = require('crypto').createHmac('sha256', kDate).update(region).digest();
  const kService = require('crypto').createHmac('sha256', kRegion).update(service).digest();
  const kSigning = require('crypto').createHmac('sha256', kService).update('aws4_request').digest();
  const signature = require('crypto').createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  
  // Crear authorization header
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${dateStamp}/${region}/${service}/aws4_request,SignedHeaders=content-type;host;x-amz-date,Signature=${signature}`;
  
  // Subir usando fetch
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'X-Amz-Date': date,
      'Authorization': authorization,
      'Content-Length': buffer.length.toString()
    },
    body: buffer,
    // Configuración SSL robusta
    signal: AbortSignal.timeout(60000), // 60 segundos
    keepalive: true
  });
  
  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response;
}

export async function POST(request: NextRequest) {
  let formData: FormData | null = null;
  let guardiaId: string | null = null;
  let tipoDocumento: string | null = null;
  let archivo: File | null = null;
  
  try {
    formData = await request.formData();
    guardiaId = formData.get('guardia_id') as string;
    tipoDocumento = formData.get('tipo_documento') as string;
    archivo = formData.get('archivo') as File;

    console.log('📤 API Postulación - Subiendo documento:', {
      guardia_id: guardiaId,
      tipo_documento: tipoDocumento,
      archivo: archivo?.name,
      tamaño: archivo?.size
    });

    if (!guardiaId || !tipoDocumento || !archivo) {
      return NextResponse.json({
        error: 'Faltan campos requeridos: guardia_id, tipo_documento, archivo'
      }, { status: 400 });
    }

    const client = await getClient();
    
    try {
      // Verificar que el guardia existe
      const guardiaCheck = await client.query(
        'SELECT id, nombre, apellido_paterno, tenant_id FROM guardias WHERE id = $1',
        [guardiaId]
      );

      if (guardiaCheck.rows.length === 0) {
        return NextResponse.json({
          error: 'Guardia no encontrado'
        }, { status: 404 });
      }

      const guardia = guardiaCheck.rows[0];

      // Verificar que el tipo de documento es válido
      const tipoDocCheck = await client.query(
        'SELECT id, nombre, formato_permitido FROM tipos_documentos_postulacion WHERE nombre = $1 AND activo = true',
        [tipoDocumento]
      );

      if (tipoDocCheck.rows.length === 0) {
        return NextResponse.json({
          error: 'Tipo de documento no válido'
        }, { status: 400 });
      }

      const tipoDoc = tipoDocCheck.rows[0];

      // Validar formato del archivo
      const extension = archivo.name.split('.').pop()?.toLowerCase();
      const formatoPermitido = tipoDoc.formato_permitido.split(',');
      
      let formatoValido = false;
      if (formatoPermitido.includes('IMAGEN')) {
        formatoValido = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '');
      }
      if (formatoPermitido.includes('PDF')) {
        formatoValido = formatoValido || extension === 'pdf';
      }

      if (!formatoValido) {
        return NextResponse.json({
          error: `Formato de archivo no permitido. Tipos permitidos: ${tipoDoc.formato_permitido}`
        }, { status: 400 });
      }

      // Validar tamaño del archivo (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (archivo.size > maxSize) {
        return NextResponse.json({
          error: 'El archivo es demasiado grande. Máximo 10MB permitido'
        }, { status: 400 });
      }

      // Convertir archivo a buffer
      const buffer = Buffer.from(await archivo.arrayBuffer());

      // Generar nombre único para el archivo en R2
      const uuid = randomUUID();
      const key = `postulacion/${uuid}.${extension}`;

      // Subir archivo a Cloudflare R2 usando fetch nativo
      console.log('📤 Subiendo archivo a Cloudflare R2:', key);
      
      await uploadToR2WithFetch(
        buffer,
        key,
        archivo.type || 'application/octet-stream',
        {
          originalName: archivo.name,
          guardiaId: guardiaId,
          tipoDocumento: tipoDocumento
        }
      );
      
      console.log('✅ Archivo subido exitosamente a Cloudflare R2');

      // Generar nombre descriptivo para la base de datos
      const timestamp = Date.now();
      const nombreArchivo = `${guardiaId}_${tipoDocumento.replace(/\s+/g, '_')}_${timestamp}.${extension}`;

      // Guardar en la tabla de documentos de postulación (solo metadatos, no el archivo)
      const insertQuery = `
        INSERT INTO documentos_postulacion (
          guardia_id, tipo_documento_id, nombre_archivo, url_archivo,
          contenido_archivo, tamaño, formato, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (guardia_id, tipo_documento_id) 
        DO UPDATE SET
          nombre_archivo = EXCLUDED.nombre_archivo,
          url_archivo = EXCLUDED.url_archivo,
          contenido_archivo = EXCLUDED.contenido_archivo,
          tamaño = EXCLUDED.tamaño,
          formato = EXCLUDED.formato,
          created_at = NOW()
        RETURNING id, nombre_archivo
      `;

      const insertParams = [
        guardiaId,
        tipoDoc.id,
        nombreArchivo,
        key, // URL de R2
        null, // Ya no guardamos el contenido del archivo
        archivo.size,
        extension
      ];

      const result = await client.query(insertQuery, insertParams);
      const documentoGuardado = result.rows[0];

      console.log('✅ Documento guardado exitosamente:', documentoGuardado);

      // Log de la operación
      await logCRUD({
        accion: 'CREATE',
        entidad: 'documentos_postulacion',
        entidad_id: documentoGuardado.id,
        usuario: 'postulacion_publica',
        detalles: `Documento subido a R2: ${tipoDocumento} para guardia ${guardia.nombre} ${guardia.apellido_paterno}`,
        tenant_id: guardia.tenant_id
      });

      return NextResponse.json({
        success: true,
        documento_id: documentoGuardado.id,
        nombre_archivo: documentoGuardado.nombre_archivo,
        url_r2: key,
        mensaje: 'Documento subido exitosamente a Cloudflare R2'
      }, { status: 201 });

    } finally {
      client.release?.();
    }

  } catch (error: any) {
    console.error('❌ Error en API de documento de postulación:', error);
    
    await logError({
      error: error.message,
      stack: error.stack,
      contexto: 'API postulación subir documento',
      datos_entrada: {
        guardia_id: guardiaId,
        tipo_documento: tipoDocumento
      }
    });

    return NextResponse.json({
      error: 'Error interno del servidor',
      detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
