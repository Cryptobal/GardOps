import { sql } from '@vercel/postgres';

async function migratePlanillasTurnosExtras() {
  try {
    console.log('🔄 Iniciando migración de tablas de planillas de turnos extras...');

    // Crear tabla planillas_turnos_extras
    console.log('📋 Creando tabla planillas_turnos_extras...');
    await sql`
      CREATE TABLE IF NOT EXISTS planillas_turnos_extras (
        id SERIAL PRIMARY KEY,
        fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario_id INTEGER REFERENCES usuarios(id),
        monto_total DECIMAL(10,2) NOT NULL,
        cantidad_turnos INTEGER NOT NULL,
        estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada')),
        fecha_pago TIMESTAMP NULL,
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Crear tabla planilla_turno_relacion
    console.log('🔗 Creando tabla planilla_turno_relacion...');
    await sql`
      CREATE TABLE IF NOT EXISTS planilla_turno_relacion (
        id SERIAL PRIMARY KEY,
        planilla_id INTEGER REFERENCES planillas_turnos_extras(id) ON DELETE CASCADE,
        turno_extra_id INTEGER REFERENCES turnos_extras(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(planilla_id, turno_extra_id)
      )
    `;

    // Agregar índices
    console.log('📊 Creando índices...');
    await sql`CREATE INDEX IF NOT EXISTS idx_planillas_turnos_extras_usuario ON planillas_turnos_extras(usuario_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_planillas_turnos_extras_estado ON planillas_turnos_extras(estado)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_planillas_turnos_extras_fecha ON planillas_turnos_extras(fecha_generacion)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_planilla_turno_relacion_planilla ON planilla_turno_relacion(planilla_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_planilla_turno_relacion_turno ON planilla_turno_relacion(turno_extra_id)`;

    // Agregar columna planilla_id a turnos_extras
    console.log('🔧 Agregando columna planilla_id a turnos_extras...');
    await sql`ALTER TABLE turnos_extras ADD COLUMN IF NOT EXISTS planilla_id INTEGER REFERENCES planillas_turnos_extras(id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_turnos_extras_planilla_id ON turnos_extras(planilla_id)`;

    console.log('✅ Migración completada exitosamente!');
    console.log('📋 Tablas creadas:');
    console.log('   - planillas_turnos_extras');
    console.log('   - planilla_turno_relacion');
    console.log('🔧 Modificaciones:');
    console.log('   - Agregada columna planilla_id a turnos_extras');
    console.log('   - Creados índices para optimizar consultas');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

// Ejecutar migración
migratePlanillasTurnosExtras()
  .then(() => {
    console.log('🎉 Migración finalizada correctamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  }); 