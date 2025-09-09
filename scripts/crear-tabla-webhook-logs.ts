import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function crearTablaWebhookLogs() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 CREANDO TABLA WEBHOOK_LOGS');
    console.log('================================\n');

    // 1. Verificar si existe la tabla
    console.log('1️⃣ Verificando si existe la tabla webhook_logs...');
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'webhook_logs'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('✅ La tabla webhook_logs ya existe');
      
      // Mostrar estructura actual
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'webhook_logs'
        ORDER BY ordinal_position;
      `);
      
      console.log('Estructura actual:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
    } else {
      console.log('❌ La tabla webhook_logs NO existe. Creándola...');
      
      // Crear la tabla
      await client.query(`
        CREATE TABLE webhook_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          guardia_id UUID NOT NULL REFERENCES guardias(id) ON DELETE CASCADE,
          url_webhook TEXT NOT NULL,
          payload_sent TEXT,
          response_status INTEGER,
          response_body TEXT,
          error_message TEXT,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        );
      `);
      
      // Crear índices
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_webhook_logs_tenant_id ON webhook_logs(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_webhook_logs_guardia_id ON webhook_logs(guardia_id);
        CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);
      `);
      
      console.log('✅ Tabla webhook_logs creada exitosamente');
    }
    
    console.log('');

    // 2. Verificar si existe la tabla tenant_webhooks
    console.log('2️⃣ Verificando si existe la tabla tenant_webhooks...');
    const tenantWebhooksExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tenant_webhooks'
      );
    `);
    
    if (tenantWebhooksExists.rows[0].exists) {
      console.log('✅ La tabla tenant_webhooks ya existe');
    } else {
      console.log('❌ La tabla tenant_webhooks NO existe. Creándola...');
      
      // Crear la tabla
      await client.query(`
        CREATE TABLE tenant_webhooks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          url_webhook TEXT NOT NULL,
          activo BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
          UNIQUE(tenant_id)
        );
      `);
      
      console.log('✅ Tabla tenant_webhooks creada exitosamente');
    }

  } catch (error: any) {
    console.error('❌ Error durante la creación:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

crearTablaWebhookLogs().catch(console.error);
