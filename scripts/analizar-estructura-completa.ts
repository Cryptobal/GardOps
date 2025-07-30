#!/usr/bin/env ts-node

import * as fs from 'fs';

// Configuración
const FICHA_PATH = "BBDD GGSS.csv";

function analizarEstructuraCompleta(): void {
  console.log('🔍 ANÁLISIS COMPLETO DE ESTRUCTURA CSV');
  console.log('='.repeat(60));
  
  if (!fs.existsSync(FICHA_PATH)) {
    console.log(`❌ Archivo no encontrado: ${FICHA_PATH}`);
    return;
  }
  
  const contenido = fs.readFileSync(FICHA_PATH, 'utf-8');
  const lineas = contenido.split('\n');
  
  console.log(`📊 Total de líneas: ${lineas.length}`);
  console.log('');
  
  // Mostrar las primeras 50 líneas para entender la estructura
  console.log('📋 PRIMERAS 50 LÍNEAS:');
  for (let i = 0; i < Math.min(50, lineas.length); i++) {
    const linea = lineas[i].trim();
    if (linea) {
      console.log(`${String(i + 1).padStart(3, '0')}: "${linea}"`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 BUSCANDO PATRONES DE RUT:');
  
  // Buscar todas las líneas que contengan RUTs
  const rutPattern = /\d{7,8}[-][0-9kK]/;
  const lineasConRUT: { linea: number; contenido: string }[] = [];
  
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    if (rutPattern.test(linea)) {
      lineasConRUT.push({ linea: i + 1, contenido: linea });
    }
  }
  
  console.log(`📊 Líneas con RUT encontradas: ${lineasConRUT.length}`);
  
  if (lineasConRUT.length > 0) {
    console.log('\n📋 PRIMERAS 10 LÍNEAS CON RUT:');
    lineasConRUT.slice(0, 10).forEach((item, index) => {
      console.log(`${index + 1}. Línea ${item.linea}: "${item.contenido}"`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 ANÁLISIS DE SECUENCIA DE DATOS:');
  
  // Analizar la secuencia de datos alrededor de los primeros RUTs
  if (lineasConRUT.length > 0) {
    const primerRUT = lineasConRUT[0];
    const inicio = Math.max(0, primerRUT.linea - 5);
    const fin = Math.min(lineas.length, primerRUT.linea + 20);
    
    console.log(`📊 Analizando secuencia alrededor de línea ${primerRUT.linea}:`);
    console.log(`   Rango: líneas ${inicio + 1} a ${fin}`);
    
    for (let i = inicio; i < fin; i++) {
      const linea = lineas[i].trim();
      if (linea) {
        const marcador = i + 1 === primerRUT.linea ? ' >>> ' : '     ';
        console.log(`${marcador}${String(i + 1).padStart(3, '0')}: "${linea}"`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 CONTANDO CAMPOS POR LÍNEA:');
  
  // Contar campos en diferentes líneas
  const lineasAMostrar = [0, 1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 45];
  
  for (const numLinea of lineasAMostrar) {
    if (numLinea < lineas.length) {
      const linea = lineas[numLinea].trim();
      if (linea) {
        const campos = linea.split(',').map(c => c.trim());
        console.log(`Línea ${String(numLinea + 1).padStart(2, '0')}: ${campos.length} campos`);
        console.log(`   Contenido: "${linea}"`);
        console.log('');
      }
    }
  }
  
  console.log('='.repeat(60));
  console.log('🔍 BUSCANDO LÍNEAS CON MÚLTIPLES CAMPOS:');
  
  // Buscar líneas que parezcan tener múltiples campos
  const lineasConMultiplesCampos: { linea: number; campos: number; contenido: string }[] = [];
  
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    if (linea) {
      const campos = linea.split(',').map(c => c.trim());
      if (campos.length > 5) { // Más de 5 campos
        lineasConMultiplesCampos.push({
          linea: i + 1,
          campos: campos.length,
          contenido: linea
        });
      }
    }
  }
  
  console.log(`📊 Líneas con múltiples campos (>5): ${lineasConMultiplesCampos.length}`);
  
  if (lineasConMultiplesCampos.length > 0) {
    console.log('\n📋 PRIMERAS 5 LÍNEAS CON MÚLTIPLES CAMPOS:');
    lineasConMultiplesCampos.slice(0, 5).forEach((item, index) => {
      console.log(`${index + 1}. Línea ${item.linea} (${item.campos} campos):`);
      console.log(`   "${item.contenido}"`);
      console.log('');
    });
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  analizarEstructuraCompleta();
}

export { analizarEstructuraCompleta }; 