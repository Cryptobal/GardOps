import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import fs from 'fs';
import path from 'path';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
/**
 * Ejecuta las migraciones de las tablas de sueldos
 */
export async function POST(request: NextRequest) {
  try {
    logger.debug('🚀 Iniciando migración de tablas de sueldos...');
    
    // Leer el archivo SQL
    const sqlFilePath = path.join(process.cwd(), 'db', 'create-sueldo-tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Dividir el contenido en statements individuales
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    const resultados = [];
    let exitosos = 0;
    let errores = 0;
    
    // Ejecutar cada statement
    for (const statement of statements) {
      try {
        // Agregar punto y coma al final si no lo tiene
        const finalStatement = statement.endsWith(';') ? statement : statement + ';';
        
        console.log(`Ejecutando: ${finalStatement.substring(0, 50)}...`);
        await query(finalStatement);
        
        exitosos++;
        resultados.push({
          statement: finalStatement.substring(0, 100),
          status: 'success'
        });
      } catch (error: any) {
        errores++;
        console.error(`Error en statement:`, error.message);
        resultados.push({
          statement: statement.substring(0, 100),
          status: 'error',
          error: error.message
        });
      }
    }
    
    logger.debug(`✅ Migración completada: ${exitosos} exitosos, ${errores} errores`);
    
    return NextResponse.json({
      success: true,
      message: 'Migración de tablas de sueldos completada',
      resumen: {
        totalStatements: statements.length,
        exitosos,
        errores
      },
      detalles: resultados
    });
    
  } catch (error: any) {
    console.error('❌ Error en migración:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error al ejecutar migración'
      },
      { status: 500 }
    );
  }
}

/**
 * Verifica el estado de las tablas de sueldos
 */
export async function GET(request: NextRequest) {
  try {
    const tablas = [
      'sueldo_afp',
      'sueldo_isapre',
      'sueldo_mutualidad',
      'sueldo_parametros_generales',
      'sueldo_tramos_impuesto',
      'sueldo_valor_uf',
      'sueldo_historial_calculos'
    ];
    
    const estado = [];
    
    for (const tabla of tablas) {
      try {
        const result = await query(`
          SELECT COUNT(*) as registros
          FROM ${tabla}
        `);
        
        estado.push({
          tabla,
          existe: true,
          registros: Number(result.rows[0].registros)
        });
      } catch (error) {
        estado.push({
          tabla,
          existe: false,
          registros: 0
        });
      }
    }
    
    const todasExisten = estado.every(t => t.existe);
    
    return NextResponse.json({
      success: true,
      tablasCompletas: todasExisten,
      estado,
      mensaje: todasExisten ? 
        'Todas las tablas de sueldos están creadas' : 
        'Faltan algunas tablas de sueldos'
    });
    
  } catch (error: any) {
    logger.error('Error al verificar tablas::', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error al verificar tablas'
      },
      { status: 500 }
    );
  }
}
