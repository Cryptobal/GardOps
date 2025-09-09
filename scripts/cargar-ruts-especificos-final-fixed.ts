#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import { query } from '../src/lib/database';
import { v4 as uuidv4 } from 'uuid';
import { getTenantId } from '@/lib/utils/tenant-utils';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

// Datos de los guardias específicos extraídos del CSV
const guardiasEspecificos = [
  {
    rut: '12833245-6',
    apellido_paterno: 'Rebolledo',
    apellido_materno: 'Molina',
    nombre: 'Winter Benjamin',
    email: '',
    telefono: '959517552',
    sexo: 'Hombre',
    activo: false,
    direccion: 'Antonio Rendic 5859',
    comuna: 'Antofagasta',
    ciudad: 'Antofagasta',
    nacionalidad: 'CHILENA',
    fecha_os10: null
  },
  {
    rut: '21381703-5',
    apellido_paterno: 'Sandoval',
    apellido_materno: 'Inostroza',
    nombre: 'Alexi Alejandro',
    email: 'asndvl9@gmail.com',
    telefono: '946235204',
    sexo: 'Hombre',
    activo: false,
    direccion: 'pasaje valle hondo 1729',
    comuna: 'Coronel',
    ciudad: 'Concepción',
    nacionalidad: 'CHILENA',
    fecha_os10: '2028-02-11'
  },
  {
    rut: '9178825-K',
    apellido_paterno: 'Zamora',
    apellido_materno: 'Zamora',
    nombre: 'Marco antonio',
    email: '',
    telefono: '966751399',
    sexo: 'Hombre',
    activo: false,
    direccion: 'Calle austral 4933 primer sector gomez carreño',
    comuna: 'Viña del Mar',
    ciudad: 'Valparaíso',
    nacionalidad: 'CHILENA',
    fecha_os10: null
  },
  {
    rut: '13211292-4',
    apellido_paterno: 'Avalos',
    apellido_materno: 'Correa',
    nombre: 'Pedro antonio',
    email: '',
    telefono: '957868900',
    sexo: 'Hombre',
    activo: false,
    direccion: 'Ernesto riquelme 1575 - A',
    comuna: 'Antofagasta',
    ciudad: 'Antofagasta',
    nacionalidad: 'CHILENA',
    fecha_os10: null
  },
  {
    rut: '18563612-7',
    apellido_paterno: 'Cáceres',
    apellido_materno: 'Aravena',
    nombre: 'Diego Alejandro',
    email: '',
    telefono: '996313201',
    sexo: 'Hombre',
    activo: false,
    direccion: 'Calle los álamos sin número',
    comuna: 'Putaendo',
    ciudad: 'San Felipe de Aconcagua',
    nacionalidad: 'CHILENA',
    fecha_os10: null
  }
];

// Datos de coordenadas por dirección
const coordenadasPorDireccion: Record<string, { latitud: number; longitud: number }> = {
  'Antonio Rendic 5859': { latitud: -33.6194144, longitud: -70.6084387 },
  'pasaje valle hondo 1729': { latitud: -33.49917001, longitud: -70.7365173 },
  'Calle austral 4933 primer sector gomez carreño': { latitud: -33.4459946, longitud: -70.6670569 },
  'Ernesto riquelme 1575 - A': { latitud: -33.59908493, longitud: -70.67393705 },
  'Calle los álamos sin número': { latitud: -33.47247327, longitud: -70.65821487 }
};

// Función para obtener coordenadas por dirección
function obtenerCoordenadas(direccion: string): { latitud: number | null; longitud: number | null } {
  const coords = coordenadasPorDireccion[direccion];
  return coords ? { latitud: coords.latitud, longitud: coords.longitud } : { latitud: null, longitud: null };
}

// Función para verificar si un guardia ya existe
async function verificarGuardiaExiste(rut: string): Promise<boolean> {
  const result = await query('SELECT id FROM guardias WHERE rut = $1', [rut]);
  return result.rows.length > 0;
}

// Función para generar email único
async function generarEmailUnico(guardia: any): Promise<string> {
  if (guardia.email && guardia.email.trim() !== '') {
    // Si ya tiene email, verificar que sea único
    const result = await query('SELECT id FROM guardias WHERE email = $1', [guardia.email]);
    if (result.rows.length === 0) {
      return guardia.email; // Email único, usarlo
    }
  }
  
  // Generar email único basado en RUT
  const emailBase = `${guardia.rut.replace('-', '')}@gardops.cl`;
  const result = await query('SELECT id FROM guardias WHERE email = $1', [emailBase]);
  
  if (result.rows.length === 0) {
    return emailBase;
  }
  
  // Si el email base ya existe, agregar un sufijo
  let contador = 1;
  let emailUnico = `${guardia.rut.replace('-', '')}.${contador}@gardops.cl`;
  
  while (true) {
    const checkResult = await query('SELECT id FROM guardias WHERE email = $1', [emailUnico]);
    if (checkResult.rows.length === 0) {
      return emailUnico;
    }
    contador++;
    emailUnico = `${guardia.rut.replace('-', '')}.${contador}@gardops.cl`;
  }
}

// Función para cargar un guardia específico
async function cargarGuardia(guardia: any) {
  // Verificar si ya existe
  const existe = await verificarGuardiaExiste(guardia.rut);
  if (existe) {
    console.log(`⏭️  Guardia ${guardia.rut} ya existe, saltando...`);
    return { resultado: true, accion: 'saltado' };
  }

  const id = uuidv4();
  const tenantId = await getTenantId(request);
  const coords = obtenerCoordenadas(guardia.direccion || '');
  
  // Generar email único
  const emailUnico = await generarEmailUnico(guardia);

  const sqlQuery = `
    INSERT INTO guardias (
      id, tenant_id, nombre, email, telefono, activo, usuario_id, 
      latitud, longitud, ciudad, comuna, rut, apellido_paterno, 
      apellido_materno, nacionalidad, sexo, direccion, fecha_os10, 
      created_from_excel
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 
      $14, $15, $16, $17, $18, $19
    )
  `;

  try {
    await query(sqlQuery, [
      id, tenantId, guardia.nombre || '', emailUnico, guardia.telefono || '', 
      guardia.activo, null, coords.latitud, coords.longitud, guardia.ciudad || '', 
      guardia.comuna || '', guardia.rut, guardia.apellido_paterno || '', 
      guardia.apellido_materno || '', guardia.nacionalidad || '', guardia.sexo || '', 
      guardia.direccion || '', guardia.fecha_os10 || null, true
    ]);
    
    console.log(`✅ Guardia ${guardia.rut} cargado exitosamente`);
    console.log(`   📧 Email asignado: ${emailUnico}`);
    return { resultado: true, accion: 'creado' };
  } catch (error) {
    console.error(`❌ Error cargando guardia ${guardia.rut}:`, error);
    return { resultado: false, accion: 'error' };
  }
}

// Función principal
async function cargarRutsEspecificosFinal() {
  console.log('🚀 Iniciando carga de RUTs específicos (versión final)...');
  console.log(`📊 Procesando ${guardiasEspecificos.length} guardias específicos\n`);
  
  let creados = 0;
  let saltados = 0;
  let fallidos = 0;
  
  for (const guardia of guardiasEspecificos) {
    const resultado = await cargarGuardia(guardia);
    if (resultado.resultado) {
      if (resultado.accion === 'creado') {
        creados++;
      } else if (resultado.accion === 'saltado') {
        saltados++;
      }
    } else {
      fallidos++;
    }
    
    // Pequeña pausa para no sobrecargar la base de datos
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n📈 Resumen de carga:`);
  console.log(`✅ Creados: ${creados}`);
  console.log(`⏭️  Saltados (ya existían): ${saltados}`);
  console.log(`❌ Fallidos: ${fallidos}`);
  console.log(`📊 Total procesados: ${guardiasEspecificos.length}`);
  
  return { creados, saltados, fallidos, total: guardiasEspecificos.length };
}

// Ejecutar el script
if (require.main === module) {
  cargarRutsEspecificosFinal()
    .then(() => {
      console.log('🎉 Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en el proceso:', error);
      process.exit(1);
    });
}

export { cargarRutsEspecificosFinal }; 