import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(req: NextRequest) {
  try {
    logger.debug('🔧 Iniciando migración de documentos a multitenant...');

    const client = await pool.connect();
    
    try {
      // 1. VERIFICAR Y OBTENER TENANT ID
      logger.debug('1️⃣ Verificando tenant...');
      
      const tenantCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'tenants'
        )
      `);

      if (!tenantCheck.rows[0].exists) {
        throw new Error('❌ Tabla tenants no existe. Ejecute primero la migración de usuarios.');
      }

      // Obtener o crear tenant 'Gard'
      let tenantResult = await client.query(`
        SELECT id FROM tenants WHERE nombre = 'Gard' LIMIT 1
      `);

      let tenantId: string;
      if (tenantResult.rows.length === 0) {
        // Crear tenant 'Gard' si no existe
        const newTenant = await client.query(`
          INSERT INTO tenants (nombre, activo) VALUES ('Gard', true) RETURNING id
        `);
        tenantId = newTenant.rows[0].id;
        devLogger.success(' Tenant "Gard" creado con ID:', tenantId);
      } else {
        tenantId = tenantResult.rows[0].id;
        devLogger.success(' Tenant "Gard" encontrado con ID:', tenantId);
      }

      // 2. AGREGAR TENANT_ID A TIPOS_DOCUMENTOS
      logger.debug('2️⃣ Agregando tenant_id a tipos_documentos...');
      
      const tiposColumnCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'tipos_documentos' 
          AND column_name = 'tenant_id'
        )
      `);

      if (!tiposColumnCheck.rows[0].exists) {
        await client.query(`
          ALTER TABLE tipos_documentos ADD COLUMN tenant_id UUID REFERENCES tenants(id)
        `);
        logger.debug('✅ Columna tenant_id agregada a tipos_documentos');
        
        // Actualizar registros existentes
        await client.query(`
          UPDATE tipos_documentos SET tenant_id = $1 WHERE tenant_id IS NULL
        `, [tenantId]);
        logger.debug('✅ Registros existentes actualizados con tenant_id');
      } else {
        logger.debug('ℹ️ Columna tenant_id ya existe en tipos_documentos');
      }

      // 3. AGREGAR TENANT_ID A DOCUMENTOS
      logger.debug('3️⃣ Agregando tenant_id a documentos...');
      
      const docsColumnCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'documentos' 
          AND column_name = 'tenant_id'
        )
      `);

      if (!docsColumnCheck.rows[0].exists) {
        await client.query(`
          ALTER TABLE documentos ADD COLUMN tenant_id UUID REFERENCES tenants(id)
        `);
        logger.debug('✅ Columna tenant_id agregada a documentos');
        
        // Actualizar registros existentes
        await client.query(`
          UPDATE documentos SET tenant_id = $1 WHERE tenant_id IS NULL
        `, [tenantId]);
        logger.debug('✅ Registros existentes actualizados con tenant_id');
      } else {
        logger.debug('ℹ️ Columna tenant_id ya existe en documentos');
      }

      // 4. AGREGAR TENANT_ID A ALERTAS_DOCUMENTOS
      logger.debug('4️⃣ Agregando tenant_id a alertas_documentos...');
      
      const alertasColumnCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'alertas_documentos' 
          AND column_name = 'tenant_id'
        )
      `);

      if (!alertasColumnCheck.rows[0].exists) {
        await client.query(`
          ALTER TABLE alertas_documentos ADD COLUMN tenant_id UUID REFERENCES tenants(id)
        `);
        logger.debug('✅ Columna tenant_id agregada a alertas_documentos');
        
        // Actualizar registros existentes
        await client.query(`
          UPDATE alertas_documentos SET tenant_id = $1 WHERE tenant_id IS NULL
        `, [tenantId]);
        logger.debug('✅ Registros existentes actualizados con tenant_id');
      } else {
        logger.debug('ℹ️ Columna tenant_id ya existe en alertas_documentos');
      }

      // 5. RENOMBRAR TIPOS_DOCUMENTOS A DOCUMENTOS_TIPOS
      logger.debug('5️⃣ Renombrando tipos_documentos a documentos_tipos...');
      
      const tiposTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'tipos_documentos'
        )
      `);

      if (tiposTableCheck.rows[0].exists) {
        await client.query(`
          ALTER TABLE tipos_documentos RENAME TO documentos_tipos
        `);
        logger.debug('✅ Tabla tipos_documentos renombrada a documentos_tipos');
        
        // Renombrar índices si existen
        try {
          await client.query(`
            ALTER INDEX IF EXISTS idx_tipos_documentos_modulo RENAME TO idx_documentos_tipos_modulo
          `);
          await client.query(`
            ALTER INDEX IF EXISTS idx_tipos_documentos_activo RENAME TO idx_documentos_tipos_activo
          `);
          logger.debug('✅ Índices renombrados');
        } catch (error) {
          console.log('ℹ️ No se pudieron renombrar algunos índices (puede que no existan)');
        }
      } else {
        logger.debug('ℹ️ Tabla tipos_documentos no existe, puede que ya haya sido renombrada');
      }

      // 6. CREAR ÍNDICES PARA TENANT_ID
      logger.debug('6️⃣ Creando índices para tenant_id...');
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_documentos_tenant_id ON documentos(tenant_id)
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_documentos_tipos_tenant_id ON documentos_tipos(tenant_id)
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_alertas_documentos_tenant_id ON alertas_documentos(tenant_id)
      `);
      
      logger.debug('✅ Índices de tenant_id creados');

      // 7. VERIFICAR ESTRUCTURA FINAL
      logger.debug('7️⃣ Verificando estructura final...');
      
      const finalStructure = await client.query(`
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable
        FROM information_schema.columns 
        WHERE table_name IN ('documentos', 'documentos_tipos', 'alertas_documentos')
        AND column_name = 'tenant_id'
        ORDER BY table_name, ordinal_position
      `);

      logger.debug('📋 Columnas tenant_id encontradas:');
      finalStructure.rows.forEach((col: any) => {
        console.log(`  - ${col.table_name}.${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });

      // 8. ESTADÍSTICAS FINALES
      const stats = await client.query(`
        SELECT 
          'documentos' as tabla,
          COUNT(*) as total_registros,
          COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as con_tenant_id
        FROM documentos
        
        UNION ALL
        
        SELECT 
          'documentos_tipos' as tabla,
          COUNT(*) as total_registros,
          COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as con_tenant_id
        FROM documentos_tipos
        
        UNION ALL
        
        SELECT 
          'alertas_documentos' as tabla,
          COUNT(*) as total_registros,
          COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as con_tenant_id
        FROM alertas_documentos
      `);

      logger.debug('🎯 Migración completada exitosamente');
      logger.debug('📊 Estadísticas finales:');
      stats.rows.forEach((stat: any) => {
        logger.debug(`   - ${stat.tabla}: ${stat.con_tenant_id}/${stat.total_registros} registros con tenant_id`);
      });

      return NextResponse.json({
        success: true,
        message: "Migración a multitenant completada exitosamente",
        tenant_id: tenantId,
        estadisticas: stats.rows
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Error en migración multitenant:', error);
    return NextResponse.json({ 
      error: "Error durante la migración",
      detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
