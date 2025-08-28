import { sql } from '@vercel/postgres';

async function eliminarGardOps() {
  console.log('🗑️ Eliminando tenant GardOps...\n');
  
  try {
    // 1. Verificar que GardOps existe y está vacío
    console.log('1️⃣ Verificando tenant GardOps...');
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
      console.log('✅ Tenant GardOps no existe');
      return;
    }
    
    const tenant = rows[0];
    console.log(`📋 Tenant encontrado: ${tenant.nombre} (${tenant.id})`);
    console.log(`- Clientes: ${tenant.clientes}`);
    console.log(`- Instalaciones: ${tenant.instalaciones}`);
    console.log(`- Guardias: ${tenant.guardias}`);
    
    if (tenant.clientes > 0 || tenant.instalaciones > 0 || tenant.guardias > 0) {
      console.log('❌ ERROR: Tenant GardOps tiene datos. No se puede eliminar.');
      return;
    }
    
    // 2. Eliminar tenant GardOps
    console.log('\n2️⃣ Eliminando tenant GardOps...');
    await sql`DELETE FROM tenants WHERE nombre = 'GardOps'`;
    console.log('✅ Tenant GardOps eliminado');
    
    // 3. Verificar resultado
    console.log('\n3️⃣ Verificando tenants restantes...');
    const { rows: remainingTenants } = await sql`
      SELECT id::text as id, nombre, created_at
      FROM tenants 
      ORDER BY created_at DESC
    `;
    
    console.log('\n📋 TENANTS RESTANTES:');
    for (const row of remainingTenants) {
      console.log(`- ${row.nombre} (${row.id.substring(0, 8)}...)`);
    }
    
    console.log('\n🎉 Eliminación completada!');
    
  } catch (error) {
    console.error('❌ Error eliminando GardOps:', error);
  }
}

eliminarGardOps().then(() => process.exit(0)).catch(console.error);
