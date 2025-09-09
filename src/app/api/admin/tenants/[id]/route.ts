import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      allowed = (await userHasPerm(userId, 'rbac.platform_admin')) || (await userHasPerm(userId, 'rbac.tenants.read')) || (await userHasPerm(userId, 'rbac.tenants.create'));
    }
    if (!allowed) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.tenants.read', code:'FORBIDDEN' }, { status:403 });

    const { id } = params;
    console.log('🔍 Buscando tenant con ID:', id);

    // Obtener información del tenant y su administrador
    const result = await sql`
      SELECT 
        t.id as tenant_id,
        t.nombre as tenant_nombre,
        t.rut as tenant_rut,
        t.activo as tenant_activo,
        t.created_at as tenant_created_at,
        u.id as admin_id,
        u.email as admin_email,
        u.nombre as admin_nombre,
        u.apellido as admin_apellido,
        u.activo as admin_activo
      FROM tenants t
      LEFT JOIN usuarios u ON u.tenant_id = t.id AND u.rol = 'admin'
      WHERE t.id = ${id}::uuid
    `;

    console.log('📊 Resultado de la consulta:', (result as any).rows);
    const tenant = (result as any).rows[0];

    if (!tenant) {
      console.log('❌ Tenant no encontrado para ID:', id);
      return NextResponse.json({ ok:false, error:'tenant_not_found', code:'NOT_FOUND' }, { status:404 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        tenant: {
          id: tenant.tenant_id,
          nombre: tenant.tenant_nombre,
          rut: tenant.tenant_rut,
          activo: tenant.tenant_activo,
          created_at: tenant.tenant_created_at,
        },
        admin: {
          id: tenant.admin_id,
          email: tenant.admin_email,
          nombre: tenant.admin_nombre,
          apellido: tenant.admin_apellido,
          activo: tenant.admin_activo,
        }
      }
    });

  } catch (e: any) {
    console.error('Error obteniendo tenant:', e);
    return NextResponse.json({ ok:false, error:'internal', detail:String(e?.message ?? e), code:'INTERNAL' }, { status:500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      allowed = (await userHasPerm(userId, 'rbac.platform_admin')) || (await userHasPerm(userId, 'rbac.tenants.update')) || (await userHasPerm(userId, 'rbac.tenants.create'));
    }
    if (!allowed) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.tenants.update', code:'FORBIDDEN' }, { status:403 });

    const { id } = params;
    const body = await request.json();
    const { 
      tenant_nombre, 
      tenant_rut, 
      tenant_activo,
      admin_email, 
      admin_nombre, 
      admin_apellido,
      admin_password,
      admin_activo 
    } = body;

    // Verificar que el tenant existe
    const existingTenant = await sql`
      SELECT id FROM tenants WHERE id = ${id}::uuid
    `;
    
    if ((existingTenant as any).rows?.length === 0) {
      return NextResponse.json({ ok:false, error:'tenant_not_found', code:'NOT_FOUND' }, { status:404 });
    }

    // Verificar que el RUT no esté duplicado (si se está cambiando)
    if (tenant_rut) {
      const duplicateRut = await sql`
        SELECT id FROM tenants WHERE rut = ${tenant_rut} AND id != ${id}::uuid
      `;
      
      if ((duplicateRut as any).rows?.length > 0) {
        return NextResponse.json({ ok:false, error:'rut_already_exists', code:'CONFLICT' }, { status:409 });
      }
    }

    // Verificar que el email del admin no esté duplicado (si se está cambiando)
    if (admin_email) {
      const duplicateEmail = await sql`
        SELECT id FROM usuarios WHERE lower(email) = lower(${admin_email}) AND tenant_id = ${id}::uuid AND rol = 'admin'
      `;
      
      if ((duplicateEmail as any).rows?.length > 0) {
        return NextResponse.json({ ok:false, error:'admin_email_already_exists', code:'CONFLICT' }, { status:409 });
      }
    }

    // Actualizar tenant (sin usar sql.unsafe): COALESCE mantiene el valor si no viene en el body
    {
      const nombreVal = tenant_nombre !== undefined ? tenant_nombre : null;
      const rutVal = tenant_rut !== undefined ? tenant_rut : null;
      const activoVal = tenant_activo !== undefined ? tenant_activo : null;
      await sql`
        UPDATE tenants
        SET
          nombre = COALESCE(${nombreVal}, nombre),
          rut = COALESCE(${rutVal}, rut),
          activo = COALESCE(${activoVal}::boolean, activo)
        WHERE id = ${id}::uuid
      `;
    }

    // Actualizar o crear administrador si no existe
    {
      const adminExists = await sql`
        SELECT id FROM usuarios WHERE tenant_id = ${id}::uuid AND rol = 'admin' LIMIT 1
      `;

      if ((adminExists as any).rows?.length > 0) {
        // Update existente
        const adminEmailVal = admin_email !== undefined ? admin_email.toLowerCase() : null;
        const adminNombreVal = admin_nombre !== undefined ? admin_nombre : null;
        const adminApellidoVal = admin_apellido !== undefined ? admin_apellido : null;
        const adminActivoVal = admin_activo !== undefined ? admin_activo : null;

        await sql`
          UPDATE usuarios
          SET
            email = COALESCE(${adminEmailVal}, email),
            nombre = COALESCE(${adminNombreVal}, nombre),
            apellido = COALESCE(${adminApellidoVal}, apellido),
            activo = COALESCE(${adminActivoVal}::boolean, activo)
          WHERE tenant_id = ${id}::uuid AND rol = 'admin'
        `;

        if (admin_password && String(admin_password).length > 0) {
          await sql`
            UPDATE usuarios
            SET password = crypt(${admin_password}::text, gen_salt('bf'))
            WHERE tenant_id = ${id}::uuid AND rol = 'admin'
          `;
        }
      } else {
        // Crear nuevo admin solo si viene email
        if (admin_email && String(admin_email).length > 0) {
          const emailLower = admin_email.toLowerCase();
          const nombreVal = admin_nombre ?? '';
          const apellidoVal = admin_apellido ?? '';
          const activoVal = admin_activo !== undefined ? admin_activo : true;
          const passVal = admin_password ?? '';

          await sql`
            INSERT INTO usuarios (tenant_id, email, nombre, apellido, rol, activo, password)
            VALUES (
              ${id}::uuid,
              ${emailLower},
              ${nombreVal},
              ${apellidoVal},
              'admin',
              ${activoVal}::boolean,
              CASE WHEN ${passVal} <> '' THEN crypt(${passVal}::text, gen_salt('bf')) ELSE crypt('admin123'::text, gen_salt('bf')) END
            )
          `;
        }
      }
    }

    // Obtener información actualizada
    const updatedResult = await sql`
      SELECT 
        t.id as tenant_id,
        t.nombre as tenant_nombre,
        t.rut as tenant_rut,
        t.activo as tenant_activo,
        t.created_at as tenant_created_at,
        u.id as admin_id,
        u.email as admin_email,
        u.nombre as admin_nombre,
        u.apellido as admin_apellido,
        u.activo as admin_activo
      FROM tenants t
      LEFT JOIN usuarios u ON u.tenant_id = t.id AND u.rol = 'admin'
      WHERE t.id = ${id}::uuid
    `;

    const updatedTenant = (updatedResult as any).rows[0];

    return NextResponse.json({
      ok: true,
      data: {
        tenant: {
          id: updatedTenant.tenant_id,
          nombre: updatedTenant.tenant_nombre,
          rut: updatedTenant.tenant_rut,
          activo: updatedTenant.tenant_activo,
          created_at: updatedTenant.tenant_created_at,
        },
        admin: {
          id: updatedTenant.admin_id,
          email: updatedTenant.admin_email,
          nombre: updatedTenant.admin_nombre,
          apellido: updatedTenant.admin_apellido,
          activo: updatedTenant.admin_activo,
        }
      },
      message: 'Tenant actualizado exitosamente'
    });

  } catch (e: any) {
    console.error('Error actualizando tenant:', e);
    return NextResponse.json({ ok:false, error:'internal', detail:String(e?.message ?? e), code:'INTERNAL' }, { status:500 });
  }
}
