#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import { query } from '../src/lib/database';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

// Datos de los guardias que necesitan coordenadas
const guardiasSinCoordenadas = [
  {
    id: '0d704355-445c-44f5-b739-7af144151b51',
    rut: '20132531-5',
    nombre: 'Hans eduardo',
    apellido_paterno: 'Ceballo',
    apellido_materno: 'Sandoval',
    direccion: 'Rio choapa 9384, la granja santiago de chile',
    comuna: 'La Granja',
    ciudad: 'Santiago',
    coordenadas: { latitud: -33.5441, longitud: -70.6333 } // Coordenadas aproximadas de La Granja, Santiago
  },
  {
    id: '55dd4e1a-d165-43d7-adb2-3f0c0820936b',
    rut: '10639040-1',
    nombre: 'MARCELO IVAN',
    apellido_paterno: 'ASTORGA',
    apellido_materno: 'INOSTROZA',
    direccion: 'COLISEO 970, VILLA EL ROSAL',
    comuna: 'Maipú',
    ciudad: 'Santiago',
    coordenadas: { latitud: -33.5091, longitud: -70.7567 } // Coordenadas aproximadas de Maipú, Santiago
  },
  {
    id: '3790fabc-83af-400c-b4c2-5acfe6b2bd41',
    rut: '9494724-3',
    nombre: 'MARIO ANTONIO',
    apellido_paterno: 'GONZÁLEZ',
    apellido_materno: 'NOVOA',
    direccion: 'Av. ventisqueros 1561, sector 2 torre C dpto:104',
    comuna: 'Cerro Navia',
    ciudad: 'Santiago',
    coordenadas: { latitud: -33.4167, longitud: -70.7167 } // Coordenadas aproximadas de Cerro Navia, Santiago
  }
];

// Función para actualizar coordenadas de un guardia
async function actualizarCoordenadasGuardia(guardia: any) {
  const sqlQuery = `
    UPDATE guardias 
    SET latitud = $1, longitud = $2, updated_at = NOW()
    WHERE id = $3
  `;

  try {
    await query(sqlQuery, [
      guardia.coordenadas.latitud,
      guardia.coordenadas.longitud,
      guardia.id
    ]);
    
    console.log(`✅ Coordenadas actualizadas para ${guardia.nombre} ${guardia.apellido_paterno} ${guardia.apellido_materno} (${guardia.rut})`);
    console.log(`   📍 Lat: ${guardia.coordenadas.latitud}, Lng: ${guardia.coordenadas.longitud}`);
    return true;
  } catch (error) {
    console.error(`❌ Error actualizando coordenadas para ${guardia.rut}:`, error);
    return false;
  }
}

// Función principal
async function completarCoordenadasGuardias() {
  console.log('🚀 Iniciando actualización de coordenadas...');
  console.log(`📊 Procesando ${guardiasSinCoordenadas.length} guardias sin coordenadas\n`);
  
  let exitosos = 0;
  let fallidos = 0;
  
  for (const guardia of guardiasSinCoordenadas) {
    const resultado = await actualizarCoordenadasGuardia(guardia);
    if (resultado) {
      exitosos++;
    } else {
      fallidos++;
    }
    
    // Pequeña pausa para no sobrecargar la base de datos
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n📈 Resumen de actualización:`);
  console.log(`✅ Exitosos: ${exitosos}`);
  console.log(`❌ Fallidos: ${fallidos}`);
  console.log(`📊 Total procesados: ${guardiasSinCoordenadas.length}`);
  
  if (exitosos === guardiasSinCoordenadas.length) {
    console.log('\n🎉 ¡Todos los guardias ahora tienen coordenadas!');
    console.log('💡 Puedes ejecutar la auditoría nuevamente para verificar: npm run audit:guardias');
  }
  
  return { exitosos, fallidos, total: guardiasSinCoordenadas.length };
}

// Ejecutar el script
if (require.main === module) {
  completarCoordenadasGuardias()
    .then(() => {
      console.log('\n🏁 Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en el proceso:', error);
      process.exit(1);
    });
}

export { completarCoordenadasGuardias }; 