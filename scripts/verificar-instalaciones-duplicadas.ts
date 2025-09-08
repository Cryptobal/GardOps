import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function verificarInstalacionesDuplicadas() {
  console.log('🔍 VERIFICACIÓN DE INSTALACIONES DUPLICADAS');
  console.log('============================================\n');

  try {
    // 1. Buscar instalaciones con el mismo nombre
    console.log('📋 1. BUSCANDO INSTALACIONES CON NOMBRES DUPLICADOS...');
    
    const duplicados = await query(`
      SELECT 
        nombre,
        COUNT(*) as cantidad,
        array_agg(id ORDER BY created_at) as ids,
        array_agg(created_at ORDER BY created_at) as fechas_creacion
      FROM instalaciones
      GROUP BY nombre
      HAVING COUNT(*) > 1
      ORDER BY nombre
    `);
    
    if (duplicados.rows.length > 0) {
      console.log(`❌ ENCONTRADAS ${duplicados.rows.length} INSTALACIONES DUPLICADAS:`);
      duplicados.rows.forEach((dup: any) => {
        console.log(`\n📌 ${dup.nombre}:`);
        console.log(`   Cantidad: ${dup.cantidad}`);
        console.log(`   IDs: ${dup.ids.join(', ')}`);
        console.log(`   Fechas: ${dup.fechas_creacion.join(', ')}`);
      });
    } else {
      console.log('✅ No se encontraron instalaciones duplicadas');
    }

    // 2. Verificar específicamente "Bodega Santa Amalia"
    console.log('\n📋 2. VERIFICANDO "BODEGA SANTA AMALIA"...');
    
    const santaAmalia = await query(`
      SELECT 
        id,
        nombre,
        direccion,
        estado,
        created_at,
        updated_at
      FROM instalaciones
      WHERE nombre ILIKE '%santa amalia%'
      ORDER BY created_at
    `);
    
    console.log(`📊 Instalaciones "Santa Amalia" encontradas: ${santaAmalia.rows.length}`);
    santaAmalia.rows.forEach((inst: any, index: number) => {
      console.log(`\n   ${index + 1}. ID: ${inst.id}`);
      console.log(`      Nombre: ${inst.nombre}`);
      console.log(`      Dirección: ${inst.direccion}`);
      console.log(`      Estado: ${inst.estado}`);
      console.log(`      Creado: ${inst.created_at}`);
    });

    // 3. Verificar PPCs para cada instalación de Santa Amalia
    console.log('\n📋 3. VERIFICANDO PPCs PARA CADA INSTALACIÓN...');
    
    for (const inst of santaAmalia.rows) {
      console.log(`\n🔍 Verificando PPCs para ${inst.nombre} (${inst.id}):`);
      
      const ppcs = await query(`
        SELECT 
          COUNT(*) as total_ppcs,
          COUNT(CASE WHEN guardia_id IS NULL THEN 1 END) as sin_guardia,
          COUNT(CASE WHEN guardia_id IS NOT NULL THEN 1 END) as con_guardia
        FROM as_turnos_puestos_operativos
        WHERE instalacion_id = $1 AND es_ppc = true
      `, [inst.id]);
      
      const stats = ppcs.rows[0];
      console.log(`   Total PPCs: ${stats.total_ppcs}`);
      console.log(`   Sin guardia: ${stats.sin_guardia}`);
      console.log(`   Con guardia: ${stats.con_guardia}`);
      
      if (stats.total_ppcs > 0) {
        const detalles = await query(`
          SELECT 
            id,
            nombre_puesto,
            rol_id,
            guardia_id,
            es_ppc,
            creado_en
          FROM as_turnos_puestos_operativos
          WHERE instalacion_id = $1 AND es_ppc = true
          ORDER BY creado_en
        `, [inst.id]);
        
        console.log(`   Detalles de PPCs:`);
        detalles.rows.forEach((ppc: any, index: number) => {
          console.log(`     ${index + 1}. ${ppc.nombre_puesto} (${ppc.guardia_id ? 'Asignado' : 'Sin asignar'})`);
        });
      }
    }

    // 4. Verificar cuál instalación se está usando en el dropdown
    console.log('\n📋 4. VERIFICANDO INSTALACIONES CON COORDENADAS...');
    
    const conCoords = await query(`
      SELECT 
        id,
        nombre,
        latitud,
        longitud,
        estado
      FROM instalaciones
      WHERE nombre ILIKE '%santa amalia%'
        AND latitud IS NOT NULL 
        AND longitud IS NOT NULL
        AND estado = 'Activo'
      ORDER BY created_at
    `);
    
    console.log(`📊 Instalaciones "Santa Amalia" con coordenadas: ${conCoords.rows.length}`);
    conCoords.rows.forEach((inst: any, index: number) => {
      console.log(`\n   ${index + 1}. ID: ${inst.id}`);
      console.log(`      Nombre: ${inst.nombre}`);
      console.log(`      Coordenadas: ${inst.latitud}, ${inst.longitud}`);
      console.log(`      Estado: ${inst.estado}`);
    });

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

// Ejecutar verificación
verificarInstalacionesDuplicadas().then(() => {
  console.log('\n🎯 Verificación de instalaciones duplicadas finalizada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
