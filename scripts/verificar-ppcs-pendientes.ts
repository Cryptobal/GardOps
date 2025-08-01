import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function verificarPPCsPendientes() {
  console.log('🔍 Verificando PPCs pendientes y sus coordenadas...\n');

  try {
    // Obtener todos los PPCs pendientes
    const ppcsPendientes = await query(`
      SELECT 
        ppc.id,
        ppc.motivo,
        ppc.fecha_deteccion,
        ppc.fecha_limite_cobertura,
        ppc.estado,
        i.nombre as instalacion_nombre,
        i.latitud as inst_lat,
        i.longitud as inst_lon,
        c.nombre as cliente_nombre
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos req ON ppc.requisito_puesto_id = req.id
      INNER JOIN instalaciones i ON req.instalacion_id = i.id
      INNER JOIN clientes c ON i.cliente_id = c.id
      WHERE ppc.estado = 'Pendiente'
      ORDER BY ppc.fecha_deteccion
    `);

    console.log(`📊 Total de PPCs pendientes: ${ppcsPendientes.rows.length}`);

    // Separar PPCs con y sin coordenadas
    const ppcsConCoordenadas = ppcsPendientes.rows.filter((ppc: any) => 
      ppc.inst_lat && ppc.inst_lon
    );

    const ppcsSinCoordenadas = ppcsPendientes.rows.filter((ppc: any) => 
      !ppc.inst_lat || !ppc.inst_lon
    );

    console.log(`✅ PPCs con coordenadas: ${ppcsConCoordenadas.length}`);
    console.log(`⚠️ PPCs sin coordenadas: ${ppcsSinCoordenadas.length}`);

    // Mostrar PPCs con coordenadas
    if (ppcsConCoordenadas.length > 0) {
      console.log('\n📍 PPCs con coordenadas (pueden ser asignados automáticamente):');
      ppcsConCoordenadas.forEach((ppc: any) => {
        console.log(`  - ID: ${ppc.id}`);
        console.log(`    Instalación: ${ppc.instalacion_nombre}`);
        console.log(`    Cliente: ${ppc.cliente_nombre}`);
        console.log(`    Motivo: ${ppc.motivo}`);
        console.log(`    Coordenadas: ${ppc.inst_lat}, ${ppc.inst_lon}`);
        console.log(`    Fecha detección: ${ppc.fecha_deteccion}`);
        console.log('');
      });
    }

    // Mostrar PPCs sin coordenadas
    if (ppcsSinCoordenadas.length > 0) {
      console.log('\n🚨 PPCs sin coordenadas (requieren asignación manual):');
      ppcsSinCoordenadas.forEach((ppc: any) => {
        console.log(`  - ID: ${ppc.id}`);
        console.log(`    Instalación: ${ppc.instalacion_nombre}`);
        console.log(`    Cliente: ${ppc.cliente_nombre}`);
        console.log(`    Motivo: ${ppc.motivo}`);
        console.log(`    Coordenadas: ${ppc.inst_lat || 'NULL'}, ${ppc.inst_lon || 'NULL'}`);
        console.log(`    Fecha detección: ${ppc.fecha_deteccion}`);
        console.log('');
      });
    }

    // Verificar instalaciones sin coordenadas
    console.log('\n🏢 Verificando instalaciones sin coordenadas...');
    
    const instalacionesSinCoordenadas = await query(`
      SELECT 
        i.id,
        i.nombre,
        i.latitud,
        i.longitud,
        c.nombre as cliente_nombre
      FROM instalaciones i
      INNER JOIN clientes c ON i.cliente_id = c.id
      WHERE i.latitud IS NULL OR i.longitud IS NULL
      ORDER BY i.nombre
    `);

    console.log(`⚠️ Instalaciones sin coordenadas: ${instalacionesSinCoordenadas.rows.length}`);
    
    if (instalacionesSinCoordenadas.rows.length > 0) {
      console.log('\nInstalaciones que necesitan coordenadas:');
      instalacionesSinCoordenadas.rows.forEach((inst: any) => {
        console.log(`  - ${inst.nombre} (Cliente: ${inst.cliente_nombre})`);
        console.log(`    Coordenadas: ${inst.latitud || 'NULL'}, ${inst.longitud || 'NULL'}`);
      });
    }

    // Resumen final
    console.log('\n📋 RESUMEN:');
    console.log(`   - PPCs pendientes total: ${ppcsPendientes.rows.length}`);
    console.log(`   - PPCs con coordenadas: ${ppcsConCoordenadas.length}`);
    console.log(`   - PPCs sin coordenadas: ${ppcsSinCoordenadas.length}`);
    console.log(`   - Instalaciones sin coordenadas: ${instalacionesSinCoordenadas.rows.length}`);
    
    if (ppcsConCoordenadas.length > 0) {
      console.log(`\n✅ ${ppcsConCoordenadas.length} PPCs pueden ser asignados automáticamente`);
    }
    
    if (ppcsSinCoordenadas.length > 0) {
      console.log(`\n⚠️ ${ppcsSinCoordenadas.length} PPCs requieren asignación manual (sin coordenadas)`);
    }

  } catch (error) {
    console.error('❌ Error verificando PPCs pendientes:', error);
  }
}

// Ejecutar verificación
verificarPPCsPendientes().then(() => {
  console.log('\n✅ Verificación completada');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
}); 