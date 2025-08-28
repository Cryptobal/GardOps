import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function testEliminarPuestos() {
  console.log('🧪 PROBANDO ELIMINACIÓN DE PUESTOS INDIVIDUALES');
  console.log('==============================================\n');

  try {
    const instalacionId = '0e8ba906-e64b-4d4d-a104-ba29f21f48a9';
    
    console.log('🔍 Probando instalación:', instalacionId);

    // 1. Verificar puestos existentes antes de eliminar
    console.log('\n1️⃣ PUESTOS EXISTENTES ANTES DE ELIMINAR:');
    const puestosAntes = await query(`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.es_ppc,
        po.activo,
        po.guardia_id,
        rs.nombre as rol_nombre
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1
      ORDER BY po.rol_id, po.nombre_puesto
    `, [instalacionId]);
    
    console.log(`Puestos encontrados: ${puestosAntes.rows.length}`);
    puestosAntes.rows.forEach((row: any, index: number) => {
      console.log(`  ${index + 1}. ${row.nombre_puesto} (${row.rol_nombre}) - PPC: ${row.es_ppc}, Activo: ${row.activo}, Guardia: ${row.guardia_id ? 'Sí' : 'No'}`);
    });

    if (puestosAntes.rows.length === 0) {
      console.log('❌ No hay puestos para eliminar');
      return;
    }

    // 2. Seleccionar un puesto para eliminar (el primero que sea PPC)
    const puestoAEliminar = puestosAntes.rows.find((row: any) => row.es_ppc && !row.guardia_id);
    
    if (!puestoAEliminar) {
      console.log('❌ No hay puestos PPC disponibles para eliminar');
      return;
    }

    console.log(`\n2️⃣ ELIMINANDO PUESTO: ${puestoAEliminar.nombre_puesto} (ID: ${puestoAEliminar.id})`);

    // 3. Simular la eliminación del puesto
    const resultado = await query(`
      DELETE FROM as_turnos_puestos_operativos 
      WHERE id = $1
      RETURNING id, nombre_puesto
    `, [puestoAEliminar.id]);

    if (resultado.rows.length > 0) {
      console.log(`✅ Puesto eliminado: ${resultado.rows[0].nombre_puesto}`);
    } else {
      console.log('❌ No se pudo eliminar el puesto');
      return;
    }

    // 4. Verificar puestos después de eliminar
    console.log('\n3️⃣ PUESTOS DESPUÉS DE ELIMINAR:');
    const puestosDespues = await query(`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.es_ppc,
        po.activo,
        po.guardia_id,
        rs.nombre as rol_nombre
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1
      ORDER BY po.rol_id, po.nombre_puesto
    `, [instalacionId]);
    
    console.log(`Puestos restantes: ${puestosDespues.rows.length}`);
    puestosDespues.rows.forEach((row: any, index: number) => {
      console.log(`  ${index + 1}. ${row.nombre_puesto} (${row.rol_nombre}) - PPC: ${row.es_ppc}, Activo: ${row.activo}, Guardia: ${row.guardia_id ? 'Sí' : 'No'}`);
    });

    // 5. Verificar que el puesto eliminado ya no existe
    const puestoEliminado = await query(`
      SELECT id FROM as_turnos_puestos_operativos WHERE id = $1
    `, [puestoAEliminar.id]);

    if (puestoEliminado.rows.length === 0) {
      console.log('\n✅ VERIFICACIÓN: El puesto fue eliminado completamente de la base de datos');
    } else {
      console.log('\n❌ VERIFICACIÓN: El puesto aún existe en la base de datos');
    }

    // 6. Verificar que el endpoint /completa funciona correctamente
    console.log('\n4️⃣ PROBANDO ENDPOINT /completa:');
    try {
      const response = await fetch(`http://localhost:3000/api/instalaciones/${instalacionId}/completa`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'carlos.irigoyen@gard.cl'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Endpoint /completa responde correctamente:`);
        console.log(`  - Turnos: ${data.data.turnos.length}`);
        console.log(`  - Puestos: ${data.data.puestos.length}`);
        console.log(`  - PPCs: ${data.data.ppcs.length}`);
      } else {
        console.log(`❌ Endpoint /completa falló: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Error probando endpoint: ${error}`);
    }

    console.log('\n📊 RESUMEN:');
    console.log(`  - Puestos antes: ${puestosAntes.rows.length}`);
    console.log(`  - Puestos después: ${puestosDespues.rows.length}`);
    console.log(`  - Puesto eliminado: ${puestoAEliminar.nombre_puesto}`);
    console.log(`  - Diferencia: ${puestosAntes.rows.length - puestosDespues.rows.length}`);

  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testEliminarPuestos().then(() => {
    console.log('\n✅ Test completado');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { testEliminarPuestos };
