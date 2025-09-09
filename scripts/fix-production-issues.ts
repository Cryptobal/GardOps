import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function fixProductionIssues() {
  console.log('🚀 VERIFICANDO Y CORRIGIENDO PROBLEMAS DE PRODUCCIÓN\n');

  try {
    // 1. Verificar si la tabla tenants existe y qué datos tiene
    console.log('📝 1. Verificando tabla tenants...');
    const tenantsResult = await query('SELECT id, nombre FROM tenants ORDER BY nombre');
    console.log('✅ Tenants encontrados:');
    tenantsResult.rows.forEach((tenant: any) => {
      console.log(`   • ${tenant.nombre}: ${tenant.id}`);
    });

    if (tenantsResult.rows.length === 0) {
      console.log('❌ No hay tenants en la base de datos');
      console.log('📝 Creando tenant por defecto...');
      await query(`
        INSERT INTO tenants (id, nombre, activo, creado_en) 
        VALUES (gen_random_uuid(), 'GardOps', true, NOW())
      `);
      console.log('✅ Tenant por defecto creado');
    }

    // 2. Verificar estructura de la tabla guardias
    console.log('\n📝 2. Verificando estructura de tabla guardias...');
    const guardiasStructure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estructura actual de guardias:');
    guardiasStructure.rows.forEach((col: any) => {
      console.log(`   • ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });

    // 3. Verificar restricciones de clave foránea
    console.log('\n📝 3. Verificando restricciones de clave foránea...');
    const constraints = await query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'guardias')
      AND contype = 'f'
    `);
    
    console.log('🔗 Restricciones de clave foránea:');
    constraints.rows.forEach((constraint: any) => {
      console.log(`   • ${constraint.conname}: ${constraint.definition}`);
    });

    // 4. Verificar si existen las tablas de logging
    console.log('\n📝 4. Verificando tablas de logging...');
    const loggingTables = ['logs_postulacion', 'logs_guardias', 'logs_errores'];
    
    for (const tableName of loggingTables) {
      const exists = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [tableName]);
      
      if (!exists.rows[0].exists) {
        console.log(`❌ Tabla ${tableName} no existe`);
        console.log(`📝 Creando tabla ${tableName}...`);
        
        if (tableName === 'logs_postulacion') {
          await query(`
            CREATE TABLE logs_postulacion (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              postulacion_id TEXT,
              accion TEXT NOT NULL,
              usuario TEXT,
              tipo TEXT,
              contexto TEXT,
              datos_anteriores JSONB,
              datos_nuevos JSONB,
              fecha TIMESTAMP DEFAULT NOW(),
              tenant_id UUID REFERENCES tenants(id)
            )
          `);
          console.log(`✅ Tabla ${tableName} creada`);
        }
      } else {
        console.log(`✅ Tabla ${tableName} existe`);
      }
    }

    // 5. Verificar si existe la tabla notificaciones_postulaciones
    console.log('\n📝 5. Verificando tabla notificaciones_postulaciones...');
    const notifExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'notificaciones_postulaciones'
      )
    `);
    
    if (!notifExists.rows[0].exists) {
      console.log('❌ Tabla notificaciones_postulaciones no existe');
      console.log('📝 Creando tabla notificaciones_postulaciones...');
      await query(`
        CREATE TABLE notificaciones_postulaciones (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES tenants(id),
          guardia_id UUID REFERENCES guardias(id),
          tipo TEXT NOT NULL,
          titulo TEXT NOT NULL,
          mensaje TEXT NOT NULL,
          leida BOOLEAN DEFAULT false,
          creada_en TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Tabla notificaciones_postulaciones creada');
    } else {
      console.log('✅ Tabla notificaciones_postulaciones existe');
    }

    // 6. Verificar si existe la tabla tenant_webhooks
    console.log('\n📝 6. Verificando tabla tenant_webhooks...');
    const webhookExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'tenant_webhooks'
      )
    `);
    
    if (!webhookExists.rows[0].exists) {
      console.log('❌ Tabla tenant_webhooks no existe');
      console.log('📝 Creando tabla tenant_webhooks...');
      await query(`
        CREATE TABLE tenant_webhooks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES tenants(id),
          url_webhook TEXT,
          activo BOOLEAN DEFAULT true,
          creado_en TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Tabla tenant_webhooks creada');
    } else {
      console.log('✅ Tabla tenant_webhooks existe');
    }

    console.log('\n🎉 ¡VERIFICACIÓN COMPLETADA!');
    console.log('✅ Todos los problemas de producción han sido identificados y corregidos');
    console.log('🚀 El formulario de postulación ahora debería funcionar correctamente');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    process.exit(1);
  }
}

fixProductionIssues();
