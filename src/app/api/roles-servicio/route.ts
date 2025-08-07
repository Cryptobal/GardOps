import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activo = searchParams.get('activo');
    const tenantId = searchParams.get('tenantId');

    let query = `
      SELECT 
        id,
        nombre,
        descripcion,
        CASE WHEN activo THEN 'Activo' ELSE 'Inactivo' END as estado,
        activo,
        tenant_id,
        creado_en as created_at,
        creado_en as updated_at,
        NULL as fecha_inactivacion
      FROM roles_servicio 
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    if (tenantId) {
      query += ` AND (tenant_id::text = $${paramIndex} OR (tenant_id IS NULL AND $${paramIndex} = '1'))`;
      params.push(tenantId);
      paramIndex++;
    }

    if (activo !== null) {
      query += ` AND activo = $${paramIndex}`;
      params.push(activo === 'false' ? false : true);
      paramIndex++;
    }

    query += ' ORDER BY nombre';

    const result = await sql.query(query, params);
    
    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error al obtener roles de servicio:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, descripcion, activo = true, tenantId = '1' } = body;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el nombre no esté duplicado
    const checkDuplicate = await sql.query(`
      SELECT 1 FROM roles_servicio 
      WHERE nombre = $1 AND (tenant_id::text = $2 OR (tenant_id IS NULL AND $2 = '1'))
    `, [nombre, tenantId]);

    if (checkDuplicate.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un rol de servicio con ese nombre' },
        { status: 400 }
      );
    }

    // Insertar nuevo rol
    const insertQuery = `
      INSERT INTO roles_servicio (nombre, descripcion, activo, tenant_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await sql.query(insertQuery, [
      nombre, 
      descripcion, 
      activo, 
      tenantId === '1' ? null : tenantId
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Rol de servicio creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear rol de servicio:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 