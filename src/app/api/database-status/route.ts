import { NextResponse } from 'next/server';
import { query, checkTableExists, getColumnType, hasData } from '../../../lib/database';

export async function GET() {
  try {
    const tableNames = ['tenants', 'instalaciones', 'roles_servicio', 'guardias', 'pautas_mensuales'];
    const tables = [];

    for (const tableName of tableNames) {
      const exists = await checkTableExists(tableName);
      let idType = 'no existe';
      let rowCount = 0;

      if (exists) {
        const typeResult = await getColumnType(tableName, 'id');
        idType = typeResult || 'unknown';
        
        try {
          const countResult = await query(`SELECT COUNT(*) FROM ${tableName}`);
          rowCount = parseInt(countResult.rows[0].count);
        } catch (error) {
          rowCount = -1; // Error al contar
        }
      }

      tables.push({
        name: tableName,
        exists,
        idType,
        rowCount
      });
    }

    return NextResponse.json({
      success: true,
      tables
    });

  } catch (error) {
    console.error('Error consultando estado de base de datos:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 