import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requireAuthz } from '@/lib/authz-api';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';

// POST /api/admin/migrate-to-gard
// Migra toda la data al tenant Gard y limpia tenants vacíos
export async function POST(request: NextRequest) {
  // Requiere ser Platform Admin
  const deny = await requireAuthz(request, { resource: 'configuracion', action: 'manage:roles' });
  if (deny) {
    // Fallback al mismo patrón permisivo del resto de endpoints admin
    try {
      const email = await getUserEmail(request);
      if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
      const userId = await getUserIdByEmail(email);
      if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });
      const allowed = (await userHasPerm(userId, 'rbac.platform_admin'));
      if (!allowed) return NextResponse.json({ ok:false, error:'forbidden', code:'FORBIDDEN' }, { status:403 });
    } catch (e) {
      return deny;
    }
  }

  try {
    console.log('🚀 Iniciando migración a Gard...');
    
    // 1. Obtener el ID del tenant "Gard"
    const { rows: gardTenant } = await sql`
      SELECT id::text as id, nombre FROM tenants WHERE nombre = 'Gard' LIMIT 1
    `;
    
    if (gardTenant.length === 0) {
      return NextResponse.json({ ok: false, error: 'Tenant Gard no encontrado' }, { status: 404 });
    }
    
    const gardId = gardTenant[0].id;
    console.log(`✅ Tenant Gard encontrado: ${gardId}`);
    
    // 2. Contar datos sin tenant_id
    const { rows: counts } = await sql`
      SELECT 
        (SELECT COUNT(*) FROM clientes WHERE tenant_id IS NULL) as clientes_sin_tenant,
        (SELECT COUNT(*) FROM instalaciones WHERE tenant_id IS NULL) as instalaciones_sin_tenant,
        (SELECT COUNT(*) FROM guardias WHERE tenant_id IS NULL) as guardias_sin_tenant
    `;
    
    const clientesSinTenant = counts[0].clientes_sin_tenant;
    const instalacionesSinTenant = counts[0].instalaciones_sin_tenant;
    const guardiasSinTenant = counts[0].guardias_sin_tenant;
    
    // 3. Migrar clientes sin tenant_id → Gard
    let clientesMigrados = 0;
    if (clientesSinTenant > 0) {
      const { rowCount } = await sql`
        UPDATE clientes 
        SET tenant_id = ${gardId}::uuid 
        WHERE tenant_id IS NULL
      `;
      clientesMigrados = rowCount;
    }
    
    // 4. Migrar instalaciones sin tenant_id → Gard
    let instalacionesMigradas = 0;
    if (instalacionesSinTenant > 0) {
      const { rowCount } = await sql`
        UPDATE instalaciones 
        SET tenant_id = ${gardId}::uuid 
        WHERE tenant_id IS NULL
      `;
      instalacionesMigradas = rowCount;
    }
    
    // 5. Migrar guardias sin tenant_id → Gard
    let guardiasMigrados = 0;
    if (guardiasSinTenant > 0) {
      const { rowCount } = await sql`
        UPDATE guardias 
        SET tenant_id = ${gardId}::uuid 
        WHERE tenant_id IS NULL
      `;
      guardiasMigrados = rowCount;
    }
    
    // 6. Migrar guardias de GardOps → Gard
    const { rows: gardOpsTenant } = await sql`
      SELECT id::text as id FROM tenants WHERE nombre = 'GardOps' LIMIT 1
    `;
    
    let guardiasGardOps = 0;
    if (gardOpsTenant.length > 0) {
      const gardOpsId = gardOpsTenant[0].id;
      const { rowCount } = await sql`
        UPDATE guardias 
        SET tenant_id = ${gardId}::uuid 
        WHERE tenant_id = ${gardOpsId}::uuid
      `;
      guardiasGardOps = rowCount;
    }
    
    // 7. Verificar Carlos.Irigoyen@gard.cl
    const { rows: carlosUser } = await sql`
      SELECT id::text as id, email, rol, tenant_id::text as tenant_id 
      FROM usuarios 
      WHERE email = 'carlos.irigoyen@gard.cl'
    `;
    
    let carlosActualizado = false;
    if (carlosUser.length > 0 && carlosUser[0].tenant_id !== gardId) {
      await sql`
        UPDATE usuarios 
        SET tenant_id = ${gardId}::uuid 
        WHERE email = 'carlos.irigoyen@gard.cl'
      `;
      carlosActualizado = true;
    }
    
    // 8. Eliminar tenants vacíos
    const emptyTenants = [
      '5b6ccc9f-bfc1-48a3-a8de-f2454e2e7622', // Prueba Tenant
      '3bc6f44f-4b8f-41de-b031-9851bf04e673', // Pruyeba
      '1cee3c7c-5cfb-4db9-83e5-26a20b6d6dc0'  // Empresa Demo
    ];
    
    if (gardOpsTenant.length > 0) {
      emptyTenants.push(gardOpsTenant[0].id);
    }
    
    let tenantsEliminados = 0;
    for (const tenantId of emptyTenants) {
      try {
        await sql`DELETE FROM usuarios_roles ur WHERE ur.rol_id IN (SELECT id FROM roles WHERE tenant_id = ${tenantId}::uuid)`;
        await sql`DELETE FROM roles_permisos rp WHERE rp.rol_id IN (SELECT id FROM roles WHERE tenant_id = ${tenantId}::uuid)`;
        await sql`DELETE FROM roles WHERE tenant_id = ${tenantId}::uuid`;
        await sql`DELETE FROM usuarios WHERE tenant_id = ${tenantId}::uuid`;
        await sql`DELETE FROM tenants WHERE id = ${tenantId}::uuid`;
        tenantsEliminados++;
      } catch (e) {
        console.log(`Error eliminando tenant ${tenantId}:`, e);
      }
    }
    
    // 9. Crear tenant de prueba
    const { rows: demoTenant } = await sql`
      INSERT INTO tenants (nombre, rut, activo)
      VALUES ('Tenant Demo', '12.345.678-9', true)
      RETURNING id::text as id, nombre
    `;
    
    let demoAdminCreado = false;
    if (demoTenant.length > 0) {
      const demoId = demoTenant[0].id;
      await sql`
        INSERT INTO usuarios (tenant_id, email, password, nombre, apellido, rol, activo)
        VALUES (
          ${demoId}::uuid,
          'admin@demo.com',
          crypt('admin123', gen_salt('bf')),
          'Admin',
          'Demo',
          'admin',
          true
        )
      `;
      demoAdminCreado = true;
    }
    
    // 10. Verificar resultado final
    const { rows: finalTenants } = await sql`
      SELECT 
        t.id::text as id, 
        t.nombre,
        (SELECT COUNT(*) FROM clientes c WHERE c.tenant_id = t.id) as clientes,
        (SELECT COUNT(*) FROM instalaciones i WHERE i.tenant_id = t.id) as instalaciones,
        (SELECT COUNT(*) FROM guardias g WHERE g.tenant_id = t.id) as guardias
      FROM tenants t
      ORDER BY t.nombre
    `;
    
    return NextResponse.json({
      ok: true,
      message: 'Migración completada exitosamente',
      summary: {
        clientesMigrados,
        instalacionesMigradas,
        guardiasMigrados,
        guardiasGardOps,
        carlosActualizado,
        tenantsEliminados,
        demoAdminCreado
      },
      finalTenants: finalTenants.map(t => ({
        id: t.id,
        nombre: t.nombre,
        clientes: Number(t.clientes),
        instalaciones: Number(t.instalaciones),
        guardias: Number(t.guardias)
      }))
    });
    
  } catch (e: any) {
    console.error('Error en migración:', e);
    return NextResponse.json({ 
      ok: false, 
      error: 'internal', 
      detail: String(e?.message ?? e), 
      code: 'INTERNAL' 
    }, { status: 500 });
  }
}
