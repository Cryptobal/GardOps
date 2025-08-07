import { query } from '../src/lib/database';

async function createHistorialTables() {
  console.log('🚀 CREANDO TABLAS DE HISTORIAL\n');

  try {
    // 1. Crear tabla historial_roles_servicio
    console.log('1️⃣ Creando historial_roles_servicio...');
    await query(`
      CREATE TABLE IF NOT EXISTS historial_roles_servicio (
        id SERIAL PRIMARY KEY,
        rol_servicio_id UUID NOT NULL REFERENCES as_turnos_roles_servicio(id),
        accion VARCHAR(50) NOT NULL CHECK (accion IN ('ACTIVACION', 'INACTIVACION', 'MODIFICACION')),
        motivo TEXT,
        fecha_accion TIMESTAMP DEFAULT NOW(),
        datos_anteriores JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ historial_roles_servicio creada');

    // 2. Crear tabla historial_estructuras_servicio
    console.log('\n2️⃣ Creando historial_estructuras_servicio...');
    await query(`
      CREATE TABLE IF NOT EXISTS historial_estructuras_servicio (
        id SERIAL PRIMARY KEY,
        estructura_anterior_id UUID REFERENCES sueldo_estructuras_roles(id),
        estructura_nueva_id UUID REFERENCES sueldo_estructuras_roles(id),
        rol_servicio_id UUID NOT NULL REFERENCES as_turnos_roles_servicio(id),
        accion VARCHAR(50) NOT NULL CHECK (accion IN ('CREACION', 'INACTIVACION', 'REEMPLAZO', 'MODIFICACION')),
        motivo TEXT,
        fecha_accion TIMESTAMP DEFAULT NOW(),
        datos_anteriores JSONB,
        datos_nuevos JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ historial_estructuras_servicio creada');

    // 3. Crear índices para mejorar el rendimiento
    console.log('\n3️⃣ Creando índices...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_historial_roles_servicio_id ON historial_roles_servicio(rol_servicio_id);
      CREATE INDEX IF NOT EXISTS idx_historial_roles_fecha ON historial_roles_servicio(fecha_accion);
      CREATE INDEX IF NOT EXISTS idx_historial_estructuras_rol_id ON historial_estructuras_servicio(rol_servicio_id);
      CREATE INDEX IF NOT EXISTS idx_historial_estructuras_fecha ON historial_estructuras_servicio(fecha_accion);
    `);
    console.log('✅ Índices creados');

    console.log('\n🎉 ¡Todas las tablas de historial han sido creadas exitosamente!');

  } catch (error) {
    console.error('❌ Error creando tablas de historial:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createHistorialTables()
    .then(() => {
      console.log('✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el script:', error);
      process.exit(1);
    });
}

export { createHistorialTables }; 
