import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';
import { readFileSync } from 'fs';
import { join } from 'path';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    logger.debug('🚀 Iniciando migración de documentos_tipos y multi-tenant...');

    // Leer el script SQL
    const scriptPath = join(process.cwd(), 'scripts', 'migrate-documentos-tipos-multi-tenant.sql');
    const sqlScript = readFileSync(scriptPath, 'utf8');

    logger.debug('📋 Ejecutando script de migración...');
    
    // Ejecutar el script SQL completo
    await query(sqlScript);

    // 10. Verificación final
    logger.debug('📋 Verificando resultados...');
    
    const verificationQueries = [
      // Verificar que la tabla documentos_tipos existe
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'documentos_tipos'
      ) as tabla_existe`,
      
      // Verificar que todas las tablas tienen tenant_id
      `SELECT 
        table_name,
        COUNT(*) as tiene_tenant_id
      FROM information_schema.columns 
      WHERE table_name IN ('documentos_tipos', 'documentos', 'documentos_clientes', 'documentos_instalacion', 'documentos_guardias')
      AND column_name = 'tenant_id'
      GROUP BY table_name`,
      
      // Contar registros en cada tabla
      `SELECT 
        'documentos_tipos' as tabla,
        COUNT(*) as registros
      FROM documentos_tipos
      UNION ALL
      SELECT 
        'documentos' as tabla,
        COUNT(*) as registros
      FROM documentos
      UNION ALL
      SELECT 
        'documentos_clientes' as tabla,
        COUNT(*) as registros
      FROM documentos_clientes
      UNION ALL
      SELECT 
        'documentos_instalacion' as tabla,
        COUNT(*) as registros
      FROM documentos_instalacion
      UNION ALL
      SELECT 
        'documentos_guardias' as tabla,
        COUNT(*) as registros
      FROM documentos_guardias`
    ];

    const verificationResults = [];
    for (const queryStr of verificationQueries) {
      const result = await query(queryStr);
      verificationResults.push(result.rows);
    }

    logger.debug('✅ Migración completada exitosamente');
    logger.debug('📊 Resultados de verificación:', verificationResults);

    return NextResponse.json({
      success: true,
      message: 'Migración completada exitosamente',
      verification: {
        tabla_existe: verificationResults[0][0]?.tabla_existe,
        tablas_con_tenant: verificationResults[1],
        conteo_registros: verificationResults[2]
      }
    });

  } catch (error) {
    console.error('❌ Error en migración:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error en la migración',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
