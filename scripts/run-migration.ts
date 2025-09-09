import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function runMigration() {
  console.log('🚀 EJECUTANDO MIGRACIÓN DE CAMPOS DE POSTULACIÓN\n');

  try {
    // 1. Agregar campos de información personal
    console.log('📝 1. Agregando campos de información personal...');
    await query(`
      ALTER TABLE guardias 
      ADD COLUMN IF NOT EXISTS apellido_paterno TEXT,
      ADD COLUMN IF NOT EXISTS apellido_materno TEXT,
      ADD COLUMN IF NOT EXISTS sexo VARCHAR(20) CHECK (sexo IN ('Masculino', 'Femenino')),
      ADD COLUMN IF NOT EXISTS nacionalidad VARCHAR(50) DEFAULT 'Chilena',
      ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE
    `);
    console.log('✅ Campos personales agregados');

    // 2. Agregar campos de ubicación geográfica
    console.log('📝 2. Agregando campos de ubicación geográfica...');
    await query(`
      ALTER TABLE guardias 
      ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100),
      ADD COLUMN IF NOT EXISTS comuna VARCHAR(100),
      ADD COLUMN IF NOT EXISTS region VARCHAR(100),
      ADD COLUMN IF NOT EXISTS latitud DECIMAL(10, 8),
      ADD COLUMN IF NOT EXISTS longitud DECIMAL(11, 8)
    `);
    console.log('✅ Campos geográficos agregados');

    // 3. Agregar campos previsionales
    console.log('📝 3. Agregando campos previsionales...');
    await query(`
      ALTER TABLE guardias 
      ADD COLUMN IF NOT EXISTS afp VARCHAR(100),
      ADD COLUMN IF NOT EXISTS descuento_afp DECIMAL(3,2) DEFAULT 1.00,
      ADD COLUMN IF NOT EXISTS prevision_salud VARCHAR(50),
      ADD COLUMN IF NOT EXISTS cotiza_sobre_7 BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS monto_pactado_uf DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS es_pensionado BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS asignacion_familiar BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS tramo_asignacion VARCHAR(10) CHECK (tramo_asignacion IN ('A', 'B', 'C'))
    `);
    console.log('✅ Campos previsionales agregados');

    // 4. Agregar campos bancarios
    console.log('📝 4. Agregando campos bancarios...');
    await query(`
      ALTER TABLE guardias 
      ADD COLUMN IF NOT EXISTS banco_id UUID,
      ADD COLUMN IF NOT EXISTS tipo_cuenta VARCHAR(20) CHECK (tipo_cuenta IN ('CCT', 'CCV', 'CAH', 'RUT')),
      ADD COLUMN IF NOT EXISTS numero_cuenta TEXT
    `);
    console.log('✅ Campos bancarios agregados');

    // 5. Agregar campos físicos
    console.log('📝 5. Agregando campos físicos...');
    await query(`
      ALTER TABLE guardias 
      ADD COLUMN IF NOT EXISTS talla_camisa VARCHAR(10) CHECK (talla_camisa IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL')),
      ADD COLUMN IF NOT EXISTS talla_pantalon VARCHAR(10) CHECK (talla_pantalon IN ('38', '40', '42', '44', '46', '48', '50', '52', '54')),
      ADD COLUMN IF NOT EXISTS talla_zapato INTEGER CHECK (talla_zapato BETWEEN 35 AND 46),
      ADD COLUMN IF NOT EXISTS altura_cm INTEGER CHECK (altura_cm BETWEEN 140 AND 210),
      ADD COLUMN IF NOT EXISTS peso_kg INTEGER CHECK (peso_kg BETWEEN 40 AND 120)
    `);
    console.log('✅ Campos físicos agregados');

    // 6. Agregar campos de postulación
    console.log('📝 6. Agregando campos de postulación...');
    await query(`
      ALTER TABLE guardias 
      ADD COLUMN IF NOT EXISTS fecha_postulacion TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS estado_postulacion VARCHAR(20) DEFAULT 'pendiente' CHECK (estado_postulacion IN ('pendiente', 'revisando', 'aprobada', 'rechazada')),
      ADD COLUMN IF NOT EXISTS ip_postulacion INET,
      ADD COLUMN IF NOT EXISTS user_agent_postulacion TEXT
    `);
    console.log('✅ Campos de postulación agregados');

    // 7. Crear índices para optimizar consultas
    console.log('📝 7. Creando índices...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_guardias_estado_postulacion ON guardias(estado_postulacion);
      CREATE INDEX IF NOT EXISTS idx_guardias_fecha_postulacion ON guardias(fecha_postulacion);
      CREATE INDEX IF NOT EXISTS idx_guardias_banco_id ON guardias(banco_id);
      CREATE INDEX IF NOT EXISTS idx_guardias_afp ON guardias(afp);
      CREATE INDEX IF NOT EXISTS idx_guardias_prevision_salud ON guardias(prevision_salud)
    `);
    console.log('✅ Índices creados');

    // 8. Verificar la migración
    console.log('📝 8. Verificando migración...');
    const columnsResult = await query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
      AND column_name IN (
        'apellido_paterno', 'apellido_materno', 'sexo', 'nacionalidad', 'fecha_nacimiento',
        'ciudad', 'comuna', 'region', 'latitud', 'longitud',
        'afp', 'descuento_afp', 'prevision_salud', 'cotiza_sobre_7', 'monto_pactado_uf',
        'es_pensionado', 'asignacion_familiar', 'tramo_asignacion',
        'banco_id', 'tipo_cuenta', 'numero_cuenta',
        'talla_camisa', 'talla_pantalon', 'talla_zapato', 'altura_cm', 'peso_kg',
        'fecha_postulacion', 'estado_postulacion', 'ip_postulacion', 'user_agent_postulacion'
      )
      ORDER BY column_name
    `);

    console.log('\n📋 CAMPOS AGREGADOS EXITOSAMENTE:');
    console.log('='.repeat(60));
    columnsResult.rows.forEach((row: any) => {
      console.log(`   • ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });

    console.log('\n🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('✅ La tabla guardias ahora tiene todos los campos necesarios para postulaciones');
    console.log('🚀 El formulario de postulación debería funcionar sin errores 500');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

runMigration();
