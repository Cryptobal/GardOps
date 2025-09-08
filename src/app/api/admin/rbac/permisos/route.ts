import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    console.log('[admin/rbac/permisos][GET] Iniciando autenticación...');
    
    const email = await getUserEmail(req);
    console.log('[admin/rbac/permisos][GET] Email obtenido:', email);
    
    let userId: string;
    
    if (!email) {
      console.log('[admin/rbac/permisos][GET] No se pudo obtener email, intentando fallback...');
      
      // Fallback: intentar obtener email desde headers directos
      const fallbackEmail = req.headers.get('x-user-email') || 
                           req.headers.get('user-email') ||
                           process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
      
      console.log('[admin/rbac/permisos][GET] Fallback email:', fallbackEmail);
      
      if (!fallbackEmail) {
        console.log('[admin/rbac/permisos][GET] No hay email disponible');
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
        console.log('[admin/rbac/permisos][GET] Usuario no encontrado con fallback email');
        return NextResponse.json({ 
          ok: false, 
          error: 'Usuario no encontrado', 
          code: 'NOT_FOUND' 
        }, { status: 401 });
      }
      userId = fallbackUserId;
      
      console.log('[admin/rbac/permisos][GET] Autenticación exitosa con fallback');
    } else {
      const emailUserId = await getUserIdByEmail(email);
      if (!emailUserId) {
        console.log('[admin/rbac/permisos][GET] Usuario no encontrado');
        return NextResponse.json({ 
          ok: false, 
          error: 'Usuario no encontrado', 
          code: 'NOT_FOUND' 
        }, { status: 401 });
      }
      userId = emailUserId;
      
      console.log('[admin/rbac/permisos][GET] Autenticación exitosa');
    }

    // Verificar permisos
    let allowed = false;
    try {
      const { getCurrentUserServer } = await import('@/lib/auth');
      const u = getCurrentUserServer(req as any);
      if (u?.rol === 'admin') {
        allowed = true;
        console.log('[admin/rbac/permisos][GET] JWT admin, permitiendo acceso');
      }
    } catch (err) {
      console.log('[admin/rbac/permisos][GET] JWT check falló:', err);
    }
    
    if (!allowed) {
      allowed = await userHasPerm(userId, 'rbac.permisos.read') || await userHasPerm(userId, 'rbac.platform_admin');
      console.log('[admin/rbac/permisos][GET] Permiso check:', allowed);
    }
    
    if (!allowed) {
      console.log('[admin/rbac/permisos][GET] Usuario no tiene permisos');
      return NextResponse.json({ 
        ok: false, 
        error: 'Forbidden', 
        code: 'FORBIDDEN', 
        perm: 'rbac.permisos.read' 
      }, { status: 403 });
    }

    console.log('[admin/rbac/permisos][GET]', { email, userId, perms: ['rbac.permisos.read','rbac.platform_admin'] })
    
    // Verificar si es Platform Admin para filtrar permisos
    const isPlatformAdmin = await userHasPerm(userId, 'rbac.platform_admin');
    
    // Obtener permisos con categorías (filtrar tenants si no es Platform Admin)
    let permisosQuery;
    if (isPlatformAdmin) {
      // Platform Admin ve todos los permisos
      permisosQuery = sql`
        SELECT id, clave, descripcion, categoria
        FROM public.permisos
        ORDER BY categoria ASC, clave ASC
      `;
    } else {
      // Otros roles NO ven permisos relacionados con tenants
      permisosQuery = sql`
        SELECT id, clave, descripcion, categoria
        FROM public.permisos
        WHERE clave NOT LIKE '%tenant%' 
        AND clave NOT LIKE 'rbac.tenants.%'
        AND clave != 'rbac.platform_admin'
        ORDER BY categoria ASC, clave ASC
      `;
    }
    
    const rows = await permisosQuery;

    // Contar categorías únicas (aplicar mismo filtro)
    let categoriasQuery;
    if (isPlatformAdmin) {
      categoriasQuery = sql`
        SELECT COUNT(DISTINCT categoria) as total
        FROM public.permisos
        WHERE categoria IS NOT NULL
      `;
    } else {
      categoriasQuery = sql`
        SELECT COUNT(DISTINCT categoria) as total
        FROM public.permisos
        WHERE categoria IS NOT NULL
        AND clave NOT LIKE '%tenant%' 
        AND clave NOT LIKE 'rbac.tenants.%'
        AND clave != 'rbac.platform_admin'
      `;
    }
    
    const categoriasCount = await categoriasQuery;

    // Contar permisos en uso (asignados a roles, aplicar mismo filtro)
    let permisosEnUsoQuery;
    if (isPlatformAdmin) {
      permisosEnUsoQuery = sql`
        SELECT COUNT(DISTINCT p.id) as total
        FROM public.permisos p
        JOIN roles_permisos rp ON rp.permiso_id = p.id
      `;
    } else {
      permisosEnUsoQuery = sql`
        SELECT COUNT(DISTINCT p.id) as total
        FROM public.permisos p
        JOIN roles_permisos rp ON rp.permiso_id = p.id
        WHERE p.clave NOT LIKE '%tenant%' 
        AND p.clave NOT LIKE 'rbac.tenants.%'
        AND p.clave != 'rbac.platform_admin'
      `;
    }
    
    const permisosEnUso = await permisosEnUsoQuery;

    return NextResponse.json({ 
      ok: true, 
      items: rows.rows,
      stats: {
        total: rows.rows.length,
        categorias: categoriasCount.rows[0].total,
        permisosEnUso: permisosEnUso.rows[0].total
      }
    });
  } catch (err: any) {
    console.error('[admin/rbac/permisos][GET] error:', err);
    return NextResponse.json({ ok:false, error:'internal', detail:String(err?.message ?? err), code:'INTERNAL' }, { status: 500 });
  }
}
