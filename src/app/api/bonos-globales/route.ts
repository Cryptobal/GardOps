import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener todos los bonos globales
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activo = searchParams.get('activo');
    const imponible = searchParams.get('imponible');

    let sqlQuery = `
      SELECT 
        id,
        nombre,
        descripcion,
        imponible,
        activo,
        created_at,
        updated_at
      FROM sueldo_bonos_globales
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    if (activo !== null) {
      sqlQuery += ` AND activo = $${paramIndex}`;
      params.push(activo === 'false' ? false : true);
      paramIndex++;
    }

    if (imponible !== null) {
      sqlQuery += ` AND imponible = $${paramIndex}`;
      params.push(imponible === 'false' ? false : true);
      paramIndex++;
    }

    sqlQuery += ' ORDER BY nombre';

    const result = await query(sqlQuery, params);
    const rows = Array.isArray(result) ? result : (result.rows || []);
    
    return NextResponse.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error obteniendo bonos globales:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener bonos globales' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo bono global
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, descripcion, imponible = true } = body;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: 'El nombre del bono es requerido' },
        { status: 400 }
      );
    }

    // Verificar que no exista un bono con el mismo nombre
    const checkDuplicate = await query(
      'SELECT 1 FROM sueldo_bonos_globales WHERE nombre = $1',
      [nombre]
    );

    if (checkDuplicate.rows && checkDuplicate.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un bono con ese nombre' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO sueldo_bonos_globales (nombre, descripcion, imponible)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nombre, descripcion, imponible]
    );

    const newBono = Array.isArray(result) ? result[0] : result.rows[0];

    return NextResponse.json({
      success: true,
      data: newBono,
      message: 'Bono global creado exitosamente'
    });
  } catch (error) {
    console.error('Error creando bono global:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear bono global' },
      { status: 500 }
    );
  }
}
