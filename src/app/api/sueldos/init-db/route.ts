import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import fs from 'fs';
import path from 'path';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    // Leer el archivo SQL
    const sqlPath = path.join(process.cwd(), 'db', 'init-sueldo-tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Dividir el contenido por punto y coma para ejecutar cada comando
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Ejecutar cada statement
    for (const statement of statements) {
      try {
        await query(statement + ';');
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push(`Error en statement: ${statement.substring(0, 50)}... - ${error instanceof Error ? error.message : 'Error desconocido'}`);
        logger.error('Error ejecutando statement::', error);
      }
    }
    
    return NextResponse.json({
      success: errorCount === 0,
      message: `Inicialización completada. ${successCount} statements ejecutados correctamente, ${errorCount} errores.`,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    logger.error('Error al inicializar base de datos::', error);
    return NextResponse.json(
      {
        error: 'Error al inicializar base de datos',
        detalles: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Verificar el estado de las tablas
    const tables = [
      'sueldo_valor_uf',
      'sueldo_parametros_generales',
      'sueldo_afp',
      'sueldo_isapre',
      'sueldo_mutualidad',
      'sueldo_tramos_impuesto'
    ];
    
    const status: any = {};
    
    for (const table of tables) {
      try {
        const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
        status[table] = {
          exists: true,
          count: parseInt(result.rows[0].count)
        };
      } catch (error) {
        status[table] = {
          exists: false,
          count: 0,
          error: error instanceof Error ? error.message : 'Error desconocido'
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      status
    });
    
  } catch (error) {
    logger.error('Error al verificar estado de base de datos::', error);
    return NextResponse.json(
      {
        error: 'Error al verificar estado de base de datos',
        detalles: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
