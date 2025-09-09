import { query } from '../src/lib/database';

async function auditRBACTables() {
  console.log('🔍 AUDITORÍA DE TABLAS RBAC');
  console.log('='*50);
  
  try {
    // 1. Verificar qué tablas RBAC existen en ambos esquemas
    const checkTablesQuery = `
      SELECT 
        table_schema,
        table_name,
        CASE 
          WHEN table_name IN ('usuarios', 'roles', 'permisos', 'usuarios_roles', 'roles_permisos') THEN 'ESPERADA'
          WHEN table_name LIKE 'rbac_%' THEN 'RBAC_PREFIJO'
          ELSE 'OTRA'
        END as tipo
      FROM information_schema.tables
      WHERE table_schema IN ('public', 'as_turnos')
        AND (
          table_name IN ('usuarios', 'roles', 'permisos', 'usuarios_roles', 'roles_permisos')
          OR table_name LIKE 'rbac_%'
        )
      ORDER BY table_schema, table_name;
    `;
    
    console.log('\n📊 TABLAS RBAC ENCONTRADAS:');
    const tables = await query(checkTablesQuery);
    const tableRows = Array.isArray(tables) ? tables : (tables.rows || []);
    
    if (tableRows.length === 0) {
      console.log('❌ No se encontraron tablas RBAC');
    } else {
      tableRows.forEach((row: any) => {
        console.log(`  ${row.table_schema}.${row.table_name} (${row.tipo})`);
      });
    }
    
    // 2. Verificar estructura de la tabla usuarios si existe
    const checkUsuariosQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema IN ('public', 'as_turnos')
        AND table_name = 'usuarios'
      ORDER BY ordinal_position;
    `;
    
    console.log('\n📋 ESTRUCTURA DE TABLA USUARIOS:');
    const usuariosCols = await query(checkUsuariosQuery);
    const usuariosRows = Array.isArray(usuariosCols) ? usuariosCols : (usuariosCols.rows || []);
    
    if (usuariosRows.length > 0) {
      console.log('  Columnas encontradas:');
      usuariosRows.forEach((col: any) => {
        console.log(`    - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    } else {
      console.log('  ❌ Tabla usuarios no encontrada');
    }
    
    // 3. Verificar las tablas con prefijo rbac_
    const checkRBACPrefixQuery = `
      SELECT 
        t.table_name,
        array_agg(c.column_name ORDER BY c.ordinal_position) as columns
      FROM information_schema.tables t
      JOIN information_schema.columns c 
        ON c.table_schema = t.table_schema 
        AND c.table_name = t.table_name
      WHERE t.table_schema = 'public'
        AND t.table_name LIKE 'rbac_%'
      GROUP BY t.table_name
      ORDER BY t.table_name;
    `;
    
    console.log('\n📦 TABLAS CON PREFIJO rbac_:');
    const rbacTables = await query(checkRBACPrefixQuery);
    const rbacRows = Array.isArray(rbacTables) ? rbacTables : (rbacTables.rows || []);
    
    if (rbacRows.length > 0) {
      rbacRows.forEach((table: any) => {
        console.log(`  ${table.table_name}:`);
        console.log(`    Columnas: ${Array.isArray(table.columns) ? table.columns.join(', ') : table.columns}`);
      });
    } else {
      console.log('  ❌ No se encontraron tablas con prefijo rbac_');
    }
    
    // 4. Verificar constraints y foreign keys
    const checkConstraintsQuery = `
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public'
        AND (tc.table_name LIKE 'rbac_%' OR tc.table_name IN ('usuarios', 'roles', 'permisos'))
      ORDER BY tc.table_name, tc.constraint_type;
    `;
    
    console.log('\n🔐 CONSTRAINTS Y FOREIGN KEYS:');
    const constraints = await query(checkConstraintsQuery);
    const constraintRows = Array.isArray(constraints) ? constraints : (constraints.rows || []);
    
    if (constraintRows.length > 0) {
      let currentTable = '';
      constraintRows.forEach((con: any) => {
        if (con.table_name !== currentTable) {
          currentTable = con.table_name;
          console.log(`\n  ${con.table_name}:`);
        }
        if (con.constraint_type === 'FOREIGN KEY') {
          console.log(`    FK: ${con.column_name} → ${con.foreign_table_name}.${con.foreign_column_name}`);
        } else {
          console.log(`    ${con.constraint_type}: ${con.constraint_name} (${con.column_name})`);
        }
      });
    }
    
    // 5. Verificar índices
    const checkIndexesQuery = `
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND (tablename LIKE 'rbac_%' OR tablename IN ('usuarios', 'roles', 'permisos'))
      ORDER BY tablename, indexname;
    `;
    
    console.log('\n📑 ÍNDICES:');
    const indexes = await query(checkIndexesQuery);
    const indexRows = Array.isArray(indexes) ? indexes : (indexes.rows || []);
    
    if (indexRows.length > 0) {
      let currentTable = '';
      indexRows.forEach((idx: any) => {
        if (idx.tablename !== currentTable) {
          currentTable = idx.tablename;
          console.log(`\n  ${idx.tablename}:`);
        }
        console.log(`    ${idx.indexname}`);
      });
    }
    
    // 6. Resumen y recomendaciones
    console.log('\n' + '='*50);
    console.log('📝 RESUMEN:');
    
    const hasRBACPrefix = rbacRows.length > 0;
    const hasStandardNames = tableRows.some((t: any) => t.tipo === 'ESPERADA');
    
    if (hasRBACPrefix && !hasStandardNames) {
      console.log('✅ Ya existen tablas RBAC con prefijo rbac_');
      console.log('   Recomendación: Usar las tablas existentes o crear alias/vistas');
    } else if (!hasRBACPrefix && !hasStandardNames) {
      console.log('⚠️ No se encontraron tablas RBAC');
      console.log('   Recomendación: Crear las tablas desde cero');
    } else if (hasRBACPrefix && hasStandardNames) {
      console.log('⚠️ Existen ambos conjuntos de tablas');
      console.log('   Recomendación: Consolidar en un solo esquema');
    }
    
  } catch (error) {
    console.error('❌ Error en auditoría:', error);
  }
}

// Ejecutar auditoría
auditRBACTables().catch(console.error);
