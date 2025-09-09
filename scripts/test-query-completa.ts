import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function testQueryCompleta() {
  console.log('🧪 PROBANDO CONSULTA SQL DEL ENDPOINT COMPLETA');
  console.log('==============================================\n');

  try {
    const instalacionId = '0e8ba906-e64b-4d4d-a104-ba29f21f48a9';
    
    console.log('🔍 Probando instalación:', instalacionId);

    // 1. Verificar datos sin filtro activo
    console.log('\n1️⃣ CONSULTA SIN FILTRO ACTIVO:');
    const puestosSinFiltro = await query(`
      SELECT 
        po.id,
        po.instalacion_id,
        po.rol_id,
        po.guardia_id,
        po.nombre_puesto,
        po.es_ppc,
        po.activo,
        po.creado_en,
        po.tipo_puesto_id
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1
      ORDER BY po.rol_id, po.nombre_puesto
    `, [instalacionId]);
    
    console.log(`Puestos encontrados sin filtro: ${puestosSinFiltro.rows.length}`);
    puestosSinFiltro.rows.forEach((row: any) => {
      console.log(`  - ${row.nombre_puesto} (Activo: ${row.activo}, PPC: ${row.es_ppc})`);
    });

    // 2. Verificar datos con filtro activo = true
    console.log('\n2️⃣ CONSULTA CON FILTRO ACTIVO = TRUE:');
    const puestosConFiltro = await query(`
      SELECT 
        po.id,
        po.instalacion_id,
        po.rol_id,
        po.guardia_id,
        po.nombre_puesto,
        po.es_ppc,
        po.activo,
        po.creado_en,
        po.tipo_puesto_id
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1 AND po.activo = true
      ORDER BY po.rol_id, po.nombre_puesto
    `, [instalacionId]);
    
    console.log(`Puestos encontrados con filtro activo=true: ${puestosConFiltro.rows.length}`);
    puestosConFiltro.rows.forEach((row: any) => {
      console.log(`  - ${row.nombre_puesto} (Activo: ${row.activo}, PPC: ${row.es_ppc})`);
    });

    // 3. Verificar datos con filtro activo IS NULL
    console.log('\n3️⃣ CONSULTA CON FILTRO ACTIVO IS NULL:');
    const puestosNull = await query(`
      SELECT 
        po.id,
        po.instalacion_id,
        po.rol_id,
        po.guardia_id,
        po.nombre_puesto,
        po.es_ppc,
        po.activo,
        po.creado_en,
        po.tipo_puesto_id
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1 AND (po.activo IS NULL OR po.activo = true)
      ORDER BY po.rol_id, po.nombre_puesto
    `, [instalacionId]);
    
    console.log(`Puestos encontrados con filtro activo IS NULL OR true: ${puestosNull.rows.length}`);
    puestosNull.rows.forEach((row: any) => {
      console.log(`  - ${row.nombre_puesto} (Activo: ${row.activo}, PPC: ${row.es_ppc})`);
    });

    // 4. Verificar todos los valores de activo
    console.log('\n4️⃣ TODOS LOS VALORES DE ACTIVO:');
    const todosActivos = await query(`
      SELECT DISTINCT activo, COUNT(*) as cantidad
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1
      GROUP BY activo
    `, [instalacionId]);
    
    console.log('Valores de activo encontrados:');
    todosActivos.rows.forEach((row: any) => {
      console.log(`  - activo = ${row.activo}: ${row.cantidad} puestos`);
    });

  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testQueryCompleta().then(() => {
    console.log('\n✅ Test completado');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { testQueryCompleta };
