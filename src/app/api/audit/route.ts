import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

export async function GET() {
  try {
    console.log('🔍 API: Iniciando auditoría de base de datos...');
    
    const auditResult = {
      success: false,
      foreignKeys: [],
      tables: {},
      indexes: [],
      constraints: [],
      tableCounts: [],
      errors: []
    };

    try {
      // 1. Consulta de relaciones y claves foráneas
      const foreignKeys = await query(`
        SELECT
          tc.table_name AS tabla_origen,
          kcu.column_name AS columna_origen,
          ccu.table_name AS tabla_referenciada,
          ccu.column_name AS columna_referenciada
        FROM 
          information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tabla_origen;
      `);
      auditResult.foreignKeys = foreignKeys.rows;

      // 2. Listado de todas las tablas y columnas
      const tablesAndColumns = await query(`
        SELECT 
          table_name, 
          column_name, 
          data_type, 
          is_nullable, 
          column_default
        FROM 
          information_schema.columns
        WHERE 
          table_schema = 'public'
        ORDER BY table_name, ordinal_position;
      `);

      // Agrupar por tabla
      const tablesByName = {};
      tablesAndColumns.rows.forEach((row: any) => {
        if (!tablesByName[row.table_name]) {
          tablesByName[row.table_name] = [];
        }
        tablesByName[row.table_name].push({
          columna: row.column_name,
          tipo: row.data_type,
          nulo: row.is_nullable,
          default: row.column_default
        });
      });
      auditResult.tables = tablesByName;

      // 3. Información de índices
      const indexes = await query(`
        SELECT 
          tablename,
          indexname,
          indexdef
        FROM 
          pg_indexes
        WHERE 
          schemaname = 'public'
        ORDER BY tablename, indexname;
      `);
      auditResult.indexes = indexes.rows;

      // 4. Información de constraints
      const constraints = await query(`
        SELECT 
          tc.table_name,
          tc.constraint_name,
          tc.constraint_type
        FROM 
          information_schema.table_constraints tc
        WHERE 
          tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_type;
      `);
      auditResult.constraints = constraints.rows;

      // 5. Conteo de registros por tabla
      const tableNames = Array.from(new Set(tablesAndColumns.rows.map((row: any) => row.table_name)));
      const tableCounts = [];
      
      for (const tableName of tableNames) {
        try {
          const countResult = await query(`SELECT COUNT(*) FROM ${tableName}`);
          tableCounts.push({
            tabla: tableName,
            registros: parseInt(countResult.rows[0].count)
          });
        } catch (error) {
          tableCounts.push({
            tabla: tableName,
            registros: -1,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }
      auditResult.tableCounts = tableCounts;

      auditResult.success = true;
      console.log('🔍 API: Auditoría completada exitosamente');

      return NextResponse.json(auditResult, { status: 200 });

    } catch (dbError) {
      auditResult.errors.push(dbError instanceof Error ? dbError.message : 'Error de base de datos');
      console.error('🔍 API: Error de base de datos:', dbError);
      
      return NextResponse.json(auditResult, { status: 500 });
    }

  } catch (error) {
    console.error('🔍 API: Error interno:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}