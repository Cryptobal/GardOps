#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import { query } from '../src/lib/database';
import * as fs from 'fs';
import csv from 'csv-parser';

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

async function analizarRutsFaltantes() {
  console.log('🔍 Analizando RUTs en Neon vs CSV...\n');

  try {
    // 1. Obtener todos los RUTs de Neon
    const neonResult = await query(`
      SELECT rut FROM guardias 
      ORDER BY rut
    `);
    
    const rutsEnNeon = new Set(neonResult.rows.map((row: any) => row.rut));
    console.log(`📊 RUTs en Neon: ${rutsEnNeon.size}`);

    // 2. Leer el archivo CSV
    const rutsEnCSV = new Set<string>();
    const guardiasCSV: GuardiaCSV[] = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream('BBDD GGSS.csv')
        .pipe(csv())
        .on('data', (row: any) => {
          const rut = row.RUT?.trim();
          if (rut && rut !== 'RUT' && rut !== '') {
            rutsEnCSV.add(rut);
            guardiasCSV.push({
              rut,
              apellido_paterno: row['apellido paterno\nTEXT\nNOT NULL'] || '',
              apellido_materno: row['apellido materno\nTEXT\nNOT NULL'] || '',
              nombre: row['nombre\nTEXT\nNOT NULL'] || '',
              email: row['email\nTEXT\nUNIQUE'] || '',
              telefono: row['Celular\nTEXT'] || '',
              sexo: row['Sexo (solo opcion de hombre o mujer)'] || '',
              activo: row['activo\nBOOLEAN\nDEFAULTtrue'] === 'TRUE',
              direccion: row['Dirección'] || '',
              comuna: row['comuna\nVARCHAR(100)'] || '',
              ciudad: row['ciudad\nVARCHAR(100)'] || '',
              nacionalidad: row['Nacionalidad'] || '',
              instalacion: row['Instalación (este campo relaciona a cada guardia con una instalacion)'] || '',
              jornada: row['Jornada'] || '',
              banco: row['Banco (videne da la tabla ya creada bancos)'] || '',
              tipo_cuenta: row['Tipo Cuenta'] || '',
              numero_cuenta: row['N° Cuenta'] || '',
              anticipo: row['Anticipo'] || '',
              fecha_nacimiento: row['Fecha Nacimiento'] || '',
              fecha_contrato: row['Fecha Contrato'] || '',
              fecha_os10: row['Fecha OS10'] || ''
            });
          }
        })
        .on('end', async () => {
          console.log(`📊 RUTs en CSV: ${rutsEnCSV.size}`);
          console.log(`📊 Total de guardias en CSV: ${guardiasCSV.length}\n`);

          // 3. Encontrar RUTs que faltan en Neon
          const rutsFaltantes = new Set<string>();
          rutsEnCSV.forEach((rut: string) => {
            if (!rutsEnNeon.has(rut)) {
              rutsFaltantes.add(rut);
            }
          });

          console.log(`❌ RUTs faltantes en Neon: ${rutsFaltantes.size}`);
          
          if (rutsFaltantes.size > 0) {
            console.log('\n📋 Lista de RUTs faltantes:');
            const rutsFaltantesArray = Array.from(rutsFaltantes).sort();
            rutsFaltantesArray.forEach((rut, index) => {
              const guardia = guardiasCSV.find(g => g.rut === rut);
              if (guardia) {
                console.log(`${index + 1}. ${rut} - ${guardia.nombre} ${guardia.apellido_paterno} ${guardia.apellido_materno}`);
              }
            });

            // 4. Filtrar guardias que faltan
            const guardiasFaltantes = guardiasCSV.filter(g => rutsFaltantes.has(g.rut));
            
            console.log(`\n✅ Guardias a cargar: ${guardiasFaltantes.length}`);
            
            // Guardar en archivo para referencia
            fs.writeFileSync(
              'scripts/guardias-faltantes.json', 
              JSON.stringify(guardiasFaltantes, null, 2)
            );
            
            console.log('\n💾 Guardias faltantes guardados en: scripts/guardias-faltantes.json');
            
            resolve(guardiasFaltantes);
          } else {
            console.log('✅ Todos los RUTs del CSV ya están en Neon');
            resolve([]);
          }
        })
        .on('error', reject);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Ejecutar el análisis
analizarRutsFaltantes()
  .then(() => {
    console.log('\n✅ Análisis completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en el análisis:', error);
    process.exit(1);
  }); 