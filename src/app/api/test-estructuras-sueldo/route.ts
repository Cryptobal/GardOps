import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'test_estructuras_sueldo', action: 'read:list' });
if (deny) return deny;

  try {
    // Prueba simple de conexión
    const result = await sql.query('SELECT 1 as test');
    
    return NextResponse.json({
      success: true,
      message: 'Conexión exitosa',
      test: result.rows[0].test
    });
  } catch (error) {
    console.error('Error en test:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
