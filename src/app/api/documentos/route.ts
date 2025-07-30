import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

// GET /api/documentos - Obtener documentos (específicos o globales)
export async function GET(request: NextRequest) {
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

    let sql = '';
    let params: any[] = [];

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
      LEFT JOIN tipos_documentos td ON d.tipo_documento_id = td.id
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
  try {
    const { searchParams } = new URL(request.url);
    const documentoId = searchParams.get('id');
    const modulo = searchParams.get('modulo');
    
    if (!documentoId || !modulo) {
      return NextResponse.json(
        { success: false, error: 'ID del documento y módulo requeridos' },
        { status: 400 }
      );
    }

    let sql = '';
    let params: any[] = [];

    // Query unificada para eliminar documentos
    sql = `DELETE FROM documentos WHERE id = $1 RETURNING *`;

    params = [documentoId];
    const result = await query(sql, params);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Documento no encontrado' },
        { status: 404 }
      );
    }
    
    console.log(`✅ Documento eliminado del módulo ${modulo}:`, result.rows[0]);
    
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Error en DELETE /api/documentos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar documento' },
      { status: 500 }
    );
  }
} 