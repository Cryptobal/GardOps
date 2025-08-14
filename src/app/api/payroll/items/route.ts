import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// Función para generar código único desde nombre
function generateCodigo(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9\s]/g, '') // Solo letras, números y espacios
    .replace(/\s+/g, '_') // Espacios a guiones bajos
    .replace(/_+/g, '_') // Múltiples guiones bajos a uno solo
    .replace(/^_|_$/g, ''); // Remover guiones bajos al inicio y final
}

// GET - Obtener todos los ítems globales
export async function GET(request: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'payroll', action: 'create' });
  if (deny) return deny;

try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const clase = searchParams.get('clase');
    const naturaleza = searchParams.get('naturaleza');
    const activo = searchParams.get('activo');

    let sqlQuery = `
      SELECT 
        id,
        codigo,
        nombre,
        clase,
        naturaleza,
        descripcion,
        formula_json,
        tope_modo,
        tope_valor,
        activo,
        created_at,
        updated_at
      FROM sueldo_item
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      sqlQuery += ` AND (nombre ILIKE $${paramIndex} OR codigo ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (clase && clase !== 'all') {
      sqlQuery += ` AND clase = $${paramIndex}`;
      params.push(clase);
      paramIndex++;
    }

    if (naturaleza && naturaleza !== 'all') {
      sqlQuery += ` AND naturaleza = $${paramIndex}`;
      params.push(naturaleza);
      paramIndex++;
    }

    if (activo !== null && activo !== 'all') {
      sqlQuery += ` AND activo = $${paramIndex}`;
      params.push(activo === 'true');
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
    console.error('Error obteniendo ítems globales:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener ítems globales' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo ítem global
export async function POST(request: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'payroll', action: 'create' });
  if (deny) return deny;

try {
    const body = await request.json();
    const { 
      nombre, 
      clase, 
      naturaleza, 
      descripcion, 
      formula_json, 
      tope_modo = 'NONE', 
      tope_valor, 
      activo = true 
    } = body;

    if (!nombre || !clase || !naturaleza) {
      return NextResponse.json(
        { success: false, error: 'Nombre, clase y naturaleza son requeridos' },
        { status: 400 }
      );
    }

    // Generar código único
    let codigo = generateCodigo(nombre);
    let counter = 1;
    let originalCodigo = codigo;

    // Verificar que el código sea único
    while (true) {
      const checkDuplicate = await query(
        'SELECT 1 FROM sueldo_item WHERE codigo = $1',
        [codigo]
      );

      if (checkDuplicate.rows && checkDuplicate.rows.length > 0) {
        codigo = `${originalCodigo}_${counter}`;
        counter++;
      } else {
        break;
      }
    }

    const result = await query(
      `INSERT INTO sueldo_item (
        codigo, nombre, clase, naturaleza, descripcion, 
        formula_json, tope_modo, tope_valor, activo
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [codigo, nombre, clase, naturaleza, descripcion, formula_json, tope_modo, tope_valor, activo]
    );

    const newItem = Array.isArray(result) ? result[0] : result.rows[0];

    return NextResponse.json({
      success: true,
      data: newItem,
      message: 'Ítem global creado exitosamente'
    });
  } catch (error) {
    console.error('Error creando ítem global:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear ítem global' },
      { status: 500 }
    );
  }
}
