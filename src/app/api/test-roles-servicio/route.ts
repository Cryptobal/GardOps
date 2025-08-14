import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'test_roles_servicio', action: 'read:list' });
if (deny) return deny;

  try {
    // Probar directamente la tabla
    const result = await sql.query(`
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
      ORDER BY nombre
    `);
    
    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Error consultando roles:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
