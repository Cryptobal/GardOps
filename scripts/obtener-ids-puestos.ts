import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function obtenerIdsPuestos() {
  console.log('🔍 OBTENIENDO IDs DE PUESTOS');
  console.log('============================\n');

  try {
    const instalacionId = '0e8ba906-e64b-4d4d-a104-ba29f21f48a9';
    
    console.log('🔍 Instalación:', instalacionId);

    const puestos = await query(`
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
    
    console.log(`📊 Puestos encontrados: ${puestos.rows.length}\n`);
    
    puestos.rows.forEach((row: any, index: number) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   Nombre: ${row.nombre_puesto}`);
      console.log(`   Rol: ${row.rol_nombre}`);
      console.log(`   PPC: ${row.es_ppc}`);
      console.log(`   Activo: ${row.activo}`);
      console.log(`   Guardia: ${row.guardia_id ? 'Sí' : 'No'}`);
      console.log('');
    });

    // Mostrar solo los IDs para copiar fácilmente
    console.log('📋 IDs para copiar:');
    puestos.rows.forEach((row: any, index: number) => {
      console.log(`${index + 1}. ${row.id}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  obtenerIdsPuestos().then(() => {
    console.log('\n✅ Completado');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { obtenerIdsPuestos };
