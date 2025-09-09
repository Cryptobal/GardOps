import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/database';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// Configurar cliente S3 para Cloudflare R2
const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    
    const client = await getClient();
    
    try {
      // Buscar documento por nombre de archivo
      const docResult = await client.query(`
        SELECT 
          dp.url_archivo,
          dp.formato,
          dp.tamaño,
          dp.nombre_archivo
        FROM documentos_postulacion dp
        WHERE dp.nombre_archivo = $1
      `, [filename]);

      if (docResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Documento no encontrado' },
          { status: 404 }
        );
      }

      const documento = docResult.rows[0];
      
      // Obtener archivo desde Cloudflare R2
      const getObjectCommand = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: documento.url_archivo,
      });

      const r2Response = await s3.send(getObjectCommand);
      
      if (!r2Response.Body) {
        return NextResponse.json(
          { error: 'Archivo no encontrado en R2' },
          { status: 404 }
        );
      }

      // Convertir stream a buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of r2Response.Body as any) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      
      // Determinar Content-Type
      let contentType = 'application/octet-stream';
      if (documento.formato === 'pdf') {
        contentType = 'application/pdf';
      } else if (['jpg', 'jpeg'].includes(documento.formato)) {
        contentType = 'image/jpeg';
      } else if (documento.formato === 'png') {
        contentType = 'image/png';
      }

      // Crear respuesta con el archivo
      const response = new NextResponse(buffer);
      response.headers.set('Content-Type', contentType);
      response.headers.set('Content-Disposition', `attachment; filename="${documento.nombre_archivo}"`);
      response.headers.set('Content-Length', documento.tamaño.toString());
      
      return response;

    } finally {
      client.release?.();
    }

  } catch (error: any) {
    console.error('❌ Error descargando documento de postulación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
