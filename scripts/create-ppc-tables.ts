import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function createPPCTables() {
  console.log('🔧 Creando tablas para lógica de asignación de PPCs...\n');

  try {
    // 1. Crear tabla puestos_por_cubrir
    console.log('📋 Creando tabla puestos_por_cubrir...');
    
    await query(`
      CREATE TABLE IF NOT EXISTS puestos_por_cubrir (
        id SERIAL PRIMARY KEY,
        requisito_puesto_id INTEGER NOT NULL,
        motivo VARCHAR(255) NOT NULL,
        observaciones TEXT,
        cantidad_faltante INTEGER DEFAULT 1,
        prioridad VARCHAR(50) DEFAULT 'Normal',
        fecha_deteccion TIMESTAMP DEFAULT NOW(),
        fecha_limite_cobertura DATE,
        estado VARCHAR(50) DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Asignado', 'Cancelado', 'Completado')),
        guardia_asignado_id UUID REFERENCES guardias(id),
        fecha_asignacion TIMESTAMP,
        fecha_cierre TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        tenant_id UUID
      )
    `);
    
    console.log('✅ Tabla puestos_por_cubrir creada');

    // 2. Crear tabla asignaciones_guardias
    console.log('📋 Creando tabla asignaciones_guardias...');
    
    await query(`
      CREATE TABLE IF NOT EXISTS asignaciones_guardias (
        id SERIAL PRIMARY KEY,
        guardia_id UUID NOT NULL REFERENCES guardias(id),
        requisito_puesto_id INTEGER NOT NULL,
        ppc_id INTEGER REFERENCES puestos_por_cubrir(id),
        tipo_asignacion VARCHAR(50) DEFAULT 'PPC' CHECK (tipo_asignacion IN ('PPC', 'Reasignación', 'Turno Regular')),
        fecha_inicio DATE NOT NULL,
        fecha_termino DATE,
        estado VARCHAR(50) DEFAULT 'Activa' CHECK (estado IN ('Activa', 'Finalizada', 'Cancelada')),
        motivo_termino VARCHAR(255),
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        tenant_id UUID
      )
    `);
    
    console.log('✅ Tabla asignaciones_guardias creada');

    // 3. Crear índices
    console.log('📋 Creando índices...');
    
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_ppc_estado ON puestos_por_cubrir(estado)',
      'CREATE INDEX IF NOT EXISTS idx_ppc_guardia_asignado ON puestos_por_cubrir(guardia_asignado_id)',
      'CREATE INDEX IF NOT EXISTS idx_ppc_requisito ON puestos_por_cubrir(requisito_puesto_id)',
      'CREATE INDEX IF NOT EXISTS idx_ppc_fecha_asignacion ON puestos_por_cubrir(fecha_asignacion)',
      'CREATE INDEX IF NOT EXISTS idx_asignaciones_guardia ON asignaciones_guardias(guardia_id)',
      'CREATE INDEX IF NOT EXISTS idx_asignaciones_estado ON asignaciones_guardias(estado)',
      'CREATE INDEX IF NOT EXISTS idx_asignaciones_fecha_inicio ON asignaciones_guardias(fecha_inicio)',
      'CREATE INDEX IF NOT EXISTS idx_asignaciones_fecha_termino ON asignaciones_guardias(fecha_termino)',
      'CREATE INDEX IF NOT EXISTS idx_asignaciones_requisito ON asignaciones_guardias(requisito_puesto_id)'
    ];

    for (const indice of indices) {
      await query(indice);
    }
    
    console.log('✅ Índices creados');

    // 4. Crear constraint para evitar asignaciones activas duplicadas
    console.log('📋 Creando constraints...');
    
    try {
      await query(`
        ALTER TABLE asignaciones_guardias 
        ADD CONSTRAINT unique_active_assignment 
        EXCLUDE USING btree (guardia_id WITH =) 
        WHERE (estado = 'Activa' AND fecha_termino IS NULL)
      `);
      console.log('✅ Constraint unique_active_assignment creado');
    } catch (error: any) {
      if (error.code === '42710' || error.code === '42P07') {
        console.log('⚠️ Constraint unique_active_assignment ya existe');
      } else {
        throw error;
      }
    }

    // 5. Crear trigger para actualizar updated_at
    console.log('📋 Creando triggers...');
    
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_ppc_updated_at ON puestos_por_cubrir;
      CREATE TRIGGER update_ppc_updated_at 
          BEFORE UPDATE ON puestos_por_cubrir 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_asignaciones_updated_at ON asignaciones_guardias;
      CREATE TRIGGER update_asignaciones_updated_at 
          BEFORE UPDATE ON asignaciones_guardias 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    
    console.log('✅ Triggers creados');

    // 6. Insertar datos de ejemplo
    console.log('📋 Insertando datos de ejemplo...');
    
    const tenantId = await query('SELECT id FROM tenants LIMIT 1');
    if (tenantId.rows.length > 0) {
      await query(`
        INSERT INTO puestos_por_cubrir (
          requisito_puesto_id, 
          motivo, 
          observaciones, 
          estado,
          tenant_id
        ) VALUES 
        (1, 'Licencia médica', 'Guardia con licencia hasta 15/08', 'Pendiente', $1),
        (1, 'Falta aviso', 'Guardia no se presentó', 'Pendiente', $1)
        ON CONFLICT DO NOTHING
      `, [tenantId.rows[0].id]);
      
      console.log('✅ Datos de ejemplo insertados');
    }

    // 7. Verificar creación
    console.log('\n📊 Verificando tablas creadas...');
    
    const verificacion = await query(`
      SELECT 
        'puestos_por_cubrir' as tabla,
        COUNT(*) as registros
      FROM puestos_por_cubrir
      UNION ALL
      SELECT 
        'asignaciones_guardias' as tabla,
        COUNT(*) as registros
      FROM asignaciones_guardias
    `);

    console.log('Registros en las tablas:');
    verificacion.rows.forEach((row: any) => {
      console.log(`  - ${row.tabla}: ${row.registros} registros`);
    });

    console.log('\n✅ Todas las tablas creadas exitosamente');
    console.log('✅ Lógica de asignación de PPCs lista para usar');

  } catch (error) {
    console.error('❌ Error creando tablas:', error);
    throw error;
  }
}

// Ejecutar creación de tablas
createPPCTables()
  .then(() => {
    console.log('\n🎉 Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }); 