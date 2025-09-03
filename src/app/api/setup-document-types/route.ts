import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";

export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Configurando tipos de documentos predefinidos para guardias...');

    const client = await pool.connect();
    
    try {
      // 1. Obtener tenant_id del usuario actual (por ahora usar 'Gard')
      const tenantResult = await client.query(`
        SELECT id FROM tenants WHERE nombre = 'Gard' LIMIT 1
      `);
      
      if (tenantResult.rows.length === 0) {
        throw new Error('Tenant "Gard" no encontrado');
      }
      
      const tenantId = tenantResult.rows[0].id;
      console.log('✅ Tenant ID obtenido:', tenantId);

      // 2. Desactivar tipos existentes para guardias
      await client.query(`
        UPDATE documentos_tipos 
        SET activo = false 
        WHERE modulo = 'guardias' AND tenant_id = $1
      `, [tenantId]);
      console.log('✅ Tipos existentes desactivados');

      // 2. Insertar/actualizar tipos de documentos para guardias con nombres predefinidos
      const tiposDocumentos = [
        // Documentos de identidad (sin vencimiento)
        { nombre: 'Carnet Identidad Frontal', requiere_vencimiento: false, dias_antes_alarma: 0 },
        { nombre: 'Carnet Identidad Reverso', requiere_vencimiento: false, dias_antes_alarma: 0 },
        
        // Certificados de salud y antecedentes (con vencimiento)
        { nombre: 'Certificado OS10', requiere_vencimiento: true, dias_antes_alarma: 30 },
        { nombre: 'Certificado Antecedentes', requiere_vencimiento: true, dias_antes_alarma: 30 },
        
        // Certificados de estudios (sin vencimiento)
        { nombre: 'Certificado Enseñanza Media', requiere_vencimiento: false, dias_antes_alarma: 0 },
        
        // Certificados previsionales (sin vencimiento)
        { nombre: 'Certificado AFP', requiere_vencimiento: false, dias_antes_alarma: 0 },
        { nombre: 'Certificado AFC', requiere_vencimiento: false, dias_antes_alarma: 0 },
        { nombre: 'Certificado FONASA/ISAPRE', requiere_vencimiento: false, dias_antes_alarma: 0 },
        
        // Documentos laborales (sin vencimiento)
        { nombre: 'Contrato de Trabajo', requiere_vencimiento: false, dias_antes_alarma: 0 },
        { nombre: 'Finiquito', requiere_vencimiento: false, dias_antes_alarma: 0 },
        
        // Otros documentos importantes
        { nombre: 'Certificado Residencia', requiere_vencimiento: false, dias_antes_alarma: 0 },
        { nombre: 'Licencia de Conducir', requiere_vencimiento: true, dias_antes_alarma: 60 },
        { nombre: 'Certificado de Capacitación', requiere_vencimiento: true, dias_antes_alarma: 365 },
        { nombre: 'Certificado de Primeros Auxilios', requiere_vencimiento: true, dias_antes_alarma: 730 },
        { nombre: 'Certificado de Manejo de Extintores', requiere_vencimiento: true, dias_antes_alarma: 730 },
        { nombre: 'Certificado de Seguridad Ocupacional', requiere_vencimiento: true, dias_antes_alarma: 365 },
        
        // Documento genérico para otros casos
        { nombre: 'Otro Documento', requiere_vencimiento: false, dias_antes_alarma: 0 }
      ];

      for (const tipo of tiposDocumentos) {
        await client.query(`
          INSERT INTO documentos_tipos (id, modulo, nombre, requiere_vencimiento, dias_antes_alarma, activo, creado_en, tenant_id)
          VALUES (gen_random_uuid(), 'guardias', $1, $2, $3, true, NOW(), $4)
          ON CONFLICT (modulo, nombre, tenant_id) 
          DO UPDATE SET 
              requiere_vencimiento = EXCLUDED.requiere_vencimiento,
              dias_antes_alarma = EXCLUDED.dias_antes_alarma,
              activo = EXCLUDED.activo,
              updated_at = NOW()
        `, [tipo.nombre, tipo.requiere_vencimiento, tipo.dias_antes_alarma, tenantId]);
      }

      console.log(`✅ ${tiposDocumentos.length} tipos de documentos configurados`);

      // 3. Verificar que se crearon correctamente
      const tiposCreados = await client.query(`
        SELECT 
          id, 
          nombre, 
          modulo, 
          requiere_vencimiento, 
          dias_antes_alarma, 
          activo
        FROM documentos_tipos 
        WHERE modulo = 'guardias' AND activo = true AND tenant_id = $1
        ORDER BY nombre
      `, [tenantId]);

      // 4. Estadísticas finales
      const stats = await client.query(`
        SELECT 
          COUNT(*) as total_tipos,
          COUNT(CASE WHEN requiere_vencimiento THEN 1 END) as con_vencimiento,
          COUNT(CASE WHEN NOT requiere_vencimiento THEN 1 END) as sin_vencimiento
        FROM documentos_tipos 
        WHERE modulo = 'guardias' AND activo = true AND tenant_id = $1
      `, [tenantId]);

      const statsData = stats.rows[0];

      console.log('🎯 Configuración completada exitosamente');
      console.log(`📊 Estadísticas:`);
      console.log(`   - Total tipos: ${statsData.total_tipos}`);
      console.log(`   - Con vencimiento: ${statsData.con_vencimiento}`);
      console.log(`   - Sin vencimiento: ${statsData.sin_vencimiento}`);

      return NextResponse.json({
        success: true,
        message: "Tipos de documentos configurados exitosamente",
        estadisticas: {
          total_tipos: statsData.total_tipos,
          con_vencimiento: statsData.con_vencimiento,
          sin_vencimiento: statsData.sin_vencimiento
        },
        tipos_creados: tiposCreados.rows
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Error configurando tipos de documentos:', error);
    return NextResponse.json({ 
      error: "Error interno durante la configuración",
      detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// Endpoint GET para verificar la configuración actual
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Verificando configuración de tipos de documentos para guardias...');

    const client = await pool.connect();
    
    try {
      // Obtener tenant_id del usuario actual (por ahora usar 'Gard')
      const tenantResult = await client.query(`
        SELECT id FROM tenants WHERE nombre = 'Gard' LIMIT 1
      `);
      
      if (tenantResult.rows.length === 0) {
        throw new Error('Tenant "Gard" no encontrado');
      }
      
      const tenantId = tenantResult.rows[0].id;

      const tiposGuardias = await client.query(`
        SELECT 
          id, 
          nombre, 
          requiere_vencimiento, 
          dias_antes_alarma, 
          activo,
          created_at,
          updated_at
        FROM documentos_tipos 
        WHERE modulo = 'guardias' AND tenant_id = $1
        ORDER BY 
          CASE 
            WHEN nombre LIKE '%Carnet%' THEN 1
            WHEN nombre LIKE '%OS10%' THEN 2
            WHEN nombre LIKE '%Antecedentes%' THEN 3
            WHEN nombre LIKE '%Enseñanza%' THEN 4
            WHEN nombre LIKE '%AFP%' THEN 5
            WHEN nombre LIKE '%AFC%' THEN 6
            WHEN nombre LIKE '%FONASA%' THEN 7
            WHEN nombre LIKE '%Contrato%' THEN 8
            WHEN nombre LIKE '%Finiquito%' THEN 9
            WHEN nombre LIKE '%Residencia%' THEN 10
            WHEN nombre LIKE '%Licencia%' THEN 11
            WHEN nombre LIKE '%Capacitación%' THEN 12
            WHEN nombre LIKE '%Primeros Auxilios%' THEN 13
            WHEN nombre LIKE '%Extintores%' THEN 14
            WHEN nombre LIKE '%Seguridad Ocupacional%' THEN 15
            ELSE 99
          END,
          nombre
      `, [tenantId]);

      const stats = await client.query(`
        SELECT 
          COUNT(*) as total_tipos,
          COUNT(CASE WHEN activo = true THEN 1 END) as activos,
          COUNT(CASE WHEN activo = false THEN 1 END) as inactivos,
          COUNT(CASE WHEN requiere_vencimiento THEN 1 END) as con_vencimiento,
          COUNT(CASE WHEN NOT requiere_vencimiento THEN 1 END) as sin_vencimiento
        FROM documentos_tipos 
        WHERE modulo = 'guardias' AND tenant_id = $1
      `, [tenantId]);

      const statsData = stats.rows[0];

      return NextResponse.json({
        success: true,
        estado: "Verificación completada",
        estadisticas: {
          total_tipos: statsData.total_tipos,
          activos: statsData.activos,
          inactivos: statsData.inactivos,
          con_vencimiento: statsData.con_vencimiento,
          sin_vencimiento: statsData.sin_vencimiento
        },
        tipos_documentos: tiposGuardias.rows
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Error verificando configuración:', error);
    return NextResponse.json({ 
      error: "Error interno durante la verificación",
      detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
