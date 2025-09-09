// Script para ver los datos actuales en las tablas del módulo de sueldos

import { query } from '../src/lib/database';

async function checkData() {
  console.log('📊 Verificando datos en las tablas del módulo de sueldos...\n');
  
  try {
    // 1. sueldo_parametros_generales
    console.log('\n📋 PARÁMETROS GENERALES:');
    console.log('=' + '='.repeat(50));
    const parametros = await query(`SELECT * FROM sueldo_parametros_generales ORDER BY id`);
    if (parametros.rows.length > 0) {
      parametros.rows.forEach((p: any) => {
        console.log(`   ID: ${p.id} | ${p.parametro}: ${p.valor}`);
      });
    } else {
      console.log('   (Sin datos)');
    }
    
    // 2. sueldo_afp
    console.log('\n🏦 AFP:');
    console.log('=' + '='.repeat(50));
    const afp = await query(`SELECT * FROM sueldo_afp ORDER BY id`);
    if (afp.rows.length > 0) {
      afp.rows.forEach((a: any) => {
        console.log(`   ID: ${a.id} | ${a.nombre}: ${a.comision}% | Fondo: ${a.porcentaje_fondo}`);
      });
    } else {
      console.log('   (Sin datos)');
    }
    
    // 3. sueldo_mutualidad
    console.log('\n🛡️ MUTUALIDAD:');
    console.log('=' + '='.repeat(50));
    const mutualidad = await query(`SELECT * FROM sueldo_mutualidad ORDER BY id`);
    if (mutualidad.rows.length > 0) {
      mutualidad.rows.forEach((m: any) => {
        console.log(`   ID: ${m.id} | ${m.entidad}: ${m.tasa}%`);
      });
    } else {
      console.log('   (Sin datos)');
    }
    
    // 4. sueldo_tramos_impuesto
    console.log('\n💰 TRAMOS IMPUESTO:');
    console.log('=' + '='.repeat(50));
    const tramos = await query(`SELECT * FROM sueldo_tramos_impuesto ORDER BY tramo`);
    if (tramos.rows.length > 0) {
      tramos.rows.forEach((t: any) => {
        console.log(`   Tramo ${t.tramo}: Desde ${t.desde} - Hasta ${t.hasta || 'Sin límite'} | Factor: ${t.factor} | Rebaja: ${t.rebaja}`);
      });
    } else {
      console.log('   (Sin datos)');
    }
    
    // 5. sueldo_valor_uf
    console.log('\n💵 VALORES UF:');
    console.log('=' + '='.repeat(50));
    const uf = await query(`SELECT * FROM sueldo_valor_uf ORDER BY fecha DESC LIMIT 5`);
    if (uf.rows.length > 0) {
      console.log('   (Últimos 5 valores)');
      uf.rows.forEach((u: any) => {
        const fecha = new Date(u.fecha).toLocaleDateString('es-CL');
        console.log(`   ${fecha}: $${u.valor}`);
      });
    } else {
      console.log('   (Sin datos)');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error al verificar los datos:');
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar la verificación
checkData();
