// Script para inicializar las tablas del módulo de sueldos
// Ejecutar con: npm run init-sueldo-db

import { query } from '../src/lib/database';

async function initializeDatabase() {
  console.log('🔧 Inicializando base de datos del módulo de sueldos...\n');
  
  try {
    // 1. Crear tabla de parámetros generales
    console.log('⚙️ Creando tabla sueldo_parametros_generales...');
    await query(`
      CREATE TABLE IF NOT EXISTS sueldo_parametros_generales (
        id SERIAL PRIMARY KEY,
        parametro VARCHAR(100) NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        descripcion TEXT,
        activo BOOLEAN DEFAULT true,
        fecha_vigencia DATE NOT NULL DEFAULT CURRENT_DATE
      )
    `);
    
    // 2. Crear tabla de AFP
    console.log('🏦 Creando tabla sueldo_afp...');
    await query(`
      CREATE TABLE IF NOT EXISTS sueldo_afp (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL,
        comision DECIMAL(5,2) NOT NULL,
        activo BOOLEAN DEFAULT true
      )
    `);
    
    // 3. Crear tabla de ISAPRE
    console.log('🏥 Creando tabla sueldo_isapre...');
    await query(`
      CREATE TABLE IF NOT EXISTS sueldo_isapre (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL,
        activo BOOLEAN DEFAULT true
      )
    `);
    
    // 4. Crear tabla de mutualidad
    console.log('🛡️ Creando tabla sueldo_mutualidad...');
    await query(`
      CREATE TABLE IF NOT EXISTS sueldo_mutualidad (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL,
        tasa_base DECIMAL(5,2) NOT NULL,
        tasa_adicional DECIMAL(5,2) DEFAULT 0,
        activo BOOLEAN DEFAULT true
      )
    `);
    
    // 5. Crear tabla de tramos de impuesto
    console.log('💰 Creando tabla sueldo_tramos_impuesto...');
    await query(`
      CREATE TABLE IF NOT EXISTS sueldo_tramos_impuesto (
        id SERIAL PRIMARY KEY,
        tramo INTEGER NOT NULL,
        desde DECIMAL(12,2) NOT NULL,
        hasta DECIMAL(12,2),
        factor DECIMAL(5,3) NOT NULL,
        rebaja DECIMAL(12,2) NOT NULL,
        activo BOOLEAN DEFAULT true,
        fecha_vigencia DATE NOT NULL DEFAULT CURRENT_DATE
      )
    `);
    
    console.log('\n✅ Tablas creadas exitosamente\n');
    
    // Insertar datos iniciales
    console.log('📝 Insertando datos iniciales...\n');
    
    // Parámetros generales
    console.log('⚙️ Insertando parámetros generales...');
    const parametros = [
      ['UF_TOPE_IMPONIBLE', 87.8, 'Tope imponible en UF para cotizaciones previsionales'],
      ['SUELDO_MINIMO', 529000, 'Sueldo mínimo legal'],
      ['GRATIFICACION_TOPE_MENSUAL', 209396, 'Tope mensual para gratificación legal'],
      ['HORAS_EXTRAS_MAX_MES', 60, 'Máximo de horas extras permitidas al mes'],
      ['AFC_TRABAJADOR_INDEFINIDO', 0.6, 'Porcentaje AFC trabajador contrato indefinido'],
      ['AFC_EMPLEADOR_INDEFINIDO', 2.4, 'Porcentaje AFC empleador contrato indefinido'],
      ['AFC_EMPLEADOR_PLAZO_FIJO', 3.0, 'Porcentaje AFC empleador contrato plazo fijo'],
      ['SIS_EMPLEADOR', 1.88, 'Porcentaje SIS pagado por empleador'],
      ['REFORMA_PREVISIONAL', 1.0, 'Porcentaje reforma previsional empleador']
    ];
    
    for (const [parametro, valor, descripcion] of parametros) {
      await query(
        `INSERT INTO sueldo_parametros_generales (parametro, valor, descripcion, fecha_vigencia) 
         VALUES ($1, $2, $3, '2025-01-01') 
         ON CONFLICT DO NOTHING`,
        [parametro, valor, descripcion]
      );
    }
    
    // AFPs
    console.log('🏦 Insertando AFPs...');
    const afps = [
      ['capital', 'AFP Capital', 11.44],
      ['cuprum', 'AFP Cuprum', 11.44],
      ['habitat', 'AFP Habitat', 11.27],
      ['modelo', 'AFP Modelo', 10.77],
      ['planvital', 'AFP PlanVital', 11.10],
      ['provida', 'AFP ProVida', 11.45],
      ['uno', 'AFP Uno', 10.69]
    ];
    
    for (const [codigo, nombre, comision] of afps) {
      await query(
        `INSERT INTO sueldo_afp (codigo, nombre, comision) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (codigo) DO UPDATE 
         SET nombre = $2, comision = $3`,
        [codigo, nombre, comision]
      );
    }
    
    // ISAPREs
    console.log('🏥 Insertando ISAPREs...');
    const isapres = [
      ['banmedica', 'Banmédica'],
      ['consalud', 'Consalud'],
      ['cruz_blanca', 'Cruz Blanca'],
      ['colmena', 'Colmena Golden Cross'],
      ['nueva_masvida', 'Nueva Masvida'],
      ['vida_tres', 'Vida Tres'],
      ['fonasa', 'FONASA']
    ];
    
    for (const [codigo, nombre] of isapres) {
      await query(
        `INSERT INTO sueldo_isapre (codigo, nombre) 
         VALUES ($1, $2) 
         ON CONFLICT (codigo) DO UPDATE 
         SET nombre = $2`,
        [codigo, nombre]
      );
    }
    
    // Mutualidades
    console.log('🛡️ Insertando Mutualidades...');
    const mutualidades = [
      ['achs', 'Asociación Chilena de Seguridad', 0.90],
      ['ist', 'Instituto de Seguridad del Trabajo', 0.90],
      ['museg', 'Mutual de Seguridad CChC', 0.90]
    ];
    
    for (const [codigo, nombre, tasa] of mutualidades) {
      await query(
        `INSERT INTO sueldo_mutualidad (codigo, nombre, tasa_base) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (codigo) DO UPDATE 
         SET nombre = $2, tasa_base = $3`,
        [codigo, nombre, tasa]
      );
    }
    
    // Tramos de impuesto
    console.log('💰 Insertando tramos de impuesto...');
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
    
    for (const [tramo, desde, hasta, factor, rebaja] of tramos) {
      await query(
        `INSERT INTO sueldo_tramos_impuesto (tramo, desde, hasta, factor, rebaja, fecha_vigencia) 
         VALUES ($1, $2, $3, $4, $5, '2025-01-01') 
         ON CONFLICT DO NOTHING`,
        [tramo, desde, hasta, factor, rebaja]
      );
    }
    
    console.log('\n✅ Base de datos inicializada correctamente');
    console.log('📊 Nota: Los valores UF se obtienen en tiempo real desde la API de la CMF');
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initializeDatabase();
}

export { initializeDatabase };
