import { query } from '../src/lib/database';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import { getTenantId } from '@/lib/utils/tenant-utils';

// Cargar variables de entorno desde .env.local
dotenv.config({ path: '.env.local' });

// Verificar que DATABASE_URL esté configurada
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no está configurada en las variables de entorno');
  process.exit(1);
}

console.log('🔗 Conectando a la base de datos...');

// Datos de los guardias específicos extraídos del CSV
const guardiasEspecificos = [
  {
    rut: '12833245-6',
    apellido_paterno: 'Rebolledo',
    apellido_materno: 'Molina',
    nombre: 'Winter Benjamin',
    email: '',
    celular: '959517552',
    sexo: 'Hombre',
    activo: false,
    fecha_contrato: '01-10-2024',
    instalacion: 'Tattersall Antofagasta',
    jornada: '4x4',
    banco: 'banco estado',
    tipo_cuenta: 'cuenta rut',
    numero_cuenta: '128332456',
    anticipo: 50000,
    fecha_nacimiento: '01-05-1973',
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
    celular: '946235204',
    sexo: 'Hombre',
    activo: false,
    fecha_contrato: '05-08-2025',
    instalacion: 'Coronel',
    jornada: '4x4',
    banco: 'banco falabella',
    tipo_cuenta: 'cuenta corriente',
    numero_cuenta: '19995964953',
    anticipo: 50000,
    fecha_nacimiento: '01-09-2003',
    direccion: 'pasaje valle hondo 1729',
    comuna: 'Coronel',
    ciudad: 'Concepción',
    nacionalidad: 'CHILENA',
    fecha_os10: '11-02-2028'
  },
  {
    rut: '9178825-K',
    apellido_paterno: 'Zamora',
    apellido_materno: 'Zamora',
    nombre: 'Marco antonio',
    email: '',
    celular: '966751399',
    sexo: 'Hombre',
    activo: false,
    fecha_contrato: '14-08-2024',
    instalacion: 'Placilla',
    jornada: '5x2',
    banco: 'banco estado',
    tipo_cuenta: 'cuenta vista',
    numero_cuenta: '9178825',
    anticipo: 0,
    fecha_nacimiento: '01-12-1961',
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
    celular: '957868900',
    sexo: 'Hombre',
    activo: false,
    fecha_contrato: '01-10-2024',
    instalacion: 'Tattersall Antofagasta',
    jornada: '4x4',
    banco: 'banco estado',
    tipo_cuenta: 'cuenta rut',
    numero_cuenta: '13211292',
    anticipo: 50000,
    fecha_nacimiento: '02-02-1977',
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
    celular: '996313201',
    sexo: 'Hombre',
    activo: false,
    fecha_contrato: '06-12-2024',
    instalacion: 'Asfalcura San Felipe',
    jornada: '4x4',
    banco: 'banco estado',
    tipo_cuenta: 'cuenta vista',
    numero_cuenta: '18563612',
    anticipo: 50000,
    fecha_nacimiento: '02-04-1994',
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

// Función para cargar un guardia específico
async function cargarGuardia(guardia: any) {
  const id = uuidv4();
  const tenantId = await getTenantId(request);
  const coords = obtenerCoordenadas(guardia.direccion || '');

  const sqlQuery = `
    INSERT INTO guardias (
      id, tenant_id, rut, apellido_paterno, apellido_materno, nombre, 
      email, telefono, sexo, activo, fecha_contrato, instalacion, 
      jornada, banco, tipo_cuenta, numero_cuenta, anticipo, 
      fecha_nacimiento, direccion, comuna, ciudad, nacionalidad, 
      fecha_os10, created_at, usuario_id, updated_at, latitud, longitud
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
      $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
    )
  `;

  try {
    await query(sqlQuery, [
      id, tenantId, guardia.rut, guardia.apellido_paterno || '', guardia.apellido_materno || '', 
      guardia.nombre || '', guardia.email || '', guardia.celular || '', guardia.sexo || '', 
      guardia.activo, guardia.fecha_contrato || null, guardia.instalacion || '', 
      guardia.jornada || '', guardia.banco || '', guardia.tipo_cuenta || '', 
      guardia.numero_cuenta || '', guardia.anticipo || 0, guardia.fecha_nacimiento || null, 
      guardia.direccion || '', guardia.comuna || '', guardia.ciudad || '', 
      guardia.nacionalidad || '', guardia.fecha_os10 || null, new Date(), null, new Date(),
      coords.latitud, coords.longitud
    ]);
    
    console.log(`✅ Guardia ${guardia.rut} cargado exitosamente`);
    return true;
  } catch (error) {
    console.error(`❌ Error cargando guardia ${guardia.rut}:`, error);
    return false;
  }
}

// Función principal
async function cargarRutsEspecificos() {
  console.log('🚀 Iniciando carga de RUTs específicos...');
  console.log(`📊 Procesando ${guardiasEspecificos.length} guardias específicos`);
  
  let exitosos = 0;
  let fallidos = 0;
  
  for (const guardia of guardiasEspecificos) {
    const resultado = await cargarGuardia(guardia);
    if (resultado) {
      exitosos++;
    } else {
      fallidos++;
    }
    
    // Pequeña pausa para no sobrecargar la base de datos
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📈 Resumen de carga:`);
  console.log(`✅ Exitosos: ${exitosos}`);
  console.log(`❌ Fallidos: ${fallidos}`);
  console.log(`📊 Total procesados: ${guardiasEspecificos.length}`);
  
  return { exitosos, fallidos, total: guardiasEspecificos.length };
}

// Ejecutar el script
if (require.main === module) {
  cargarRutsEspecificos()
    .then(() => {
      console.log('🎉 Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en el proceso:', error);
      process.exit(1);
    });
}

export { cargarRutsEspecificos }; 