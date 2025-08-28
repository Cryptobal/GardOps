import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  // Tolerante a permisos en desarrollo: no bloquear listado de opciones
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'read:list' });
    if (maybeDeny && (maybeDeny as any).status === 403) return maybeDeny;
  } catch (_) {
    // Ignorar errores de autorización para permitir uso del módulo
  }

  try {
    const { searchParams } = new URL(request.url);
    const tipo = (searchParams.get('tipo') || '').toLowerCase();
    const q = (searchParams.get('q') || '').trim();

    if (!['haber', 'descuento'].includes(tipo)) {
      return NextResponse.json({ message: 'tipo inválido' }, { status: 400 });
    }

    const params: any[] = [];
    let paramIndex = 1;

    let sql = `
      SELECT id, codigo, nombre, clase, naturaleza
      FROM sueldo_item
      WHERE activo = TRUE
    `;

    if (tipo === 'haber') {
      // Haber: solo clase HABER (naturaleza puede ser IMPONIBLE o NO_IMPONIBLE)
      sql += ` AND clase = 'HABER'`;
    } else {
      // Descuento: clase DESCUENTO
      sql += ` AND clase = 'DESCUENTO'`;
    }

    if (q) {
      sql += ` AND (codigo ILIKE $${paramIndex} OR nombre ILIKE $${paramIndex})`;
      params.push(`%${q}%`);
      paramIndex++;
    }

    sql += ` ORDER BY nombre LIMIT 50`;

    const result = await query(sql, params);
    const rows = Array.isArray(result) ? result : (result.rows || []);

    return NextResponse.json({ items: rows }, { status: 200 });
  } catch (err: any) {
    console.error('items/opciones error', err);
    return NextResponse.json({ message: 'Error al cargar items' }, { status: 500 });
  }
}
