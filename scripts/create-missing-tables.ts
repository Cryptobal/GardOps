import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function createMissingTables() {
  console.log('🔧 Verificando y creando tablas que faltan...\n');

  try {
    // 1. Verificar qué tablas existen
    console.log('📋 Verificando tablas existentes...');
    
    const existingTables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'as_turnos_%'
      ORDER BY table_name
    `);
    
    console.log('Tablas existentes:');
    existingTables.rows.forEach((row: any) => {
      console.log(`  - ${row.table_name}`);
    });

    // 2. Crear as_turnos_roles_servicio si no existe
    console.log('\n📋 Verificando as_turnos_roles_servicio...');
    
    const rolesServicioExists = existingTables.rows.some((row: any) => row.table_name === 'as_turnos_roles_servicio');
    
    if (!rolesServicioExists) {
      console.log('Creando as_turnos_roles_servicio...');
      await query(`
        CREATE TABLE as_turnos_roles_servicio (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL UNIQUE,
          descripcion TEXT,
          dias_trabajo INTEGER NOT NULL DEFAULT 1,
          dias_descanso INTEGER NOT NULL DEFAULT 1,
          horas_turno INTEGER NOT NULL DEFAULT 8,
          hora_inicio TIME,
          hora_termino TIME,
          estado VARCHAR(50) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
          tenant_id UUID,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Insertar datos de ejemplo
      await query(`
        INSERT INTO as_turnos_roles_servicio (nombre, descripcion, dias_trabajo, dias_descanso, horas_turno, hora_inicio, hora_termino, estado)
        VALUES 
        ('4x4 Diurno', 'Turno de 4 días trabajados por 4 días libres en horario diurno', 4, 4, 12, '08:00', '20:00', 'Activo'),
        ('4x4 Nocturno', 'Turno de 4 días trabajados por 4 días libres en horario nocturno', 4, 4, 12, '20:00', '08:00', 'Activo'),
        ('6x2 Diurno', 'Turno de 6 días trabajados por 2 días libres en horario diurno', 6, 2, 8, '08:00', '16:00', 'Activo'),
        ('6x2 Nocturno', 'Turno de 6 días trabajados por 2 días libres en horario nocturno', 6, 2, 8, '22:00', '06:00', 'Activo')
        ON CONFLICT (nombre) DO NOTHING
      `);
      
      console.log('✅ as_turnos_roles_servicio creada');
    } else {
      console.log('✅ as_turnos_roles_servicio ya existe');
    }

    // 3. Crear as_turnos_configuracion si no existe
    console.log('\n📋 Verificando as_turnos_configuracion...');
    
    const configuracionExists = existingTables.rows.some((row: any) => row.table_name === 'as_turnos_configuracion');
    
    if (!configuracionExists) {
      console.log('Creando as_turnos_configuracion...');
      await query(`
        CREATE TABLE as_turnos_configuracion (
          id SERIAL PRIMARY KEY,
          instalacion_id UUID NOT NULL REFERENCES instalaciones(id),
          rol_servicio_id INTEGER NOT NULL REFERENCES as_turnos_roles_servicio(id),
          cantidad_guardias INTEGER NOT NULL DEFAULT 1,
          estado VARCHAR(50) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
          tenant_id UUID,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('✅ as_turnos_configuracion creada');
    } else {
      console.log('✅ as_turnos_configuracion ya existe');
    }

    // 4. Crear as_turnos_puestos_operativos si no existe
    console.log('\n📋 Verificando as_turnos_puestos_operativos...');
    
    const puestosExists = existingTables.rows.some((row: any) => row.table_name === 'as_turnos_puestos_operativos');
    
    if (!puestosExists) {
      console.log('Creando as_turnos_puestos_operativos...');
      await query(`
        CREATE TABLE as_turnos_puestos_operativos (
          id SERIAL PRIMARY KEY,
          instalacion_id UUID NOT NULL REFERENCES instalaciones(id),
          nombre VARCHAR(255) NOT NULL,
          descripcion TEXT,
          estado VARCHAR(50) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
          tenant_id UUID,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('✅ as_turnos_puestos_operativos creada');
    } else {
      console.log('✅ as_turnos_puestos_operativos ya existe');
    }

    // 5. Crear as_turnos_requisitos si no existe
    console.log('\n📋 Verificando as_turnos_requisitos...');
    
    const requisitosExists = existingTables.rows.some((row: any) => row.table_name === 'as_turnos_requisitos');
    
    if (!requisitosExists) {
      console.log('Creando as_turnos_requisitos...');
      await query(`
        CREATE TABLE as_turnos_requisitos (
          id SERIAL PRIMARY KEY,
          instalacion_id UUID NOT NULL REFERENCES instalaciones(id),
          puesto_operativo_id INTEGER REFERENCES as_turnos_puestos_operativos(id),
          rol_servicio_id INTEGER NOT NULL REFERENCES as_turnos_roles_servicio(id),
          cantidad_guardias INTEGER NOT NULL DEFAULT 1,
          turno VARCHAR(50),
          vigente_desde DATE DEFAULT CURRENT_DATE,
          vigente_hasta DATE,
          estado VARCHAR(50) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
          tenant_id UUID,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('✅ as_turnos_requisitos creada');
    } else {
      console.log('✅ as_turnos_requisitos ya existe');
    }

    // 6. Verificar tablas creadas anteriormente
    const tablasPPC = ['as_turnos_ppc', 'as_turnos_asignaciones'];
    for (const tabla of tablasPPC) {
      const exists = existingTables.rows.some((row: any) => row.table_name === tabla);
      if (exists) {
        console.log(`✅ ${tabla} ya existe`);
      } else {
        console.log(`❌ ${tabla} no existe - debe crearse manualmente`);
      }
    }

    // 7. Crear índices importantes
    console.log('\n📋 Creando índices...');
    
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_as_turnos_configuracion_instalacion ON as_turnos_configuracion(instalacion_id)',
      'CREATE INDEX IF NOT EXISTS idx_as_turnos_configuracion_rol ON as_turnos_configuracion(rol_servicio_id)',
      'CREATE INDEX IF NOT EXISTS idx_as_turnos_requisitos_instalacion ON as_turnos_requisitos(instalacion_id)',
      'CREATE INDEX IF NOT EXISTS idx_as_turnos_requisitos_rol ON as_turnos_requisitos(rol_servicio_id)',
      'CREATE INDEX IF NOT EXISTS idx_as_turnos_puestos_instalacion ON as_turnos_puestos_operativos(instalacion_id)'
    ];

    for (const indice of indices) {
      await query(indice);
    }
    
    console.log('✅ Índices creados');

    // 8. Verificación final
    console.log('\n📊 Verificación final...');
    
    const finalTables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'as_turnos_%'
      ORDER BY table_name
    `);
    
    console.log('Tablas con prefijo as_turnos_:');
    finalTables.rows.forEach((row: any) => {
      console.log(`  ✅ ${row.table_name}`);
    });

    console.log('\n✅ Todas las tablas verificadas y creadas');

  } catch (error) {
    console.error('❌ Error creando tablas:', error);
    throw error;
  }
}

// Ejecutar creación
createMissingTables()
  .then(() => {
    console.log('\n🎉 Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });