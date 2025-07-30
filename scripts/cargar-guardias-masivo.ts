#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

// Configuración
const FICHA_PATH = "BBDD GGSS.csv";
const LATLNG_PATH = "latlng_guardias.csv";

// Interfaces
interface GuardiaFicha {
  RUT: string;
  'apellido paterno': string;
  'apellido materno': string;
  nombre: string;
  email: string;
  Celular: string;
  'Sexo (solo opcion de hombre o mujer)': string;
  activo: string;
  'Fecha Contrato': string;
  'Instalación (este campo relaciona a cada guardia con una instalacion)': string;
  Jornada: string;
  'Banco (videne da la tabla ya creada bancos)': string;
  'Tipo Cuenta': string;
  'N° Cuenta': string;
  Anticipo: string;
  'Fecha Nacimiento': string;
  Dirección: string;
  comuna: string;
  ciudad: string;
  Nacionalidad: string;
  'Fecha OS10': string;
}

interface Coordenada {
  Dirección: string;
  latitud: string;
  longitud: string;
}

interface GuardiaCompleto extends GuardiaFicha {
  latitud?: number;
  longitud?: number;
}

// Función para parsear CSV robusto
function parsearCSV(contenido: string): any[] {
  const lineas = contenido.split('\n');
  const headers = parsearLineaCSV(lineas[0]);
  
  console.log(`📋 Headers encontrados: ${headers.length}`);
  headers.forEach((header, index) => {
    console.log(`  ${index + 1}. "${header}"`);
  });
  
  const resultados: any[] = [];
  
  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    if (!linea) continue;
    
    const valores = parsearLineaCSV(linea);
    const objeto: any = {};
    
    headers.forEach((header, index) => {
      objeto[header] = valores[index] || '';
    });
    
    resultados.push(objeto);
  }
  
  return resultados;
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

// Función para normalizar direcciones
function normalizarDireccion(direccion: string): string {
  if (!direccion || typeof direccion !== 'string') return '';
  
  return direccion
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Reemplazar múltiples espacios con uno solo
    .replace(/[.,;]/g, '') // Remover puntuación
    .replace(/dpto\s*:?\s*/gi, 'dpto ') // Normalizar "dpto"
    .replace(/depto\s*:?\s*/gi, 'depto ') // Normalizar "depto"
    .replace(/torre\s+/gi, 'torre ') // Normalizar "torre"
    .replace(/sector\s+/gi, 'sector ') // Normalizar "sector"
    .replace(/block\s+/gi, 'block ') // Normalizar "block"
    .replace(/casa\s+/gi, 'casa ') // Normalizar "casa"
    .replace(/villa\s+/gi, 'villa ') // Normalizar "villa"
    .replace(/pasaje\s+/gi, 'pasaje ') // Normalizar "pasaje"
    .replace(/avenida\s+/gi, 'av ') // Normalizar "avenida"
    .replace(/calle\s+/gi, '') // Remover "calle"
    .replace(/av\.\s+/gi, 'av ') // Normalizar "av."
    .replace(/n°\s*/gi, '') // Remover "N°"
    .replace(/#\s*/gi, '') // Remover "#"
    .replace(/s\/n/gi, '') // Remover "S/N"
    .replace(/\s+/g, ' ') // Limpiar espacios extra
    .trim();
}

// Función para validar RUT chileno
function validarRUT(rut: string): boolean {
  if (!rut || typeof rut !== 'string') return false;
  
  // Limpiar RUT
  const rutLimpio = rut.replace(/[.-]/g, '');
  
  // Verificar formato básico
  if (!/^[0-9]{7,8}[0-9kK]$/.test(rutLimpio)) return false;
  
  // Algoritmo de validación de RUT chileno
  const dv = rutLimpio.slice(-1).toLowerCase();
  const numero = rutLimpio.slice(0, -1);
  
  let suma = 0;
  let multiplicador = 2;
  
  for (let i = numero.length - 1; i >= 0; i--) {
    suma += parseInt(numero[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  
  const dvEsperado = 11 - (suma % 11);
  const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'k' : dvEsperado.toString();
  
  return dv === dvCalculado;
}

// Función para parsear fecha
function parsearFecha(fechaStr: string): Date | null {
  if (!fechaStr || typeof fechaStr !== 'string') return null;
  
  // Intentar diferentes formatos de fecha
  const formatos = [
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
  ];
  
  for (const formato of formatos) {
    const match = fechaStr.match(formato);
    if (match) {
      const [, dia, mes, año] = match;
      const fecha = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
      if (!isNaN(fecha.getTime())) {
        return fecha;
      }
    }
  }
  
  return null;
}

// Función para limpiar teléfono
function limpiarTelefono(telefono: string): string {
  if (!telefono || typeof telefono !== 'string') return '';
  
  return telefono
    .replace(/\D/g, '') // Solo números
    .trim();
}

// Función para leer archivo CSV
function leerCSV<T>(filePath: string): T[] {
  const contenido = fs.readFileSync(filePath, 'utf-8');
  return parsearCSV(contenido) as T[];
}

// Función para obtener tenant_id por defecto
async function obtenerTenantId(pool: Pool): Promise<string> {
  const result = await pool.query('SELECT id FROM tenants LIMIT 1');
  if (result.rows.length === 0) {
    throw new Error('No se encontró ningún tenant en la base de datos');
  }
  return result.rows[0].id;
}

// Función principal de carga masiva
async function cargarGuardiasMasivo(): Promise<void> {
  console.log('🚀 Iniciando carga masiva de guardias...');
  
  // Verificar que los archivos existan
  if (!fs.existsSync(FICHA_PATH)) {
    throw new Error(`❌ Archivo no encontrado: ${FICHA_PATH}`);
  }
  if (!fs.existsSync(LATLNG_PATH)) {
    throw new Error(`❌ Archivo no encontrado: ${LATLNG_PATH}`);
  }
  
  console.log('📁 Cargando archivos CSV...');
  
  // Cargar CSVs
  const fichaData = leerCSV<GuardiaFicha>(FICHA_PATH);
  const coordenadasData = leerCSV<Coordenada>(LATLNG_PATH);
  
  console.log(`📊 Ficha principal: ${fichaData.length} registros`);
  console.log(`📍 Coordenadas: ${coordenadasData.length} registros`);
  
  // Crear mapa de coordenadas normalizadas
  const coordenadasMap = new Map<string, { latitud: number; longitud: number }>();
  
  for (const coord of coordenadasData) {
    const direccionNormalizada = normalizarDireccion(coord.Dirección);
    if (coord.latitud && coord.longitud) {
      coordenadasMap.set(direccionNormalizada, {
        latitud: parseFloat(coord.latitud),
        longitud: parseFloat(coord.longitud)
      });
    }
  }
  
  console.log(`📍 Direcciones con coordenadas: ${coordenadasMap.size}`);
  
  // Unir datos
  const guardiasCompletos: GuardiaCompleto[] = [];
  
  for (const guardia of fichaData) {
    const direccionNormalizada = normalizarDireccion(guardia.Dirección);
    const coordenadas = coordenadasMap.get(direccionNormalizada);
    
    guardiasCompletos.push({
      ...guardia,
      latitud: coordenadas?.latitud,
      longitud: coordenadas?.longitud
    });
  }
  
  // Filtrar registros válidos
  const guardiasValidos = guardiasCompletos.filter(g => g.RUT && g.RUT.trim() !== '');
  
  console.log(`✅ Registros válidos: ${guardiasValidos.length}`);
  
  // Conectar a la base de datos
  console.log('🔌 Conectando a la base de datos...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  try {
    // Obtener tenant_id
    const tenantId = await obtenerTenantId(pool);
    console.log(`🏢 Usando tenant_id: ${tenantId}`);
    
    // Eliminar registros anteriores
    console.log('🧨 Eliminando registros anteriores...');
    await pool.query('DELETE FROM guardias');
    
    // Estadísticas
    let insertados = 0;
    let errores = 0;
    let sinCoords = 0;
    let rutInvalidos = 0;
    
    console.log('📝 Iniciando inserción de registros...');
    
    // Procesar cada guardia
    for (let index = 0; index < guardiasValidos.length; index++) {
      const guardia = guardiasValidos[index];
      try {
        // Validar RUT
        if (!validarRUT(guardia.RUT)) {
          rutInvalidos++;
          console.log(`⚠️ RUT inválido en fila ${index + 1}: ${guardia.RUT}`);
          continue;
        }
        
        // Verificar coordenadas
        const tieneCoords = guardia.latitud !== undefined && guardia.longitud !== undefined;
        if (!tieneCoords) {
          sinCoords++;
        }
        
        // Parsear fechas
        const fechaOS10 = parsearFecha(guardia['Fecha OS10']);
        
        // Limpiar teléfono
        const telefono = limpiarTelefono(guardia.Celular);
        
        // Insertar registro
        const result = await pool.query(`
          INSERT INTO guardias (
            tenant_id, 
            nombre, 
            apellido,
            apellido_paterno, 
            apellido_materno,
            email, 
            telefono, 
            rut, 
            nacionalidad, 
            sexo, 
            direccion,
            ciudad, 
            comuna, 
            fecha_os10,
            activo,
            created_from_excel,
            latitud, 
            longitud
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, true, $16, $17
          ) RETURNING id
        `, [
          tenantId,
          guardia.nombre || '',
          `${guardia['apellido paterno']} ${guardia['apellido materno']}`.trim() || '',
          guardia['apellido paterno'] || '',
          guardia['apellido materno'] || '',
          guardia.email || '',
          telefono,
          guardia.RUT,
          guardia.Nacionalidad || 'CHILENA',
          guardia['Sexo (solo opcion de hombre o mujer)'] || 'Hombre',
          guardia.Dirección || '',
          guardia.ciudad || '',
          guardia.comuna || '',
          fechaOS10,
          guardia.activo === 'TRUE',
          guardia.latitud,
          guardia.longitud
        ]);
        
        insertados++;
        
        // Mostrar progreso cada 10 registros
        if (insertados % 10 === 0) {
          console.log(`✅ Progreso: ${insertados}/${guardiasValidos.length} registros insertados`);
        }
        
      } catch (error) {
        errores++;
        console.error(`❌ Error en fila ${index + 1}:`, error);
        console.error(`   RUT: ${guardia.RUT}, Nombre: ${guardia.nombre}`);
      }
    }
    
    // Cerrar conexión
    await pool.end();
    
    // Mostrar resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(60));
    console.log(`✅ Guardias insertados: ${insertados}`);
    console.log(`📍 Guardias sin coordenadas: ${sinCoords}`);
    console.log(`⚠️ RUTs inválidos: ${rutInvalidos}`);
    console.log(`❌ Errores de inserción: ${errores}`);
    console.log(`📈 Total procesado: ${guardiasValidos.length}`);
    console.log('='.repeat(60));
    
    if (errores === 0) {
      console.log('\n🎉 ¡Carga masiva completada exitosamente!');
    } else {
      console.log('\n⚠️ Se completó con algunos errores. Revisa el log anterior.');
    }
    
  } catch (error) {
    console.error('❌ Error durante la carga:', error);
    await pool.end();
    throw error;
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  cargarGuardiasMasivo()
    .then(() => {
      console.log('✅ Carga completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { cargarGuardiasMasivo }; 