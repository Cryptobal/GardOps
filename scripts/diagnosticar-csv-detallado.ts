#!/usr/bin/env ts-node

import * as fs from 'fs';

// Configuración
const FICHA_PATH = "BBDD GGSS.csv";

function diagnosticarCSVDetallado(): void {
  console.log('🔍 DIAGNÓSTICO DETALLADO DE ARCHIVO CSV');
  console.log('='.repeat(60));
  
  if (!fs.existsSync(FICHA_PATH)) {
    console.log(`❌ Archivo no encontrado: ${FICHA_PATH}`);
    return;
  }
  
  const contenido = fs.readFileSync(FICHA_PATH, 'utf-8');
  const lineas = contenido.split('\n');
  
  console.log(`📊 Total de líneas: ${lineas.length}`);
  console.log('');
  
  // Mostrar las primeras 5 líneas completas
  console.log('📋 PRIMERAS 5 LÍNEAS COMPLETAS:');
  for (let i = 0; i < Math.min(5, lineas.length); i++) {
    console.log(`\nLínea ${i + 1}:`);
    console.log(`"${lineas[i]}"`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 ANÁLISIS DE LA PRIMERA LÍNEA (HEADERS):');
  
  if (lineas.length > 0) {
    const primeraLinea = lineas[0];
    console.log(`Línea completa: "${primeraLinea}"`);
    console.log(`Longitud: ${primeraLinea.length} caracteres`);
    
    // Contar comillas
    const comillas = (primeraLinea.match(/"/g) || []).length;
    console.log(`Número de comillas: ${comillas}`);
    
    // Contar comas
    const comas = (primeraLinea.match(/,/g) || []).length;
    console.log(`Número de comas: ${comas}`);
    
    // Intentar diferentes métodos de parsing
    console.log('\n📋 MÉTODOS DE PARSING:');
    
    // Método 1: Split simple por comas
    const splitSimple = primeraLinea.split(',');
    console.log(`1. Split simple: ${splitSimple.length} campos`);
    splitSimple.forEach((campo, index) => {
      console.log(`   ${index + 1}. "${campo}"`);
    });
    
    // Método 2: Split respetando comillas
    const camposConComillas = parsearLineaCSV(primeraLinea);
    console.log(`\n2. Split con comillas: ${camposConComillas.length} campos`);
    camposConComillas.forEach((campo, index) => {
      console.log(`   ${index + 1}. "${campo}"`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 ANÁLISIS DE LA SEGUNDA LÍNEA (PRIMER DATO):');
  
  if (lineas.length > 1) {
    const segundaLinea = lineas[1];
    console.log(`Línea completa: "${segundaLinea}"`);
    console.log(`Longitud: ${segundaLinea.length} caracteres`);
    
    // Contar comillas
    const comillas = (segundaLinea.match(/"/g) || []).length;
    console.log(`Número de comillas: ${comillas}`);
    
    // Contar comas
    const comas = (segundaLinea.match(/,/g) || []).length;
    console.log(`Número de comas: ${comas}`);
    
    // Intentar diferentes métodos de parsing
    console.log('\n📋 MÉTODOS DE PARSING:');
    
    // Método 1: Split simple por comas
    const splitSimple = segundaLinea.split(',');
    console.log(`1. Split simple: ${splitSimple.length} campos`);
    splitSimple.forEach((campo, index) => {
      console.log(`   ${index + 1}. "${campo}"`);
    });
    
    // Método 2: Split respetando comillas
    const camposConComillas = parsearLineaCSV(segundaLinea);
    console.log(`\n2. Split con comillas: ${camposConComillas.length} campos`);
    camposConComillas.forEach((campo, index) => {
      console.log(`   ${index + 1}. "${campo}"`);
    });
  }
}

// Función para parsear una línea CSV respetando comillas
function parsearLineaCSV(linea: string): string[] {
  const valores: string[] = [];
  let actual = '';
  let dentroComillas = false;
  let i = 0;
  
  while (i < linea.length) {
    const char = linea[i];
    
    if (char === '"') {
      if (dentroComillas && linea[i + 1] === '"') {
        // Comilla escapada
        actual += '"';
        i += 2;
      } else {
        // Cambiar estado de comillas
        dentroComillas = !dentroComillas;
        i++;
      }
    } else if (char === ',' && !dentroComillas) {
      // Fin de campo
      valores.push(actual.trim());
      actual = '';
      i++;
    } else {
      actual += char;
      i++;
    }
  }
  
  // Agregar el último campo
  valores.push(actual.trim());
  
  return valores;
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  diagnosticarCSVDetallado();
}

export { diagnosticarCSVDetallado }; 