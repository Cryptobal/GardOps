import { query } from '../src/lib/database';

async function recrearEstructuras() {
  console.log('🚀 RECREANDO TABLAS DE ESTRUCTURAS DE SERVICIO\n');

  try {
    // 1. Eliminar tablas existentes si existen
    console.log('📋 Eliminando tablas existentes...');
    await query('DROP TABLE IF EXISTS sueldo_estructura_inst_item CASCADE');
    await query('DROP TABLE IF EXISTS sueldo_estructura_instalacion CASCADE');
    console.log('✅ Tablas eliminadas');

    // 2. Crear tabla sueldo_estructura_instalacion
    console.log('📋 Creando tabla sueldo_estructura_instalacion...');
    await query(`
      CREATE TABLE sueldo_estructura_instalacion (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        instalacion_id UUID NOT NULL REFERENCES instalaciones(id) ON DELETE CASCADE,
        rol_servicio_id UUID NOT NULL REFERENCES as_turnos_roles_servicio(id) ON DELETE CASCADE,
        version INTEGER NOT NULL DEFAULT 1,
        vigencia_desde DATE NOT NULL,
        activo BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT unique_instalacion_rol_version UNIQUE(instalacion_id, rol_servicio_id, version)
      )
    `);
    console.log('✅ Tabla sueldo_estructura_instalacion creada');

    // 3. Crear tabla sueldo_estructura_inst_item
    console.log('📋 Creando tabla sueldo_estructura_inst_item...');
    await query(`
      CREATE TABLE sueldo_estructura_inst_item (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        estructura_id UUID NOT NULL REFERENCES sueldo_estructura_instalacion(id) ON DELETE CASCADE,
        item_id UUID NOT NULL REFERENCES sueldo_item(id) ON DELETE CASCADE,
        monto DECIMAL(15,2) NOT NULL DEFAULT 0,
        vigencia_desde DATE NOT NULL,
        vigencia_hasta DATE NULL,
        activo BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT unique_estructura_item_vigencia UNIQUE(estructura_id, item_id, vigencia_desde)
      )
    `);
    console.log('✅ Tabla sueldo_estructura_inst_item creada');

    // 4. Crear índices
    console.log('📋 Creando índices...');
    
    await query('CREATE INDEX idx_sueldo_estructura_instalacion_instalacion ON sueldo_estructura_instalacion(instalacion_id)');
    await query('CREATE INDEX idx_sueldo_estructura_instalacion_rol ON sueldo_estructura_instalacion(rol_servicio_id)');
    await query('CREATE INDEX idx_sueldo_estructura_instalacion_activo ON sueldo_estructura_instalacion(activo)');
    await query('CREATE INDEX idx_sueldo_estructura_inst_item_estructura ON sueldo_estructura_inst_item(estructura_id)');
    await query('CREATE INDEX idx_sueldo_estructura_inst_item_item ON sueldo_estructura_inst_item(item_id)');
    await query('CREATE INDEX idx_sueldo_estructura_inst_item_activo ON sueldo_estructura_inst_item(activo)');
    await query('CREATE INDEX idx_sueldo_estructura_inst_item_vigencia ON sueldo_estructura_inst_item(vigencia_desde, vigencia_hasta)');
    
    console.log('✅ Índices creados');

    // 5. Agregar comentarios
    console.log('📋 Agregando comentarios...');
    await query('COMMENT ON TABLE sueldo_estructura_instalacion IS \'Cabecera de estructuras de servicio por instalación y rol\'');
    await query('COMMENT ON COLUMN sueldo_estructura_instalacion.version IS \'Versión de la estructura (para control de cambios)\'');
    await query('COMMENT ON COLUMN sueldo_estructura_instalacion.vigencia_desde IS \'Fecha desde la cual es válida la estructura\'');
    await query('COMMENT ON COLUMN sueldo_estructura_instalacion.activo IS \'Indica si la estructura está activa\'');
    
    await query('COMMENT ON TABLE sueldo_estructura_inst_item IS \'Detalle de ítems de estructura de servicio\'');
    await query('COMMENT ON COLUMN sueldo_estructura_inst_item.monto IS \'Monto del ítem en la estructura\'');
    await query('COMMENT ON COLUMN sueldo_estructura_inst_item.vigencia_desde IS \'Fecha desde la cual es válido el ítem\'');
    await query('COMMENT ON COLUMN sueldo_estructura_inst_item.vigencia_hasta IS \'Fecha hasta la cual es válido el ítem (NULL = sin límite)\'');
    await query('COMMENT ON COLUMN sueldo_estructura_inst_item.activo IS \'Indica si el ítem está activo en la estructura\'');
    
    console.log('✅ Comentarios agregados');

    // 6. Verificar que las tablas se crearon correctamente
    console.log('\n🔍 Verificando tablas creadas...');
    
    const estructuraTable = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sueldo_estructura_instalacion'
      )
    `);
    
    const itemTable = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sueldo_estructura_inst_item'
      )
    `);
    
    const estructuraExists = Array.isArray(estructuraTable) ? estructuraTable[0].exists : estructuraTable.rows[0].exists;
    const itemExists = Array.isArray(itemTable) ? itemTable[0].exists : itemTable.rows[0].exists;
    
    if (estructuraExists && itemExists) {
      console.log('✅ Tabla sueldo_estructura_instalacion: OK');
      console.log('✅ Tabla sueldo_estructura_inst_item: OK');
      console.log('\n🎉 Todas las tablas se crearon correctamente');
    } else {
      console.log('❌ Error: No se pudieron verificar todas las tablas');
    }
    
  } catch (error) {
    console.error('❌ Error recreando tablas:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  recrearEstructuras()
    .then(() => {
      console.log('\n✅ Proceso completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el proceso:', error);
      process.exit(1);
    });
}

export { recrearEstructuras };
