import { query, checkTableExists } from '../src/lib/database';
import fs from 'fs';
import path from 'path';

async function crearTablaPautaMensual() {
  try {
    console.log('🔄 Creando tabla as_turnos_pauta_mensual...');
    
    // Verificar si la tabla ya existe
    const tablaExiste = await checkTableExists('as_turnos_pauta_mensual');
    if (tablaExiste) {
      console.log('✅ La tabla as_turnos_pauta_mensual ya existe');
      return;
    }
    
    // Crear la tabla
    const createTableSQL = `
      CREATE TABLE as_turnos_pauta_mensual (
        id SERIAL PRIMARY KEY,
        instalacion_id TEXT NOT NULL,
        guardia_id TEXT NOT NULL,
        anio INTEGER NOT NULL,
        mes INTEGER NOT NULL,
        dia INTEGER NOT NULL,
        estado TEXT NOT NULL CHECK (estado IN ('trabajado', 'libre', 'permiso')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Restricción única para evitar duplicados
        UNIQUE(instalacion_id, guardia_id, anio, mes, dia)
      );
    `;
    
    console.log('📝 Creando tabla...');
    await query(createTableSQL);
    
    // Crear índices
    const createIndexesSQL = [
      'CREATE INDEX idx_instalacion_anio_mes ON as_turnos_pauta_mensual (instalacion_id, anio, mes);',
      'CREATE INDEX idx_guardia ON as_turnos_pauta_mensual (guardia_id);',
      'CREATE INDEX idx_fecha ON as_turnos_pauta_mensual (anio, mes, dia);'
    ];
    
    for (const indexSQL of createIndexesSQL) {
      console.log(`📝 Creando índice: ${indexSQL.substring(0, 50)}...`);
      await query(indexSQL);
    }
    
    // Crear trigger para actualizar updated_at
    const createTriggerSQL = `
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
    `;
    
    console.log('📝 Creando trigger...');
    await query(createTriggerSQL);
    
    console.log('✅ Tabla as_turnos_pauta_mensual creada exitosamente');
    
    // Verificar que la tabla se creó correctamente
    const tablaCreada = await checkTableExists('as_turnos_pauta_mensual');
    if (tablaCreada) {
      console.log('✅ Verificación: La tabla existe en la base de datos');
      
      // Mostrar estructura de la tabla
      const structure = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'as_turnos_pauta_mensual'
        ORDER BY ordinal_position;
      `);
      
      console.log('📋 Estructura de la tabla:');
      structure.rows.forEach((column: any) => {
        console.log(`  - ${column.column_name}: ${column.data_type} ${column.is_nullable === 'NO' ? 'NOT NULL' : ''} ${column.column_default ? `DEFAULT ${column.column_default}` : ''}`);
      });
    } else {
      console.log('❌ Error: La tabla no se creó correctamente');
    }
    
  } catch (error) {
    console.error('❌ Error creando tabla as_turnos_pauta_mensual:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  crearTablaPautaMensual()
    .then(() => {
      console.log('🎉 Migración completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en la migración:', error);
      process.exit(1);
    });
} 