import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

// GET /api/tipos-documentos?modulo=clientes - Obtener tipos de documentos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modulo = searchParams.get('modulo');
    
    let sql = `
      SELECT 
        id,
        modulo,
        nombre,
        requiere_vencimiento,
        dias_antes_alarma,
        creado_en
      FROM tipos_documentos 
    `;
    
    const params: string[] = [];
    
    if (modulo) {
      sql += ` WHERE modulo = $1`;
      params.push(modulo);
    }
    
    sql += ` ORDER BY modulo, nombre`;
    
    const result = await query(sql, params);
    
    const response = NextResponse.json({ 
      success: true, 
      data: result.rows 
    });
    
    // Eliminar caché para obtener datos frescos siempre
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('❌ Error en GET /api/tipos-documentos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener tipos de documentos' },
      { status: 500 }
    );
  }
}

// POST /api/tipos-documentos - Crear nuevo tipo de documento
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modulo, nombre, requiere_vencimiento = false, dias_antes_alarma = 30 } = body;
    
    if (!modulo || !nombre) {
      return NextResponse.json(
        { success: false, error: 'Módulo y nombre son obligatorios' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un tipo con el mismo nombre en el módulo
    const existeResult = await query(`
      SELECT id FROM tipos_documentos 
      WHERE modulo = $1 AND nombre = $2
    `, [modulo, nombre]);
    
    if (existeResult.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un tipo con ese nombre en este módulo' },
        { status: 400 }
      );
    }
    
    const result = await query(`
      INSERT INTO tipos_documentos (
        id,
        modulo,
        nombre,
        requiere_vencimiento,
        dias_antes_alarma,
        creado_en
      ) VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        NOW()
      )
      RETURNING 
        id,
        modulo,
        nombre,
        requiere_vencimiento,
        dias_antes_alarma,
        creado_en
    `, [modulo, nombre, requiere_vencimiento, dias_antes_alarma]);
    
    console.log('✅ Tipo de documento creado:', result.rows[0]);
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error en POST /api/tipos-documentos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear tipo de documento' },
      { status: 500 }
    );
  }
}

// PUT /api/tipos-documentos?id=uuid - Actualizar tipo de documento
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

    console.log('🔄 Actualizando tipo con ID:', id, 'Datos:', body);

    // Si se está actualizando nombre y módulo, verificar duplicados
    if (body.nombre && body.modulo) {
      const existeResult = await query(`
        SELECT id FROM tipos_documentos 
        WHERE modulo = $1 AND nombre = $2 AND id != $3
      `, [body.modulo, body.nombre, id]);
      
      if (existeResult.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Ya existe un tipo con ese nombre en este módulo' },
          { status: 400 }
        );
      }
    }

    // Construir query dinámicamente
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (body.modulo !== undefined) {
      updates.push(`modulo = $${paramIndex}`);
      params.push(body.modulo);
      paramIndex++;
    }

    if (body.nombre !== undefined) {
      updates.push(`nombre = $${paramIndex}`);
      params.push(body.nombre);
      paramIndex++;
    }

    if (body.requiere_vencimiento !== undefined) {
      updates.push(`requiere_vencimiento = $${paramIndex}`);
      params.push(body.requiere_vencimiento);
      paramIndex++;
    }

    if (body.dias_antes_alarma !== undefined) {
      updates.push(`dias_antes_alarma = $${paramIndex}`);
      params.push(body.dias_antes_alarma);
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
      UPDATE tipos_documentos 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        modulo,
        nombre,
        requiere_vencimiento,
        dias_antes_alarma,
        creado_en
    `;
    
    console.log('🔧 SQL:', sql);
    console.log('🔧 Parámetros:', params);
    
    const result = await query(sql, params);
    
    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Tipo de documento no encontrado' },
        { status: 404 }
      );
    }
    
    console.log('✅ Tipo actualizado exitosamente:', result.rows[0]);
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error en PUT /api/tipos-documentos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar tipo de documento' },
      { status: 500 }
    );
  }
}

// DELETE /api/tipos-documentos?id=uuid - Eliminar tipo de documento
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

    console.log('🗑️ Eliminando tipo con ID:', id);

    const result = await query(`
      DELETE FROM tipos_documentos 
      WHERE id = $1
      RETURNING id, nombre, modulo
    `, [id]);
    
    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Tipo de documento no encontrado' },
        { status: 404 }
      );
    }
    
    console.log('✅ Tipo eliminado exitosamente:', result.rows[0]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error en DELETE /api/tipos-documentos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar tipo de documento' },
      { status: 500 }
    );
  }
} 