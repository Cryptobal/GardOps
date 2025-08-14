import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'bancos', action: 'read:list' });
if (deny) return deny;

  try {
    const result = await query(`
      SELECT 
        id,
        nombre,
        codigo
      FROM bancos
      ORDER BY nombre
    `);

    return NextResponse.json({
      success: true,
      bancos: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo bancos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 