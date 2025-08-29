import { sql } from '@vercel/postgres';

async function auditTenants() {
  console.log('🔍 Auditando uso de tenants...\n');
  
  try {
    const { rows } = await sql`
      SELECT 
        t.id::text                        AS id,
        t.nombre                          AS nombre,
        t.created_at                      AS created_at,
        COALESCE((SELECT COUNT(*) FROM clientes c WHERE c.tenant_id = t.id), 0)::int        AS clientes,
        COALESCE((SELECT COUNT(*) FROM instalaciones i WHERE i.tenant_id = t.id), 0)::int   AS instalaciones,
        COALESCE((SELECT COUNT(*) FROM guardias g WHERE g.tenant_id = t.id), 0)::int        AS guardias,
        COALESCE((
          SELECT COUNT(*) FROM as_turnos_puestos_operativos po 
          JOIN instalaciones i2 ON i2.id = po.instalacion_id 
          WHERE i2.tenant_id = t.id
        ), 0)::int AS puestos,
        COALESCE((
          SELECT COUNT(*) FROM as_turnos_puestos_operativos po 
          JOIN instalaciones i2 ON i2.id = po.instalacion_id 
          WHERE i2.tenant_id = t.id AND po.es_ppc = true AND po.activo = true
        ), 0)::int AS ppc_activos,
        COALESCE((
          SELECT COUNT(*) FROM documentos_clientes dc 
          JOIN clientes c2 ON c2.id = dc.cliente_id 
          WHERE c2.tenant_id = t.id
        ), 0)::int AS documentos_clientes,
        COALESCE((
          SELECT COUNT(*) FROM documentos_instalacion di 
          JOIN instalaciones i3 ON i3.id = di.instalacion_id 
          WHERE i3.tenant_id = t.id
        ), 0)::int AS documentos_instalacion,
        COALESCE((
          SELECT COUNT(*) FROM documentos_guardias dg 
          JOIN guardias g2 ON g2.id = dg.guardia_id 
          WHERE g2.tenant_id = t.id
        ), 0)::int AS documentos_guardias,
        COALESCE((
          SELECT COUNT(*) FROM TE_turnos_extras te 
          JOIN instalaciones ix ON ix.id = te.instalacion_id 
          WHERE ix.tenant_id = t.id
        ), 0)::int AS turnos_extras
      FROM tenants t
      ORDER BY t.created_at DESC
    `;

    console.log('📊 RESULTADO DEL ANÁLISIS:\n');
    console.log('ID                                    | Nombre           | Clientes | Inst | Guardias | Puestos | PPC | Docs | Empty |');
    console.log('--------------------------------------|------------------|----------|------|----------|---------|-----|------|-------|');
    
    let totalEmpty = 0;
    let gardTenant: any = null;
    
    for (const row of rows) {
      const empty = [row.clientes, row.instalaciones, row.guardias, row.puestos, row.ppc_activos, row.documentos_clientes, row.documentos_instalacion, row.documentos_guardias, row.turnos_extras]
        .every(v => Number(v || 0) === 0);
      
      if (empty) totalEmpty++;
      if (row.nombre.toLowerCase().includes('gard') && !row.nombre.toLowerCase().includes('gardops')) {
        gardTenant = row;
      }
      
      console.log(
        `${row.id.substring(0, 8)}... | ${row.nombre.padEnd(16)} | ${String(row.clientes).padStart(8)} | ${String(row.instalaciones).padStart(4)} | ${String(row.guardias).padStart(8)} | ${String(row.puestos).padStart(7)} | ${String(row.ppc_activos).padStart(3)} | ${String(row.documentos_clientes + row.documentos_instalacion + row.documentos_guardias).padStart(4)} | ${empty ? '✅' : '❌'} |`
      );
    }
    
    console.log('\n📋 RESUMEN:');
    console.log(`- Total tenants: ${rows.length}`);
    console.log(`- Tenants vacíos: ${totalEmpty}`);
    console.log(`- Tenants con datos: ${rows.length - totalEmpty}`);
    
    if (gardTenant) {
      console.log(`\n🏢 TENANT PRINCIPAL "GARD":`);
      console.log(`- ID: ${gardTenant.id}`);
      console.log(`- Nombre: ${gardTenant.nombre}`);
      console.log(`- Clientes: ${gardTenant.clientes}`);
      console.log(`- Instalaciones: ${gardTenant.instalaciones}`);
      console.log(`- Guardias: ${gardTenant.guardias}`);
      console.log(`- Vacío: ${[gardTenant.clientes, gardTenant.instalaciones, gardTenant.guardias].every(v => Number(v || 0) === 0) ? 'SÍ' : 'NO'}`);
    }
    
    console.log('\n💡 RECOMENDACIONES:');
    console.log('1. Mantener "Gard" (tenant principal)');
    console.log('2. Eliminar tenants con "Empty: ✅"');
    console.log('3. Revisar tenants con pocos datos antes de eliminar');
    
  } catch (error) {
    console.error('❌ Error auditando tenants:', error);
  }
}

auditTenants().then(() => process.exit(0)).catch(console.error);
