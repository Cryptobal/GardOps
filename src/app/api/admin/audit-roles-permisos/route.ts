import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'admin', action: 'read:list' });
  if (deny) return deny;

  try {
    const email = await getUserEmail(request);
    if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
    const userId = await getUserIdByEmail(email);
    if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });
    
    // Solo Platform Admin puede hacer auditoría
    const isPlatformAdmin = await userHasPerm(userId, 'rbac.platform_admin');
    if (!isPlatformAdmin) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.platform_admin', code:'FORBIDDEN' }, { status:403 });

    console.log('[admin/audit-roles-permisos][GET]', { email, userId });

    // 1. Verificar qué tablas RBAC existen
    const tables = await sql`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%rol%' OR table_name LIKE '%perm%' OR table_name LIKE '%rbac%')
      ORDER BY table_name
    `;

    // 2. Listar todos los tenants
    const tenants = await sql`
      SELECT id, nombre, slug, activo
      FROM tenants
      ORDER BY nombre
    `;

    // 3. Listar todos los roles por tenant
    const roles = await sql`
      SELECT r.id, r.nombre, r.descripcion, r.tenant_id, t.nombre as tenant_nombre
      FROM roles r
      LEFT JOIN tenants t ON r.tenant_id = t.id
      ORDER BY t.nombre NULLS FIRST, r.nombre
    `;

    // 4. Listar todos los permisos
    const permisos = await sql`
      SELECT id, clave, descripcion, categoria
      FROM permisos
      ORDER BY categoria NULLS FIRST, clave
    `;

    // 5. Mostrar permisos por rol
    const rolesConPermisos = await sql`
      SELECT 
        r.id as rol_id,
        r.nombre as rol_nombre,
        r.tenant_id,
        t.nombre as tenant_nombre,
        p.clave as permiso_clave,
        p.descripcion as permiso_descripcion
      FROM roles r
      LEFT JOIN tenants t ON r.tenant_id = t.id
      LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
      LEFT JOIN permisos p ON rp.permiso_id = p.id
      ORDER BY t.nombre NULLS FIRST, r.nombre, p.clave
    `;

    // 6. Verificar usuarios y sus roles
    const usuariosConRoles = await sql`
      SELECT 
        u.id,
        u.email,
        u.nombre,
        u.tenant_id,
        t.nombre as tenant_nombre,
        r.nombre as rol_nombre
      FROM usuarios u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id
      LEFT JOIN roles r ON ur.rol_id = r.id
      WHERE u.activo = true
      ORDER BY t.nombre NULLS FIRST, u.email
    `;

    // 7. Resumen estadístico
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM tenants) as total_tenants,
        (SELECT COUNT(*) FROM roles) as total_roles,
        (SELECT COUNT(*) FROM permisos) as total_permisos,
        (SELECT COUNT(*) FROM usuarios WHERE activo = true) as total_usuarios_activos,
        (SELECT COUNT(*) FROM usuarios_roles) as total_asignaciones_roles,
        (SELECT COUNT(*) FROM roles_permisos) as total_asignaciones_permisos
    `;

    // 8. Verificar roles por tenant
    const rolesPorTenant = await sql`
      SELECT 
        t.nombre as tenant_nombre,
        COUNT(r.id) as total_roles
      FROM tenants t
      LEFT JOIN roles r ON t.id = r.tenant_id
      GROUP BY t.id, t.nombre
      ORDER BY t.nombre
    `;

    const rolesGlobales = await sql`
      SELECT COUNT(*) as total
      FROM roles
      WHERE tenant_id IS NULL
    `;

    return NextResponse.json({ 
      ok: true,
      auditoria: {
        tablas: tables.rows,
        tenants: tenants.rows,
        roles: roles.rows,
        permisos: permisos.rows,
        rolesConPermisos: rolesConPermisos.rows,
        usuariosConRoles: usuariosConRoles.rows,
        estadisticas: stats.rows[0],
        rolesPorTenant: rolesPorTenant.rows,
        rolesGlobales: rolesGlobales.rows[0]
      }
    });

  } catch (err: any) {
    console.error('[admin/audit-roles-permisos][GET] error:', err);
    return NextResponse.json({ ok:false, error:'internal', detail:String(err?.message ?? err), code:'INTERNAL' }, { status: 500 });
  }
}
