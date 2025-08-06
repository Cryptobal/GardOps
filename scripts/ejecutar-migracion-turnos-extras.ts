import { query } from '../src/lib/database';

async function ejecutarMigracionTurnosExtras() {
  try {
    console.log('🚀 Iniciando migración de tabla turnos_extras...');

    // Verificar si la tabla ya existe
    const { rows: tableExists } = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'turnos_extras'
      )
    `);

    if (tableExists[0].exists) {
      console.log('⚠️  La tabla turnos_extras ya existe. Verificando estructura...');
      
      // Verificar si necesitamos agregar campos faltantes
      const { rows: columns } = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'turnos_extras'
      `);

      const columnNames = columns.map((col: any) => col.column_name);
      const requiredColumns = [
        'observaciones_pago',
        'usuario_pago', 
        'tenant_id',
        'updated_at'
      ];

      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));

      if (missingColumns.length > 0) {
        console.log(`📝 Agregando columnas faltantes: ${missingColumns.join(', ')}`);
        
        for (const column of missingColumns) {
          switch (column) {
            case 'observaciones_pago':
              await query(`ALTER TABLE turnos_extras ADD COLUMN IF NOT EXISTS observaciones_pago TEXT NULL`);
              break;
            case 'usuario_pago':
              await query(`ALTER TABLE turnos_extras ADD COLUMN IF NOT EXISTS usuario_pago VARCHAR(255) NULL`);
              break;
            case 'tenant_id':
              await query(`ALTER TABLE turnos_extras ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT 'accebf8a-bacc-41fa-9601-ed39cb320a52'`);
              break;
            case 'updated_at':
              await query(`ALTER TABLE turnos_extras ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);
              break;
          }
        }
      }

      // Verificar y corregir tipo de pauta_id
      const { rows: pautaIdType } = await query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'turnos_extras' AND column_name = 'pauta_id'
      `);

      if (pautaIdType.length > 0 && pautaIdType[0].data_type !== 'uuid') {
        console.log('🔄 Corrigiendo tipo de pauta_id a UUID...');
        // Nota: Esto requeriría una migración más compleja en producción
        console.log('⚠️  Se requiere migración manual para cambiar pauta_id a UUID');
      }

    } else {
      console.log('📝 Creando tabla turnos_extras...');
      
      // Crear la tabla completa
      await query(`
        CREATE TABLE turnos_extras (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          guardia_id UUID NOT NULL REFERENCES guardias(id),
          instalacion_id UUID NOT NULL REFERENCES instalaciones(id),
          puesto_id UUID NOT NULL REFERENCES as_turnos_puestos_operativos(id),
          pauta_id UUID NOT NULL REFERENCES as_turnos_pauta_mensual(id),
          fecha DATE NOT NULL,
          estado VARCHAR(20) NOT NULL CHECK (estado IN ('reemplazo', 'ppc')),
          valor DECIMAL(10,2) NOT NULL DEFAULT 0,
          pagado BOOLEAN NOT NULL DEFAULT FALSE,
          fecha_pago DATE NULL,
          observaciones_pago TEXT NULL,
          usuario_pago VARCHAR(255) NULL,
          tenant_id UUID NOT NULL DEFAULT 'accebf8a-bacc-41fa-9601-ed39cb320a52',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Crear índices
      console.log('📊 Creando índices...');
      await query(`CREATE INDEX IF NOT EXISTS idx_turnos_extras_guardia_id ON turnos_extras(guardia_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_turnos_extras_instalacion_id ON turnos_extras(instalacion_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_turnos_extras_fecha ON turnos_extras(fecha)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_turnos_extras_estado ON turnos_extras(estado)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_turnos_extras_pagado ON turnos_extras(pagado)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_turnos_extras_tenant_id ON turnos_extras(tenant_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_turnos_extras_guardia_fecha ON turnos_extras(guardia_id, fecha)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_turnos_extras_instalacion_fecha ON turnos_extras(instalacion_id, fecha)`);

      // Crear trigger para updated_at
      console.log('🔧 Creando trigger para updated_at...');
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
        CREATE TRIGGER update_turnos_extras_updated_at 
          BEFORE UPDATE ON turnos_extras 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column()
      `);

      // Agregar comentarios
      await query(`COMMENT ON TABLE turnos_extras IS 'Registro de turnos extras (reemplazos y PPC)'`);
      await query(`COMMENT ON COLUMN turnos_extras.estado IS 'Estado del turno: reemplazo o ppc'`);
      await query(`COMMENT ON COLUMN turnos_extras.valor IS 'Valor calculado desde valor_turno_extra de la instalación'`);
      await query(`COMMENT ON COLUMN turnos_extras.pagado IS 'Indica si el turno extra ha sido pagado'`);
      await query(`COMMENT ON COLUMN turnos_extras.observaciones_pago IS 'Comentarios sobre el pago realizado'`);
      await query(`COMMENT ON COLUMN turnos_extras.usuario_pago IS 'Usuario que realizó el pago'`);
    }

    console.log('✅ Migración completada exitosamente');
    
    // Verificar la estructura final
    const { rows: finalStructure } = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'turnos_extras'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Estructura final de la tabla turnos_extras:');
    finalStructure.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

// Ejecutar la migración
ejecutarMigracionTurnosExtras()
  .then(() => {
    console.log('🎉 Migración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  }); 