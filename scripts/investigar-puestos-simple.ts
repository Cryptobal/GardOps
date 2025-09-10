import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function investigarPuestosPPC() {
  try {
    console.log('🔍 Investigando puestos PPC en la base de datos...\n');

    // Consultar todos los puestos operativos
    const puestosResult = await pool.query(`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.guardia_id,
        po.es_ppc,
        po.activo,
        po.instalacion_id,
        i.nombre as instalacion_nombre,
        g.nombre as guardia_nombre,
        g.apellido_paterno,
        g.apellido_materno,
        rs.nombre as rol_nombre
      FROM as_turnos_puestos_operativos po
      LEFT JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.activo = true
      ORDER BY i.nombre, po.nombre_puesto
    `);

    console.log(`📊 Total de puestos activos: ${puestosResult.rows.length}\n`);

    // Agrupar por instalación
    const puestosPorInstalacion = puestosResult.rows.reduce((acc: any, puesto: any) => {
      if (!acc[puesto.instalacion_nombre]) {
        acc[puesto.instalacion_nombre] = [];
      }
      acc[puesto.instalacion_nombre].push(puesto);
      return acc;
    }, {});

    // Mostrar cada instalación
    for (const [instalacion, puestos] of Object.entries(puestosPorInstalacion)) {
      console.log(`🏢 INSTALACIÓN: ${instalacion}`);
      console.log('=' .repeat(50));
      
      (puestos as any[]).forEach((puesto: any) => {
        const tieneGuardia = puesto.guardia_id ? '✅' : '❌';
        const esPPC = puesto.es_ppc ? 'PPC' : 'ASIGNADO';
        const guardiaNombre = puesto.guardia_nombre 
          ? `${puesto.guardia_nombre} ${puesto.apellido_paterno} ${puesto.apellido_materno}`.trim()
          : 'Sin guardia';
        
        console.log(`  ${tieneGuardia} ${puesto.nombre_puesto} (${esPPC})`);
        console.log(`     ID: ${puesto.id}`);
        console.log(`     Guardia ID: ${puesto.guardia_id || 'NULL'}`);
        console.log(`     Guardia: ${guardiaNombre}`);
        console.log(`     Rol: ${puesto.rol_nombre || 'Sin rol'}`);
        console.log('');
      });
    }

    // Verificar específicamente los puestos PPC
    const puestosPPC = puestosResult.rows.filter((p: any) => p.es_ppc);
    console.log(`\n🔍 PUESTOS PPC (${puestosPPC.length}):`);
    console.log('=' .repeat(50));
    
    puestosPPC.forEach((puesto: any) => {
      const tieneGuardia = puesto.guardia_id ? '⚠️  PROBLEMA' : '✅ OK';
      console.log(`${tieneGuardia} ${puesto.nombre_puesto} - Guardia ID: ${puesto.guardia_id || 'NULL'}`);
    });

    // Verificar si hay registros en pauta mensual para estos puestos
    if (puestosPPC.length > 0) {
      console.log('\n📅 VERIFICANDO PAUTA MENSUAL...');
      console.log('=' .repeat(50));
      
      for (const puesto of puestosPPC) {
        const pautaResult = await pool.query(`
          SELECT COUNT(*) as count, MIN(dia) as min_dia, MAX(dia) as max_dia
          FROM as_turnos_pauta_mensual 
          WHERE puesto_id = $1 AND anio = 2025 AND mes = 9
        `, [puesto.id]);
        
        const count = parseInt(pautaResult.rows[0].count);
        if (count > 0) {
          console.log(`⚠️  ${puesto.nombre_puesto}: ${count} registros en pauta (días ${pautaResult.rows[0].min_dia}-${pautaResult.rows[0].max_dia})`);
        } else {
          console.log(`✅ ${puesto.nombre_puesto}: Sin registros en pauta`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error investigando puestos PPC:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

investigarPuestosPPC();
