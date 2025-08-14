import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'test_param', action: 'read:list' });
if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const rolId = searchParams.get('rolId');
    
    if (!rolId) {
      return NextResponse.json({ error: 'No se proporcionó rolId' });
    }
    
    const result = await sql.query(`
      SELECT * FROM sueldo_estructuras_roles WHERE rol_servicio_id = $1
    `, [rolId]);
    
    return NextResponse.json({
      success: true,
      rolId,
      found: result.rows.length > 0,
      data: result.rows
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
