import { sql } from '@vercel/postgres';

async function cleanupTenants() {
  console.log('🧹 Limpiando tenants...\n');
  
  try {
    // 1. Renombrar "GardOps" a "Gard" (tenant principal)
    console.log('1️⃣ Renombrando GardOps → Gard...');
    await sql`
      UPDATE tenants 
      SET nombre = 'Gard' 
      WHERE nombre = 'GardOps'
    `;
    console.log('✅ GardOps renombrado a Gard');
    
    // 2. Eliminar tenants vacíos
    const emptyTenants = [
      '5b6ccc9f-bfc1-48a3-a8de-f2454e2e7622', // Prueba Tenant
      '3bc6f44f-4b8f-41de-b031-9851bf04e673', // Pruyeba
      '1397e653-a702-4020-9702-3ae4f3f8b337', // Gard (vacío)
      '1cee3c7c-5cfb-4db9-83e5-26a20b6d6dc0'  // Empresa Demo
    ];
    
    console.log('\n2️⃣ Eliminando tenants vacíos...');
    for (const tenantId of emptyTenants) {
      try {
        // Eliminar en orden: usuarios, roles, tenant
        await sql`DELETE FROM usuarios_roles ur WHERE ur.rol_id IN (SELECT id FROM roles WHERE tenant_id = ${tenantId}::uuid)`;
        await sql`DELETE FROM roles_permisos rp WHERE rp.rol_id IN (SELECT id FROM roles WHERE tenant_id = ${tenantId}::uuid)`;
        await sql`DELETE FROM roles WHERE tenant_id = ${tenantId}::uuid`;
        await sql`DELETE FROM usuarios WHERE tenant_id = ${tenantId}::uuid`;
        await sql`DELETE FROM tenants WHERE id = ${tenantId}::uuid`;
        console.log(`✅ Tenant ${tenantId} eliminado`);
      } catch (e) {
        console.log(`⚠️ Error eliminando tenant ${tenantId}:`, e);
      }
    }
    
    // 3. Verificar resultado
    console.log('\n3️⃣ Verificando resultado...');
    const { rows } = await sql`
      SELECT id::text as id, nombre, created_at
      FROM tenants 
      ORDER BY created_at DESC
    `;
    
    console.log('\n📋 TENANTS FINALES:');
    for (const row of rows) {
      console.log(`- ${row.nombre} (${row.id.substring(0, 8)}...)`);
    }
    
    console.log('\n🎉 Limpieza completada!');
    console.log('💡 Ahora el selector debería mostrar solo "Gard" como opción principal.');
    
  } catch (error) {
    console.error('❌ Error en limpieza:', error);
  }
}

cleanupTenants().then(() => process.exit(0)).catch(console.error);
