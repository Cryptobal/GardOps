import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // End-point legacy: limitar por tenant del usuario si hay cabecera x-user-email
    const email = request.headers.get('x-user-email');
    let rolesResult;
    if (email) {
      const tenantRes = await query(
        `SELECT tenant_id FROM usuarios WHERE lower(email)=lower($1) LIMIT 1`,
        [email]
      );
      const tenantId = tenantRes.rows?.[0]?.tenant_id || null;
      rolesResult = await query(
        `SELECT id, nombre AS nombre, descripcion AS descripcion
         FROM roles
         WHERE tenant_id = $1
         ORDER BY nombre`,
        [tenantId]
      );
    } else {
      rolesResult = await query(
        `SELECT id, nombre AS nombre, descripcion AS descripcion FROM roles WHERE false` // bloquear acceso anónimo
      );
    }
    const roles = Array.isArray(rolesResult) ? rolesResult : (rolesResult.rows || []);

    return NextResponse.json({
      success: true,
      data: roles
    });

  } catch (error) {
    console.error('Error obteniendo roles:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
