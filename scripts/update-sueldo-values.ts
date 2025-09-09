// Script para actualizar los valores de las tablas del módulo de sueldos con valores correctos 2025

import { query } from '../src/lib/database';

async function updateValues() {
  console.log('🔧 Actualizando valores del módulo de sueldos...\n');
  
  try {
    // 1. Actualizar AFPs con comisiones correctas 2025 (como decimal)
    console.log('🏦 Actualizando comisiones AFP 2025...');
    const afps = [
      ['Habitat', 0.1127],
      ['Provida', 0.1145],
      ['Capital', 0.1144],
      ['Cuprum', 0.1144],
      ['Modelo', 0.1077]
    ];
    
    for (const [nombre, comision] of afps) {
      await query(
        `UPDATE sueldo_afp 
         SET comision = $1 
         WHERE LOWER(nombre) = LOWER($2)`,
        [comision, nombre]
      );
      console.log(`   ✅ ${nombre}: ${(Number(comision) * 100).toFixed(2)}%`);
    }
    
    // Agregar AFPs faltantes
    console.log('\n🏦 Agregando AFPs faltantes...');
    const afpsFaltantes = [
      ['PlanVital', 0.1110],
      ['Uno', 0.1069]
    ];
    
    for (const [nombre, comision] of afpsFaltantes) {
      const exists = await query(
        `SELECT id FROM sueldo_afp WHERE LOWER(nombre) = LOWER($1)`,
        [nombre]
      );
      
      if (exists.rows.length === 0) {
        await query(
          `INSERT INTO sueldo_afp (nombre, comision, porcentaje_fondo) 
           VALUES ($1, $2, 0.10)`,
          [nombre, comision]
        );
        console.log(`   ✅ Agregada ${nombre}: ${(Number(comision) * 100).toFixed(2)}%`);
      }
    }
    
    // 2. Actualizar mutualidades con tasas correctas (en porcentaje)
    console.log('\n🛡️ Actualizando tasas de mutualidad...');
    const mutualidades = [
      ['ACHS', 0.93],
      ['IST', 0.93],
      ['ISL', 1.00]
    ];
    
    for (const [entidad, tasa] of mutualidades) {
      await query(
        `UPDATE sueldo_mutualidad 
         SET tasa = $1 
         WHERE LOWER(entidad) = LOWER($2)`,
        [tasa, entidad]
      );
      console.log(`   ✅ ${entidad}: ${tasa}%`);
    }
    
    // 3. Agregar/actualizar parámetros faltantes
    console.log('\n⚙️ Actualizando parámetros generales...');
    const parametros = [
      ['SUELDO_MINIMO', 529000],
      ['GRATIFICACION_TOPE_MENSUAL', 209396],
      ['HORAS_EXTRAS_MAX_MES', 60],
      ['AFC_TRABAJADOR_INDEFINIDO', 0.6],
      ['AFC_EMPLEADOR_INDEFINIDO', 2.4],
      ['AFC_EMPLEADOR_PLAZO_FIJO', 3.0],
      ['SIS_EMPLEADOR', 1.88],
      ['REFORMA_PREVISIONAL', 1.0]
    ];
    
    for (const [nombre, valor] of parametros) {
      const exists = await query(
        `SELECT id FROM sueldo_parametros_generales WHERE parametro = $1`,
        [nombre]
      );
      
      if (exists.rows.length === 0) {
        await query(
          `INSERT INTO sueldo_parametros_generales (parametro, valor) 
           VALUES ($1, $2)`,
          [nombre, valor]
        );
        console.log(`   ✅ Agregado ${nombre}: ${valor}`);
      } else {
        await query(
          `UPDATE sueldo_parametros_generales 
           SET valor = $1 
           WHERE parametro = $2`,
          [valor, nombre]
        );
        console.log(`   ✅ Actualizado ${nombre}: ${valor}`);
      }
    }
    
    // 4. Verificar y actualizar tramos de impuesto 2025
    console.log('\n💰 Actualizando tramos de impuesto 2025...');
    const tramos = [
      [1, 0, 1500000, 0.000, 0],
      [2, 1500000.01, 2500000, 0.040, 60000],
      [3, 2500000.01, 3500000, 0.080, 160000],
      [4, 3500000.01, 4500000, 0.135, 327500],
      [5, 4500000.01, 5500000, 0.230, 765000],
      [6, 5500000.01, 7500000, 0.304, 1156500],
      [7, 7500000.01, 10000000, 0.350, 1656500],
      [8, 10000000.01, null, 0.400, 2156500]
    ];
    
    // Primero, eliminar tramos existentes
    await query(`DELETE FROM sueldo_tramos_impuesto`);
    
    // Insertar nuevos tramos
    for (const [tramo, desde, hasta, factor, rebaja] of tramos) {
      await query(
        `INSERT INTO sueldo_tramos_impuesto (tramo, desde, hasta, factor, rebaja) 
         VALUES ($1, $2, $3, $4, $5)`,
        [tramo, desde, hasta, factor, rebaja]
      );
      console.log(`   ✅ Tramo ${tramo}: Desde ${desde} - Hasta ${hasta || 'Sin límite'}`);
    }
    
    console.log('\n✅ Valores actualizados exitosamente!');
    
    // Verificar los valores actualizados
    console.log('\n📊 Verificación de valores actualizados:');
    
    const afpResult = await query(
      `SELECT nombre, comision FROM sueldo_afp ORDER BY nombre`
    );
    console.log('\nAFPs:');
    afpResult.rows.forEach((row: any) => {
      console.log(`   - ${row.nombre}: ${(Number(row.comision) * 100).toFixed(2)}%`);
    });
    
    const paramResult = await query(
      `SELECT nombre, valor FROM sueldo_parametros_generales ORDER BY id`
    );
    console.log('\nParámetros:');
    paramResult.rows.forEach((row: any) => {
      console.log(`   - ${row.nombre}: ${row.valor}`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error al actualizar valores:');
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar la actualización
updateValues();
