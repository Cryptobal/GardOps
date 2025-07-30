#!/usr/bin/env node

/**
 * Script de prueba para la funcionalidad de Optimización de Asignaciones
 * 
 * Este script verifica:
 * 1. Que las APIs respondan correctamente
 * 2. Que los cálculos de distancia sean precisos
 * 3. Que los datos se formateen correctamente
 */

const fetch = require('node-fetch');

// Configuración
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TEST_TENANT_ID = 'test-tenant-id';

// Función para calcular distancia (misma que en el frontend)
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Función para probar API de guardias
async function testGuardiasAPI() {
  console.log('🧪 Probando API de guardias con coordenadas...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/guardias-con-coordenadas?tenantId=${TEST_TENANT_ID}`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ API de guardias: ${data.data.length} guardias encontrados`);
      
      // Verificar estructura de datos
      if (data.data.length > 0) {
        const guardia = data.data[0];
        const camposRequeridos = ['id', 'nombre', 'direccion', 'latitud', 'longitud'];
        const camposValidos = camposRequeridos.every(campo => guardia[campo] !== undefined);
        
        if (camposValidos) {
          console.log('✅ Estructura de datos de guardias válida');
        } else {
          console.log('❌ Estructura de datos de guardias inválida');
        }
      }
    } else {
      console.log(`❌ API de guardias: ${data.error}`);
    }
  } catch (error) {
    console.log(`❌ Error en API de guardias: ${error.message}`);
  }
}

// Función para probar API de instalaciones
async function testInstalacionesAPI() {
  console.log('🧪 Probando API de instalaciones con coordenadas...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/instalaciones-con-coordenadas?tenantId=${TEST_TENANT_ID}`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ API de instalaciones: ${data.data.length} instalaciones encontradas`);
      
      // Verificar estructura de datos
      if (data.data.length > 0) {
        const instalacion = data.data[0];
        const camposRequeridos = ['id', 'nombre', 'direccion', 'latitud', 'longitud'];
        const camposValidos = camposRequeridos.every(campo => instalacion[campo] !== undefined);
        
        if (camposValidos) {
          console.log('✅ Estructura de datos de instalaciones válida');
        } else {
          console.log('❌ Estructura de datos de instalaciones inválida');
        }
      }
    } else {
      console.log(`❌ API de instalaciones: ${data.error}`);
    }
  } catch (error) {
    console.log(`❌ Error en API de instalaciones: ${error.message}`);
  }
}

// Función para probar cálculos de distancia
function testCalculosDistancia() {
  console.log('🧪 Probando cálculos de distancia...');
  
  // Coordenadas de Concepción, Chile
  const concepcion = { lat: -36.8270, lng: -73.0500 };
  
  // Coordenadas de Chiguayante, Chile (cerca de Concepción)
  const chiguayante = { lat: -36.9214, lng: -73.0167 };
  
  // Coordenadas de Santiago, Chile (más lejos)
  const santiago = { lat: -33.4489, lng: -70.6693 };
  
  // Calcular distancias
  const distanciaConcepcionChiguayante = calcularDistancia(
    concepcion.lat, concepcion.lng,
    chiguayante.lat, chiguayante.lng
  );
  
  const distanciaConcepcionSantiago = calcularDistancia(
    concepcion.lat, concepcion.lng,
    santiago.lat, santiago.lng
  );
  
  console.log(`📏 Concepción → Chiguayante: ${distanciaConcepcionChiguayante.toFixed(1)} km`);
  console.log(`📏 Concepción → Santiago: ${distanciaConcepcionSantiago.toFixed(1)} km`);
  
  // Verificar que las distancias sean razonables
  if (distanciaConcepcionChiguayante > 0 && distanciaConcepcionChiguayante < 20) {
    console.log('✅ Distancia Concepción-Chiguayante es razonable');
  } else {
    console.log('❌ Distancia Concepción-Chiguayante parece incorrecta');
  }
  
  if (distanciaConcepcionSantiago > 400 && distanciaConcepcionSantiago < 500) {
    console.log('✅ Distancia Concepción-Santiago es razonable');
  } else {
    console.log('❌ Distancia Concepción-Santiago parece incorrecta');
  }
}

// Función para probar búsqueda de ubicaciones cercanas
function testBusquedaCercanas() {
  console.log('🧪 Probando búsqueda de ubicaciones cercanas...');
  
  // Datos de prueba
  const referencia = {
    id: 'ref-1',
    nombre: 'Punto de Referencia',
    latitud: -36.8270,
    longitud: -73.0500
  };
  
  const ubicaciones = [
    {
      id: 'loc-1',
      nombre: 'Ubicación Cercana',
      latitud: -36.8300,
      longitud: -73.0550
    },
    {
      id: 'loc-2',
      nombre: 'Ubicación Lejana',
      latitud: -36.9000,
      longitud: -73.1000
    },
    {
      id: 'loc-3',
      nombre: 'Ubicación Muy Cercana',
      latitud: -36.8275,
      longitud: -73.0505
    }
  ];
  
  // Buscar ubicaciones cercanas
  const distanciaMaxima = 10; // 10 km
  const resultados = ubicaciones
    .map(ubicacion => ({
      ...ubicacion,
      distancia: calcularDistancia(
        referencia.latitud,
        referencia.longitud,
        ubicacion.latitud,
        ubicacion.longitud
      )
    }))
    .filter(resultado => resultado.distancia <= distanciaMaxima)
    .sort((a, b) => a.distancia - b.distancia);
  
  console.log(`📊 Encontradas ${resultados.length} ubicaciones dentro de ${distanciaMaxima} km`);
  
  resultados.forEach(resultado => {
    console.log(`  - ${resultado.nombre}: ${resultado.distancia.toFixed(2)} km`);
  });
  
  if (resultados.length >= 2) {
    console.log('✅ Búsqueda de ubicaciones cercanas funciona correctamente');
  } else {
    console.log('❌ Búsqueda de ubicaciones cercanas no encontró suficientes resultados');
  }
}

// Función principal
async function runTests() {
  console.log('🚀 Iniciando pruebas de Optimización de Asignaciones...\n');
  
  // Ejecutar pruebas
  await testGuardiasAPI();
  console.log('');
  
  await testInstalacionesAPI();
  console.log('');
  
  testCalculosDistancia();
  console.log('');
  
  testBusquedaCercanas();
  console.log('');
  
  console.log('✨ Pruebas completadas');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testGuardiasAPI,
  testInstalacionesAPI,
  testCalculosDistancia,
  testBusquedaCercanas,
  calcularDistancia
}; 