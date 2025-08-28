import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Listar todos los tipos de puesto
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const incluirInactivos = searchParams.get('incluir_inactivos') === 'true';
    
    const whereClause = incluirInactivos ? '' : 'WHERE activo = true';
    
    const result = await query(`
      SELECT 
        tp.*,
        contar_puestos_por_tipo(tp.id) as cantidad_puestos_usando
      FROM cat_tipos_puesto tp
      ${whereClause}
      ORDER BY tp.orden ASC, tp.nombre ASC
    `);

    return NextResponse.json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        cantidad_puestos_usando: parseInt(row.cantidad_puestos_usando) || 0,
        puede_eliminar: parseInt(row.cantidad_puestos_usando) === 0
      }))
    });
  } catch (error) {
    console.error('Error obteniendo tipos de puesto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo tipo de puesto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, descripcion, emoji, color, orden } = body;

    if (!nombre || nombre.trim().length === 0) {
      return NextResponse.json(
        { error: 'El nombre del tipo de puesto es requerido' },
        { status: 400 }
      );
    }

    // Verificar que no exista un tipo con el mismo nombre
    const checkResult = await query(
      'SELECT id FROM cat_tipos_puesto WHERE LOWER(nombre) = LOWER($1) AND activo = true',
      [nombre.trim()]
    );

    if (checkResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un tipo de puesto con ese nombre' },
        { status: 409 }
      );
    }

    // Insertar el nuevo tipo
    const insertResult = await query(`
      INSERT INTO cat_tipos_puesto (nombre, descripcion, emoji, color, orden)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      nombre.trim(),
      descripcion?.trim() || null,
      emoji || '📍',
      color || 'gray',
      orden || 99
    ]);

    console.log(`✅ Tipo de puesto creado: ${nombre}`);

    return NextResponse.json({
      success: true,
      message: 'Tipo de puesto creado exitosamente',
      data: insertResult.rows[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error creando tipo de puesto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
