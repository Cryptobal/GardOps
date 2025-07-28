import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

// GET /api/documentos?modulo=clientes&entidad_id=uuid - Obtener documentos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modulo = searchParams.get('modulo');
    const entidadId = searchParams.get('entidad_id');
    
    if (!modulo || !entidadId) {
      return NextResponse.json(
        { success: false, error: 'Módulo y entidad_id requeridos' },
        { status: 400 }
      );
    }

    const result = await query(`
      SELECT 
        d.id,
        d.modulo,
        d.tipo,
        d.url,
        d.creado_en,
        d.tipo_documento_id,
        td.nombre as tipo_documento_nombre
      FROM documentos d
      LEFT JOIN tipos_documentos td ON d.tipo_documento_id = td.id
      WHERE d.modulo = $1 
      AND (
        (d.modulo = 'guardias' AND d.guardia_id = $2) OR
        (d.modulo = 'instalaciones' AND d.instalacion_id = $2) OR
        (d.modulo != 'guardias' AND d.modulo != 'instalaciones')
      )
      ORDER BY d.creado_en DESC
    `, [modulo, entidadId]);
    
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
    const { modulo, entidad_id, nombre_original, tipo, url, tipo_documento_id } = body;
    
    if (!modulo || !entidad_id || !nombre_original || !url) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }

    let sql = `
      INSERT INTO documentos (
        id, modulo, tipo, url, creado_en, tipo_documento_id
    `;
    let params = [modulo, tipo, url, tipo_documento_id];
    let paramCount = 4;

    // Agregar campos específicos según el módulo
    if (modulo === 'guardias') {
      sql += `, guardia_id`;
      params.push(entidad_id);
      paramCount++;
    } else if (modulo === 'instalaciones') {
      sql += `, instalacion_id`;
      params.push(entidad_id);
      paramCount++;
    }

    sql += `) VALUES (gen_random_uuid(), $1, $2, $3, NOW(), $4`;
    
    if (modulo === 'guardias' || modulo === 'instalaciones') {
      sql += `, $${paramCount}`;
    }
    
    sql += `) RETURNING *`;

    const result = await query(sql, params);
    
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
    
    if (!documentoId) {
      return NextResponse.json(
        { success: false, error: 'ID de documento requerido' },
        { status: 400 }
      );
    }

    const result = await query(`
      DELETE FROM documentos WHERE id = $1
    `, [documentoId]);
    
    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error en DELETE /api/documentos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar documento' },
      { status: 500 }
    );
  }
} 