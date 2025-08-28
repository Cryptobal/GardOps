import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function testConsistenciaFiltros() {
  console.log('🧪 VERIFICANDO CONSISTENCIA DE FILTROS EN ENDPOINTS');
  console.log('==================================================\n');

  try {
    const instalacionId = '0e8ba906-e64b-4d4d-a104-ba29f21f48a9';
    
    console.log('🔍 Probando instalación:', instalacionId);

    // 1. Test filtro restrictivo (debería fallar)
    console.log('\n1️⃣ TEST FILTRO RESTRICTIVO (activo = true):');
    const puestosRestrictivo = await query(`
      SELECT COUNT(*) as count
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1 AND po.activo = true
    `, [instalacionId]);
    
    console.log(`  Puestos con filtro restrictivo: ${puestosRestrictivo.rows[0].count}`);

    // 2. Test filtro correcto (debería funcionar)
    console.log('\n2️⃣ TEST FILTRO CORRECTO (activo = true OR activo IS NULL):');
    const puestosCorrecto = await query(`
      SELECT COUNT(*) as count
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1 AND (po.activo = true OR po.activo IS NULL)
    `, [instalacionId]);
    
    console.log(`  Puestos con filtro correcto: ${puestosCorrecto.rows[0].count}`);

    // 3. Test sin filtro (para comparar)
    console.log('\n3️⃣ TEST SIN FILTRO (todos los puestos):');
    const puestosSinFiltro = await query(`
      SELECT COUNT(*) as count
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1
    `, [instalacionId]);
    
    console.log(`  Puestos sin filtro: ${puestosSinFiltro.rows[0].count}`);

    // 4. Verificar valores de activo
    console.log('\n4️⃣ VALORES DE ACTIVO EN LA BASE DE DATOS:');
    const valoresActivo = await query(`
      SELECT activo, COUNT(*) as count
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1
      GROUP BY activo
      ORDER BY activo
    `, [instalacionId]);
    
    valoresActivo.rows.forEach((row: any) => {
      console.log(`  - activo = ${row.activo}: ${row.count} puestos`);
    });

    // 5. Verificar que el filtro correcto devuelve los mismos datos que sin filtro
    console.log('\n5️⃣ VERIFICACIÓN DE CONSISTENCIA:');
    if (puestosCorrecto.rows[0].count === puestosSinFiltro.rows[0].count) {
      console.log('  ✅ El filtro correcto devuelve todos los puestos');
    } else {
      console.log('  ❌ El filtro correcto no devuelve todos los puestos');
    }

    if (puestosRestrictivo.rows[0].count < puestosCorrecto.rows[0].count) {
      console.log('  ✅ El filtro restrictivo excluye puestos (como se esperaba)');
    } else {
      console.log('  ⚠️ El filtro restrictivo no excluye puestos');
    }

    console.log('\n📊 RESUMEN:');
    console.log(`  - Filtro restrictivo: ${puestosRestrictivo.rows[0].count} puestos`);
    console.log(`  - Filtro correcto: ${puestosCorrecto.rows[0].count} puestos`);
    console.log(`  - Sin filtro: ${puestosSinFiltro.rows[0].count} puestos`);

  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testConsistenciaFiltros().then(() => {
    console.log('\n✅ Test completado');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { testConsistenciaFiltros };
