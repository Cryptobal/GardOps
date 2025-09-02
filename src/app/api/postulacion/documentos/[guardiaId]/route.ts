import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { guardiaId: string } }
) {
  try {
    const guardiaId = params.guardiaId;
    
    const client = await getClient();
    
    try {
      // Obtener documentos de postulación del guardia
      const documentosResult = await client.query(`
        SELECT 
          dp.id,
          dp.nombre_archivo,
          dp.url_archivo,
          dp.formato,
          dp.tamaño,
          dp.created_at,
          tdp.nombre as tipo_documento
        FROM documentos_postulacion dp
        JOIN tipos_documentos_postulacion tdp ON dp.tipo_documento_id = tdp.id
        WHERE dp.guardia_id = $1
        ORDER BY dp.created_at DESC
      `, [guardiaId]);

      const documentos = documentosResult.rows.map(doc => ({
        id: doc.id,
        nombre_archivo: doc.nombre_archivo,
        url_archivo: doc.url_archivo,
        formato: doc.formato,
        tamaño: doc.tamaño,
        created_at: doc.created_at,
        tipo_documento: doc.tipo_documento
      }));

      return NextResponse.json({
        success: true,
        documentos: documentos
      });

    } finally {
      client.release?.();
    }

  } catch (error: any) {
    console.error('❌ Error obteniendo documentos de postulación:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
