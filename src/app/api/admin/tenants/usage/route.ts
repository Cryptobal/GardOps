import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requireAuthz } from '@/lib/authz-api';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';

// GET /api/admin/tenants/usage
// Devuelve todos los tenants con métricas de uso básicas para auditar cuáles están vacíos
export async function GET(request: NextRequest) {
  // Requiere ser Platform Admin o tener rbac.tenants.read
  const deny = await requireAuthz(request, { resource: 'configuracion', action: 'manage:roles' });
  if (deny) {
    // Fallback al mismo patrón permisivo del resto de endpoints admin
    try {
      const email = await getUserEmail(request);
      if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
      const userId = await getUserIdByEmail(email);
      if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });
      const allowed = (await userHasPerm(userId, 'rbac.platform_admin')) || (await userHasPerm(userId, 'rbac.tenants.read'));
      if (!allowed) return NextResponse.json({ ok:false, error:'forbidden', code:'FORBIDDEN' }, { status:403 });
    } catch (e) {
      return deny; // devolver el deny original si algo falla
    }
  }

  try {
    const { rows } = await sql`
      SELECT 
        t.id::text                        AS id,
        t.nombre                          AS nombre,
        COALESCE((SELECT COUNT(*) FROM clientes c WHERE c.tenant_id = t.id), 0)::int        AS clientes,
        COALESCE((SELECT COUNT(*) FROM instalaciones i WHERE i.tenant_id = t.id), 0)::int   AS instalaciones,
        COALESCE((SELECT COUNT(*) FROM guardias g WHERE g.tenant_id = t.id), 0)::int        AS guardias,
        COALESCE((
          SELECT COUNT(*) FROM as_turnos_puestos_operativos po 
          JOIN instalaciones i2 ON i2.id = po.instalacion_id 
          WHERE i2.tenant_id = t.id
        ), 0)::int AS puestos,
        COALESCE((
          SELECT COUNT(*) FROM as_turnos_puestos_operativos po 
          JOIN instalaciones i2 ON i2.id = po.instalacion_id 
          WHERE i2.tenant_id = t.id AND po.es_ppc = true AND po.activo = true
        ), 0)::int AS ppc_activos,
        COALESCE((
          SELECT COUNT(*) FROM documentos_clientes dc 
          JOIN clientes c2 ON c2.id = dc.cliente_id 
          WHERE c2.tenant_id = t.id
        ), 0)::int AS documentos_clientes,
        COALESCE((
          SELECT COUNT(*) FROM documentos_instalacion di 
          JOIN instalaciones i3 ON i3.id = di.instalacion_id 
          WHERE i3.tenant_id = t.id
        ), 0)::int AS documentos_instalacion,
        COALESCE((
          SELECT COUNT(*) FROM documentos_guardias dg 
          JOIN guardias g2 ON g2.id = dg.guardia_id 
          WHERE g2.tenant_id = t.id
        ), 0)::int AS documentos_guardias,
        COALESCE((
          SELECT COUNT(*) FROM TE_turnos_extras te 
          JOIN instalaciones ix ON ix.id = te.instalacion_id 
          WHERE ix.tenant_id = t.id
        ), 0)::int AS turnos_extras
      FROM tenants t
      ORDER BY t.created_at DESC
    `;

    const data = rows.map(r => ({
      id: r.id,
      nombre: r.nombre,
      clientes: Number(r.clientes || 0),
      instalaciones: Number(r.instalaciones || 0),
      guardias: Number(r.guardias || 0),
      puestos: Number(r.puestos || 0),
      ppc_activos: Number(r.ppc_activos || 0),
      documentos_clientes: Number(r.documentos_clientes || 0),
      documentos_instalacion: Number(r.documentos_instalacion || 0),
      documentos_guardias: Number(r.documentos_guardias || 0),
      turnos_extras: Number(r.turnos_extras || 0),
      empty: [r.clientes, r.instalaciones, r.guardias, r.puestos, r.ppc_activos, r.documentos_clientes, r.documentos_instalacion, r.documentos_guardias, r.turnos_extras]
        .every(v => Number(v || 0) === 0)
    }));

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    console.error('Error listando uso de tenants:', e);
    return NextResponse.json({ ok:false, error:'internal', detail:String(e?.message ?? e), code:'INTERNAL' }, { status:500 });
  }
}


