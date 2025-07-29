const { Pool } = require('pg');
const { config } = require('dotenv');
const path = require('path');

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

async function auditDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔍 AUDITORÍA COMPLETA DE BASE DE DATOS EN NEON\n');
    console.log('='.repeat(60));

    // 1. Consulta de relaciones y claves foráneas
    console.log('\n📋 RELACIONES Y CLAVES FORÁNEAS:');
    console.log('-'.repeat(50));
    
    const foreignKeys = await pool.query(`
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

    if (foreignKeys.rows.length === 0) {
      console.log('❌ No se encontraron claves foráneas');
    } else {
      console.table(foreignKeys.rows);
    }

    // 2. Listado de todas las tablas y columnas
    console.log('\n📊 TODAS LAS TABLAS Y COLUMNAS:');
    console.log('-'.repeat(50));
    
    const tablesAndColumns = await pool.query(`
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

    if (tablesAndColumns.rows.length === 0) {
      console.log('❌ No se encontraron tablas en el esquema public');
    } else {
      // Agrupar por tabla para mejor visualización
      const tablesByName = {};
      tablesAndColumns.rows.forEach(row => {
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

      Object.keys(tablesByName).forEach(tableName => {
        console.log(`\n🏷️  TABLA: ${tableName.toUpperCase()}`);
        console.table(tablesByName[tableName]);
      });
    }

    // 3. Información adicional de índices
    console.log('\n🔍 ÍNDICES EXISTENTES:');
    console.log('-'.repeat(50));
    
    const indexes = await pool.query(`
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

    if (indexes.rows.length === 0) {
      console.log('❌ No se encontraron índices personalizados');
    } else {
      console.table(indexes.rows);
    }

    // 4. Información de secuencias/constraints
    console.log('\n⚙️  CONSTRAINTS Y SECUENCIAS:');
    console.log('-'.repeat(50));
    
    const constraints = await pool.query(`
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

    if (constraints.rows.length === 0) {
      console.log('❌ No se encontraron constraints');
    } else {
      console.table(constraints.rows);
    }

    // 5. Conteo de registros por tabla
    console.log('\n📈 CONTEO DE REGISTROS POR TABLA:');
    console.log('-'.repeat(50));
    
    const tableNames = Array.from(new Set(tablesAndColumns.rows.map(row => row.table_name)));
    const tableCounts = [];
    
    for (const tableName of tableNames) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
        tableCounts.push({
          tabla: tableName,
          registros: parseInt(countResult.rows[0].count)
        });
      } catch (error) {
        tableCounts.push({
          tabla: tableName,
          registros: 'Error'
        });
      }
    }
    
    console.table(tableCounts);

    console.log('\n✅ AUDITORÍA COMPLETADA');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error durante la auditoría:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar auditoría
auditDatabase();