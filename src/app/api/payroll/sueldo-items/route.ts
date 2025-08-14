import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener catálogo de ítems de sueldo
export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'read:list' });
if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const clase = searchParams.get('clase');
    const naturaleza = searchParams.get('naturaleza');
    const activo = searchParams.get('activo');
    const q = searchParams.get('q');

    let sql = `
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

    // Filtro por clase
    if (clase) {
      sql += ` AND clase = $${paramIndex}`;
      params.push(clase);
      paramIndex++;
    }

    // Filtro por naturaleza
    if (naturaleza) {
      sql += ` AND naturaleza = $${paramIndex}`;
      params.push(naturaleza);
      paramIndex++;
    }

    // Filtro por activo
    if (activo !== null) {
      sql += ` AND activo = $${paramIndex}`;
      params.push(activo === 'true');
      paramIndex++;
    }

    // Búsqueda por texto
    if (q) {
      sql += ` AND (
        nombre ILIKE $${paramIndex} OR 
        descripcion ILIKE $${paramIndex} OR
        codigo ILIKE $${paramIndex}
      )`;
      params.push(`%${q}%`);
      paramIndex++;
    }

    sql += ` ORDER BY nombre`;

    const result = await query(sql, params);

    return NextResponse.json({ data: result.rows });

  } catch (error) {
    console.error('Error al obtener catálogo de ítems:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
