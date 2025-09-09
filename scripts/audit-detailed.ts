import { sql } from '@vercel/postgres';

async function auditDetailed() {
  console.log('🔍 Auditoría detallada de datos...\n');
  
  try {
    // 1. Verificar todos los tenants
    console.log('1️⃣ TODOS LOS TENANTS:');
    const { rows: tenants } = await sql`
      SELECT id::text as id, nombre, created_at
      FROM tenants 
      ORDER BY created_at DESC
    `;
    
    for (const tenant of tenants) {
      console.log(`- ${tenant.nombre} (${tenant.id.substring(0, 8)}...) - Creado: ${tenant.created_at}`);
    }
    
    // 2. Verificar clientes sin tenant_id (datos antiguos)
    console.log('\n2️⃣ CLIENTES SIN TENANT_ID (datos antiguos):');
    const { rows: clientesSinTenant } = await sql`
      SELECT COUNT(*) as count FROM clientes WHERE tenant_id IS NULL
    `;
    console.log(`- Clientes sin tenant_id: ${clientesSinTenant[0].count}`);
    
    if (clientesSinTenant[0].count > 0) {
      const { rows: clientesDetalle } = await sql`
        SELECT id, nombre, email FROM clientes WHERE tenant_id IS NULL LIMIT 5
      `;
      console.log('  Ejemplos:', clientesDetalle.map(c => c.nombre));
    }
    
    // 3. Verificar instalaciones sin tenant_id
    console.log('\n3️⃣ INSTALACIONES SIN TENANT_ID:');
    const { rows: instalacionesSinTenant } = await sql`
      SELECT COUNT(*) as count FROM instalaciones WHERE tenant_id IS NULL
    `;
    console.log(`- Instalaciones sin tenant_id: ${instalacionesSinTenant[0].count}`);
    
    if (instalacionesSinTenant[0].count > 0) {
      const { rows: instalacionesDetalle } = await sql`
        SELECT id, nombre, cliente_id FROM instalaciones WHERE tenant_id IS NULL LIMIT 5
      `;
      console.log('  Ejemplos:', instalacionesDetalle.map(i => i.nombre));
    }
    
    // 4. Verificar guardias sin tenant_id
    console.log('\n4️⃣ GUARDIAS SIN TENANT_ID:');
    const { rows: guardiasSinTenant } = await sql`
      SELECT COUNT(*) as count FROM guardias WHERE tenant_id IS NULL
    `;
    console.log(`- Guardias sin tenant_id: ${guardiasSinTenant[0].count}`);
    
    // 5. Verificar usuarios por tenant
    console.log('\n5️⃣ USUARIOS POR TENANT:');
    const { rows: usuariosPorTenant } = await sql`
      SELECT 
        t.nombre as tenant_nombre,
        COUNT(u.id) as usuarios_count,
        STRING_AGG(u.email, ', ') as emails
      FROM tenants t
      LEFT JOIN usuarios u ON u.tenant_id = t.id
      GROUP BY t.id, t.nombre
      ORDER BY t.nombre
    `;
    
    for (const row of usuariosPorTenant) {
      console.log(`- ${row.tenant_nombre}: ${row.usuarios_count} usuarios`);
      if (row.emails) {
        console.log(`  Emails: ${row.emails}`);
      }
    }
    
    // 6. Verificar tenant por defecto del sistema
    console.log('\n6️⃣ TENANT POR DEFECTO:');
    const { rows: defaultTenant } = await sql`
      SELECT id::text as id, nombre FROM tenants 
      WHERE id = '550e8400-e29b-41d4-a716-446655440000'
    `;
    
    if (defaultTenant.length > 0) {
      console.log(`- Tenant por defecto: ${defaultTenant[0].nombre} (${defaultTenant[0].id})`);
    } else {
      console.log('- No existe tenant por defecto con ID 550e8400-e29b-41d4-a716-446655440000');
    }
    
    console.log('\n💡 RECOMENDACIONES:');
    console.log('1. Si hay datos sin tenant_id, migrarlos al tenant "Gard"');
    console.log('2. Eliminar tenants vacíos');
    console.log('3. Asegurar que Carlos.Irigoyen@gard.cl sea Super Admin del tenant principal');
    
  } catch (error) {
    console.error('❌ Error en auditoría:', error);
  }
}

auditDetailed().then(() => process.exit(0)).catch(console.error);
