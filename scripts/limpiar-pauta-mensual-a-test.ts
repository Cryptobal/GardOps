import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function limpiarPautaMensualATest() {
  console.log('🧹 LIMPIEZA DE PAUTA MENSUAL PARA INSTALACIÓN A-TEST\n');

  const instalacionId = '7e05a55d-8db6-4c20-b51c-509f09d69f74';

  try {
    // 1. Obtener puestos operativos de la instalación
    console.log('1️⃣ OBTENIENDO PUESTOS OPERATIVOS DE LA INSTALACIÓN...');
    const puestosOperativos = await query(`
      SELECT id
      FROM as_turnos_puestos_operativos
      WHERE instalacion_id = $1
    `, [instalacionId]);

    console.log(`Total puestos operativos: ${puestosOperativos.rows.length}`);
    
    if (puestosOperativos.rows.length === 0) {
      console.log('❌ No se encontraron puestos operativos para esta instalación');
      return;
    }

    const puestoIds = puestosOperativos.rows.map((p: any) => p.id);

    // 2. Verificar pauta mensual actual
    console.log('\n2️⃣ VERIFICANDO PAUTA MENSUAL ACTUAL...');
    const pautaActual = await query(`
      SELECT 
        guardia_id,
        COUNT(*) as cantidad_registros
      FROM as_turnos_pauta_mensual
      WHERE puesto_id = ANY($1) AND anio = 2025 AND mes = 8
      GROUP BY guardia_id
      ORDER BY guardia_id
    `, [puestoIds]);

    console.log(`Total guardias en pauta mensual: ${pautaActual.rows.length}`);
    
    if (pautaActual.rows.length > 0) {
      console.log('\nDetalles de pauta mensual actual:');
      pautaActual.rows.forEach((pauta: any, index: number) => {
        console.log(`  ${index + 1}. Guardia ID: ${pauta.guardia_id}`);
        console.log(`     Registros: ${pauta.cantidad_registros}`);
        console.log('');
      });
    }

    // 3. Eliminar pauta mensual existente
    console.log('3️⃣ ELIMINANDO PAUTA MENSUAL EXISTENTE...');
    const eliminados = await query(`
      DELETE FROM as_turnos_pauta_mensual
      WHERE puesto_id = ANY($1) AND anio = 2025 AND mes = 8
    `, [puestoIds]);

    console.log(`✅ Registros eliminados: ${eliminados.rowCount}`);

    // 4. Verificar puestos operativos actuales
    console.log('\n4️⃣ VERIFICANDO PUESTOS OPERATIVOS ACTUALES...');
    const puestosDetallados = await query(`
      SELECT 
        id,
        nombre_puesto,
        guardia_id,
        es_ppc
      FROM as_turnos_puestos_operativos
      WHERE instalacion_id = $1
      ORDER BY nombre_puesto
    `, [instalacionId]);

    console.log(`Total puestos operativos: ${puestosDetallados.rows.length}`);
    
    if (puestosDetallados.rows.length > 0) {
      console.log('\nDetalles de puestos operativos:');
      puestosDetallados.rows.forEach((puesto: any, index: number) => {
        console.log(`  ${index + 1}. ${puesto.nombre_puesto}`);
        console.log(`     Guardia ID: ${puesto.guardia_id || 'NULL'}`);
        console.log(`     Es PPC: ${puesto.es_ppc}`);
        console.log('');
      });
    }

    console.log('\n✅ LIMPIEZA COMPLETADA');
    console.log('💡 La pauta mensual se regenerará automáticamente cuando se acceda a la página');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  }
}

limpiarPautaMensualATest(); 