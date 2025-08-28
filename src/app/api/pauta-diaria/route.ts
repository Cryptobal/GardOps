import { requireAuthz } from '@/lib/authz-api'
import { NextRequest } from 'next/server';
import pool from '@/lib/database';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = {
  pauta_id: number;
  puesto_id: number;
  fecha: string;
  anio: number; mes: number; dia: number;
  guardia_id: string | null;
  estado: string | null;
  meta: any | null;
  instalacion_id: string;
  instalacion_nombre: string;
  guardia_nombre: string | null;
};

export async function GET(req: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'pauta_diaria', action: 'read:list' });
  if (deny) return deny;

  noStore();
  const url = new URL(req.url);
  const fecha = url.searchParams.get('fecha'); // YYYY-MM-DD
  const instalacionId = url.searchParams.get('instalacion_id');
  
  // Obtener tenant_id del contexto
      const ctx = (req as any).ctx as { tenantId?: string; selectedTenantId?: string | null; isPlatformAdmin?: boolean } | undefined;
      // Solo usar selectedTenantId si es Platform Admin, sino usar el tenantId del usuario
    const tenantId = ctx?.isPlatformAdmin ? (ctx?.selectedTenantId || ctx?.tenantId) : ctx?.tenantId;
  if (!tenantId) {
    return new Response('TENANT_REQUIRED', { status: 400 });
  }
  
  // Si no se proporciona fecha, devolver resumen del tenant
  if (!fecha) {
    console.log(`📊 Devolviendo resumen de pauta diaria del tenant ${tenantId}`);
    
    // Obtener todas las instalaciones del tenant con pautas para hoy
    const hoy = new Date().toISOString().split('T')[0];
    const resumenResult = await pool.query(`
      SELECT 
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        c.nombre as cliente_nombre,
        COUNT(DISTINCT v.puesto_id) as puestos_con_pauta,
        COUNT(DISTINCT po.id) as total_puestos
      FROM instalaciones i
      LEFT JOIN clientes c ON i.cliente_id = c.id
      LEFT JOIN as_turnos_puestos_operativos po ON po.instalacion_id = i.id AND po.activo = true
      LEFT JOIN as_turnos_v_pauta_diaria v ON v.instalacion_id = i.id AND v.fecha = $1
      WHERE i.tenant_id = $2 AND i.estado = 'Activo'
      GROUP BY i.id, i.nombre, c.nombre
      ORDER BY i.nombre
    `, [hoy, tenantId]);
    
    return Response.json({
      success: true,
      tipo: 'resumen',
      data: resumenResult.rows
    });
  }

  const params: any[] = [fecha];
  let paramIndex = 2;
  
  // Consulta directa sin usar la vista para asegurar filtrado por tenant
  let sql = `
    SELECT 
      pm.id as pauta_id, 
      pm.puesto_id, 
      TO_DATE(CONCAT(pm.anio, '-', pm.mes, '-', pm.dia), 'YYYY-MM-DD')::text as fecha, 
      pm.anio, 
      pm.mes, 
      pm.dia,
      pm.guardia_id::text, 
      pm.estado, 
      pm.observaciones as meta,
      i.id::text as instalacion_id, 
      i.nombre as instalacion_nombre, 
      g.nombre as guardia_nombre
    FROM as_turnos_pauta_mensual pm
    INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
    INNER JOIN instalaciones i ON po.instalacion_id = i.id
    LEFT JOIN guardias g ON pm.guardia_id = g.id
    WHERE TO_DATE(CONCAT(pm.anio, '-', pm.mes, '-', pm.dia), 'YYYY-MM-DD') = $1
      AND po.activo = true
      AND i.tenant_id::text = $${paramIndex++}
  `;

  params.push(tenantId);
  if (instalacionId) { 
    sql += ` AND i.id::text = $${paramIndex++}`; 
    params.push(instalacionId); 
  }
  sql += ` ORDER BY i.nombre, po.nombre_puesto`;

  const { rows } = await pool.query<Row>(sql, params);
  return Response.json({ data: rows });
}