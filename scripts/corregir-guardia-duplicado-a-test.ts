import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function corregirGuardiaDuplicadoATest() {
  console.log('🔧 CORRECCIÓN DE GUARDIA DUPLICADO EN INSTALACIÓN A-TEST\n');

  const instalacionId = '7e05a55d-8db6-4c20-b51c-509f09d69f74';
  const guardiaDuplicadoId = '7c84d4ad-dcb2-40f9-9d03-b7d1bf673220';

  try {
    // 1. Verificar el estado actual
    console.log('1️⃣ VERIFICANDO ESTADO ACTUAL...');
    const puestosActuales = await query(`
      SELECT 
        id,
        nombre_puesto,
        guardia_id,
        es_ppc,
        creado_en
      FROM as_turnos_puestos_operativos
      WHERE instalacion_id = $1 AND guardia_id = $2
      ORDER BY creado_en
    `, [instalacionId, guardiaDuplicadoId]);

    console.log(`Puestos del guardia duplicado: ${puestosActuales.rows.length}`);
    puestosActuales.rows.forEach((puesto: any, index: number) => {
      console.log(`  ${index + 1}. ID: ${puesto.id}`);
      console.log(`     Nombre: ${puesto.nombre_puesto}`);
      console.log(`     Es PPC: ${puesto.es_ppc}`);
      console.log(`     Creado: ${puesto.creado_en}`);
      console.log('');
    });

    // 2. Identificar cuál eliminar
    // El PPC más antiguo debería ser eliminado, manteniendo el puesto asignado más reciente
    const puestosOrdenados = puestosActuales.rows.sort((a: any, b: any) => 
      new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime()
    );

    const puestoAMantener = puestosOrdenados.find((p: any) => !p.es_ppc);
    const puestoAEliminar = puestosOrdenados.find((p: any) => p.es_ppc);

    if (!puestoAMantener || !puestoAEliminar) {
      console.log('❌ No se encontraron puestos para corregir');
      return;
    }

    console.log('2️⃣ IDENTIFICANDO PUESTOS A CORREGIR...');
    console.log(`✅ Puesto a mantener: ${puestoAMantener.nombre_puesto} (ID: ${puestoAMantener.id})`);
    console.log(`❌ Puesto a eliminar: ${puestoAEliminar.nombre_puesto} (ID: ${puestoAEliminar.id})`);

    // 3. Eliminar el PPC duplicado
    console.log('\n3️⃣ ELIMINANDO PPC DUPLICADO...');
    await query(`
      DELETE FROM as_turnos_puestos_operativos
      WHERE id = $1
    `, [puestoAEliminar.id]);

    console.log(`✅ PPC eliminado: ${puestoAEliminar.nombre_puesto}`);

    // 4. Verificar que el guardia ya no esté duplicado
    console.log('\n4️⃣ VERIFICANDO CORRECCIÓN...');
    const puestosDespues = await query(`
      SELECT 
        id,
        nombre_puesto,
        guardia_id,
        es_ppc,
        creado_en
      FROM as_turnos_puestos_operativos
      WHERE instalacion_id = $1 AND guardia_id = $2
      ORDER BY creado_en
    `, [instalacionId, guardiaDuplicadoId]);

    console.log(`Puestos del guardia después de la corrección: ${puestosDespues.rows.length}`);
    
    if (puestosDespues.rows.length === 1) {
      console.log('✅ CORRECCIÓN EXITOSA: El guardia ya no está duplicado');
      puestosDespues.rows.forEach((puesto: any) => {
        console.log(`  - ${puesto.nombre_puesto} (Es PPC: ${puesto.es_ppc})`);
      });
    } else {
      console.log('❌ ERROR: El guardia sigue duplicado');
    }

    // 5. Verificar estado general de la instalación
    console.log('\n5️⃣ VERIFICANDO ESTADO GENERAL DE LA INSTALACIÓN...');
    const puestosTotales = await query(`
      SELECT 
        COUNT(*) as total_puestos,
        COUNT(CASE WHEN guardia_id IS NOT NULL THEN 1 END) as puestos_asignados,
        COUNT(CASE WHEN es_ppc = true THEN 1 END) as ppcs
      FROM as_turnos_puestos_operativos
      WHERE instalacion_id = $1
    `, [instalacionId]);

    const stats = puestosTotales.rows[0];
    console.log(`📊 Estadísticas finales:`);
    console.log(`  - Total puestos: ${stats.total_puestos}`);
    console.log(`  - Puestos asignados: ${stats.puestos_asignados}`);
    console.log(`  - PPCs: ${stats.ppcs}`);

    console.log('\n✅ CORRECCIÓN COMPLETADA');

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  }
}

corregirGuardiaDuplicadoATest(); 