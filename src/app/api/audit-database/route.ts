import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

interface TableInfo {
  table_name: string;
  row_count: number;
  size_mb: number;
}

interface ForeignKey {
  constraint_name: string;
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string;
  character_maximum_length: number;
}

interface IndexInfo {
  table_name: string;
  index_name: string;
  column_name: string;
  is_unique: boolean;
}

export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'audit_database', action: 'read:list' });
if (deny) return deny;

  try {
    const client = await pool.connect();
    
    // 1. Lista de tablas con número de registros
    console.log('📊 Analizando tablas y registros...');
    const tablesQuery = await client.query(`
      SELECT 
        table_schema,
        table_name,
        pg_size_pretty(pg_total_relation_size(table_schema||'.'||table_name)) as size
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    // Obtener conteo real para cada tabla
    const tables: TableInfo[] = [];
    for (const table of tablesQuery.rows) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
        tables.push({
          table_name: table.table_name,
          row_count: parseInt(countResult.rows[0].count),
          size_mb: parseFloat(table.size?.replace(/[^\d.]/g, '') || '0')
        });
      } catch (err) {
        console.error(`Error contando registros en ${table.table_name}:`, err);
        tables.push({
          table_name: table.table_name,
          row_count: -1,
          size_mb: 0
        });
      }
    }

    // 2. Relaciones entre tablas (Foreign Keys)
    console.log('🔗 Analizando relaciones (Foreign Keys)...');
    const foreignKeysResult = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name;
    `);
    const foreignKeys: ForeignKey[] = foreignKeysResult.rows;

    // 3. Información detallada de columnas
    console.log('📋 Analizando estructura de columnas...');
    const columnsResult = await client.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        ordinal_position
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);
    const columns: ColumnInfo[] = columnsResult.rows;

    // 4. Índices existentes
    console.log('🔍 Analizando índices...');
    const indexesResult = await client.query(`
      SELECT 
        t.relname AS table_name,
        i.relname AS index_name,
        a.attname AS column_name,
        ix.indisunique AS is_unique,
        ix.indisprimary AS is_primary,
        pg_get_indexdef(ix.indexrelid) AS index_definition
      FROM 
        pg_class t,
        pg_class i,
        pg_index ix,
        pg_attribute a,
        pg_namespace n
      WHERE 
        t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND a.attrelid = t.oid
        AND a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
        AND n.oid = t.relnamespace
        AND n.nspname = 'public'
      ORDER BY t.relname, i.relname;
    `);
    const indexes: IndexInfo[] = indexesResult.rows;

    // 5. Constraints y validaciones
    console.log('⚡ Analizando constraints...');
    const constraintsResult = await client.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        cc.check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
        AND tc.table_schema = cc.constraint_schema
      WHERE tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
    `);

    client.release();

    // ANÁLISIS Y DETECCIÓN DE PROBLEMAS

    // Detectar columnas duplicadas/redundantes
    const duplicateColumns = detectDuplicateColumns(columns);
    
    // Detectar problemas de naming
    const namingIssues = detectNamingIssues(columns, tables);
    
    // Detectar columnas importantes sin índice
    const missingIndexes = detectMissingIndexes(columns, indexes);
    
    // Detectar inconsistencias en campos de auditoría
    const auditFieldIssues = detectAuditFieldIssues(columns);
    
    // Tablas vacías o en desuso
    const emptyTables = tables.filter(t => t.row_count === 0);
    
    // Preparar respuesta
    const auditReport = {
      timestamp: new Date().toISOString(),
      database_info: {
        total_tables: tables.length,
        total_foreign_keys: foreignKeys.length,
        total_indexes: indexes.length
      },
      tables_summary: tables.sort((a, b) => b.row_count - a.row_count),
      foreign_keys: foreignKeys,
      duplicate_columns: duplicateColumns,
      naming_issues: namingIssues,
      missing_indexes: missingIndexes,
      audit_field_issues: auditFieldIssues,
      empty_tables: emptyTables,
      all_columns: columns,
      all_indexes: indexes,
      constraints: constraintsResult.rows
    };

    return NextResponse.json({
      success: true,
      audit_report: auditReport
    });

  } catch (error) {
    console.error('❌ Error en auditoría de base de datos:', error);
    return NextResponse.json({
      success: false,
      error: 'Error realizando auditoría de base de datos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// Funciones auxiliares para detección de problemas

function detectDuplicateColumns(columns: ColumnInfo[]) {
  const issues = [];
  
  // Buscar patrones de duplicación comunes
  const duplicatePatterns = [
    ['password', 'password_hash'],
    ['rol', 'rol_id', 'role', 'role_id'],
    ['usuario', 'usuario_id', 'user', 'user_id'],
    ['cliente', 'cliente_id', 'client', 'client_id'],
    ['fecha', 'date', 'timestamp'],
    ['activo', 'active', 'enabled', 'status']
  ];

  const tableColumns = groupBy(columns, 'table_name');
  
  for (const [tableName, tableCols] of Object.entries(tableColumns)) {
    const columnNames = tableCols.map(c => c.column_name.toLowerCase());
    
    for (const pattern of duplicatePatterns) {
      const found = pattern.filter(p => columnNames.includes(p));
      if (found.length > 1) {
        issues.push({
          table: tableName,
          duplicate_columns: found,
          type: 'potential_duplicate'
        });
      }
    }
  }
  
  return issues;
}

function detectNamingIssues(columns: ColumnInfo[], tables: TableInfo[]) {
  const issues = [];
  
  // Verificar consistencia de naming en tablas
  const tableNames = tables.map(t => t.table_name);
  const hasSnakeCase = tableNames.some(name => name.includes('_'));
  const hasCamelCase = tableNames.some(name => /[a-z][A-Z]/.test(name));
  
  if (hasSnakeCase && hasCamelCase) {
    issues.push({
      type: 'table_naming_inconsistency',
      message: 'Mezcla de snake_case y camelCase en nombres de tablas',
      tables: tableNames
    });
  }
  
  // Verificar consistencia en columnas
  const columnsByTable = groupBy(columns, 'table_name');
  
  for (const [tableName, tableCols] of Object.entries(columnsByTable)) {
    const columnNames = tableCols.map(c => c.column_name);
    const hasSnake = columnNames.some(name => name.includes('_'));
    const hasCamel = columnNames.some(name => /[a-z][A-Z]/.test(name));
    
    if (hasSnake && hasCamel) {
      issues.push({
        type: 'column_naming_inconsistency',
        table: tableName,
        message: 'Mezcla de snake_case y camelCase en columnas',
        columns: columnNames
      });
    }
    
    // Detectar mezcla de idiomas
    const spanishWords = ['usuario', 'cliente', 'fecha', 'activo', 'nombre', 'descripcion'];
    const englishWords = ['user', 'client', 'date', 'active', 'name', 'description'];
    
    const hasSpanish = columnNames.some(name => 
      spanishWords.some(word => name.toLowerCase().includes(word))
    );
    const hasEnglish = columnNames.some(name => 
      englishWords.some(word => name.toLowerCase().includes(word))
    );
    
    if (hasSpanish && hasEnglish) {
      issues.push({
        type: 'language_inconsistency',
        table: tableName,
        message: 'Mezcla de español e inglés en nombres de columnas',
        columns: columnNames
      });
    }
  }
  
  return issues;
}

function detectMissingIndexes(columns: ColumnInfo[], indexes: IndexInfo[]) {
  const issues = [];
  const indexedColumns = new Set(indexes.map(i => `${i.table_name}.${i.column_name}`));
  
  // Buscar columnas que probablemente necesiten índices
  const importantPatterns = [
    'tenant_id', 'user_id', 'usuario_id', 'cliente_id', 'client_id',
    'fecha', 'date', 'created_at', 'updated_at',
    'status', 'estado', 'activo', 'active',
    'email', 'telefono', 'phone'
  ];
  
  for (const column of columns) {
    const fullColumnName = `${column.table_name}.${column.column_name}`;
    const columnName = column.column_name.toLowerCase();
    
    // Verificar si es una columna importante sin índice
    if (importantPatterns.some(pattern => columnName.includes(pattern)) &&
        !indexedColumns.has(fullColumnName)) {
      issues.push({
        table: column.table_name,
        column: column.column_name,
        reason: 'Columna importante sin índice',
        data_type: column.data_type
      });
    }
    
    // Verificar columnas de fecha/timestamp sin índice
    if ((column.data_type.includes('timestamp') || column.data_type.includes('date')) &&
        !indexedColumns.has(fullColumnName)) {
      issues.push({
        table: column.table_name,
        column: column.column_name,
        reason: 'Columna de fecha/timestamp sin índice',
        data_type: column.data_type
      });
    }
  }
  
  return issues;
}

function detectAuditFieldIssues(columns: ColumnInfo[]) {
  const issues = [];
  const tableColumns = groupBy(columns, 'table_name');
  
  const auditFields = {
    created_at: ['created_at', 'fecha_creacion', 'creado_en'],
    updated_at: ['updated_at', 'fecha_actualizacion', 'actualizado_en'],
    created_by: ['created_by', 'creado_por', 'usuario_creacion'],
    updated_by: ['updated_by', 'actualizado_por', 'usuario_actualizacion']
  };
  
  for (const [tableName, tableCols] of Object.entries(tableColumns)) {
    const columnNames = tableCols.map(c => c.column_name.toLowerCase());
    const auditFieldsFound: Record<string, string[]> = {
      created_at: [],
      updated_at: [],
      created_by: [],
      updated_by: []
    };
    
    for (const [fieldType, variants] of Object.entries(auditFields)) {
      const found = variants.filter(variant => columnNames.includes(variant));
      auditFieldsFound[fieldType] = found;
    }
    
    // Verificar inconsistencias
    if (auditFieldsFound.created_at.length > 1) {
      issues.push({
        table: tableName,
        type: 'multiple_created_at_fields',
        fields: auditFieldsFound.created_at
      });
    }
    
    if (auditFieldsFound.updated_at.length > 1) {
      issues.push({
        table: tableName,
        type: 'multiple_updated_at_fields',
        fields: auditFieldsFound.updated_at
      });
    }
    
    // Verificar si tiene created_at pero no updated_at (o viceversa)
    if (auditFieldsFound.created_at.length > 0 && auditFieldsFound.updated_at.length === 0) {
      issues.push({
        table: tableName,
        type: 'missing_updated_at',
        message: 'Tiene created_at pero no updated_at'
      });
    }
    
    if (auditFieldsFound.updated_at.length > 0 && auditFieldsFound.created_at.length === 0) {
      issues.push({
        table: tableName,
        type: 'missing_created_at',
        message: 'Tiene updated_at pero no created_at'
      });
    }
  }
  
  return issues;
}

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    groups[groupKey] = groups[groupKey] || [];
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
} 