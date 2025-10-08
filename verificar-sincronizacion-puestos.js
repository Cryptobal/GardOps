require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

const INSTALACION_ID = '19e4dfc1-f7de-433e-976f-4a23f1d1d47e'; // Chañaral

async function verificarSincronizacion() {
  try {
    console.log('\n🔍 VERIFICANDO SINCRONIZACIÓN DE PUESTOS\n');
    console.log('═'.repeat(70));
    console.log(`Instalación ID: ${INSTALACION_ID}\n`);
    
    // 1. Obtener TODOS los puestos en as_turnos_puestos_operativos
    const todosLosPuestos = await pool.query(`
      SELECT 
        id,
        nombre_puesto,
        guardia_id,
        es_ppc,
        activo,
        rol_id,
        creado_en,
        eliminado_en
      FROM as_turnos_puestos_operativos
      WHERE instalacion_id = $1
      ORDER BY creado_en
    `, [INSTALACION_ID]);
    
    console.log(`📊 TOTAL DE PUESTOS EN BD: ${todosLosPuestos.rows.length}\n`);
    
    todosLosPuestos.rows.forEach((p, i) => {
      const tieneGuardia = p.guardia_id ? '👤 CON GUARDIA' : '⭕ SIN GUARDIA';
      const estado = p.activo ? '✅ ACTIVO' : '❌ INACTIVO';
      const tipo = p.es_ppc ? '🔴 PPC' : '🟢 ASIGNADO';
      const eliminado = p.eliminado_en ? `🗑️ Eliminado: ${p.eliminado_en}` : '';
      
      console.log(`${i + 1}. ${p.nombre_puesto || 'Sin nombre'}`);
      console.log(`   ${tipo} | ${estado} | ${tieneGuardia} ${eliminado}`);
      console.log(`   ID: ${p.id}`);
      console.log(`   Guardia ID: ${p.guardia_id || 'null'}`);
      console.log('');
    });
    
    // 2. Puestos ACTIVOS
    const puestosActivos = todosLosPuestos.rows.filter(p => p.activo);
    console.log(`\n✅ PUESTOS ACTIVOS: ${puestosActivos.length}`);
    puestosActivos.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.nombre_puesto} ${p.guardia_id ? '(con guardia)' : '(vacante)'}`);
    });
    
    // 3. Puestos INACTIVOS
    const puestosInactivos = todosLosPuestos.rows.filter(p => !p.activo);
    console.log(`\n❌ PUESTOS INACTIVOS: ${puestosInactivos.length}`);
    puestosInactivos.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.nombre_puesto} (eliminado: ${p.eliminado_en || 'N/A'})`);
    });
    
    // 4. Verificar qué se muestra en Pauta Mensual
    const puestosEnPauta = await pool.query(`
      SELECT
        po.id,
        po.nombre_puesto,
        po.guardia_id,
        po.es_ppc,
        po.activo,
        po.creado_en
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1
        AND po.activo = true
      ORDER BY po.creado_en
    `, [INSTALACION_ID]);
    
    console.log(`\n📅 PUESTOS QUE DEBERÍAN VERSE EN PAUTA MENSUAL: ${puestosEnPauta.rows.length}\n`);
    puestosEnPauta.rows.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.nombre_puesto} ${p.es_ppc ? '(PPC)' : '(Asignado)'}`);
    });
    
    console.log('\n═'.repeat(70));
    console.log('\n📋 RESUMEN:');
    console.log(`   Total puestos: ${todosLosPuestos.rows.length}`);
    console.log(`   Activos: ${puestosActivos.length}`);
    console.log(`   Inactivos: ${puestosInactivos.length}`);
    console.log(`   Deberían verse en Pauta: ${puestosEnPauta.rows.length}`);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verificarSincronizacion();

