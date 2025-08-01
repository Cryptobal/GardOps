import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function checkPPCAssignment() {
  console.log('🔍 Verificando asignación de PPC...\n');

  try {
    const ppcId = '1e550268-545d-4506-94a4-6fcc690c9504';
    
    // Verificar directamente en la tabla puestos_por_cubrir
    const ppcData = await query(`
      SELECT 
        id,
        estado,
        guardia_asignado_id,
        fecha_asignacion,
        observaciones,
        updated_at
      FROM puestos_por_cubrir 
      WHERE id = $1
    `, [ppcId]);

    console.log('📋 DATOS DEL PPC EN LA BASE DE DATOS:');
    console.log('='.repeat(80));
    
    if (ppcData.rows.length > 0) {
      const ppc = ppcData.rows[0];
      console.log(`• ID: ${ppc.id}`);
      console.log(`• Estado: ${ppc.estado}`);
      console.log(`• Guardia Asignado ID: ${ppc.guardia_asignado_id}`);
      console.log(`• Fecha Asignación: ${ppc.fecha_asignacion}`);
      console.log(`• Observaciones: ${ppc.observaciones}`);
      console.log(`• Última Actualización: ${ppc.updated_at}`);
    } else {
      console.log('❌ PPC no encontrado');
    }

    // Verificar si hay algún PPC asignado
    const assignedPPCs = await query(`
      SELECT 
        id,
        estado,
        guardia_asignado_id,
        fecha_asignacion
      FROM puestos_por_cubrir 
      WHERE estado = 'Asignado'
      ORDER BY fecha_asignacion DESC
    `);

    console.log('\n📊 TODOS LOS PPCs ASIGNADOS:');
    console.log('='.repeat(80));
    
    if (assignedPPCs.rows.length > 0) {
      assignedPPCs.rows.forEach((ppc: any, index: number) => {
        console.log(`${index + 1}. ID: ${ppc.id}`);
        console.log(`   Estado: ${ppc.estado}`);
        console.log(`   Guardia ID: ${ppc.guardia_asignado_id}`);
        console.log(`   Fecha: ${ppc.fecha_asignacion}`);
        console.log('');
      });
    } else {
      console.log('No hay PPCs asignados');
    }

  } catch (error) {
    console.error('❌ Error verificando asignación:', error);
  }
}

// Ejecutar la verificación
checkPPCAssignment()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }); 