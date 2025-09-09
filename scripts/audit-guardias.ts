#!/usr/bin/env tsx

/* eslint-disable no-console */
import dotenv from 'dotenv';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Crear pool de conexión después de cargar las variables de entorno
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function query(text: string, params?: any[]): Promise<any> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function main() {
  // Debug: mostrar la URL de la base de datos (sin credenciales)
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const urlParts = dbUrl.split('@');
    if (urlParts.length > 1) {
      console.log(`🔗 Conectando a: ...@${urlParts[1]}`);
    }
  } else {
    console.log('❌ DATABASE_URL no encontrada');
    process.exit(1);
  }
  console.log('🔍  AUDITORÍA DE GUARDIAS\n');

  try {
    /* --- 1. Verificar estructura de tabla primero ------------------------- */
    console.log('🏗️  ESTRUCTURA DE TABLA');
    const columnsResult = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas encontradas en tabla guardias:');
    columnsResult.rows.forEach((row: any) => {
      console.log(`   • ${row.column_name} (${row.data_type}, ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    /* --- 2. Métricas base -------------------------------------------------- */
    console.log('\n📊  MÉTRICAS BASE');
    
    // Verificar si existen las columnas necesarias
    const hasLatLng = columnsResult.rows.some((row: any) => 
      row.column_name === 'latitud' || row.column_name === 'longitud'
    );
    const hasInstalacion = columnsResult.rows.some((row: any) => 
      row.column_name === 'instalacion_id'
    );
    
    let statsQuery = 'SELECT COUNT(*) AS total';
    if (hasLatLng) {
      statsQuery += ', SUM((latitud IS NULL OR longitud IS NULL)::int) AS sin_coords';
    }
    if (hasInstalacion) {
      statsQuery += ', SUM((instalacion_id IS NULL)::int) AS sin_instal';
      statsQuery += ', COUNT(DISTINCT instalacion_id) AS instalaciones_distintas';
    }
    statsQuery += ' FROM guardias';
    
    const statsResult = await query(statsQuery);
    const stats = statsResult.rows[0];
    console.table(stats);

    /* --- 2. Duplicados de RUT --------------------------------------------- */
    const hasRut = columnsResult.rows.some((row: any) => row.column_name === 'rut');
    
    let dupsResult: any = { rows: [] };
    if (hasRut) {
      console.log('\n🔍  DUPLICADOS DE RUT');
      dupsResult = await query(`
        SELECT rut, COUNT(*) as cantidad 
        FROM guardias 
        GROUP BY rut 
        HAVING COUNT(*) > 1 
        ORDER BY cantidad DESC 
        LIMIT 5
      `);
      
      if (dupsResult.rows.length > 0) {
        console.log('⚠️  Duplicados de RUT detectados:');
        console.table(dupsResult.rows);
      } else {
        console.log('✅  Sin duplicados de RUT');
      }
    } else {
      console.log('\n🔍  DUPLICADOS DE RUT');
      console.log('⚠️  No se puede verificar - columna rut no existe');
    }

    /* --- 3. FK órfanas ----------------------------------------------------- */
    let orphans = 0;
    if (hasInstalacion) {
      console.log('\n🔗  INTEGRIDAD DE CLAVES FORÁNEAS');
      const orphansResult = await query(`
        SELECT COUNT(*) as count 
        FROM guardias g
        LEFT JOIN instalaciones i ON i.id = g.instalacion_id
        WHERE g.instalacion_id IS NOT NULL AND i.id IS NULL
      `);
      orphans = parseInt(orphansResult.rows[0].count);
      
      console.log(orphans > 0
        ? `❌  ${orphans} guardias con instalación inexistente`
        : '✅  Todas las instalaciones referenciadas existen');
    } else {
      console.log('\n🔗  INTEGRIDAD DE CLAVES FORÁNEAS');
      console.log('⚠️  No se puede verificar - columna instalacion_id no existe');
    }

    /* --- 4. Índice espacial ----------------------------------------------- */
    let idxResult: any = { rows: [] };
    if (hasLatLng) {
      console.log('\n🗺️  ÍNDICES ESPACIALES');
      idxResult = await query(`
        SELECT indexname, indexdef 
        FROM pg_indexes
        WHERE tablename = 'guardias' 
        AND (indexdef ILIKE '%latitud%' OR indexdef ILIKE '%longitud%')
      `);
      
      if (idxResult.rows.length > 0) {
        console.log('✅  Índices de ubicación presentes:');
        idxResult.rows.forEach((idx: any) => {
          console.log(`   • ${idx.indexname}`);
        });
      } else {
        console.log('⚠️  Sin índices específicos en latitud/longitud');
      }
    } else {
      console.log('\n🗺️  ÍNDICES ESPACIALES');
      console.log('⚠️  No se puede verificar - columnas latitud/longitud no existen');
    }

    /* --- 5. Verificar columnas críticas --------------------------------- */
    console.log('\n🔍  COLUMNAS CRÍTICAS');
    const expectedColumns = ['latitud', 'longitud', 'instalacion_id', 'rut', 'email'];
    const foundColumns = columnsResult.rows.map((row: any) => row.column_name);
    
    expectedColumns.forEach(col => {
      const found = foundColumns.includes(col);
      console.log(found ? `✅  ${col}` : `❌  ${col} - FALTA`);
    });

    /* --- 6. Auditoría Frontend -------------------------------------------- */
    console.log('\n🖼️  AUDITORÍA FRONTEND');
    
    // Verificar página de guardias
    const pagePath = path.join(process.cwd(), 'src/app/guardias/page.tsx');
    const pageExists = fs.existsSync(pagePath);
    console.log(pageExists ? '✅  Página /guardias presente' : '❌  Falta ruta /guardias');

    // Verificar componente GuardDetailModal
    const modalPath = path.join(process.cwd(), 'src/components/GuardDetailModal.tsx');
    const modalExists = fs.existsSync(modalPath);
    console.log(modalExists ? '✅  GuardDetailModal.tsx existe' : '❌  Falta GuardDetailModal.tsx');

    // Verificar API de guardias
    const apiPath = path.join(process.cwd(), 'src/app/api/guardias/route.ts');
    const apiExists = fs.existsSync(apiPath);
    console.log(apiExists ? '✅  API /api/guardias presente' : '❌  Falta API /api/guardias');

    /* --- 7. Resumen y recomendaciones ------------------------------------- */
    console.log('\n📋  ACCIONES RECOMENDADAS');
    
    const todo = [];
    
    // Verificar columnas faltantes
    if (!hasLatLng) {
      todo.push('• Agregar columnas latitud y longitud a la tabla guardias');
    } else if (stats.sin_coords > 0) {
      todo.push(`• Completar latitud/longitud en ${stats.sin_coords} guardias`);
    }
    
    if (!hasInstalacion) {
      todo.push('• Agregar columna instalacion_id a la tabla guardias');
    }
    
    if (!hasRut) {
      todo.push('• Agregar columna rut a la tabla guardias');
    }
    
    // Verificar índices
    if (hasLatLng && idxResult && idxResult.rows.length === 0) {
      todo.push('• Crear índice espacial en latitud/longitud para búsquedas rápidas');
    }
    
    // Verificar FK órfanas
    if (hasInstalacion && orphans > 0) {
      todo.push('• Corregir instalaciones órfanas en guardias');
    }
    
    // Verificar frontend
    if (!modalExists) {
      todo.push('• Crear componente GuardDetailModal.tsx');
    }
    
    if (!apiExists) {
      todo.push('• Crear API endpoint /api/guardias');
    }

    if (hasRut && dupsResult && dupsResult.rows.length > 0) {
      todo.push('• Resolver duplicados de RUT en guardias');
    }

    if (todo.length > 0) {
      console.log('⚠️  Problemas detectados:');
      todo.forEach(item => console.log(`   ${item}`));
    } else {
      console.log('✅  Todo OK. Puede avanzar con optimización de asignaciones 🤝');
    }

    /* --- 8. Estadísticas adicionales -------------------------------------- */
    console.log('\n📈  ESTADÍSTICAS ADICIONALES');
    
    // Verificar qué columnas existen para estadísticas
    const hasEstado = columnsResult.rows.some((row: any) => row.column_name === 'estado');
    const hasTipoContrato = columnsResult.rows.some((row: any) => row.column_name === 'tipo_contrato');
    const hasSueldoBase = columnsResult.rows.some((row: any) => row.column_name === 'sueldo_base');
    const hasActivo = columnsResult.rows.some((row: any) => row.column_name === 'activo');
    
    let additionalStatsQuery = 'SELECT';
    if (hasEstado) {
      additionalStatsQuery += ' COUNT(CASE WHEN estado = \'Activo\' THEN 1 END) as activos,';
      additionalStatsQuery += ' COUNT(CASE WHEN estado = \'Inactivo\' THEN 1 END) as inactivos,';
    } else if (hasActivo) {
      additionalStatsQuery += ' COUNT(CASE WHEN activo = true THEN 1 END) as activos,';
      additionalStatsQuery += ' COUNT(CASE WHEN activo = false THEN 1 END) as inactivos,';
    } else {
      additionalStatsQuery += ' 0 as activos, 0 as inactivos,';
    }
    
    if (hasTipoContrato) {
      additionalStatsQuery += ' COUNT(CASE WHEN tipo_contrato = \'Indefinido\' THEN 1 END) as indefinidos,';
      additionalStatsQuery += ' COUNT(CASE WHEN tipo_contrato = \'Plazo Fijo\' THEN 1 END) as plazo_fijo,';
      additionalStatsQuery += ' COUNT(CASE WHEN tipo_contrato = \'Por Obra\' THEN 1 END) as por_obra,';
    } else {
      additionalStatsQuery += ' 0 as indefinidos, 0 as plazo_fijo, 0 as por_obra,';
    }
    
    if (hasSueldoBase) {
      additionalStatsQuery += ' AVG(sueldo_base) as sueldo_promedio';
    } else {
      additionalStatsQuery += ' 0 as sueldo_promedio';
    }
    
    additionalStatsQuery += ' FROM guardias';
    
    const additionalStats = await query(additionalStatsQuery);
    const additional = additionalStats.rows[0];
    
    const statsTable: any = {};
    if (hasEstado || hasActivo) {
      statsTable['Guardias Activos'] = additional.activos;
      statsTable['Guardias Inactivos'] = additional.inactivos;
    }
    if (hasTipoContrato) {
      statsTable['Contratos Indefinidos'] = additional.indefinidos;
      statsTable['Contratos Plazo Fijo'] = additional.plazo_fijo;
      statsTable['Contratos Por Obra'] = additional.por_obra;
    }
    if (hasSueldoBase) {
      statsTable['Sueldo Promedio'] = `$${Math.round(additional.sueldo_promedio || 0).toLocaleString()}`;
    }
    
    console.table(statsTable);

  } catch (error) {
    console.error('❌ Error durante la auditoría:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }

  console.log('\n🏁 Auditoría completada – revise el resumen anterior');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
}); 