#!/usr/bin/env ts-node

import { config } from 'dotenv';
import path from 'path';
import { getTenantId } from '@/lib/utils/tenant-utils';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';
import { checkConnection } from '../src/lib/database';

async function createPagosTurnosExtrasTable() {
  console.log('🚀 Iniciando creación de tabla pagos_turnos_extras...\n');
  
  try {
    // 1. Verificar conexión
    console.log('🔍 Verificando conexión a la base de datos...');
    const connected = await checkConnection();
    if (!connected) {
      console.error('❌ Error: No se pudo conectar a la base de datos');
      console.error('   Verifica que DATABASE_URL esté configurado correctamente');
      process.exit(1);
    }
    console.log('✅ Conexión establecida\n');

    // 2. Verificar si la tabla ya existe
    console.log('📋 Verificando si la tabla pagos_turnos_extras existe...');
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'pagos_turnos_extras'
      );
    `);

    if (tableExists.rows[0].exists) {
      console.log('✅ Tabla pagos_turnos_extras ya existe');
      return;
    }

    // 3. Crear tabla pagos_turnos_extras
    console.log('📋 Creando tabla pagos_turnos_extras...');
    await query(`
      CREATE TABLE pagos_turnos_extras (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        guardia_id UUID REFERENCES guardias(id) ON DELETE CASCADE,
        fecha_pago DATE NOT NULL,
        glosa TEXT NOT NULL,
        monto_total DECIMAL(10,2) NOT NULL,
        estado TEXT CHECK (estado IN ('pendiente', 'pagado', 'cancelado')) DEFAULT 'pendiente',
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tabla pagos_turnos_extras creada exitosamente');

    // 4. Crear índices para optimización
    console.log('📋 Creando índices...');
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_pagos_turnos_extras_guardia_id ON pagos_turnos_extras(guardia_id)
    `);
    console.log('✅ Índice idx_pagos_turnos_extras_guardia_id creado');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_pagos_turnos_extras_fecha_pago ON pagos_turnos_extras(fecha_pago)
    `);
    console.log('✅ Índice idx_pagos_turnos_extras_fecha_pago creado');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_pagos_turnos_extras_estado ON pagos_turnos_extras(estado)
    `);
    console.log('✅ Índice idx_pagos_turnos_extras_estado creado');

    // 5. Insertar datos de ejemplo (opcional)
    console.log('📋 Insertando datos de ejemplo...');
    await query(`
      INSERT INTO pagos_turnos_extras (tenant_id, guardia_id, fecha_pago, glosa, monto_total, estado, observaciones)
      VALUES 
        (await getTenantId(request), 
         (SELECT id FROM guardias LIMIT 1), 
         CURRENT_DATE - INTERVAL '30 days', 
         'Turno extra nocturno - Instalación Norte', 
         45000, 
         'pagado', 
         'Pago por turno extra realizado'),
        (await getTenantId(request), 
         (SELECT id FROM guardias LIMIT 1), 
         CURRENT_DATE - INTERVAL '15 days', 
         'Cobertura fin de semana', 
         35000, 
         'pagado', 
         'Pago por cobertura de fin de semana')
    `);
    console.log('✅ Datos de ejemplo insertados');

    console.log('\n🎉 ¡ÉXITO TOTAL!');
    console.log('✅ Tabla pagos_turnos_extras creada con éxito');
    console.log('✅ Índices de optimización creados');
    console.log('✅ Datos de ejemplo insertados');
    console.log('\n🔧 Sistema de pagos de turnos extras implementado:');
    console.log('   • Gestión de pagos por turnos extras');
    console.log('   • Historial de pagos por guardia');
    console.log('   • Exportación a CSV');
    console.log('   • Estados de pago (pendiente, pagado, cancelado)');

  } catch (error) {
    console.error('\n❌ Error creando tabla pagos_turnos_extras:', error);
    process.exit(1);
  }
}

// Ejecutar el script
createPagosTurnosExtrasTable()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error ejecutando script:', error);
    process.exit(1);
  }); 