import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm, jsonError } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'admin', action: 'create' });
  if (deny) return deny;

try {
    const email = await getUserEmail(request);
    if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
    const userId = await getUserIdByEmail(email!);
    if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });
    let allowed = false;
    try {
      const { getCurrentUserServer } = await import('@/lib/auth');
      const u = getCurrentUserServer(request as any);
      if (u?.rol === 'admin') {
        allowed = true;
      }
    } catch {}
    if (!allowed) {
      allowed = (await userHasPerm(userId, 'rbac.platform_admin')) || (await userHasPerm(userId, 'rbac.tenants.read'));
    }
    // Si es admin de tenant (no platform), restringir a su único tenant
    const ctx = (request as any).ctx as { tenantId?: string } | undefined;
    const tenantId = ctx?.tenantId ?? null;
    const isPlatformAdmin = await userHasPerm(userId, 'rbac.platform_admin');
    if (!allowed && !isPlatformAdmin) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.tenants.read', code:'FORBIDDEN' }, { status:403 });
    
    const searchParams = request.nextUrl.searchParams;
    const q = (searchParams.get('q') || '').trim();
    const page = Number(searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    // Consulta sin usar fragmentos dinámicos (evita errores de sintaxis de @vercel/postgres)
    let rows;
    if (q) {
      const like = '%' + q + '%';
      if (!isPlatformAdmin && tenantId) {
        rows = await sql`
          SELECT 
            t.*, 
            u.id   AS admin_id,
            u.email AS admin_email,
            u.nombre AS admin_nombre,
            u.activo AS admin_activo
          FROM tenants t
          LEFT JOIN usuarios u ON u.tenant_id = t.id AND u.rol = 'admin'
          WHERE (t.rut ILIKE ${like} OR t.nombre ILIKE ${like})
            AND t.id = ${tenantId}
          ORDER BY t.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        rows = await sql`
          SELECT 
            t.*, 
            u.id   AS admin_id,
            u.email AS admin_email,
            u.nombre AS admin_nombre,
            u.activo AS admin_activo
          FROM tenants t
          LEFT JOIN usuarios u ON u.tenant_id = t.id AND u.rol = 'admin'
          WHERE (t.rut ILIKE ${like} OR t.nombre ILIKE ${like})
          ORDER BY t.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      }
    } else {
      if (!isPlatformAdmin && tenantId) {
        rows = await sql`
          SELECT 
            t.*, 
            u.id   AS admin_id,
            u.email AS admin_email,
            u.nombre AS admin_nombre,
            u.activo AS admin_activo
          FROM tenants t
          LEFT JOIN usuarios u ON u.tenant_id = t.id AND u.rol = 'admin'
          WHERE t.id = ${tenantId}
          ORDER BY t.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        rows = await sql`
          SELECT 
            t.*, 
            u.id   AS admin_id,
            u.email AS admin_email,
            u.nombre AS admin_nombre,
            u.activo AS admin_activo
          FROM tenants t
          LEFT JOIN usuarios u ON u.tenant_id = t.id AND u.rol = 'admin'
          ORDER BY t.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      }
    }

    // Contar total
    let totalRows;
    if (q) {
      const like = '%' + q + '%';
      if (!isPlatformAdmin && tenantId) {
        totalRows = await sql`
          SELECT COUNT(*) as total FROM tenants 
          WHERE (rut ILIKE ${like} OR nombre ILIKE ${like})
            AND id = ${tenantId}
        `;
      } else {
        totalRows = await sql`
          SELECT COUNT(*) as total FROM tenants 
          WHERE (rut ILIKE ${like} OR nombre ILIKE ${like})
        `;
      }
    } else {
      if (!isPlatformAdmin && tenantId) {
        totalRows = await sql`
          SELECT COUNT(*) as total FROM tenants
          WHERE id = ${tenantId}
        `;
      } else {
        totalRows = await sql`
          SELECT COUNT(*) as total FROM tenants
        `;
      }
    }

    const list = (rows as any).rows ?? (rows as any);
    const total = (totalRows as any).rows?.[0]?.total ?? 0;

    return NextResponse.json({
      ok: true,
      data: list.map((r: any) => ({
        id: r.id,
        nombre: r.nombre,
        rut: r.rut,
        activo: r.activo,
        created_at: r.created_at,
        admin: r.admin_id ? {
          id: r.admin_id,
          email: r.admin_email,
          nombre: r.admin_nombre,
          activo: r.admin_activo,
        } : null,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    console.error('Error listando tenants:', e);
    return NextResponse.json({ ok:false, error:'internal', detail:String(e?.message ?? e), code:'INTERNAL' }, { status:500 });
  }
}

export async function POST(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'admin', action: 'create' });
  if (deny) return deny;

try {
    const email = await getUserEmail(request);
    if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
    const userId = await getUserIdByEmail(email!);
    if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });
    let allowed = false;
    try {
      const { getCurrentUserServer } = await import('@/lib/auth');
      const u = getCurrentUserServer(request as any);
      if (u?.rol === 'admin') {
        allowed = true;
      }
    } catch {}
    if (!allowed) {
      allowed = (await userHasPerm(userId, 'rbac.platform_admin')) || (await userHasPerm(userId, 'rbac.tenants.create'));
    }
    if (!allowed) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.tenants.create', code:'FORBIDDEN' }, { status:403 });

    const body = await request.json();
    const { nombre, rut, admin_email, admin_nombre, admin_password } = body;

    // Validar campos requeridos
    if (!nombre || !rut || !admin_email) {
      return NextResponse.json({ 
        ok:false, 
        error:'missing_required_fields', 
        required: ['nombre', 'rut', 'admin_email'],
        code:'BAD_REQUEST' 
      }, { status:400 });
    }

    // Verificar si el rut ya existe
    const existingTenant = await sql`
      SELECT id FROM tenants WHERE rut = ${rut}
    `;
    
    if ((existingTenant as any).rows?.length > 0) {
      return NextResponse.json({ ok:false, error:'tenant_already_exists', code:'CONFLICT' }, { status:409 });
    }

    // Verificar si el email del admin ya existe
    const existingUser = await sql`
      SELECT id FROM usuarios WHERE lower(email) = lower(${admin_email})
    `;
    
    if ((existingUser as any).rows?.length > 0) {
      return NextResponse.json({ ok:false, error:'admin_email_already_exists', code:'CONFLICT' }, { status:409 });
    }

    // Iniciar transacción para crear tenant + admin
    const result = await sql`
      WITH new_tenant AS (
        INSERT INTO tenants (nombre, rut, activo)
        VALUES (${nombre}, ${rut}, true)
        RETURNING id, nombre, rut, activo, created_at
      ),
      new_admin_role AS (
        INSERT INTO roles (nombre, descripcion, tenant_id)
        SELECT 'Admin', 'Administrador del tenant', nt.id
        FROM new_tenant nt
        RETURNING id, nombre, tenant_id
      ),
      new_admin_user AS (
        INSERT INTO usuarios (tenant_id, email, password, nombre, apellido, rol, activo)
        SELECT 
          nt.id,
          lower(${admin_email}),
          crypt(${admin_password || 'admin123'}, gen_salt('bf')),
          ${admin_nombre || 'Administrador'},
          'Tenant',
          'admin',
          true
        FROM new_tenant nt
        RETURNING id, email, nombre, tenant_id
      ),
      assign_role AS (
        INSERT INTO usuarios_roles (usuario_id, rol_id)
        SELECT u.id, r.id
        FROM new_admin_user u
        JOIN new_admin_role r ON r.tenant_id = u.tenant_id
        RETURNING usuario_id, rol_id
      ),
      assign_permissions AS (
        INSERT INTO roles_permisos (rol_id, permiso_id)
        SELECT r.id, p.id
        FROM new_admin_role r
        CROSS JOIN permisos p
        WHERE p.clave IN (
          'turnos.*', 'turnos.view', 'turnos.edit',
          'payroll.*', 'payroll.view', 'payroll.edit',
          'maestros.*', 'maestros.view', 'maestros.edit',
          'usuarios.manage', 'documentos.manage', 'config.manage'
        )
        ON CONFLICT DO NOTHING
        RETURNING rol_id, permiso_id
      )
      SELECT 
        nt.id as tenant_id,
        nt.nombre as tenant_nombre,
        nt.rut as tenant_rut,
        nt.activo as tenant_activo,
        nt.created_at as tenant_created_at,
        u.id as admin_id,
        u.email as admin_email,
        u.nombre as admin_nombre,
        r.id as admin_role_id,
        r.nombre as admin_role_nombre
      FROM new_tenant nt
      JOIN new_admin_user u ON u.tenant_id = nt.id
      JOIN new_admin_role r ON r.tenant_id = nt.id
    `;

    const newTenant = (result as any).rows[0];

    if (!newTenant) {
      return NextResponse.json({ ok:false, error:'creation_failed', code:'INTERNAL' }, { status:500 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        tenant: {
          id: newTenant.tenant_id,
          nombre: newTenant.tenant_nombre,
          rut: newTenant.tenant_rut,
          activo: newTenant.tenant_activo,
          created_at: newTenant.tenant_created_at,
        },
        admin: {
          id: newTenant.admin_id,
          email: newTenant.admin_email,
          nombre: newTenant.admin_nombre,
          role_id: newTenant.admin_role_id,
          role_nombre: newTenant.admin_role_nombre,
        }
      },
      message: 'Tenant y administrador creados exitosamente'
    });

  } catch (e: any) {
    console.error('Error creando tenant con admin:', e);
    return NextResponse.json({ ok:false, error:'internal', detail:String(e?.message ?? e), code:'INTERNAL' }, { status:500 });
  }
}


