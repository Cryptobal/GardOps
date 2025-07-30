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

    // Construir query según el módulo
    switch (modulo) {
      case 'clientes':
        sql = `
          SELECT 
            d.id,
            d.nombre as nombre,
            d.tamaño,
            d.created_at,
            d.fecha_vencimiento,
            td.nombre as tipo_documento_nombre
          FROM documentos_clientes d
          LEFT JOIN tipos_documentos td ON d.tipo_documento_id = td.id
          WHERE d.cliente_id = $1
          ORDER BY d.created_at DESC
        `;
        params = [entidadId];
        break;
        
      case 'instalaciones':
        sql = `
          SELECT 
            d.id,
            d.tipo as nombre,
            0 as tamaño,
            d.fecha_subida as created_at,
            d.fecha_vencimiento,
            td.nombre as tipo_documento_nombre
          FROM documentos_instalacion d
          LEFT JOIN tipos_documentos td ON d.tipo_documento_id = td.id
          WHERE d.instalacion_id = $1
          ORDER BY d.fecha_subida DESC
        `;
        params = [entidadId];
        break;
        
      case 'guardias':
        sql = `
          SELECT 
            d.id,
            d.tipo as nombre,
            0 as tamaño,
            d.fecha_subida as created_at,
            d.fecha_vencimiento,
            td.nombre as tipo_documento_nombre
          FROM documentos_guardias d
          LEFT JOIN tipos_documentos td ON d.tipo_documento_id = td.id
          WHERE d.guardia_id = $1
          ORDER BY d.fecha_subida DESC
        `;
        params = [entidadId];
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: 'Módulo no válido' },
          { status: 400 }
        );
    }

    const result = await query(sql, params);
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Error en GET /api/documentos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener documentos' },
      { status: 500 }
    );
  }
}

// POST /api/documentos - Crear nuevo documento
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modulo, entidad_id, nombre_original, tipo, url, tipo_documento_id, fecha_vencimiento } = body;
    
    if (!modulo || !entidad_id || !nombre_original || !url) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }

    let sql = '';
    let params: any[] = [];

    // Construir query según el módulo
    switch (modulo) {
      case 'clientes':
        sql = `
          INSERT INTO documentos_clientes (
            id, cliente_id, nombre_original, tipo, url, creado_en, 
            tipo_documento_id, fecha_vencimiento, tamaño
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, NOW(), $5, $6, $7
          ) RETURNING *
        `;
        params = [entidad_id, nombre_original, tipo, url, tipo_documento_id, fecha_vencimiento || null, 0];
        break;
        
      case 'instalaciones':
        sql = `
          INSERT INTO documentos_instalaciones (
            id, instalacion_id, nombre_original, tipo, url, creado_en, 
            tipo_documento_id, fecha_vencimiento, tamaño
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, NOW(), $5, $6, $7
          ) RETURNING *
        `;
        params = [entidad_id, nombre_original, tipo, url, tipo_documento_id, fecha_vencimiento || null, 0];
        break;
        
      case 'guardias':
        sql = `
          INSERT INTO documentos_guardias (
            id, guardia_id, nombre_original, tipo, url, creado_en, 
            tipo_documento_id, fecha_vencimiento, tamaño
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, NOW(), $5, $6, $7
          ) RETURNING *
        `;
        params = [entidad_id, nombre_original, tipo, url, tipo_documento_id, fecha_vencimiento || null, 0];
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: 'Módulo no válido' },
          { status: 400 }
        );
    }

    const result = await query(sql, params);
    
    console.log(`✅ Documento creado para módulo ${modulo}:`, result.rows[0]);
    
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Error en POST /api/documentos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear documento' },
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

    // Construir query según el módulo
    switch (modulo) {
      case 'clientes':
        sql = `DELETE FROM documentos_clientes WHERE id = $1 RETURNING *`;
        break;
      case 'instalaciones':
        sql = `DELETE FROM documentos_instalacion WHERE id = $1 RETURNING *`;
        break;
      case 'guardias':
        sql = `DELETE FROM documentos_guardias WHERE id = $1 RETURNING *`;
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Módulo no válido' },
          { status: 400 }
        );
    }

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