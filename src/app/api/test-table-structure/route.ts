import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'test_table_structure', action: 'read:list' });
if (deny) return deny;

  try {
    // Verificar estructura de roles_servicio
    const structure = await sql.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'roles_servicio'
      ORDER BY ordinal_position;
    `);
    
    // Obtener algunos datos de ejemplo
    const sampleData = await sql.query(`
      SELECT * FROM roles_servicio LIMIT 5;
    `);
    
    return NextResponse.json({
      success: true,
      structure: structure.rows,
      sampleData: sampleData.rows,
      rowCount: sampleData.rows.length
    });
    
  } catch (error) {
    console.error('Error verificando estructura:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
