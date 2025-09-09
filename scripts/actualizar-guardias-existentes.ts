#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

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

// Función para parsear el CSV con separadores de punto y coma
function parsearCSVConPuntoYComa(contenido: string): any[] {
  const lineas = contenido.split('\n');
  
  // Encontrar dónde empiezan los datos reales (línea 27)
  const inicioDatos = 26; // Línea 27 (0-indexed)
  const datosReales = lineas.slice(inicioDatos);
  
  console.log(`📊 Inicio de datos en línea: ${inicioDatos + 1}`);
  
  // Headers esperados basados en el análisis
  const headers = [
    'id', 'tenant_id', 'RUT', 'apellido paterno', 'apellido materno', 'nombre', 
    'email', 'Celular', 'Sexo (solo opcion de hombre o mujer)', 'activo', 
    'Fecha Contrato', 'Instalación (este campo relaciona a cada guardia con una instalacion)', 
    'Jornada', 'Banco (videne da la tabla ya creada bancos)', 'Tipo Cuenta', 
    'N° Cuenta', 'Anticipo', 'Fecha Nacimiento', 'Dirección', 'comuna', 
    'ciudad', 'Nacionalidad', 'Fecha OS10', 'created_at', 'usuario_id', 
    'updated_at', 'latitud', 'longitud'
  ];
  
  const registros: any[] = [];
  
  for (const linea of datosReales) {
    const lineaLimpia = linea.trim().replace(/"/g, '');
    if (!lineaLimpia) continue;
    
    // Separar por punto y coma
    const valores = lineaLimpia.split(';').map(v => v.trim());
    
    // Crear objeto con los valores
    const registro: any = {};
    headers.forEach((header, index) => {
      registro[header] = valores[index] || '';
    });
    
    // Solo agregar si tiene RUT
    if (registro.RUT && registro.RUT.trim() !== '') {
      registros.push(registro);
    }
  }
  
  console.log(`📊 Registros parseados: ${registros.length}`);
  
  // Mostrar el primer registro como ejemplo
  if (registros.length > 0) {
    console.log('\n📋 PRIMER REGISTRO EJEMPLO:');
    Object.entries(registros[0]).forEach(([key, value]) => {
      if (value && value !== '') {
        console.log(`  ${key}: "${value}"`);
      }
    });
  }
  
  return registros;
}

// Función para leer CSV normal
function leerCSVNormal<T>(filePath: string): T[] {
  const contenido = fs.readFileSync(filePath, 'utf-8');
  const lineas = contenido.split('\n');
  const headers = lineas[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  const registros: T[] = [];
  
  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    if (!linea) continue;
    
    const valores = linea.split(',').map(v => v.trim().replace(/"/g, ''));
    const registro: any = {};
    
    headers.forEach((header, index) => {
      registro[header] = valores[index] || '';
    });
    
    registros.push(registro as T);
  }
  
  return registros;
}

// Función para normalizar direcciones
function normalizarDireccion(direccion: string): string {
  return direccion
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Función para validar RUT chileno
function validarRUT(rut: string): boolean {
  if (!rut || typeof rut !== 'string') return false;
  
  // Limpiar RUT
  const rutLimpio = rut.replace(/[.-]/g, '');
  
  if (rutLimpio.length < 2) return false;
  
  const dv = rutLimpio.slice(-1);
  const numero = rutLimpio.slice(0, -1);
  
  if (!/^\d+$/.test(numero)) return false;
  
  // Calcular dígito verificador
  let suma = 0;
  let multiplicador = 2;
  
  for (let i = numero.length - 1; i >= 0; i--) {
    suma += parseInt(numero[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  
  const dvEsperado = 11 - (suma % 11);
  const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();
  
  return dv.toUpperCase() === dvCalculado;
}

// Función para parsear fechas
function parsearFecha(fechaStr: string): Date | null {
  if (!fechaStr || fechaStr.trim() === '') return null;
  
  // Intentar diferentes formatos
  const formatos = [
    /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY
    /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY
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
  return telefono.replace(/\D/g, '');
}

// Función para obtener tenant_id
async function obtenerTenantId(pool: Pool): Promise<string> {
  const result = await pool.query('SELECT id FROM tenants LIMIT 1');
  if (result.rows.length === 0) {
    throw new Error('No se encontró ningún tenant en la base de datos');
  }
  return result.rows[0].id;
}

// Función principal para actualizar guardias existentes
async function actualizarGuardiasExistentes(): Promise<void> {
  console.log('🚀 Iniciando actualización de guardias existentes...');
  
  // Verificar que los archivos existan
  if (!fs.existsSync(FICHA_PATH)) {
    throw new Error(`❌ Archivo no encontrado: ${FICHA_PATH}`);
  }
  if (!fs.existsSync(LATLNG_PATH)) {
    throw new Error(`❌ Archivo no encontrado: ${LATLNG_PATH}`);
  }
  
  console.log('📁 Cargando archivos CSV...');
  
  // Cargar CSVs
  const contenidoFicha = fs.readFileSync(FICHA_PATH, 'utf-8');
  const fichaData = parsearCSVConPuntoYComa(contenidoFicha);
  const coordenadasData = leerCSVNormal<Coordenada>(LATLNG_PATH);
  
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
    
    // Obtener guardias existentes
    const guardiasExistentes = await pool.query('SELECT id, email, nombre, apellido FROM guardias WHERE email IS NOT NULL');
    console.log(`📊 Guardias existentes: ${guardiasExistentes.rows.length}`);
    
    // Crear mapa de guardias existentes por email
    const guardiasPorEmail = new Map<string, any>();
    guardiasExistentes.rows.forEach(guardia => {
      guardiasPorEmail.set(guardia.email.toLowerCase(), guardia);
    });
    
    // Estadísticas
    let actualizados = 0;
    let errores = 0;
    let sinCoords = 0;
    let rutInvalidos = 0;
    let noEncontrados = 0;
    
    console.log('📝 Iniciando actualización de guardias...');
    
    // Procesar cada guardia del CSV
    for (let index = 0; index < guardiasValidos.length; index++) {
      const guardia = guardiasValidos[index];
      try {
        // Validar RUT
        if (!validarRUT(guardia.RUT)) {
          rutInvalidos++;
          console.log(`⚠️ RUT inválido en fila ${index + 1}: ${guardia.RUT}`);
          continue;
        }
        
        // Buscar guardia existente por email
        const guardiaExistente = guardiasPorEmail.get(guardia.email.toLowerCase());
        if (!guardiaExistente) {
          noEncontrados++;
          console.log(`⚠️ Guardia no encontrado por email: ${guardia.email}`);
          continue;
        }
        
        // Verificar coordenadas
        if (!guardia.latitud || !guardia.longitud) {
          sinCoords++;
          console.log(`⚠️ Sin coordenadas: ${guardia.nombre} ${guardia['apellido paterno']}`);
        }
        
        // Parsear fecha OS10
        const fechaOS10 = parsearFecha(guardia['Fecha OS10']);
        
        // Limpiar teléfono
        const telefono = limpiarTelefono(guardia.Celular);
        
        // Actualizar registro
        const result = await pool.query(`
          UPDATE guardias SET
            rut = $1,
            apellido_paterno = $2,
            apellido_materno = $3,
            telefono = $4,
            nacionalidad = $5,
            sexo = $6,
            direccion = $7,
            ciudad = $8,
            comuna = $9,
            fecha_os10 = $10,
            latitud = $11,
            longitud = $12,
            updated_at = NOW()
          WHERE id = $13
        `, [
          guardia.RUT,
          guardia['apellido paterno'] || '',
          guardia['apellido materno'] || '',
          telefono,
          guardia.Nacionalidad || 'CHILENA',
          guardia['Sexo (solo opcion de hombre o mujer)'] || 'Hombre',
          guardia.Dirección || '',
          guardia.ciudad || '',
          guardia.comuna || '',
          fechaOS10,
          guardia.latitud,
          guardia.longitud,
          guardiaExistente.id
        ]);
        
        actualizados++;
        console.log(`✅ Actualizado: ${guardia.nombre} ${guardia['apellido paterno']} (ID: ${guardiaExistente.id})`);
        
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
    console.log('📊 RESUMEN DE ACTUALIZACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Guardias actualizados: ${actualizados}`);
    console.log(`📍 Guardias sin coordenadas: ${sinCoords}`);
    console.log(`⚠️ RUTs inválidos: ${rutInvalidos}`);
    console.log(`❌ Errores de actualización: ${errores}`);
    console.log(`🔍 Guardias no encontrados: ${noEncontrados}`);
    console.log(`📈 Total procesado: ${guardiasValidos.length}`);
    console.log('='.repeat(60));
    
    if (errores === 0) {
      console.log('\n🎉 ¡Actualización exitosa!');
    } else {
      console.log('\n⚠️ Se encontraron errores. Revisa antes de continuar.');
    }
    
  } catch (error) {
    console.error('❌ Error durante la actualización:', error);
    await pool.end();
    throw error;
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  actualizarGuardiasExistentes()
    .then(() => {
      console.log('✅ Actualización completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { actualizarGuardiasExistentes }; 