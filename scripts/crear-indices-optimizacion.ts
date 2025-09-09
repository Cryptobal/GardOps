import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Crear pool de conexión
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function query(text: string, params?: any[]): Promise<any> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function crearIndicesOptimizacion() {
  console.log('🔧 Creando índices de optimización...\n');

  const indices = [
    // Índices para as_turnos_requisitos
    'CREATE INDEX IF NOT EXISTS idx_as_turnos_requisitos_instalacion_id ON as_turnos_requisitos(instalacion_id)',
    'CREATE INDEX IF NOT EXISTS idx_as_turnos_requisitos_rol_servicio_id ON as_turnos_requisitos(rol_servicio_id)',
    
    // Índices para as_turnos_asignaciones
    'CREATE INDEX IF NOT EXISTS idx_as_turnos_asignaciones_requisito_puesto_id ON as_turnos_asignaciones(requisito_puesto_id)',
    'CREATE INDEX IF NOT EXISTS idx_as_turnos_asignaciones_estado ON as_turnos_asignaciones(estado)',
    'CREATE INDEX IF NOT EXISTS idx_as_turnos_asignaciones_guardia_id ON as_turnos_asignaciones(guardia_id)',
    'CREATE INDEX IF NOT EXISTS idx_as_turnos_asignaciones_estado_requisito ON as_turnos_asignaciones(estado, requisito_puesto_id)',
    
    // Índices para instalaciones
    'CREATE INDEX IF NOT EXISTS idx_instalaciones_cliente_id ON instalaciones(cliente_id)',
    'CREATE INDEX IF NOT EXISTS idx_instalaciones_estado ON instalaciones(estado)',
    'CREATE INDEX IF NOT EXISTS idx_instalaciones_nombre ON instalaciones(nombre)',
    
    // Índices para clientes
    'CREATE INDEX IF NOT EXISTS idx_clientes_estado ON clientes(estado)',
    'CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre)',
    
    // Índices para guardias
    'CREATE INDEX IF NOT EXISTS idx_guardias_activo ON guardias(activo)',
    'CREATE INDEX IF NOT EXISTS idx_guardias_instalacion_id ON guardias(instalacion_id)',
    
    // Índices para as_turnos_roles_servicio
    'CREATE INDEX IF NOT EXISTS idx_as_turnos_roles_servicio_nombre ON as_turnos_roles_servicio(nombre)'
  ];

  try {
    for (let i = 0; i < indices.length; i++) {
      const indexSQL = indices[i];
      console.log(`📊 Creando índice ${i + 1}/${indices.length}...`);
      await query(indexSQL);
      console.log(`✅ Índice creado: ${indexSQL.split('ON ')[1]}`);
    }

    // Analizar las tablas
    console.log('\n📊 Analizando tablas...');
    const tablas = ['as_turnos_requisitos', 'as_turnos_asignaciones', 'instalaciones', 'clientes', 'guardias', 'as_turnos_roles_servicio'];
    
    for (const tabla of tablas) {
      await query(`ANALYZE ${tabla}`);
      console.log(`✅ Tabla ${tabla} analizada`);
    }

    console.log('\n🎉 Todos los índices de optimización han sido creados exitosamente');

  } catch (error) {
    console.error('❌ Error creando índices:', error);
  } finally {
    await pool.end();
  }
}

crearIndicesOptimizacion(); 