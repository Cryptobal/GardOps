import { NextResponse } from 'next/server';
import { query } from '../../../lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET() {
  try {
    logger.debug('🔧 Iniciando migración de tabla clientes...');

    // Verificar que la tabla existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clientes'
      );
    `);

    if (!tableExists.rows[0].exists) {
      return NextResponse.json({
        success: false,
        message: 'La tabla clientes no existe'
      });
    }

    // Contar registros antes de la migración
    const countBefore = await query('SELECT COUNT(*) as total FROM clientes;');
    logger.debug(`📊 Registros existentes: ${countBefore.rows[0].total}`);

    // Agregar columnas faltantes una por una (si no existen)
    const columnsToAdd = [
      { name: 'email', type: 'TEXT', description: 'Email de contacto' },
      { name: 'telefono', type: 'TEXT', description: 'Teléfono de contacto' },
      { name: 'direccion', type: 'TEXT', description: 'Dirección física' },
      { name: 'latitud', type: 'FLOAT', description: 'Coordenada latitud' },
      { name: 'longitud', type: 'FLOAT', description: 'Coordenada longitud' }
    ];

    let addedColumns = 0;
    for (const column of columnsToAdd) {
      try {
        // Verificar si la columna ya existe
        const columnExists = await query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'clientes'
            AND column_name = $1
          );
        `, [column.name]);

        if (!columnExists.rows[0].exists) {
          await query(`ALTER TABLE clientes ADD COLUMN ${column.name} ${column.type};`);
          addedColumns++;
          console.log(`✅ Columna agregada: ${column.name} (${column.type}) - ${column.description}`);
        } else {
          logger.debug(`ℹ️ Columna ${column.name} ya existe`);
        }
      } catch (columnError) {
        console.error(`❌ Error agregando columna ${column.name}:`, columnError);
      }
    }

    // Actualizar la función para mapear datos existentes si es necesario
    if (addedColumns > 0) {
      try {
        // Opcional: mapear representante_legal a email si está vacío
        await query(`
          UPDATE clientes 
          SET email = LOWER(REPLACE(representante_legal, ' ', '.')) || '@empresa.cl'
          WHERE email IS NULL 
          AND representante_legal IS NOT NULL 
          AND representante_legal != '';
        `);
        logger.debug('📧 Emails generados a partir de representante_legal');
      } catch (emailError) {
        logger.debug('ℹ️ No se pudieron generar emails automáticamente');
      }
    }

    // Contar registros después de la migración
    const countAfter = await query('SELECT COUNT(*) as total FROM clientes;');

    // Obtener estructura actualizada
    const columns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'clientes'
      ORDER BY ordinal_position;
    `);

    const response = {
      success: true,
      message: 'Migración de clientes completada',
      details: {
        recordsBefore: parseInt(countBefore.rows[0].total),
        recordsAfter: parseInt(countAfter.rows[0].total),
        columnsAdded: addedColumns,
        totalColumns: columns.rows.length,
        preservedData: true
      },
      newStructure: columns.rows.map((col: any) => ({
        name: col.column_name,
        type: col.data_type
      }))
    };

    logger.debug('\n🎉 MIGRACIÓN DE CLIENTES COMPLETADA');
    logger.debug(`📊 Registros preservados: ${countAfter.rows[0].total}`);
    logger.debug(`📋 Columnas agregadas: ${addedColumns}`);
    logger.debug('✅ Ahora el módulo de Clientes debería funcionar correctamente');

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error en migración de clientes:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error en migración de clientes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 