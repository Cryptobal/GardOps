import { query } from '../src/lib/database';

async function verificarEstructuraPautaMensual() {
  console.log('🔍 VERIFICANDO ESTRUCTURA DE PAUTA MENSUAL');
  console.log('===========================================\n');

  try {
    // 1. Verificar si la tabla existe
    console.log('📋 1. VERIFICANDO EXISTENCIA DE TABLA...');
    
    const tablaExiste = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'as_turnos_pauta_mensual'
      )
    `);
    
    if (!tablaExiste.rows[0].exists) {
      console.log('❌ Tabla as_turnos_pauta_mensual no existe');
      console.log('📝 Creando tabla...');
      
      await query(`
        CREATE TABLE as_turnos_pauta_mensual (
          id SERIAL PRIMARY KEY,
          puesto_id UUID NOT NULL,
          guardia_id TEXT NOT NULL,
          anio INTEGER NOT NULL,
          mes INTEGER NOT NULL,
          dia INTEGER NOT NULL,
          estado TEXT NOT NULL CHECK (estado IN ('trabajado', 'libre', 'permiso', 'vacaciones', 'licencia')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          -- Restricción única para evitar duplicados
          UNIQUE(puesto_id, guardia_id, anio, mes, dia)
        )
      `);
      
      console.log('✅ Tabla as_turnos_pauta_mensual creada');
    } else {
      console.log('✅ Tabla as_turnos_pauta_mensual existe');
    }

    // 2. Verificar estructura de columnas
    console.log('\n📋 2. VERIFICANDO ESTRUCTURA DE COLUMNAS...');
    
    const columnas = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'as_turnos_pauta_mensual'
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas encontradas:');
    columnas.rows.forEach((col: any) => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });

    // 3. Verificar si existe la columna puesto_id
    const tienePuestoId = columnas.rows.some((col: any) => col.column_name === 'puesto_id');
    const tieneInstalacionId = columnas.rows.some((col: any) => col.column_name === 'instalacion_id');

    if (!tienePuestoId) {
      console.log('\n🔄 3. MIGRANDO A NUEVO MODELO...');
      
      // Agregar columna puesto_id si no existe
      try {
        await query('ALTER TABLE as_turnos_pauta_mensual ADD COLUMN puesto_id UUID');
        console.log('✅ Columna puesto_id agregada');
      } catch (error) {
        console.log('ℹ️ Columna puesto_id ya existe o error:', error);
      }

      // Si existe instalacion_id, migrar datos
      if (tieneInstalacionId) {
        console.log('🔄 Migrando datos de instalacion_id a puesto_id...');
        
        // Obtener datos existentes
        const datosExistentes = await query(`
          SELECT DISTINCT instalacion_id, guardia_id, anio, mes
          FROM as_turnos_pauta_mensual
          WHERE instalacion_id IS NOT NULL
        `);
        
        console.log(`📊 ${datosExistentes.rows.length} registros únicos encontrados`);
        
        // Para cada instalación, buscar puestos operativos correspondientes
        for (const registro of datosExistentes.rows) {
          const puestosOperativos = await query(`
            SELECT id as puesto_id
            FROM as_turnos_puestos_operativos
            WHERE instalacion_id = $1 AND activo = true
          `, [registro.instalacion_id]);
          
          if (puestosOperativos.rows.length > 0) {
            // Actualizar registros con puesto_id
            for (const puesto of puestosOperativos.rows) {
              await query(`
                UPDATE as_turnos_pauta_mensual
                SET puesto_id = $1
                WHERE instalacion_id = $2 AND guardia_id = $3 AND anio = $4 AND mes = $5
              `, [puesto.puesto_id, registro.instalacion_id, registro.guardia_id, registro.anio, registro.mes]);
            }
            console.log(`✅ Migrados registros para instalación ${registro.instalacion_id}`);
          }
        }
        
        // Eliminar columna instalacion_id después de la migración
        try {
          await query('ALTER TABLE as_turnos_pauta_mensual DROP COLUMN instalacion_id');
          console.log('✅ Columna instalacion_id eliminada');
        } catch (error) {
          console.log('ℹ️ Error eliminando instalacion_id:', error);
        }
      }
    }

    // 4. Verificar índices
    console.log('\n📋 4. VERIFICANDO ÍNDICES...');
    
    const indices = await query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'as_turnos_pauta_mensual'
    `);
    
    console.log('Índices encontrados:');
    indices.rows.forEach((idx: any) => {
      console.log(`  ${idx.indexname}: ${idx.indexdef}`);
    });

    // Crear índices si no existen
    const indicesNecesarios = [
      'CREATE INDEX IF NOT EXISTS idx_pauta_mensual_puesto_mes ON as_turnos_pauta_mensual (puesto_id, anio, mes)',
      'CREATE INDEX IF NOT EXISTS idx_pauta_mensual_guardia ON as_turnos_pauta_mensual (guardia_id)',
      'CREATE INDEX IF NOT EXISTS idx_pauta_mensual_fecha ON as_turnos_pauta_mensual (anio, mes, dia)'
    ];

    for (const indiceSQL of indicesNecesarios) {
      try {
        await query(indiceSQL);
        console.log(`✅ Índice creado: ${indiceSQL.substring(0, 50)}...`);
      } catch (error) {
        console.log(`ℹ️ Índice ya existe o error: ${error}`);
      }
    }

    // 5. Verificar trigger para updated_at
    console.log('\n📋 5. VERIFICANDO TRIGGER...');
    
    const triggerExiste = await query(`
      SELECT EXISTS (
        SELECT FROM pg_trigger 
        WHERE tgname = 'update_as_turnos_pauta_mensual_updated_at'
      )
    `);
    
    if (!triggerExiste.rows[0].exists) {
      console.log('📝 Creando trigger para updated_at...');
      
      await query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
        
        CREATE TRIGGER update_as_turnos_pauta_mensual_updated_at
          BEFORE UPDATE ON as_turnos_pauta_mensual
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
      
      console.log('✅ Trigger creado');
    } else {
      console.log('✅ Trigger ya existe');
    }

    // 6. Verificar datos de ejemplo
    console.log('\n📋 6. VERIFICANDO DATOS...');
    
    const datosEjemplo = await query(`
      SELECT 
        pm.puesto_id,
        pm.guardia_id,
        pm.anio,
        pm.mes,
        pm.dia,
        pm.estado,
        po.nombre_puesto,
        po.instalacion_id
      FROM as_turnos_pauta_mensual pm
      LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LIMIT 5
    `);
    
    console.log(`📊 ${datosEjemplo.rows.length} registros de ejemplo:`);
    datosEjemplo.rows.forEach((row: any, index: number) => {
      console.log(`  ${index + 1}. Puesto: ${row.nombre_puesto || 'N/A'}, Día: ${row.dia}, Estado: ${row.estado}`);
    });

    console.log('\n✅ VERIFICACIÓN COMPLETADA EXITOSAMENTE');
    console.log('🎯 La tabla as_turnos_pauta_mensual está lista para el nuevo modelo');

  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verificarEstructuraPautaMensual()
    .then(() => {
      console.log('\n🎉 Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error ejecutando script:', error);
      process.exit(1);
    });
}

export { verificarEstructuraPautaMensual }; 