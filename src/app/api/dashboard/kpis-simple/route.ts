import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'home', action: 'view' });
  if (deny) return deny;

  try {
          const ctx = (request as any).ctx as { tenantId: string; selectedTenantId: string | null; isPlatformAdmin?: boolean } | undefined;
    // Solo usar selectedTenantId si es Platform Admin, sino usar el tenantId del usuario
    const tenantId = ctx?.isPlatformAdmin ? (ctx?.selectedTenantId || ctx?.tenantId) : ctx?.tenantId;
    
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'TENANT_REQUIRED', code: 'TENANT_REQUIRED' }, { status: 400 });
    }

    // Función helper para ejecutar consultas de forma segura
    const safeQuery = async (queryFn: () => Promise<any>, defaultValue: number = 0) => {
      try {
        const result = await queryFn();
        return parseInt(result.rows[0]?.count || result.rows[0]?.total_turnos || result.rows[0]?.monto_total || '0');
      } catch (error) {
        console.error('Error en consulta:', error);
        return defaultValue;
      }
    };

    // Obtener clientes activos
    const clientesActivos = await safeQuery(async () => 
      await sql`SELECT COUNT(*) as count FROM clientes WHERE tenant_id = ${tenantId} AND estado = 'Activo'`
    );

    // Obtener instalaciones activas
    const instalacionesActivas = await safeQuery(async () => 
      await sql`SELECT COUNT(*) as count FROM instalaciones WHERE tenant_id = ${tenantId} AND estado = 'Activo'`
    );

    // Obtener guardias activos
    const guardiasActivos = await safeQuery(async () => 
      await sql`SELECT COUNT(*) as count FROM guardias WHERE tenant_id = ${tenantId} AND activo = true`
    );

    // Obtener PPC pendientes
    const totalPPC = await safeQuery(async () => 
      await sql`
        SELECT COUNT(*) as count
        FROM as_turnos_puestos_operativos po
        JOIN instalaciones i ON po.instalacion_id = i.id
        WHERE po.activo = true AND po.es_ppc = true AND i.tenant_id = ${tenantId}
      `
    );

    // Obtener documentos vencidos
    const documentosVencidos = await safeQuery(async () => 
      await sql`
        SELECT COUNT(*) as count 
        FROM documentos_clientes dc
        JOIN clientes c ON dc.cliente_id = c.id
        WHERE c.tenant_id = ${tenantId} 
          AND dc.fecha_vencimiento < CURRENT_DATE
      `
    );

    // Obtener turnos extras (por ahora solo contar total, ya que no hay columna pagado)
    const turnosExtrasPendientes = await safeQuery(async () => 
      await sql`
        SELECT COUNT(*) as count
        FROM turnos_extras te
        JOIN guardias g ON te.guardia_id = g.id
        WHERE g.tenant_id = ${tenantId}
      `
    );
    const montoTurnosExtrasPendientes = 0; // Por ahora 0 ya que no hay columna valor

    return NextResponse.json({
      success: true,
      data: {
        clientesActivos,
        instalacionesActivas,
        puestosActivos: guardiasActivos,
        totalPPC,
        documentosVencidos,
        turnosExtrasPendientes,
        montoTurnosExtrasPendientes
      }
    });

  } catch (error) {
    console.error('Error obteniendo KPIs del dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
