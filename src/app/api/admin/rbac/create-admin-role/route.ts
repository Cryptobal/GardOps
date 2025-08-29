import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';

export async function POST(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'admin', action: 'create' });
if (deny) return deny;

  try {
    const email = await getUserEmail(request);
    if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
    const userId = await getUserIdByEmail(email);
    if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });
    
    // Solo Platform Admin puede crear roles de admin
    const isPlatformAdmin = await userHasPerm(userId, 'rbac.platform_admin');
    if (!isPlatformAdmin) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.platform_admin', code:'FORBIDDEN' }, { status:403 });

    console.log('[admin/rbac/create-admin-role][POST]', { email, userId });

    // 1. Crear el rol de administrador
    const rolResult = await sql`
      INSERT INTO rbac_roles (tenant_id, code, name, description, is_system)
      VALUES (NULL, 'admin', 'Administrador', 'Rol con acceso completo a todos los módulos del sistema', true)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_system = EXCLUDED.is_system
      RETURNING id, code, name
    `;

    const rol = rolResult.rows[0];
    console.log('✅ Rol creado:', rol);

    // 2. Obtener todos los permisos disponibles
    const permisosResult = await sql`
      SELECT id, clave, descripcion
      FROM permisos
      ORDER BY clave
    `;

    const permisos = permisosResult.rows;
    console.log(`📋 Encontrados ${permisos.length} permisos`);

    // 3. Asignar todos los permisos al rol de admin
    if (permisos.length > 0) {
      const valoresPermisos = permisos.map(p => `('${rol.id}', '${p.id}')`).join(', ');
      
      await sql`
        INSERT INTO rbac_roles_permisos (role_id, permission_id)
        VALUES ${sql.unsafe(valoresPermisos)}
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `;
    }

    console.log(`✅ Asignados ${permisos.length} permisos al rol de administrador`);

    // 4. Verificar la asignación
    const asignadosResult = await sql`
      SELECT COUNT(*) as total
      FROM rbac_roles_permisos rp
      WHERE rp.role_id = ${rol.id}
    `;

    const totalAsignados = asignadosResult.rows[0].total;

    return NextResponse.json({ 
      ok: true, 
      rol: {
        id: rol.id,
        code: rol.code,
        name: rol.name,
        permisosAsignados: totalAsignados
      },
      message: 'Rol de administrador creado exitosamente'
    });

  } catch (err: any) {
    console.error('[admin/rbac/create-admin-role][POST] error:', err);
    return NextResponse.json({ ok:false, error:'internal', detail:String(err?.message ?? err), code:'INTERNAL' }, { status: 500 });
  }
}
