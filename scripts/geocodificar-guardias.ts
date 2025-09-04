import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';
import { 
  geocodificarLote, 
  actualizarCoordenadasGuardia, 
  obtenerGuardiasSinCoordenadas,
  construirDireccionCompleta 
} from '../src/lib/utils/geocoding-batch';

async function geocodificarGuardias() {
  console.log('🗺️ Iniciando geocodificación de guardias...\n');

  try {
    // Obtener guardias que necesitan geocodificación
    const guardiasSinCoordenadas = await obtenerGuardiasSinCoordenadas();
    
    if (guardiasSinCoordenadas.length === 0) {
      console.log('✅ No hay guardias que necesiten geocodificación');
      return;
    }

    console.log(`📊 Procesando ${guardiasSinCoordenadas.length} guardias sin coordenadas...\n`);

    // Construir direcciones completas
    const direcciones = guardiasSinCoordenadas.map(guardia => 
      construirDireccionCompleta(guardia.direccion, guardia.comuna, guardia.ciudad)
    );

    console.log('📍 Direcciones a geocodificar:');
    direcciones.forEach((dir, index) => {
      console.log(`   ${index + 1}. ${dir}`);
    });
    console.log('');

    // Geocodificar en lote
    console.log('🔄 Iniciando geocodificación...');
    const resultados = await geocodificarLote(direcciones, 300); // 300ms delay entre requests

    // Actualizar guardias con coordenadas obtenidas
    let actualizados = 0;
    const errores: string[] = [];

    console.log('\n📝 Actualizando coordenadas en base de datos...');
    
    for (let i = 0; i < resultados.length; i++) {
      const { direccion, resultado } = resultados[i];
      const guardia = guardiasSinCoordenadas[i];

      if (resultado) {
        try {
          await actualizarCoordenadasGuardia(guardia.id, resultado);
          actualizados++;
          console.log(`✅ ${guardia.nombre} ${guardia.apellido_paterno}: ${resultado.latitud}, ${resultado.longitud}`);
        } catch (error) {
          const errorMsg = `Error actualizando coordenadas para ${guardia.nombre} ${guardia.apellido_paterno}: ${error instanceof Error ? error.message : 'Error desconocido'}`;
          errores.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      } else {
        const errorMsg = `No se pudo geocodificar dirección para ${guardia.nombre} ${guardia.apellido_paterno}: ${direccion}`;
        errores.push(errorMsg);
        console.warn(`⚠️ ${errorMsg}`);
      }
    }

    console.log(`\n📊 RESUMEN:`);
    console.log(`   • Guardias procesados: ${guardiasSinCoordenadas.length}`);
    console.log(`   • Guardias actualizados: ${actualizados}`);
    console.log(`   • Errores: ${errores.length}`);
    console.log(`   • Tasa de éxito: ${((actualizados / guardiasSinCoordenadas.length) * 100).toFixed(1)}%`);

    if (errores.length > 0) {
      console.log(`\n❌ ERRORES:`);
      errores.forEach(error => console.log(`   • ${error}`));
    }

    console.log('\n✅ Geocodificación completada!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Función para mostrar estadísticas
async function mostrarEstadisticas() {
  console.log('📊 ESTADÍSTICAS DE GEOCODIFICACIÓN\n');

  try {
    // Estadísticas generales
    const stats = await query(`
      SELECT 
        COUNT(*) as total_guardias,
        COUNT(CASE WHEN latitud IS NOT NULL AND longitud IS NOT NULL THEN 1 END) as con_coordenadas,
        COUNT(CASE WHEN latitud IS NULL OR longitud IS NULL THEN 1 END) as sin_coordenadas,
        COUNT(CASE WHEN direccion IS NOT NULL AND direccion != '' THEN 1 END) as con_direccion
      FROM guardias
    `);

    const stat = stats.rows[0];
    console.log(`📈 ESTADÍSTICAS GENERALES:`);
    console.log(`   • Total guardias: ${stat.total_guardias}`);
    console.log(`   • Con coordenadas: ${stat.con_coordenadas}`);
    console.log(`   • Sin coordenadas: ${stat.sin_coordenadas}`);
    console.log(`   • Con dirección: ${stat.con_direccion}`);
    console.log(`   • Porcentaje geocodificado: ${((stat.con_coordenadas / stat.total_guardias) * 100).toFixed(1)}%\n`);

    // Guardias sin coordenadas
    const sinCoordenadas = await query(`
      SELECT 
        nombre,
        apellido_paterno,
        apellido_materno,
        direccion,
        comuna,
        ciudad
      FROM guardias 
      WHERE (latitud IS NULL OR longitud IS NULL)
        AND direccion IS NOT NULL 
        AND direccion != ''
      ORDER BY nombre, apellido_paterno
      LIMIT 10
    `);

    if (sinCoordenadas.rows.length > 0) {
      console.log(`⚠️ GUARDIAS SIN COORDENADAS (primeros 10):`);
      sinCoordenadas.rows.forEach((guardia, index) => {
        const direccionCompleta = construirDireccionCompleta(guardia.direccion, guardia.comuna, guardia.ciudad);
        console.log(`   ${index + 1}. ${guardia.nombre} ${guardia.apellido_paterno}: ${direccionCompleta}`);
      });
    }

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
  }
}

// Ejecutar según argumentos
const args = process.argv.slice(2);
if (args.includes('--stats') || args.includes('-s')) {
  mostrarEstadisticas();
} else {
  geocodificarGuardias();
}
