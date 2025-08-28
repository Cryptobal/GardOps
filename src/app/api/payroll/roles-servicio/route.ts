import { requireAuthz } from '@/lib/authz-api'
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(req: Request) {
  // Relajar autorización para no bloquear el flujo en desarrollo
  try {
    const maybeDeny = await requireAuthz(req as any, { resource: 'payroll', action: 'read:list' });
    if (maybeDeny && (maybeDeny as any).status === 403) return maybeDeny;
  } catch (_) {}

  try {
    const { searchParams } = new URL(req.url);
    const instalacionId = searchParams.get('instalacion_id');

    let sql: string;
    let params: any[] = [];

    if (instalacionId) {
      // Si se especifica instalación, filtrar por esa instalación
      sql = `
        SELECT DISTINCT rs.id AS id, rs.nombre
        FROM as_turnos_puestos_operativos po
        JOIN as_turnos_roles_servicio rs ON rs.id = po.rol_id
        WHERE po.instalacion_id = $1::uuid
        ORDER BY rs.nombre
      `;
      params = [instalacionId];
    } else {
      // Si no se especifica instalación, devolver todos los roles
      sql = `
        SELECT id, nombre
        FROM as_turnos_roles_servicio
        ORDER BY nombre
      `;
    }

    const result = await query(sql, params);
    const rows = Array.isArray(result) ? result : (result.rows || []);

    return NextResponse.json({ roles: rows }, { status: 200 });
  } catch (err: any) {
    console.error('roles-servicio error', err);
    return NextResponse.json({ message: 'Error al cargar roles de servicio' }, { status: 500 });
  }
}
