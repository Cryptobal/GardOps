#!/usr/bin/env ts-node

import * as fs from 'fs';

// Configuración
const FICHA_PATH = "BBDD GGSS.csv";
const LATLNG_PATH = "latlng_guardias.csv";

// Función para leer archivo CSV simple
function leerCSV<T>(filePath: string): T[] {
  const contenido = fs.readFileSync(filePath, 'utf-8');
  const lineas = contenido.split('\n');
  const headers = lineas[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  console.log(`📋 Headers de ${filePath}:`);
  headers.forEach((header, index) => {
    console.log(`  ${index + 1}. "${header}"`);
  });
  console.log('');
  
  const resultados: T[] = [];
  
  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    if (!linea) continue;
    
    // Parsear CSV simple (sin manejar comas dentro de campos)
    const valores = linea.split(',').map(v => v.replace(/"/g, '').trim());
    const objeto: any = {};
    
    headers.forEach((header, index) => {
      objeto[header] = valores[index] || '';
    });
    
    resultados.push(objeto as T);
  }
  
  return resultados;
}

// Función para diagnosticar
function diagnosticarCSV(): void {
  console.log('🔍 DIAGNÓSTICO DE ARCHIVOS CSV');
  console.log('='.repeat(50));
  
  // Verificar que los archivos existan
  if (!fs.existsSync(FICHA_PATH)) {
    console.log(`❌ Archivo no encontrado: ${FICHA_PATH}`);
    return;
  }
  if (!fs.existsSync(LATLNG_PATH)) {
    console.log(`❌ Archivo no encontrado: ${LATLNG_PATH}`);
    return;
  }
  
  console.log('✅ Archivos encontrados');
  console.log('');
  
  // Leer archivos
  const fichaData = leerCSV(FICHA_PATH);
  const coordenadasData = leerCSV(LATLNG_PATH);
  
  console.log(`📊 Ficha principal: ${fichaData.length} registros`);
  console.log(`📍 Coordenadas: ${coordenadasData.length} registros`);
  console.log('');
  
  // Mostrar primeros registros de ficha
  console.log('📋 PRIMEROS 3 REGISTROS DE FICHA:');
  fichaData.slice(0, 3).forEach((registro: any, index) => {
    console.log(`\n${index + 1}. Registro:`);
    Object.entries(registro).forEach(([key, value]) => {
      console.log(`   ${key}: "${value}"`);
    });
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 PRIMEROS 3 REGISTROS DE COORDENADAS:');
  coordenadasData.slice(0, 3).forEach((registro: any, index) => {
    console.log(`\n${index + 1}. Registro:`);
    Object.entries(registro).forEach(([key, value]) => {
      console.log(`   ${key}: "${value}"`);
    });
  });
  
  // Verificar campos RUT
  console.log('\n' + '='.repeat(50));
  console.log('🔍 ANÁLISIS DE CAMPOS RUT:');
  
  const rutValues = fichaData.map((r: any) => r.RUT).filter(rut => rut && rut.trim() !== '');
  console.log(`📊 Total de RUTs no vacíos: ${rutValues.length}`);
  
  if (rutValues.length > 0) {
    console.log('📋 Primeros 5 RUTs:');
    rutValues.slice(0, 5).forEach((rut, index) => {
      console.log(`  ${index + 1}. "${rut}"`);
    });
  }
  
  // Verificar campos de dirección
  console.log('\n' + '='.repeat(50));
  console.log('🔍 ANÁLISIS DE CAMPOS DIRECCIÓN:');
  
  const direccionValues = fichaData.map((r: any) => r.Dirección).filter(dir => dir && dir.trim() !== '');
  console.log(`📊 Total de direcciones no vacías: ${direccionValues.length}`);
  
  if (direccionValues.length > 0) {
    console.log('📋 Primeras 5 direcciones:');
    direccionValues.slice(0, 5).forEach((dir, index) => {
      console.log(`  ${index + 1}. "${dir}"`);
    });
  }
  
  // Verificar campos de coordenadas
  console.log('\n' + '='.repeat(50));
  console.log('🔍 ANÁLISIS DE CAMPOS COORDENADAS:');
  
  const latValues = coordenadasData.map((r: any) => r.latitud).filter(lat => lat && lat.trim() !== '');
  const lngValues = coordenadasData.map((r: any) => r.longitud).filter(lng => lng && lng.trim() !== '');
  
  console.log(`📊 Total de latitudes no vacías: ${latValues.length}`);
  console.log(`📊 Total de longitudes no vacías: ${lngValues.length}`);
  
  if (latValues.length > 0) {
    console.log('📋 Primeras 5 latitudes:');
    latValues.slice(0, 5).forEach((lat, index) => {
      console.log(`  ${index + 1}. "${lat}"`);
    });
  }
  
  if (lngValues.length > 0) {
    console.log('📋 Primeras 5 longitudes:');
    lngValues.slice(0, 5).forEach((lng, index) => {
      console.log(`  ${index + 1}. "${lng}"`);
    });
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  diagnosticarCSV();
}

export { diagnosticarCSV }; 