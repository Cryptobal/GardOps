import { sql } from '@vercel/postgres';

async function migrateToGard() {
  console.log('🚀 Migrando toda la data al tenant Gard...\n');
  
  try {
    // 1. Obtener el ID del tenant "Gard"
    console.log('1️⃣ Obteniendo ID del tenant Gard...');
    const { rows: gardTenant } = await sql`
      SELECT id::text as id, nombre FROM tenants WHERE nombre = 'Gard' LIMIT 1
    `;
    
    if (gardTenant.length === 0) {
      console.log('❌ No se encontró el tenant "Gard"');
      return;
    }
    
    const gardId = gardTenant[0].id;
    console.log(`✅ Tenant Gard encontrado: ${gardId}`);
    
    // 2. Contar datos sin tenant_id
    console.log('\n2️⃣ Contando datos sin tenant_id...');
    const { rows: counts } = await sql`
      SELECT 
        (SELECT COUNT(*) FROM clientes WHERE tenant_id IS NULL) as clientes_sin_tenant,
        (SELECT COUNT(*) FROM instalaciones WHERE tenant_id IS NULL) as instalaciones_sin_tenant,
        (SELECT COUNT(*) FROM guardias WHERE tenant_id IS NULL) as guardias_sin_tenant
    `;
    
    console.log(`- Clientes sin tenant_id: ${counts[0].clientes_sin_tenant}`);
    console.log(`- Instalaciones sin tenant_id: ${counts[0].instalaciones_sin_tenant}`);
    console.log(`- Guardias sin tenant_id: ${counts[0].guardias_sin_tenant}`);
    
    // 3. Migrar clientes sin tenant_id → Gard
    if (counts[0].clientes_sin_tenant > 0) {
      console.log('\n3️⃣ Migrando clientes sin tenant_id → Gard...');
      const { rowCount: clientesMigrados } = await sql`
        UPDATE clientes 
        SET tenant_id = ${gardId}::uuid 
        WHERE tenant_id IS NULL
      `;
      console.log(`✅ ${clientesMigrados} clientes migrados a Gard`);
    }
    
    // 4. Migrar instalaciones sin tenant_id → Gard
    if (counts[0].instalaciones_sin_tenant > 0) {
      console.log('\n4️⃣ Migrando instalaciones sin tenant_id → Gard...');
      const { rowCount: instalacionesMigradas } = await sql`
        UPDATE instalaciones 
        SET tenant_id = ${gardId}::uuid 
        WHERE tenant_id IS NULL
      `;
      console.log(`✅ ${instalacionesMigradas} instalaciones migradas a Gard`);
    }
    
    // 5. Migrar guardias sin tenant_id → Gard
    if (counts[0].guardias_sin_tenant > 0) {
      console.log('\n5️⃣ Migrando guardias sin tenant_id → Gard...');
      const { rowCount: guardiasMigrados } = await sql`
        UPDATE guardias 
        SET tenant_id = ${gardId}::uuid 
        WHERE tenant_id IS NULL
      `;
      console.log(`✅ ${guardiasMigrados} guardias migrados a Gard`);
    }
    
    // 6. Migrar guardias de GardOps → Gard
    console.log('\n6️⃣ Migrando guardias de GardOps → Gard...');
    const { rows: gardOpsTenant } = await sql`
      SELECT id::text as id FROM tenants WHERE nombre = 'GardOps' LIMIT 1
    `;
    
    if (gardOpsTenant.length > 0) {
      const gardOpsId = gardOpsTenant[0].id;
      const { rowCount: guardiasGardOps } = await sql`
        UPDATE guardias 
        SET tenant_id = ${gardId}::uuid 
        WHERE tenant_id = ${gardOpsId}::uuid
      `;
      console.log(`✅ ${guardiasGardOps} guardias migrados de GardOps a Gard`);
    }
    
    // 7. Verificar que Carlos.Irigoyen@gard.cl sea Super Admin
    console.log('\n7️⃣ Verificando Carlos.Irigoyen@gard.cl...');
    const { rows: carlosUser } = await sql`
      SELECT id::text as id, email, rol, tenant_id::text as tenant_id 
      FROM usuarios 
      WHERE email = 'carlos.irigoyen@gard.cl'
    `;
    
    if (carlosUser.length > 0) {
      console.log(`✅ Carlos.Irigoyen@gard.cl encontrado:`);
      console.log(`  - ID: ${carlosUser[0].id}`);
      console.log(`  - Rol: ${carlosUser[0].rol}`);
      console.log(`  - Tenant: ${carlosUser[0].tenant_id}`);
      
      // Asegurar que esté en el tenant Gard
      if (carlosUser[0].tenant_id !== gardId) {
        await sql`
          UPDATE usuarios 
          SET tenant_id = ${gardId}::uuid 
          WHERE email = 'carlos.irigoyen@gard.cl'
        `;
        console.log(`✅ Carlos.Irigoyen@gard.cl asignado al tenant Gard`);
      }
    } else {
      console.log('⚠️ Carlos.Irigoyen@gard.cl no encontrado');
    }
    
    // 8. Eliminar tenants vacíos
    console.log('\n8️⃣ Eliminando tenants vacíos...');
    const emptyTenants = [
      '5b6ccc9f-bfc1-48a3-a8de-f2454e2e7622', // Prueba Tenant
      '3bc6f44f-4b8f-41de-b031-9851bf04e673', // Pruyeba
      '1cee3c7c-5cfb-4db9-83e5-26a20b6d6dc0'  // Empresa Demo
    ];
    
    // Solo eliminar GardOps si ya migramos sus datos
    if (gardOpsTenant.length > 0) {
      emptyTenants.push(gardOpsTenant[0].id);
    }
    
    for (const tenantId of emptyTenants) {
      try {
        console.log(`🗑️ Eliminando tenant ${tenantId}...`);
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
    
    // 9. Crear tenant de prueba
    console.log('\n9️⃣ Creando tenant de prueba...');
    const { rows: demoTenant } = await sql`
      INSERT INTO tenants (nombre, rut, activo)
      VALUES ('Tenant Demo', '12.345.678-9', true)
      RETURNING id::text as id, nombre
    `;
    
    if (demoTenant.length > 0) {
      const demoId = demoTenant[0].id;
      console.log(`✅ Tenant Demo creado: ${demoId}`);
      
      // Crear admin para el tenant demo
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
      console.log(`✅ Admin demo creado: admin@demo.com / admin123`);
    }
    
    // 10. Verificar resultado final
    console.log('\n🔍 Verificando resultado final...');
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
    
    console.log('\n📋 TENANTS FINALES:');
    for (const tenant of finalTenants) {
      console.log(`- ${tenant.nombre} (${tenant.id.substring(0, 8)}...)`);
      console.log(`  Clientes: ${tenant.clientes}, Instalaciones: ${tenant.instalaciones}, Guardias: ${tenant.guardias}`);
    }
    
    console.log('\n🎉 Migración completada!');
    console.log('💡 Ahora el selector debería mostrar:');
    console.log('   - Gard (tenant principal con todos los datos)');
    console.log('   - Tenant Demo (para hacer pruebas)');
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
  }
}

migrateToGard().then(() => process.exit(0)).catch(console.error); 
