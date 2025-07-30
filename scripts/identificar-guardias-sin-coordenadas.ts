#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import { query } from '../src/lib/database';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

async function identificarGuardiasSinCoordenadas() {
  console.log('🔍 Identificando guardias sin coordenadas...\n');

  try {
    // Consultar guardias sin coordenadas
    const result = await query(`
      SELECT 
        id,
        rut,
        nombre,
        apellido_paterno,
        apellido_materno,
        direccion,
        comuna,
        ciudad,
        telefono,
        email,
        latitud,
        longitud
      FROM guardias 
      WHERE latitud IS NULL OR longitud IS NULL
      ORDER BY nombre, apellido_paterno
    `);

    if (result.rows.length === 0) {
      console.log('✅ Todos los guardias tienen coordenadas geográficas');
      return;
    }

    console.log(`⚠️  Se encontraron ${result.rows.length} guardias sin coordenadas:\n`);
    
    result.rows.forEach((guardia: any, index: number) => {
      console.log(`${index + 1}. ${guardia.nombre} ${guardia.apellido_paterno} ${guardia.apellido_materno}`);
      console.log(`   RUT: ${guardia.rut}`);
      console.log(`   Dirección: ${guardia.direccion || 'No especificada'}`);
      console.log(`   Comuna: ${guardia.comuna || 'No especificada'}`);
      console.log(`   Ciudad: ${guardia.ciudad || 'No especificada'}`);
      console.log(`   Teléfono: ${guardia.telefono || 'No especificado'}`);
      console.log(`   Email: ${guardia.email || 'No especificado'}`);
      console.log(`   ID: ${guardia.id}`);
      console.log('');
    });

    // Mostrar estadísticas
    console.log('📊 Estadísticas:');
    console.log(`• Total de guardias sin coordenadas: ${result.rows.length}`);
    
    const conDireccion = result.rows.filter((g: any) => g.direccion && g.direccion.trim() !== '').length;
    const sinDireccion = result.rows.length - conDireccion;
    
    console.log(`• Con dirección: ${conDireccion}`);
    console.log(`• Sin dirección: ${sinDireccion}`);

    if (conDireccion > 0) {
      console.log('\n💡 Recomendación: Usar Google Maps Geocoding API para obtener coordenadas de las direcciones disponibles.');
    }

  } catch (error) {
    console.error('❌ Error al consultar guardias sin coordenadas:', error);
  }
}

// Ejecutar el script
if (require.main === module) {
  identificarGuardiasSinCoordenadas()
    .then(() => {
      console.log('🎉 Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en el proceso:', error);
      process.exit(1);
    });
}

export { identificarGuardiasSinCoordenadas }; 