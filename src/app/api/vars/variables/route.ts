import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

// GET /api/vars/variables - Obtener variables disponibles
export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'vars', action: 'read:list' });
if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    
    let sqlQuery = `
      SELECT DISTINCT unnest(variables) as var_key
      FROM doc_templates
      WHERE variables IS NOT NULL AND array_length(variables, 1) > 0
    `;
    
    const params: any[] = [];
    
    if (search) {
      sqlQuery += ` AND unnest(variables) ILIKE $1`;
      params.push(`%${search}%`);
    }
    
    sqlQuery += ` ORDER BY var_key`;
    
    const result = await query(sqlQuery, params);
    
    // Transformar a formato esperado por TinyMCE mentions
    const variables = result.rows.map(row => ({
      var_key: row.var_key
    }));
    
    return NextResponse.json({ 
      success: true, 
      data: variables 
    });
  } catch (error) {
    console.error('❌ Error en GET /api/vars/variables:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener variables' },
      { status: 500 }
    );
  }
}
