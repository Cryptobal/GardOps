import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('id');
  const modulo = searchParams.get('modulo');
  
  if (!documentId || !modulo) {
    return NextResponse.json({ 
      success: false, 
      error: 'ID del documento y módulo requeridos' 
    }, { status: 400 });
  }

  try {
    devLogger.search(' Descargando documento:', { documentId, modulo });
    
    // Obtener información del documento
    const sql = `
      SELECT 
        d.id,
        d.nombre_original,
        d.url,
        d.tamaño,
        d.creado_en
      FROM documentos d
      WHERE d.id = $1
    `;
    
    const result = await query(sql, [documentId]);
    
    if (result.rows.length === 0) {
      logger.debug('❌ Documento no encontrado:', documentId);
      return NextResponse.json({ 
        success: false, 
        error: 'Documento no encontrado' 
      }, { status: 404 });
    }
    
    const documento = result.rows[0];
    logger.debug('📄 Documento encontrado:', {
      id: documento.id,
      nombre: documento.nombre_original,
      url: documento.url,
      tamaño: documento.tamaño
    });
    
    // Construir URL completa de Cloudflare R2
    let r2Url = documento.url;
    
    // Si la URL es de docs.gard.cl (URL personalizada), construir la URL real de R2
    if (r2Url.includes('docs.gard.cl')) {
      // Extraer la ruta del archivo de la URL personalizada
      const urlParts = r2Url.split('docs.gard.cl/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1]; // ej: "clientes/06bf2385-d03c-46aa-b86d-cda6d2dac8ff.png"
        
        // Construir la URL real de R2
        const r2PublicUrl = process.env.R2_PUBLIC_URL || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
        const bucketName = process.env.R2_BUCKET_NAME;
        
        if (!bucketName) {
          console.error('❌ R2_BUCKET_NAME no configurado');
          return NextResponse.json({ 
            success: false, 
            error: 'Configuración de R2 incompleta' 
          }, { status: 500 });
        }
        
        r2Url = `${r2PublicUrl}/${bucketName}/${filePath}`;
        logger.debug('🔗 URL R2 real construida:', r2Url);
      }
    }
    // Si la URL no es completa, construir la URL completa de R2
    else if (!r2Url.startsWith('http')) {
      const r2PublicUrl = process.env.R2_PUBLIC_URL || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      const bucketName = process.env.R2_BUCKET_NAME;
      
      if (!bucketName) {
        console.error('❌ R2_BUCKET_NAME no configurado');
        return NextResponse.json({ 
          success: false, 
          error: 'Configuración de R2 incompleta' 
        }, { status: 500 });
      }
      
      r2Url = `${r2PublicUrl}/${bucketName}/${r2Url}`;
      logger.debug('🔗 URL R2 construida:', r2Url);
    }
    
    // Descargar y servir el archivo desde R2
    if (r2Url && r2Url.startsWith('http')) {
      try {
        logger.debug('☁️ Descargando desde R2:', r2Url);
        
        // Descargar el archivo desde R2
        const response = await fetch(r2Url);
        
        if (!response.ok) {
          console.error('❌ Error descargando desde R2:', response.status, response.statusText);
          throw new Error(`Error descargando desde R2: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        devLogger.success(' Archivo descargado de R2, tamaño:', buffer.length);
        
        // Determinar el tipo MIME basado en la extensión
        const extension = documento.nombre_original.split('.').pop()?.toLowerCase();
        let contentType = 'application/octet-stream';
        
        if (extension === 'pdf') contentType = 'application/pdf';
        else if (extension === 'doc') contentType = 'application/msword';
        else if (extension === 'docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (extension === 'xls') contentType = 'application/vnd.ms-excel';
        else if (extension === 'xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        else if (extension === 'jpg' || extension === 'jpeg') contentType = 'image/jpeg';
        else if (extension === 'png') contentType = 'image/png';
        
        // Servir el archivo
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${documento.nombre_original}"`,
            'Content-Length': buffer.length.toString(),
            'Cache-Control': 'no-cache',
          },
        });
        
      } catch (error) {
        console.error('❌ Error descargando desde R2:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Error al descargar archivo desde R2',
          details: error.message
        }, { status: 500 });
      }
    }
    
    // Si no hay URL, devolver error
    console.error('❌ URL del documento no disponible:', documento.url);
    return NextResponse.json({ 
      success: false, 
      error: 'URL del documento no disponible' 
    }, { status: 404 });
    
  } catch (error) {
    console.error('❌ Error en GET /api/download-document:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al obtener documento',
      details: error.message
    }, { status: 500 });
  }
} 