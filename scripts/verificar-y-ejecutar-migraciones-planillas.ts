import { query } from '../src/lib/database';
import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

async function verificarYEjecutarMigraciones() {
  try {
    console.log('🔍 Verificando tablas de planillas de turnos extras...');
    console.log('================================================\n');
    
    // Verificar si existe tabla planillas_turnos_extras
    const tablaPlanillas = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'planillas_turnos_extras'
      )
    `);
    
    if (!tablaPlanillas.rows[0].exists) {
      console.log('❌ Tabla planillas_turnos_extras NO existe. Creándola...');
      
      // Crear tabla planillas_turnos_extras
      await query(`
        CREATE TABLE planillas_turnos_extras (
          id SERIAL PRIMARY KEY,
          fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          usuario_id UUID REFERENCES usuarios(id),
          monto_total DECIMAL(10,2) NOT NULL,
          cantidad_turnos INTEGER NOT NULL,
          estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada')),
          fecha_pago TIMESTAMP NULL,
          observaciones TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Crear índices
      await query(`CREATE INDEX idx_planillas_turnos_extras_usuario ON planillas_turnos_extras(usuario_id)`);
      await query(`CREATE INDEX idx_planillas_turnos_extras_estado ON planillas_turnos_extras(estado)`);
      await query(`CREATE INDEX idx_planillas_turnos_extras_fecha ON planillas_turnos_extras(fecha_generacion)`);
      
      console.log('✅ Tabla planillas_turnos_extras creada exitosamente');
    } else {
      console.log('✅ Tabla planillas_turnos_extras ya existe');
    }
    
    // Verificar si existe tabla planilla_turno_relacion
    const tablaRelacion = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'planilla_turno_relacion'
      )
    `);
    
    if (!tablaRelacion.rows[0].exists) {
      console.log('❌ Tabla planilla_turno_relacion NO existe. Creándola...');
      
      await query(`
        CREATE TABLE planilla_turno_relacion (
          id SERIAL PRIMARY KEY,
          planilla_id INTEGER REFERENCES planillas_turnos_extras(id) ON DELETE CASCADE,
          turno_extra_id UUID REFERENCES turnos_extras(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(planilla_id, turno_extra_id)
        )
      `);
      
      // Crear índices
      await query(`CREATE INDEX idx_planilla_turno_relacion_planilla ON planilla_turno_relacion(planilla_id)`);
      await query(`CREATE INDEX idx_planilla_turno_relacion_turno ON planilla_turno_relacion(turno_extra_id)`);
      
      console.log('✅ Tabla planilla_turno_relacion creada exitosamente');
    } else {
      console.log('✅ Tabla planilla_turno_relacion ya existe');
    }
    
    // Verificar columna planilla_id en turnos_extras
    const columnaPlanillaId = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'turnos_extras'
        AND column_name = 'planilla_id'
      )
    `);
    
    if (!columnaPlanillaId.rows[0].exists) {
      console.log('❌ Columna planilla_id NO existe en turnos_extras. Agregándola...');
      await query(`ALTER TABLE turnos_extras ADD COLUMN planilla_id INTEGER REFERENCES planillas_turnos_extras(id)`);
      await query(`CREATE INDEX idx_turnos_extras_planilla_id ON turnos_extras(planilla_id)`);
      console.log('✅ Columna planilla_id agregada exitosamente');
    } else {
      console.log('✅ Columna planilla_id ya existe en turnos_extras');
    }
    
    // Verificar datos existentes
    console.log('\n📊 Verificando datos existentes...');
    
    const countPlanillas = await query(`SELECT COUNT(*) as total FROM TE_planillas_turnos_extras`);
    const countRelaciones = await query(`SELECT COUNT(*) as total FROM TE_planilla_turno_relacion`);
    const countTurnosConPlanilla = await query(`SELECT COUNT(*) as total FROM TE_turnos_extras WHERE planilla_id IS NOT NULL`);
    
    console.log(`   - Planillas existentes: ${countPlanillas.rows[0].total}`);
    console.log(`   - Relaciones turno-planilla: ${countRelaciones.rows[0].total}`);
    console.log(`   - Turnos asociados a planillas: ${countTurnosConPlanilla.rows[0].total}`);
    
    console.log('\n================================================');
    console.log('🎉 ¡Todas las verificaciones completadas exitosamente!');
    console.log('✅ El sistema está listo para generar planillas de turnos extras.');
    console.log('================================================\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error durante la verificación/migración:', error);
    console.error('\nDetalles del error:');
    if (error instanceof Error) {
      console.error('  Mensaje:', error.message);
      console.error('  Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Ejecutar el script
verificarYEjecutarMigraciones();
