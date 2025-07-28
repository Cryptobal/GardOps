import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

// GET /api/documentos-clientes?cliente_id=uuid - Obtener documentos de un cliente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cliente_id = searchParams.get('cliente_id');
    
    if (!cliente_id) {
      return NextResponse.json(
        { success: false, error: 'cliente_id es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la tabla existe antes de consultar
    const checkResult = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'documentos_clientes'
      );
    `);

    if (!checkResult.rows[0].exists) {
      console.log('📋 Tabla documentos_clientes no existe, retornando array vacío');
      return NextResponse.json({ 
        success: true, 
        data: [] 
      });
    }

    console.log('✅ Tabla documentos_clientes verificada');

    // Asegurar que la tabla tenga la columna fecha_vencimiento
    try {
      await query(`ALTER TABLE documentos_clientes ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE`);
      console.log('✅ Columna fecha_vencimiento verificada');
    } catch (error) {
      console.warn('⚠️ Error verificando columna fecha_vencimiento:', error);
    }

    // Primero, verificar qué columnas existen en la tabla
    const schemaResult = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'documentos_clientes' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Columnas en documentos_clientes:', schemaResult.rows.map((r: any) => r.column_name));

    // Usar columnas que sabemos que existen
    const result = await query(`
      SELECT 
        dc.id,
        dc.cliente_id,
        dc.nombre,
        dc.tipo,
        dc.archivo_url,
        dc.tamaño,
        dc.tipo_documento_id,
        dc.fecha_vencimiento,
        td.nombre as tipo_documento_nombre,
        td.requiere_vencimiento,
        td.dias_antes_alarma,
        CASE 
          WHEN dc.fecha_vencimiento IS NOT NULL THEN
            CASE 
              WHEN dc.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
              WHEN dc.fecha_vencimiento <= CURRENT_DATE + INTERVAL '1 day' * COALESCE(td.dias_antes_alarma, 30) THEN 'proximo_vencer'
              ELSE 'vigente'
            END
          ELSE 'sin_vencimiento'
        END as estado_vencimiento,
        CASE 
          WHEN dc.fecha_vencimiento IS NOT NULL THEN
            dc.fecha_vencimiento - CURRENT_DATE
          ELSE NULL
        END as dias_restantes
      FROM documentos_clientes dc
      LEFT JOIN tipos_documentos td ON dc.tipo_documento_id = td.id
      WHERE dc.cliente_id = $1 
      ORDER BY dc.id DESC
    `, [cliente_id]);
    
    console.log(`📄 Encontrados ${result.rows.length} documentos para cliente ${cliente_id}`);
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows 
    });
  } catch (error) {
    console.error('❌ Error en GET /api/documentos-clientes:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener documentos del cliente' },
      { status: 500 }
    );
  }
}

// PUT /api/documentos-clientes?id=uuid - Actualizar documento de cliente
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID requerido' },
        { status: 400 }
      );
    }

    console.log('🔄 Actualizando documento:', id, 'Datos:', body);

    // Construir query dinámicamente
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (body.fecha_vencimiento !== undefined) {
      updates.push(`fecha_vencimiento = $${paramIndex}`);
      params.push(body.fecha_vencimiento || null);
      paramIndex++;
    }

    if (body.nombre !== undefined) {
      updates.push(`nombre = $${paramIndex}`);
      params.push(body.nombre);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay campos para actualizar' },
        { status: 400 }
      );
    }

    params.push(id);
    
    const sql = `
      UPDATE documentos_clientes 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, nombre, fecha_vencimiento
    `;
    
    console.log('🔧 SQL:', sql);
    console.log('🔧 Parámetros:', params);
    
    const result = await query(sql, params);
    
    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Documento no encontrado' },
        { status: 404 }
      );
    }
    
    console.log('✅ Documento actualizado exitosamente:', result.rows[0]);
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error en PUT /api/documentos-clientes:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar documento' },
      { status: 500 }
    );
  }
}

// DELETE /api/documentos-clientes?id=uuid - Eliminar documento de cliente
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID requerido' },
        { status: 400 }
      );
    }

    console.log('🗑️ Eliminando documento:', id);

    const result = await query(`
      DELETE FROM documentos_clientes 
      WHERE id = $1
      RETURNING id, nombre
    `, [id]);
    
    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Documento no encontrado' },
        { status: 404 }
      );
    }
    
    console.log('✅ Documento eliminado exitosamente:', result.rows[0]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error en DELETE /api/documentos-clientes:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar documento' },
      { status: 500 }
    );
  }
} 