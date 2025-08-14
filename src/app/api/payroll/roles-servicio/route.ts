import { requireAuthz } from '@/lib/authz-api'
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(req: Request) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'read:list' });
if (deny) return deny;

  try {
    const { searchParams } = new URL(req.url);
    const instalacionId = searchParams.get('instalacion_id');

    if (!instalacionId) {
      return NextResponse.json({ message: 'instalacion_id es requerido' }, { status: 400 });
    }

    const sql = `
      SELECT DISTINCT po.rol_id AS id, rs.nombre
      FROM as_turnos_puestos_operativos po
      JOIN as_turnos_roles_servicio rs ON rs.id = po.rol_id
      WHERE po.instalacion_id = $1
      ORDER BY rs.nombre
    `;

    const result = await query(sql, [instalacionId]);
    const rows = Array.isArray(result) ? result : (result.rows || []);

    return NextResponse.json({ roles: rows }, { status: 200 });
  } catch (err: any) {
    console.error('roles-servicio error', err);
    return NextResponse.json({ message: 'Error al cargar roles de servicio' }, { status: 500 });
  }
}
