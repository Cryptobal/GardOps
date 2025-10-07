import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tipos_documentos } = body;

    // Si se envían tipos_documentos desde el frontend, actualizar los existentes
    if (tipos_documentos && Array.isArray(tipos_documentos)) {
      logger.debug('🔄 Actualizando configuración de documentos desde frontend...');
      
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
        devLogger.success(' Tenant ID obtenido:', tenantId);

        // Obtener todos los documentos existentes para este tenant
        const documentosExistentes = await client.query(`
          SELECT id FROM documentos_tipos WHERE modulo = 'guardias' AND tenant_id = $1
        `, [tenantId]);

        const idsExistentes = new Set(documentosExistentes.rows.map(row => row.id));
        const idsEnviados = new Set(tipos_documentos.filter(t => t.id && !t.id.startsWith('nuevo-')).map(t => t.id));

        // Eliminar documentos que ya no están en el array enviado
        const idsAEliminar = Array.from(idsExistentes).filter(id => !idsEnviados.has(id));
        if (idsAEliminar.length > 0) {
          await client.query(`
            DELETE FROM documentos_tipos 
            WHERE id = ANY($1) AND tenant_id = $2
          `, [idsAEliminar, tenantId]);
          logger.debug(`🗑️ ${idsAEliminar.length} documentos eliminados`);
        }

        // Actualizar cada tipo de documento existente
        let actualizados = 0;
        for (const tipo of tipos_documentos) {
          if (tipo.id && !tipo.id.startsWith('nuevo-')) {
            await client.query(`
              UPDATE documentos_tipos 
              SET 
                requiere_vencimiento = $1,
                dias_antes_alarma = $2,
                activo = $3
              WHERE id = $4 AND tenant_id = $5
            `, [tipo.requiere_vencimiento, tipo.dias_antes_alarma, tipo.activo, tipo.id, tenantId]);
            actualizados++;
          }
        }

        logger.debug(`✅ ${actualizados} tipos de documentos actualizados, ${idsAEliminar.length} eliminados`);

        return NextResponse.json({
          success: true,
          message: "Configuración de documentos actualizada exitosamente"
        });

      } finally {
        client.release();
      }
    }

    // Si no se envían tipos_documentos, crear la configuración inicial
    logger.debug('🔧 Configurando tipos de documentos predefinidos para guardias...');

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
      devLogger.success(' Tenant ID obtenido:', tenantId);

      // 2. Verificar si ya existen tipos de documentos para este tenant
      const tiposExistentes = await client.query(`
        SELECT COUNT(*) as total FROM documentos_tipos WHERE modulo = 'guardias' AND tenant_id = $1
      `, [tenantId]);

      if (parseInt(tiposExistentes.rows[0].total) > 0) {
        logger.debug('⚠️ Ya existen tipos de documentos para este tenant');
        return NextResponse.json({
          success: true,
          message: "Los tipos de documentos ya están configurados",
          warning: "No se crearon nuevos registros porque ya existen"
        });
      }

      // 3. Insertar tipos de documentos predefinidos
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
        `, [tipo.nombre, tipo.requiere_vencimiento, tipo.dias_antes_alarma, tenantId]);
      }

      logger.debug(`✅ ${tiposDocumentos.length} tipos de documentos configurados`);

      // 4. Verificar que se crearon correctamente
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

      // 5. Estadísticas finales
      const stats = await client.query(`
        SELECT 
          COUNT(*) as total_tipos,
          COUNT(CASE WHEN requiere_vencimiento THEN 1 END) as con_vencimiento,
          COUNT(CASE WHEN NOT requiere_vencimiento THEN 1 END) as sin_vencimiento
        FROM documentos_tipos 
        WHERE modulo = 'guardias' AND activo = true AND tenant_id = $1
      `, [tenantId]);

      const statsData = stats.rows[0];

      logger.debug('🎯 Configuración completada exitosamente');
      logger.debug(`📊 Estadísticas:`);
      logger.debug(`   - Total tipos: ${statsData.total_tipos}`);
      logger.debug(`   - Con vencimiento: ${statsData.con_vencimiento}`);
      logger.debug(`   - Sin vencimiento: ${statsData.sin_vencimiento}`);

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
    logger.debug('🔍 Verificando configuración de tipos de documentos para guardias...');

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
          creado_en
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
