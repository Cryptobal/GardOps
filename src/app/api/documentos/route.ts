import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from '@/lib/r2';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

// GET /api/documentos - Obtener documentos (específicos o globales)
export async function GET(request: NextRequest) {
  let sql = '';
  let params: any[] = [];
  
  try {
    const { searchParams } = new URL(request.url);
    const modulo = searchParams.get('modulo');
    const entidadId = searchParams.get('entidad_id');
    const global = searchParams.get('global') === 'true';
    const tipoDocumento = searchParams.get('tipo_documento');
    const estado = searchParams.get('estado');
    const fechaDesde = searchParams.get('fecha_desde');
    const fechaHasta = searchParams.get('fecha_hasta');
    const entidadFilter = searchParams.get('entidad_filter');
    
    // Para consultas globales no requerimos modulo y entidad_id
    if (!global && (!modulo || !entidadId)) {
      return NextResponse.json(
        { success: false, error: 'Módulo y entidad_id requeridos para consultas específicas' },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { success: false, error: 'Módulo no válido' },
        { status: 400 }
      );
    }

    // Query unificada para todos los módulos usando parámetros seguros
    const validFields = ['instalacion_id', 'guardia_id'];
    if (!validFields.includes(entidadField)) {
      return NextResponse.json(
        { success: false, error: 'Campo de entidad no válido' },
        { status: 400 }
      );
    }
    
    sql = `
      SELECT 
        d.id,
        d.url as nombre,
        COALESCE(LENGTH(d.contenido_archivo), 0) as tamaño,
        d.creado_en as created_at,
        d.fecha_vencimiento,
        td.nombre as tipo_documento_nombre
      FROM documentos d
      LEFT JOIN documentos_tipos td ON d.tipo_documento_id = td.id
      WHERE d.${entidadField} = $1
      ORDER BY d.creado_en DESC
    `;
    params = [entidadId];
    
    console.log('🔍 Query SQL:', sql);
    console.log('📋 Parámetros:', params);

    console.log('🔍 Ejecutando query...');
    const result = await query(sql, params);
    console.log('✅ Query ejecutada exitosamente, filas:', result.rows.length);
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Error en GET /api/documentos:', error);
    console.error('❌ Detalles del error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      sql: sql,
      params: params
    });
    return NextResponse.json(
      { success: false, error: 'Error al obtener documentos' },
      { status: 500 }
    );
  }
}



// DELETE /api/documentos?id=uuid - Eliminar documento
export async function DELETE(request: NextRequest) {
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
    // Verificar que el documento existe
    const checkSql = `
      SELECT 
        d.id,
        d.nombre_original,
        d.url,
        d.cliente_id,
        d.instalacion_id,
        d.guardia_id
      FROM documentos d
      WHERE d.id = $1
    `;
    
    const checkResult = await query(checkSql, [documentId]);
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Documento no encontrado' 
      }, { status: 404 });
    }
    
    const documento = checkResult.rows[0];
    
    // Verificar que el documento pertenece al módulo correcto
    let belongsToModule = false;
    if (modulo === 'clientes' && documento.cliente_id) {
      belongsToModule = true;
    } else if (modulo === 'instalaciones' && documento.instalacion_id) {
      belongsToModule = true;
    } else if (modulo === 'guardias' && documento.guardia_id) {
      belongsToModule = true;
    }
    
    if (!belongsToModule) {
      return NextResponse.json({ 
        success: false, 
        error: 'Documento no pertenece al módulo especificado' 
      }, { status: 403 });
    }
    
    // Eliminar archivo de R2 si existe y tenemos configuración
    if (s3 && documento.url && documento.url.includes('docs.gard.cl')) {
      try {
        console.log('🗑️ Eliminando archivo de R2:', documento.url);
        
        // Extraer la key del archivo de la URL
        const urlParts = documento.url.split('docs.gard.cl/');
        if (urlParts.length > 1) {
          const key = urlParts[1];
          console.log('🔑 Key del archivo en R2:', key);
          
          const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME || 'gardops-docs',
            Key: key,
          });
          
          await s3.send(deleteCommand);
          console.log('✅ Archivo eliminado de R2:', key);
        }
      } catch (r2Error) {
        console.error('❌ Error eliminando de R2:', r2Error);
        // Continuar con la eliminación de la BD aunque falle R2
      }
    }
    
    // Eliminar el documento de la base de datos
    const deleteSql = `DELETE FROM documentos WHERE id = $1`;
    await query(deleteSql, [documentId]);
    
    console.log('✅ Documento eliminado de la BD:', documentId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Documento eliminado correctamente',
      documento: {
        id: documento.id,
        nombre: documento.nombre_original
      }
    });
    
  } catch (error) {
    console.error('❌ Error en DELETE /api/documentos:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error al eliminar documento' 
    }, { status: 500 });
  }
} 