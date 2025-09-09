import { query } from '../src/lib/database';

async function migrateSueldoItems() {
  console.log('🚀 MIGRANDO TABLA DE ÍTEMS GLOBALES\n');

  try {
    // Iniciar transacción
    await query('BEGIN');
    
    // ===============================================
    // 1. CREAR TABLA DE ÍTEMS GLOBALES
    // ===============================================
    console.log('1️⃣ CREANDO TABLA DE ÍTEMS GLOBALES...');
    
    // Eliminar tabla si existe
    await query('DROP TABLE IF EXISTS sueldo_item CASCADE');
    console.log('✅ Tabla anterior eliminada');
    
    await query(`
      CREATE TABLE sueldo_item (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        codigo VARCHAR(50) NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL,
        clase VARCHAR(20) NOT NULL CHECK (clase IN ('HABER', 'DESCUENTO')),
        naturaleza VARCHAR(20) NOT NULL CHECK (naturaleza IN ('IMPONIBLE', 'NO_IMPONIBLE')),
        descripcion TEXT,
        formula_json JSONB NULL,
        tope_modo VARCHAR(20) NOT NULL DEFAULT 'NONE' CHECK (tope_modo IN ('NONE', 'MONTO', 'PORCENTAJE')),
        tope_valor DECIMAL(15,2),
        activo BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla sueldo_item creada');

    // Crear índices
    await query('CREATE INDEX IF NOT EXISTS idx_sueldo_item_activo ON sueldo_item(activo)');
    await query('CREATE INDEX IF NOT EXISTS idx_sueldo_item_clase ON sueldo_item(clase)');
    await query('CREATE INDEX IF NOT EXISTS idx_sueldo_item_naturaleza ON sueldo_item(naturaleza)');
    await query('CREATE INDEX IF NOT EXISTS idx_sueldo_item_codigo ON sueldo_item(codigo)');
    console.log('✅ Índices creados');

    // ===============================================
    // 2. INSERTAR ÍTEMS BÁSICOS
    // ===============================================
    console.log('\n2️⃣ INSERTANDO ÍTEMS BÁSICOS...');
    
    const itemsBasicos = [
      { 
        codigo: 'colacion', 
        nombre: 'Colación', 
        clase: 'HABER', 
        naturaleza: 'NO_IMPONIBLE', 
        descripcion: 'Bono de colación para alimentación', 
        tope_modo: 'NONE' 
      },
      { 
        codigo: 'movilizacion', 
        nombre: 'Movilización', 
        clase: 'HABER', 
        naturaleza: 'NO_IMPONIBLE', 
        descripcion: 'Bono de movilización para transporte', 
        tope_modo: 'NONE' 
      },
      { 
        codigo: 'responsabilidad', 
        nombre: 'Responsabilidad', 
        clase: 'HABER', 
        naturaleza: 'IMPONIBLE', 
        descripcion: 'Bono por responsabilidad en el cargo', 
        tope_modo: 'NONE' 
      },
      { 
        codigo: 'descuento_ausencia', 
        nombre: 'Descuento por Ausencia', 
        clase: 'DESCUENTO', 
        naturaleza: 'IMPONIBLE', 
        descripcion: 'Descuento por días de ausencia', 
        tope_modo: 'PORCENTAJE',
        tope_valor: 100
      },
      { 
        codigo: 'descuento_anticipo', 
        nombre: 'Descuento por Anticipo', 
        clase: 'DESCUENTO', 
        naturaleza: 'IMPONIBLE', 
        descripcion: 'Descuento por anticipos de sueldo', 
        tope_modo: 'MONTO',
        tope_valor: 0
      }
    ];

    for (const item of itemsBasicos) {
      try {
        await query(
          `INSERT INTO sueldo_item (
            codigo, nombre, clase, naturaleza, descripcion, formula_json, tope_modo, tope_valor, activo
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
          ON CONFLICT (codigo) DO UPDATE SET 
            nombre = EXCLUDED.nombre,
            clase = EXCLUDED.clase,
            naturaleza = EXCLUDED.naturaleza,
            descripcion = EXCLUDED.descripcion,
            formula_json = EXCLUDED.formula_json,
            tope_modo = EXCLUDED.tope_modo,
            tope_valor = EXCLUDED.tope_valor,
            updated_at = NOW()`,
          [item.codigo, item.nombre, item.clase, item.naturaleza, item.descripcion, null, item.tope_modo, item.tope_valor]
        );
        console.log(`✅ Ítem "${item.nombre}" creado/actualizado exitosamente`);
      } catch (error) {
        console.error(`❌ Error creando ítem "${item.nombre}":`, error);
      }
    }

    // ===============================================
    // 3. VERIFICAR RESULTADO
    // ===============================================
    console.log('\n3️⃣ VERIFICANDO RESULTADO...');
    
    const result = await query('SELECT COUNT(*) as count FROM sueldo_item');
    const count = parseInt(result.rows[0].count);
    console.log(`✅ Total de ítems en la base de datos: ${count}`);

    // Mostrar estadísticas
    const stats = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN activo = true THEN 1 END) as activos,
        COUNT(CASE WHEN activo = false THEN 1 END) as inactivos,
        COUNT(CASE WHEN clase = 'HABER' THEN 1 END) as haberes,
        COUNT(CASE WHEN clase = 'DESCUENTO' THEN 1 END) as descuentos,
        COUNT(CASE WHEN naturaleza = 'IMPONIBLE' THEN 1 END) as imponibles,
        COUNT(CASE WHEN naturaleza = 'NO_IMPONIBLE' THEN 1 END) as no_imponibles
      FROM sueldo_item
    `);

    const statsData = stats.rows[0];
    console.log('\n📊 Estadísticas:');
    console.log(`   Total: ${statsData.total}`);
    console.log(`   Activos: ${statsData.activos}`);
    console.log(`   Inactivos: ${statsData.inactivos}`);
    console.log(`   Haberes: ${statsData.haberes}`);
    console.log(`   Descuentos: ${statsData.descuentos}`);
    console.log(`   Imponibles: ${statsData.imponibles}`);
    console.log(`   No Imponibles: ${statsData.no_imponibles}`);

    // Commit transacción
    await query('COMMIT');
    console.log('\n🎉 Migración completada exitosamente');

  } catch (error) {
    // Rollback en caso de error
    await query('ROLLBACK');
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrateSueldoItems()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });
