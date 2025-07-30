#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import { query } from '../src/lib/database';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

interface GuardiaCSV {
  rut: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre: string;
  email: string;
  telefono: string;
  sexo: string;
  activo: boolean;
  direccion: string;
  comuna: string;
  ciudad: string;
  nacionalidad: string;
  instalacion: string;
  jornada: string;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  anticipo: string;
  fecha_nacimiento: string;
  fecha_contrato: string;
  fecha_os10: string;
}

async function cargarGuardiasFaltantes() {
  console.log('🚀 Cargando guardias faltantes a Neon...\n');

  try {
    // Leer el archivo JSON con los guardias faltantes
    const guardiasFaltantes: GuardiaCSV[] = JSON.parse(
      fs.readFileSync('scripts/guardias-faltantes.json', 'utf-8')
    );

    // Filtrar solo los guardias válidos (excluir headers mal parseados)
    const guardiasValidos = guardiasFaltantes.filter(guardia => {
      return guardia.rut && 
             guardia.rut.length > 5 && 
             !guardia.rut.includes('"') &&
             !guardia.rut.includes('activo') &&
             !guardia.rut.includes('apellido') &&
             !guardia.rut.includes('Fecha') &&
             !guardia.rut.includes('Instalación');
    });

    console.log(`📊 Guardias válidos a cargar: ${guardiasValidos.length}\n`);

    let cargados = 0;
    let errores = 0;

    for (const guardia of guardiasValidos) {
      try {
        // Generar email único si está vacío
        let email = guardia.email;
        if (!email || email.trim() === '') {
          email = `${guardia.rut.replace('-', '')}@gardops.cl`;
        }

        // Generar coordenadas aproximadas basadas en la comuna/ciudad
        let latitud = null;
        let longitud = null;

        if (guardia.comuna && guardia.ciudad) {
          // Coordenadas aproximadas por ciudad
          const coordenadasPorCiudad: { [key: string]: [number, number] } = {
            'Santiago': [-33.4489, -70.6693],
            'Antofagasta': [-23.6509, -70.3955],
            'Concepción': [-36.8269, -73.0498],
            'Valparaíso': [-33.0472, -71.6127],
            'La Serena': [-29.9045, -71.2489],
            'Temuco': [-38.7397, -72.5984],
            'Iquique': [-20.2307, -70.1351],
            'Rancagua': [-34.1706, -70.7406],
            'Arica': [-18.4783, -70.3126],
            'Talca': [-35.4264, -71.6554],
            'Chillán': [-36.6066, -72.1034],
            'Los Ángeles': [-37.4713, -72.3616],
            'Puerto Montt': [-41.4717, -72.9366],
            'Coquimbo': [-29.9533, -71.3436],
            'Calama': [-22.4544, -68.9294],
            'Ovalle': [-30.6011, -71.1990],
            'Quillota': [-32.8833, -71.2667],
            'Copiapó': [-27.3668, -70.3322],
            'La Calera': [-32.7833, -71.2167],
            'Osorno': [-40.5769, -73.1142],
            'Curicó': [-34.9828, -71.2394],
            'Villa Alemana': [-33.0444, -71.3733],
            'San Antonio': [-33.5957, -71.6147],
            'Punta Arenas': [-53.1638, -70.9171],
            'Melipilla': [-33.6891, -71.2153],
            'Los Andes': [-32.8337, -70.5983],
            'San Felipe': [-32.7507, -70.7256],
            'Linares': [-35.8467, -71.5931],
            'Illapel': [-31.6333, -71.1667],
            'San Fernando': [-34.5867, -70.9889],
            'Angol': [-37.8000, -72.7167],
            'Lautaro': [-38.5167, -72.4500],
            'Limache': [-33.0167, -71.2667],
            'Quilpué': [-33.0500, -71.4500],
            'Villa Alemana': [-33.0444, -71.3733],
            'San Bernardo': [-33.5927, -70.6995],
            'Maipú': [-33.5167, -70.7667],
            'La Florida': [-33.5500, -70.5667],
            'Puente Alto': [-33.6167, -70.5833],
            'Las Condes': [-33.4167, -70.5667],
            'Providencia': [-33.4333, -70.6167],
            'Ñuñoa': [-33.4500, -70.6167],
            'Macul': [-33.4833, -70.5667],
            'Peñalolén': [-33.4833, -70.5500],
            'La Reina': [-33.4500, -70.5500],
            'Lo Barnechea': [-33.3500, -70.5167],
            'Vitacura': [-33.3833, -70.5667],
            'Independencia': [-33.4167, -70.6500],
            'Recoleta': [-33.4167, -70.6333],
            'Conchalí': [-33.3833, -70.6833],
            'Huechuraba': [-33.3667, -70.6500],
            'Quinta Normal': [-33.4333, -70.7000],
            'Lo Prado': [-33.4500, -70.7167],
            'Estación Central': [-33.4500, -70.6833],
            'Cerrillos': [-33.5000, -70.7167],
            'Pedro Aguirre Cerda': [-33.4833, -70.6833],
            'Lo Espejo': [-33.5167, -70.6833],
            'La Cisterna': [-33.5333, -70.6667],
            'San Ramón': [-33.5500, -70.6500],
            'La Granja': [-33.5500, -70.6333],
            'La Pintana': [-33.5833, -70.6333],
            'El Bosque': [-33.5667, -70.6833],
            'Pedro Aguirre Cerda': [-33.4833, -70.6833],
            'San Joaquín': [-33.4833, -70.6500],
            'La Florida': [-33.5500, -70.5667],
            'Ñuñoa': [-33.4500, -70.6167],
            'Peñalolén': [-33.4833, -70.5500],
            'La Reina': [-33.4500, -70.5500],
            'Las Condes': [-33.4167, -70.5667],
            'Providencia': [-33.4333, -70.6167],
            'Vitacura': [-33.3833, -70.5667],
            'Lo Barnechea': [-33.3500, -70.5167],
            'Colina': [-33.2000, -70.6833],
            'Lampa': [-33.2833, -70.8833],
            'Tiltil': [-33.0833, -70.9333],
            'San José de Maipo': [-33.6333, -70.3500],
            'Pirque': [-33.6333, -70.5500],
            'Puente Alto': [-33.6167, -70.5833],
            'San Bernardo': [-33.5927, -70.6995],
            'Buin': [-33.7333, -70.7500],
            'Calera de Tango': [-33.6333, -70.7833],
            'Paine': [-33.8167, -70.7500],
            'Melipilla': [-33.6891, -71.2153],
            'Alhué': [-34.0333, -71.1000],
            'Curacaví': [-33.4000, -71.1500],
            'María Pinto': [-33.5167, -71.1333],
            'San Pedro': [-33.9000, -71.4667],
            'Isla de Maipo': [-33.7500, -70.9000],
            'El Monte': [-33.6833, -70.9833],
            'Padre Hurtado': [-33.5667, -70.8167],
            'Peñaflor': [-33.6167, -70.8833],
            'Talagante': [-33.6667, -70.9333],
            'Quinta Normal': [-33.4333, -70.7000],
            'Lo Prado': [-33.4500, -70.7167],
            'Estación Central': [-33.4500, -70.6833],
            'Cerrillos': [-33.5000, -70.7167],
            'Pedro Aguirre Cerda': [-33.4833, -70.6833],
            'Lo Espejo': [-33.5167, -70.6833],
            'La Cisterna': [-33.5333, -70.6667],
            'San Ramón': [-33.5500, -70.6500],
            'La Granja': [-33.5500, -70.6333],
            'La Pintana': [-33.5833, -70.6333],
            'El Bosque': [-33.5667, -70.6833],
            'San Joaquín': [-33.4833, -70.6500],
            'La Florida': [-33.5500, -70.5667],
            'Ñuñoa': [-33.4500, -70.6167],
            'Peñalolén': [-33.4833, -70.5500],
            'La Reina': [-33.4500, -70.5500],
            'Las Condes': [-33.4167, -70.5667],
            'Providencia': [-33.4333, -70.6167],
            'Vitacura': [-33.3833, -70.5667],
            'Lo Barnechea': [-33.3500, -70.5167],
            'Colina': [-33.2000, -70.6833],
            'Lampa': [-33.2833, -70.8833],
            'Tiltil': [-33.0833, -70.9333],
            'San José de Maipo': [-33.6333, -70.3500],
            'Pirque': [-33.6333, -70.5500],
            'Puente Alto': [-33.6167, -70.5833],
            'San Bernardo': [-33.5927, -70.6995],
            'Buin': [-33.7333, -70.7500],
            'Calera de Tango': [-33.6333, -70.7833],
            'Paine': [-33.8167, -70.7500],
            'Melipilla': [-33.6891, -71.2153],
            'Alhué': [-34.0333, -71.1000],
            'Curacaví': [-33.4000, -71.1500],
            'María Pinto': [-33.5167, -71.1333],
            'San Pedro': [-33.9000, -71.4667],
            'Isla de Maipo': [-33.7500, -70.9000],
            'El Monte': [-33.6833, -70.9833],
            'Padre Hurtado': [-33.5667, -70.8167],
            'Peñaflor': [-33.6167, -70.8833],
            'Talagante': [-33.6667, -70.9333]
          };

          const ciudadKey = guardia.ciudad.toLowerCase();
          for (const [ciudad, coords] of Object.entries(coordenadasPorCiudad)) {
            if (ciudadKey.includes(ciudad.toLowerCase()) || 
                guardia.comuna.toLowerCase().includes(ciudad.toLowerCase())) {
              latitud = coords[0];
              longitud = coords[1];
              break;
            }
          }
        }

        // Insertar guardia
        await query(`
          INSERT INTO guardias (
            id, rut, apellido_paterno, apellido_materno, nombre, 
            email, telefono, sexo, activo, direccion, comuna, ciudad, 
            nacionalidad, latitud, longitud, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
          )
        `, [
          uuidv4(),
          guardia.rut,
          guardia.apellido_paterno,
          guardia.apellido_materno,
          guardia.nombre,
          email,
          guardia.telefono,
          guardia.sexo,
          guardia.activo,
          guardia.direccion,
          guardia.comuna,
          guardia.ciudad,
          guardia.nacionalidad,
          latitud,
          longitud
        ]);

        cargados++;
        console.log(`✅ ${cargados}. ${guardia.rut} - ${guardia.nombre} ${guardia.apellido_paterno} ${guardia.apellido_materno}`);

      } catch (error: any) {
        errores++;
        console.log(`❌ Error con ${guardia.rut}: ${error.message}`);
      }
    }

    console.log(`\n📊 Resumen:`);
    console.log(`✅ Guardias cargados: ${cargados}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📈 Total procesados: ${cargados + errores}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Ejecutar la carga
cargarGuardiasFaltantes()
  .then(() => {
    console.log('\n✅ Carga completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en la carga:', error);
    process.exit(1);
  }); 