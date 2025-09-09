#!/usr/bin/env ts-node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

// Lista de RUTs a corregir
const RUTS_A_CORREGIR = [
  '9166943-9', '16563350-4', '16032595-K', '16147407-k', '19139275-2',
  '20382235-9', '16304718-7', '25629118-5', '25933812-3', '18563612-7',
  '18830186-K', '8332329-9', '9061144-5', '21381703-5', '9146689-9',
  '9178825-K', '9350807-6', '9920483-4', '18883244-K', '16412103-8',
  '19104063-5', '9991272-3', '19222820-4', '19284975-6', '16441461-2',
  '19448798-3', '16519729-1', '19683046-4', '19707020-k', '10122151-2',
  '10150927-3', '19787268-3', '10165663-2', '19887162-1', '10198125-8',
  '10396288-9', '20122675-9', '10826281-8', '11207494-5', '16696412-1',
  '20131346-5', '20216227-4', '20228775-1', '16744067-3', '20432415-8',
  '20453936-7', '20721061-7', '11614357-7', '12003583-5', '12833245-6',
  '12864761-9', '13173493-k', '13211292-4', '16755015-0', '16866346-3',
  '20904805-1', '21112460-1', '13281478-3', '16924218-6', '21194404-8',
  '13283511-K', '24378420-4', '13344687-7', '25978430-1', '16953359-8',
  '26952355-7', '17414800-7', '13401103-3', '17462903-K', '13479418-6',
  '17548578-3', '17122247-8', '13566525-8', '13596911-7', '17564802-K',
  '13871754-2', '17614310-K', '13980816', '17689223-4', '15071621-7',
  '17689964-6', '17902401-2', '15184055-8', '15976054-5'
];

// Función para convertir fecha DD-MM-YYYY a YYYY-MM-DD
function convertirFecha(fecha: string): string | null {
  if (!fecha || fecha.trim() === '') return null;
  
  const partes = fecha.split('-');
  if (partes.length === 3) {
    const [dia, mes, año] = partes;
    return `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }
  return null;
}

// Función para limpiar y validar datos
function limpiarDatos(datos: any): any {
  return {
    rut: datos.rut?.trim() || null,
    apellido_paterno: datos.apellido_paterno?.trim() || 'Sin Apellido',
    apellido_materno: datos.apellido_materno?.trim() || 'Sin Apellido',
    nombre: datos.nombre?.trim() || 'Sin Nombre',
    email: datos.email?.trim() || null,
    telefono: datos.Celular?.trim() || null,
    sexo: datos.sexo?.trim() === 'Hombre' ? 'Hombre' : 'Mujer',
    activo: datos.activo?.toLowerCase() === 'true',
    direccion: datos.direccion?.trim() || 'Sin Dirección',
    comuna: datos.comuna?.trim() || 'Sin Comuna',
    ciudad: datos.ciudad?.trim() || 'Sin Ciudad',
    nacionalidad: datos.nacionalidad?.trim() || 'CHILENA',
    fecha_os10: convertirFecha(datos.fecha_os10),
    latitud: datos.latitud ? parseFloat(datos.latitud) : null,
    longitud: datos.longitud ? parseFloat(datos.longitud) : null
  };
}

// Función para normalizar dirección para comparación
function normalizarDireccion(direccion: string): string {
  return direccion
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function corregirDatosGuardias(): Promise<void> {
  console.log('🚀 Corrigiendo datos de guardias específicos...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  try {
    // Leer el CSV principal
    console.log('📖 Leyendo archivo CSV principal...');
    const csvContent = fs.readFileSync('BBDD GGSS.csv', 'utf-8');
    const lines = csvContent.split('\n');
    
    // Crear mapa de datos del CSV por RUT
    const datosCSV: { [rut: string]: any } = {};
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Parsear línea CSV (manejar comillas)
      const columns = line.split(';');
      if (columns.length >= 22) {
        const rut = columns[2]?.replace(/"/g, '').trim();
        if (rut && RUTS_A_CORREGIR.includes(rut)) {
          datosCSV[rut] = {
            rut: rut,
            apellido_paterno: columns[3]?.replace(/"/g, '').trim(),
            apellido_materno: columns[4]?.replace(/"/g, '').trim(),
            nombre: columns[5]?.replace(/"/g, '').trim(),
            email: columns[6]?.replace(/"/g, '').trim(),
            Celular: columns[7]?.replace(/"/g, '').trim(),
            sexo: columns[8]?.replace(/"/g, '').trim(),
            activo: columns[9]?.replace(/"/g, '').trim(),
            fecha_contrato: columns[10]?.replace(/"/g, '').trim(),
            instalacion: columns[11]?.replace(/"/g, '').trim(),
            fecha_nacimiento: columns[16]?.replace(/"/g, '').trim(),
            direccion: columns[17]?.replace(/"/g, '').trim(),
            comuna: columns[18]?.replace(/"/g, '').trim(),
            ciudad: columns[19]?.replace(/"/g, '').trim(),
            nacionalidad: columns[20]?.replace(/"/g, '').trim(),
            fecha_os10: columns[21]?.replace(/"/g, '').trim()
          };
        }
      }
    }
    
    // Leer el archivo de coordenadas
    console.log('📖 Leyendo archivo de coordenadas...');
    const latlngContent = fs.readFileSync('latlng_guardias.csv', 'utf-8');
    const latlngLines = latlngContent.split('\n');
    
    // Crear mapa de coordenadas por dirección normalizada
    const coordenadasCSV: { [direccion: string]: any } = {};
    
    for (let i = 1; i < latlngLines.length; i++) {
      const line = latlngLines[i];
      if (!line.trim()) continue;
      
      const columns = line.split(',');
      if (columns.length >= 3) {
        const direccion = columns[0]?.replace(/"/g, '').trim();
        const latitud = columns[1]?.replace(/"/g, '').trim();
        const longitud = columns[2]?.replace(/"/g, '').trim();
        
        if (direccion && latitud && longitud && latitud !== '' && longitud !== '') {
          const direccionNormalizada = normalizarDireccion(direccion);
          coordenadasCSV[direccionNormalizada] = {
            latitud: latitud,
            longitud: longitud
          };
        }
      }
    }
    
    console.log(`📊 Encontrados ${Object.keys(datosCSV).length} guardias en el CSV principal`);
    console.log(`📊 Encontradas ${Object.keys(coordenadasCSV).length} direcciones con coordenadas`);
    
    let actualizados = 0;
    let errores = 0;
    let coordenadasEncontradas = 0;
    
    // Actualizar cada guardia
    for (const rut of RUTS_A_CORREGIR) {
      try {
        const datos = datosCSV[rut];
        
        if (!datos) {
          console.log(`⚠️  RUT ${rut} no encontrado en el CSV principal`);
          continue;
        }
        
        // Buscar coordenadas por dirección
        const direccionNormalizada = normalizarDireccion(datos.direccion);
        const coordenadas = coordenadasCSV[direccionNormalizada];
        
        if (coordenadas) {
          coordenadasEncontradas++;
        }
        
        // Combinar datos del CSV principal con coordenadas
        const datosCompletos = {
          ...datos,
          latitud: coordenadas?.latitud || null,
          longitud: coordenadas?.longitud || null
        };
        
        const datosLimpios = limpiarDatos(datosCompletos);
        
        // Actualizar el guardia
        const result = await pool.query(`
          UPDATE guardias SET
            apellido_paterno = $1,
            apellido_materno = $2,
            nombre = $3,
            email = $4,
            telefono = $5,
            sexo = $6,
            activo = $7,
            direccion = $8,
            comuna = $9,
            ciudad = $10,
            nacionalidad = $11,
            fecha_os10 = $12,
            latitud = $13,
            longitud = $14,
            updated_at = CURRENT_TIMESTAMP
          WHERE rut = $15
        `, [
          datosLimpios.apellido_paterno,
          datosLimpios.apellido_materno,
          datosLimpios.nombre,
          datosLimpios.email,
          datosLimpios.telefono,
          datosLimpios.sexo,
          datosLimpios.activo,
          datosLimpios.direccion,
          datosLimpios.comuna,
          datosLimpios.ciudad,
          datosLimpios.nacionalidad,
          datosLimpios.fecha_os10,
          datosLimpios.latitud,
          datosLimpios.longitud,
          rut
        ]);
        
        if (result.rowCount && result.rowCount > 0) {
          console.log(`✅ Corregido: ${rut} - ${datosLimpios.nombre} ${datosLimpios.apellido_paterno}`);
          if (datosLimpios.latitud && datosLimpios.longitud) {
            console.log(`   📍 Coordenadas: ${datosLimpios.latitud}, ${datosLimpios.longitud}`);
          } else {
            console.log(`   ⚠️  Sin coordenadas para: ${datos.direccion}`);
          }
          actualizados++;
        } else {
          console.log(`❌ No se pudo corregir: ${rut}`);
          errores++;
        }
        
      } catch (error) {
        errores++;
        console.log(`❌ Error con ${rut}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }
    
    console.log(`\n🎉 Resumen:`);
    console.log(`✅ Corregidos: ${actualizados}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📍 Coordenadas encontradas: ${coordenadasEncontradas}`);
    console.log(`📊 Total procesados: ${RUTS_A_CORREGIR.length}`);
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await pool.end();
  }
}

corregirDatosGuardias(); 