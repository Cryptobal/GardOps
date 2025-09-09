import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm, jsonError } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    console.log('[admin/tenants][GET] Iniciando autenticación...');
    
    const email = await getUserEmail(req);
    console.log('[admin/tenants][GET] Email obtenido:', email);
    
    let userId: string;
    
    if (!email) {
      console.log('[admin/tenants][GET] No se pudo obtener email, intentando fallback...');
      
      // Fallback: intentar obtener email desde headers directos
      const fallbackEmail = req.headers.get('x-user-email') || 
                           req.headers.get('user-email') ||
                           process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
      
      console.log('[admin/tenants][GET] Fallback email:', fallbackEmail);
      
      if (!fallbackEmail) {
        console.log('[admin/tenants][GET] No hay email disponible');
        return NextResponse.json({ 
          ok: false, 
          error: 'No autenticado - email no disponible', 
          code: 'UNAUTHENTICATED',
          debug: { 
            headers: Object.fromEntries(req.headers.entries()),
            env: { NODE_ENV: process.env.NODE_ENV }
          }
        }, { status: 401 });
      }
      
      // Usar el email del fallback
      const fallbackUserId = await getUserIdByEmail(fallbackEmail);
      if (!fallbackUserId) {
        console.log('[admin/tenants][GET] Usuario no encontrado con fallback email');
        return NextResponse.json({ 
          ok: false, 
          error: 'Usuario no encontrado', 
          code: 'NOT_FOUND' 
        }, { status: 401 });
      }
      userId = fallbackUserId;
      
      console.log('[admin/tenants][GET] Autenticación exitosa con fallback');
    } else {
      const emailUserId = await getUserIdByEmail(email);
      if (!emailUserId) {
        console.log('[admin/tenants][GET] Usuario no encontrado');
        return NextResponse.json({ 
          ok: false, 
          error: 'Usuario no encontrado', 
          code: 'NOT_FOUND' 
        }, { status: 401 });
      }
      userId = emailUserId;
      
      console.log('[admin/tenants][GET] Autenticación exitosa');
    }

    // Verificar permisos
    let allowed = false;
    try {
      const { getCurrentUserServer } = await import('@/lib/auth');
      const u = getCurrentUserServer(req as any);
      if (u?.rol === 'admin') {
        allowed = true;
        console.log('[admin/tenants][GET] JWT admin, permitiendo acceso');
      }
    } catch (err) {
      console.log('[admin/tenants][GET] JWT check falló:', err);
    }
    
    if (!allowed) {
      allowed = await userHasPerm(userId, 'rbac.platform_admin') || await userHasPerm(userId, 'rbac.tenants.read');
      console.log('[admin/tenants][GET] Permiso check:', allowed);
    }
    
    if (!allowed) {
      console.log('[admin/tenants][GET] Usuario no tiene permisos');
      return NextResponse.json({ 
        ok: false, 
        error: 'Forbidden', 
        code: 'FORBIDDEN', 
        perm: 'rbac.tenants.read' 
      }, { status: 403 });
    }
    
    const searchParams = req.nextUrl.searchParams;
    const q = (searchParams.get('q') || '').trim();
    const page = Number(searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    // Consulta simplificada para evitar problemas de sintaxis
    let rows;
    if (q) {
      rows = await sql`
        SELECT * FROM tenants 
        WHERE rut ILIKE ${'%' + q + '%'} OR nombre ILIKE ${'%' + q + '%'}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      rows = await sql`
        SELECT * FROM tenants 
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    // Contar total
    let totalRows;
    if (q) {
      totalRows = await sql`
        SELECT COUNT(*) as total FROM tenants 
        WHERE rut ILIKE ${'%' + q + '%'} OR nombre ILIKE ${'%' + q + '%'}
      `;
    } else {
      totalRows = await sql`
        SELECT COUNT(*) as total FROM tenants
      `;
    }

    const list = (rows as any).rows ?? (rows as any);
    const total = (totalRows as any).rows?.[0]?.total ?? 0;

    console.log('[admin/tenants][GET]', { email, userId, q, page, limit, total });
    
    return NextResponse.json({
      ok: true,
      data: list.map((r: any) => ({
        id: r.id,
        nombre: r.nombre,
        rut: r.rut,
        activo: r.activo,
        created_at: r.created_at,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    console.error('Error listando tenants:', e);
    return NextResponse.json({ ok:false, error:'internal', detail:String(e?.message ?? e), code:'INTERNAL' }, { status:500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('[admin/tenants][POST] Iniciando autenticación...');
    
    const email = await getUserEmail(req);
    console.log('[admin/tenants][POST] Email obtenido:', email);
    
    let userId: string;
    
    if (!email) {
      console.log('[admin/tenants][POST] No se pudo obtener email, intentando fallback...');
      
      // Fallback: intentar obtener email desde headers directos
      const fallbackEmail = req.headers.get('x-user-email') || 
                           req.headers.get('user-email') ||
                           process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
      
      console.log('[admin/tenants][POST] Fallback email:', fallbackEmail);
      
      if (!fallbackEmail) {
        console.log('[admin/tenants][POST] No hay email disponible');
        return NextResponse.json({ 
          ok: false, 
          error: 'No autenticado - email no disponible', 
          code: 'UNAUTHENTICATED',
          debug: { 
            headers: Object.fromEntries(req.headers.entries()),
            env: { NODE_ENV: process.env.NODE_ENV }
          }
        }, { status: 401 });
      }
      
      // Usar el email del fallback
      const fallbackUserId = await getUserIdByEmail(fallbackEmail);
      if (!fallbackUserId) {
        console.log('[admin/tenants][POST] Usuario no encontrado con fallback email');
        return NextResponse.json({ 
          ok: false, 
          error: 'Usuario no encontrado', 
          code: 'NOT_FOUND' 
        }, { status: 401 });
      }
      userId = fallbackUserId;
      
      console.log('[admin/tenants][POST] Autenticación exitosa con fallback');
    } else {
      const emailUserId = await getUserIdByEmail(email);
      if (!emailUserId) {
        console.log('[admin/tenants][POST] Usuario no encontrado');
        return NextResponse.json({ 
          ok: false, 
          error: 'Usuario no encontrado', 
          code: 'NOT_FOUND' 
        }, { status: 401 });
      }
      userId = emailUserId;
      
      console.log('[admin/tenants][POST] Autenticación exitosa');
    }

    // Verificar permisos
    let allowed = false;
    try {
      const { getCurrentUserServer } = await import('@/lib/auth');
      const u = getCurrentUserServer(req as any);
      if (u?.rol === 'admin') {
        allowed = true;
        console.log('[admin/tenants][POST] JWT admin, permitiendo acceso');
      }
    } catch (err) {
      console.log('[admin/tenants][POST] JWT check falló:', err);
    }
    
    if (!allowed) {
      allowed = await userHasPerm(userId, 'rbac.platform_admin') || await userHasPerm(userId, 'rbac.tenants.create');
      console.log('[admin/tenants][POST] Permiso check:', allowed);
    }
    
    if (!allowed) {
      console.log('[admin/tenants][POST] Usuario no tiene permisos');
      return NextResponse.json({ 
        ok: false, 
        error: 'Forbidden', 
        code: 'FORBIDDEN', 
        perm: 'rbac.tenants.create' 
      }, { status: 403 });
    }

    const body = await req.json();
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

    console.log('[admin/tenants][POST] Tenant creado exitosamente:', { email, userId, tenantId: newTenant.tenant_id });

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


