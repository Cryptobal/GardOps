import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Verificando estructura de tablas de documentos...');

    const client = await pool.connect();
    
    try {
      // 1. Verificar si existe la tabla tenants
      const tenantsCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'tenants'
        )
      `);

      const tenantsExist = tenantsCheck.rows[0].exists;
      console.log('📋 Tabla tenants existe:', tenantsExist);

      // 2. Verificar estructura de la tabla documentos
      const documentosStructure = await client.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'documentos' 
        ORDER BY ordinal_position
      `);

      console.log('📋 Estructura de tabla documentos:');
      documentosStructure.rows.forEach((col: any) => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
      });

      // 3. Verificar estructura de la tabla documentos_tipos
      const tiposStructure = await client.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'documentos_tipos' 
        ORDER BY ordinal_position
      `);

      console.log('📋 Estructura de tabla documentos_tipos:');
      tiposStructure.rows.forEach((col: any) => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
      });

      // 4. Verificar si existe la tabla alertas_documentos
      const alertasCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'alertas_documentos'
        )
      `);

      const alertasExist = alertasCheck.rows[0].exists;
      console.log('📋 Tabla alertas_documentos existe:', alertasExist);

      let alertasStructure: any = null;
      if (alertasExist) {
        alertasStructure = await client.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = 'alertas_documentos' 
          ORDER BY ordinal_position
        `);

        console.log('📋 Estructura de tabla alertas_documentos:');
        alertasStructure.rows.forEach((col: any) => {
          console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
        });
      }

      // 5. Verificar si las columnas tenant_id existen
      const documentosTenantCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'documentos' 
          AND column_name = 'tenant_id'
        )
      `);

      const tiposTenantCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'documentos_tipos' 
          AND column_name = 'tenant_id'
        )
      `);

      const alertasTenantCheck = alertasExist ? await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'alertas_documentos' 
          AND column_name = 'tenant_id'
        )
      `) : { rows: [{ exists: false }] };

      // 6. Obtener tenant_id si existe
      let tenantId = null;
      if (tenantsExist) {
        const tenantResult = await client.query(`
          SELECT id, nombre FROM tenants WHERE nombre = 'Gard' LIMIT 1
        `);
        if (tenantResult.rows.length > 0) {
          tenantId = tenantResult.rows[0].id;
        }
      }

      // 7. Contar registros por tabla
      const documentosCount = await client.query(`
        SELECT COUNT(*) as total FROM documentos
      `);

      const tiposCount = await client.query(`
        SELECT COUNT(*) as total FROM documentos_tipos
      `);

      const alertasCount = alertasExist ? await client.query(`
        SELECT COUNT(*) as total FROM alertas_documentos
      `) : { rows: [{ total: 0 }] };

      // 8. Verificar registros con tenant_id
      const documentosConTenant = documentosTenantCheck.rows[0].exists ? await client.query(`
        SELECT COUNT(*) as total FROM documentos WHERE tenant_id IS NOT NULL
      `) : { rows: [{ total: 0 }] };

      const tiposConTenant = tiposTenantCheck.rows[0].exists ? await client.query(`
        SELECT COUNT(*) as total FROM documentos_tipos WHERE tenant_id IS NOT NULL
      `) : { rows: [{ total: 0 }] };

      const alertasConTenant = (alertasExist && alertasTenantCheck.rows[0].exists) ? await client.query(`
        SELECT COUNT(*) as total FROM alertas_documentos WHERE tenant_id IS NOT NULL
      `) : { rows: [{ total: 0 }] };

      const resultado = {
        success: true,
        message: "Estructura de tablas verificada",
        tenant: {
          existe: tenantsExist,
          id: tenantId,
          nombre: tenantId ? 'Gard' : null
        },
        tablas: {
          documentos: {
            existe: true,
            tiene_tenant_id: documentosTenantCheck.rows[0].exists,
            total_registros: parseInt(documentosCount.rows[0].total),
            registros_con_tenant: parseInt(documentosConTenant.rows[0].total),
            estructura: documentosStructure.rows
          },
          documentos_tipos: {
            existe: true,
            tiene_tenant_id: tiposTenantCheck.rows[0].exists,
            total_registros: parseInt(tiposCount.rows[0].total),
            registros_con_tenant: parseInt(tiposConTenant.rows[0].total),
            estructura: tiposStructure.rows
          },
                  alertas_documentos: {
          existe: alertasExist,
          tiene_tenant_id: alertasTenantCheck.rows[0].exists,
          total_registros: parseInt(alertasCount.rows[0].total),
          registros_con_tenant: parseInt(alertasConTenant.rows[0].total),
          estructura: alertasExist ? (alertasStructure ? alertasStructure.rows : []) : []
        }
        },
        resumen: {
          todas_tienen_tenant_id: documentosTenantCheck.rows[0].exists && 
                                   tiposTenantCheck.rows[0].exists && 
                                   (!alertasExist || alertasTenantCheck.rows[0].exists),
          estado: documentosTenantCheck.rows[0].exists && 
                  tiposTenantCheck.rows[0].exists && 
                  (!alertasExist || alertasTenantCheck.rows[0].exists) 
                  ? '✅ COMPLETAMENTE MULTITENANT' 
                  : '⚠️ PARCIALMENTE MULTITENANT'
        }
      };

      console.log('🎯 Verificación completada');
      console.log('📊 Resumen:', resultado.resumen);

      return NextResponse.json(resultado);

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Error verificando estructura:', error);
    return NextResponse.json({ 
      error: "Error durante la verificación",
      detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
