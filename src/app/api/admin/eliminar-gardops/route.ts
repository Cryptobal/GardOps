import { requireAuthz } from '@/lib/authz-api';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  // Requiere ser Platform Admin
  const deny = await requireAuthz(request, { resource: 'admin', action: 'manage:tenants' });
  if (deny) return deny;

  try {
    console.log('🗑️ Eliminando tenant GardOps...');
    
    // 1. Verificar que GardOps existe y está vacío
    const { rows } = await sql`
      SELECT 
        t.id::text as id,
        t.nombre,
        COALESCE((SELECT COUNT(*) FROM clientes c WHERE c.tenant_id = t.id), 0)::int as clientes,
        COALESCE((SELECT COUNT(*) FROM instalaciones i WHERE i.tenant_id = t.id), 0)::int as instalaciones,
        COALESCE((SELECT COUNT(*) FROM guardias g WHERE g.tenant_id = t.id), 0)::int as guardias
      FROM tenants t 
      WHERE t.nombre = 'GardOps'
    `;
    
    if (rows.length === 0) {
      return NextResponse.json({ ok: true, message: 'Tenant GardOps no existe' });
    }
    
    const tenant = rows[0];
    console.log(`📋 Tenant encontrado: ${tenant.nombre} (${tenant.id})`);
    console.log(`- Clientes: ${tenant.clientes}`);
    console.log(`- Instalaciones: ${tenant.instalaciones}`);
    console.log(`- Guardias: ${tenant.guardias}`);
    
    if (tenant.clientes > 0 || tenant.instalaciones > 0 || tenant.guardias > 0) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Tenant GardOps tiene datos. No se puede eliminar.' 
      }, { status: 400 });
    }
    
    // 2. Eliminar tenant GardOps
    await sql`DELETE FROM tenants WHERE nombre = 'GardOps'`;
    console.log('✅ Tenant GardOps eliminado');
    
    // 3. Verificar resultado
    const { rows: remainingTenants } = await sql`
      SELECT id::text as id, nombre, created_at
      FROM tenants 
      ORDER BY created_at DESC
    `;
    
    console.log('📋 Tenants restantes:', remainingTenants.map(t => t.nombre));
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Tenant GardOps eliminado exitosamente',
      remainingTenants: remainingTenants.map(t => ({ id: t.id, nombre: t.nombre }))
    });
    
  } catch (error) {
    console.error('❌ Error eliminando GardOps:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}
