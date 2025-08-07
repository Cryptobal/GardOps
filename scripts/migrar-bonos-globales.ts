import { query } from '../src/lib/database';

async function migrarBonosGlobales() {
  console.log('🚀 MIGRANDO ESTRUCTURA DE BONOS GLOBALES\n');

  try {
    // Iniciar transacción
    await query('BEGIN');
    
    // ===============================================
    // 1. CREAR TABLA DE BONOS GLOBALES
    // ===============================================
    console.log('1️⃣ CREANDO TABLA DE BONOS GLOBALES...');
    
    await query(`
      CREATE TABLE IF NOT EXISTS sueldo_bonos_globales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(100) NOT NULL UNIQUE,
        descripcion TEXT,
        imponible BOOLEAN NOT NULL DEFAULT true,
        activo BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla sueldo_bonos_globales creada');

    // Crear índices
    await query('CREATE INDEX IF NOT EXISTS idx_sueldo_bonos_globales_activo ON sueldo_bonos_globales(activo)');
    await query('CREATE INDEX IF NOT EXISTS idx_sueldo_bonos_globales_imponible ON sueldo_bonos_globales(imponible)');
    console.log('✅ Índices creados');

    // ===============================================
    // 2. INSERTAR BONOS BÁSICOS
    // ===============================================
    console.log('\n2️⃣ INSERTANDO BONOS BÁSICOS...');
    
    const bonosBasicos = [
      { nombre: 'Colación', descripcion: 'Bono de colación para alimentación', imponible: false },
      { nombre: 'Movilización', descripcion: 'Bono de movilización para transporte', imponible: false },
      { nombre: 'Responsabilidad', descripcion: 'Bono por responsabilidad en el cargo', imponible: true }
    ];

    for (const bono of bonosBasicos) {
      await query(`
        INSERT INTO sueldo_bonos_globales (nombre, descripcion, imponible)
        VALUES ($1, $2, $3)
        ON CONFLICT (nombre) DO UPDATE SET 
          descripcion = EXCLUDED.descripcion,
          imponible = EXCLUDED.imponible,
          updated_at = NOW()
      `, [bono.nombre, bono.descripcion, bono.imponible]);
      console.log(`✅ Bono "${bono.nombre}" insertado/actualizado`);
    }

    // ===============================================
    // 3. ACTUALIZAR TABLA DE ESTRUCTURAS DE SERVICIO
    // ===============================================
    console.log('\n3️⃣ ACTUALIZANDO TABLA DE ESTRUCTURAS DE SERVICIO...');
    
    // Verificar si la tabla existe
    const tablaExiste = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sueldo_estructuras_servicio'
      )
    `);

    if (tablaExiste.rows[0].exists) {
      console.log('ℹ️ La tabla sueldo_estructuras_servicio ya existe, verificando estructura...');
      
      // Verificar si ya tiene las nuevas columnas
      const columnas = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'sueldo_estructuras_servicio'
      `);
      
      const nombresColumnas = columnas.rows.map((col: any) => col.column_name);
      
      if (!nombresColumnas.includes('sueldo_base')) {
        console.log('➕ Agregando columna sueldo_base...');
        await query('ALTER TABLE sueldo_estructuras_servicio ADD COLUMN sueldo_base INTEGER NOT NULL DEFAULT 0');
      }
      
      if (!nombresColumnas.includes('bono_id')) {
        console.log('➕ Agregando columna bono_id...');
        await query('ALTER TABLE sueldo_estructuras_servicio ADD COLUMN bono_id UUID REFERENCES sueldo_bonos_globales(id)');
      }
      
      if (!nombresColumnas.includes('activo')) {
        console.log('➕ Agregando columna activo...');
        await query('ALTER TABLE sueldo_estructuras_servicio ADD COLUMN activo BOOLEAN NOT NULL DEFAULT true');
      }
      
      if (!nombresColumnas.includes('fecha_inactivacion')) {
        console.log('➕ Agregando columna fecha_inactivacion...');
        await query('ALTER TABLE sueldo_estructuras_servicio ADD COLUMN fecha_inactivacion TIMESTAMP NULL');
      }
      
      // Eliminar columnas obsoletas si existen
      if (nombresColumnas.includes('nombre_bono')) {
        console.log('🗑️ Eliminando columna nombre_bono (obsoleta)...');
        await query('ALTER TABLE sueldo_estructuras_servicio DROP COLUMN nombre_bono');
      }
      
      if (nombresColumnas.includes('imponible')) {
        console.log('🗑️ Eliminando columna imponible (obsoleta)...');
        await query('ALTER TABLE sueldo_estructuras_servicio DROP COLUMN imponible');
      }
      
    } else {
      console.log('➕ Creando tabla sueldo_estructuras_servicio...');
      await query(`
        CREATE TABLE sueldo_estructuras_servicio (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          instalacion_id UUID NOT NULL REFERENCES instalaciones(id) ON DELETE CASCADE,
          rol_servicio_id UUID NOT NULL REFERENCES as_turnos_roles_servicio(id) ON DELETE CASCADE,
          sueldo_base INTEGER NOT NULL DEFAULT 0,
          bono_id UUID REFERENCES sueldo_bonos_globales(id) ON DELETE CASCADE,
          monto INTEGER NOT NULL,
          activo BOOLEAN NOT NULL DEFAULT true,
          fecha_inactivacion TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          
          CONSTRAINT unique_instalacion_rol_bono UNIQUE(instalacion_id, rol_servicio_id, bono_id)
        )
      `);
      
      // Crear índices
      await query('CREATE INDEX idx_sueldo_estructuras_instalacion ON sueldo_estructuras_servicio(instalacion_id)');
      await query('CREATE INDEX idx_sueldo_estructuras_rol ON sueldo_estructuras_servicio(rol_servicio_id)');
      await query('CREATE INDEX idx_sueldo_estructuras_instalacion_rol ON sueldo_estructuras_servicio(instalacion_id, rol_servicio_id)');
      await query('CREATE INDEX idx_sueldo_estructuras_bono ON sueldo_estructuras_servicio(bono_id)');
      await query('CREATE INDEX idx_sueldo_estructuras_activo ON sueldo_estructuras_servicio(activo)');
    }

    // ===============================================
    // 4. VERIFICAR MIGRACIÓN
    // ===============================================
    console.log('\n4️⃣ VERIFICANDO MIGRACIÓN...');
    
    const bonosCount = await query('SELECT COUNT(*) as count FROM sueldo_bonos_globales');
    console.log(`✅ Bonos globales: ${bonosCount.rows[0].count}`);
    
    const estructurasCount = await query('SELECT COUNT(*) as count FROM sueldo_estructuras_servicio');
    console.log(`✅ Estructuras de servicio: ${estructurasCount.rows[0].count}`);

    // Commit transacción
    await query('COMMIT');
    
    console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('\n📋 RESUMEN:');
    console.log('   ✅ Tabla sueldo_bonos_globales creada');
    console.log('   ✅ 3 bonos básicos insertados');
    console.log('   ✅ Tabla sueldo_estructuras_servicio actualizada');
    console.log('   ✅ Índices creados');
    console.log('\n🚀 El sistema está listo para usar la nueva estructura de bonos globales');

  } catch (error) {
    // Rollback en caso de error
    await query('ROLLBACK');
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

// Ejecutar migración
migrarBonosGlobales()
  .then(() => {
    console.log('\n✅ Migración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en migración:', error);
    process.exit(1);
  });
