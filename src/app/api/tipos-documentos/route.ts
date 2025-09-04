import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modulo = searchParams.get('modulo');
    
    // Obtener tenant_id del usuario actual (por ahora usar 'Gard')
    let tenantId: string;
    try {
      const tenantResult = await query(`
        SELECT id FROM tenants WHERE nombre = 'Gard' LIMIT 1
      `);
      
      if (tenantResult.rows.length === 0) {
        throw new Error('Tenant "Gard" no encontrado');
      }
      
      tenantId = tenantResult.rows[0].id;
    } catch (error) {
      console.error('❌ Error obteniendo tenant_id:', error);
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
    
    let sql = `
      SELECT DISTINCT ON (modulo, nombre)
        id,
        modulo,
        nombre,
        requiere_vencimiento,
        dias_antes_alarma,
        creado_en
      FROM documentos_tipos 
      WHERE tenant_id = $1
    `;
    
    const params: string[] = [tenantId];
    
    if (modulo) {
      sql += ` AND modulo = $2`;
      params.push(modulo);
    }
    
    sql += ` ORDER BY modulo, nombre, creado_en DESC`;
    
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

    // Obtener tenant_id del usuario actual (por ahora usar 'Gard')
    let tenantId: string;
    try {
      const tenantResult = await query(`
        SELECT id FROM tenants WHERE nombre = 'Gard' LIMIT 1
      `);
      
      if (tenantResult.rows.length === 0) {
        throw new Error('Tenant "Gard" no encontrado');
      }
      
      tenantId = tenantResult.rows[0].id;
    } catch (error) {
      console.error('❌ Error obteniendo tenant_id:', error);
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      );
    }

    // Verificar si ya existe un tipo con el mismo nombre en el módulo para este tenant
    const existeResult = await query(`
      SELECT id FROM documentos_tipos 
      WHERE modulo = $1 AND nombre = $2 AND tenant_id = $3
    `, [modulo, nombre, tenantId]);
    
    if (existeResult.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un tipo con ese nombre en este módulo' },
        { status: 400 }
      );
    }
    
    const result = await query(`
      INSERT INTO documentos_tipos (
        id,
        modulo,
        nombre,
        requiere_vencimiento,
        dias_antes_alarma,
        creado_en,
        tenant_id
      ) VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        NOW(),
        $5
      )
      RETURNING 
        id,
        modulo,
        nombre,
        requiere_vencimiento,
        dias_antes_alarma,
        creado_en
    `, [modulo, nombre, requiere_vencimiento, dias_antes_alarma, tenantId]);
    
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
        SELECT id FROM documentos_tipos 
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
      UPDATE documentos_tipos 
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
      DELETE FROM documentos_tipos 
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