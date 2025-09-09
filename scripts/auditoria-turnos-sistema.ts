#!/usr/bin/env tsx

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no está configurada');
  process.exit(1);
}

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

async function ejecutarAuditoria() {
  console.log('🔍 INICIANDO AUDITORÍA DEL SISTEMA DE TURNOS\n');
  
  try {
    // 1) Verificar vistas clave y columnas
    console.log('📊 1) VERIFICANDO VISTAS CLAVE Y COLUMNAS...\n');
    
    const vistasQuery = `
      WITH cols AS (
        SELECT table_schema, table_name, column_name, data_type, ordinal_position
        FROM information_schema.columns
        WHERE table_schema IN ('public','as_turnos')
          AND table_name IN ('as_turnos_v_pauta_diaria_dedup','as_turnos_v_pauta_diaria_v2','as_turnos_v_pauta_diaria','v_turnos_extra','v_turnos_extra_minimal')
      )
      SELECT 'VISTAS_PRESENTES' AS seccion, table_schema, table_name, COUNT(*) AS n_cols
      FROM cols
      GROUP BY 1,2,3
      ORDER BY 2,3;
    `;
    
    const vistas = await query(vistasQuery);
    console.log('✅ Vistas encontradas:');
    vistas.rows.forEach(row => {
      console.log(`   ${row.table_schema}.${row.table_name}: ${row.n_cols} columnas`);
    });
    console.log('');
    
    // Columnas de pauta diaria
    const colsPautaQuery = `
      WITH cols AS (
        SELECT table_schema, table_name, column_name, data_type, ordinal_position
        FROM information_schema.columns
        WHERE table_schema IN ('public','as_turnos')
          AND table_name IN ('as_turnos_v_pauta_diaria_dedup','as_turnos_v_pauta_diaria_v2','as_turnos_v_pauta_diaria','v_turnos_extra','v_turnos_extra_minimal')
      )
      SELECT 'COLS_PAUTA_DIARIA' AS seccion, table_name, ordinal_position, column_name, data_type
      FROM cols
      WHERE table_name IN ('as_turnos_v_pauta_diaria_dedup','as_turnos_v_pauta_diaria_v2','as_turnos_v_pauta_diaria')
      ORDER BY table_name, ordinal_position;
    `;
    
    const colsPauta = await query(colsPautaQuery);
    console.log('📋 Columnas de Pauta Diaria:');
    colsPauta.rows.forEach(row => {
      console.log(`   ${row.table_name}.${row.column_name} (${row.data_type})`);
    });
    console.log('');
    
    // Columnas de turnos extra
    const colsExtraQuery = `
      WITH cols AS (
        SELECT table_schema, table_name, column_name, data_type, ordinal_position
        FROM information_schema.columns
        WHERE table_schema IN ('public','as_turnos')
          AND table_name IN ('as_turnos_v_pauta_diaria_dedup','as_turnos_v_pauta_diaria_v2','as_turnos_v_pauta_diaria','v_turnos_extra','v_turnos_extra_minimal')
      )
      SELECT 'COLS_TURNOS_EXTRA' AS seccion, table_name, ordinal_position, column_name, data_type
      FROM cols
      WHERE table_name IN ('v_turnos_extra','v_turnos_extra_minimal')
      ORDER BY table_name, ordinal_position;
    `;
    
    const colsExtra = await query(colsExtraQuery);
    console.log('📋 Columnas de Turnos Extra:');
    colsExtra.rows.forEach(row => {
      console.log(`   ${row.table_name}.${row.column_name} (${row.data_type})`);
    });
    console.log('');
    
    // 2) Verificar funciones de negocio
    console.log('🔧 2) VERIFICANDO FUNCIONES DE NEGOCIO...\n');
    
    const funcionesQuery = `
      SELECT 'FUNCIONES_ADO' AS seccion,
             n.nspname AS schema, p.proname AS function,
             pg_get_function_identity_arguments(p.oid) AS args,
             pg_get_function_result(p.oid) AS returns
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname IN ('as_turnos','public')
        AND p.proname ILIKE ANY (ARRAY[
          'fn_marcar_asistencia%',
          'fn_registrar_reemplazo%',
          'fn_marcar_extra%'
        ])
      ORDER BY 2,3;
    `;
    
    const funciones = await query(funcionesQuery);
    console.log('✅ Funciones encontradas:');
    funciones.rows.forEach(row => {
      console.log(`   ${row.schema}.${row.function}(${row.args}) -> ${row.returns}`);
    });
    console.log('');
    
    // 3) Verificar consistencia en Pauta Diaria
    console.log('📅 3) VERIFICANDO CONSISTENCIA EN PAUTA DIARIA...\n');
    
    const consistenciaQuery = `
      WITH fechas AS (
        SELECT '2025-08-11' AS f UNION ALL
        SELECT '2025-08-31'
      ),
      d AS (
        SELECT d.* FROM public.as_turnos_v_pauta_diaria_dedup d
        JOIN fechas f ON f.f = d.fecha
      )
      SELECT 'CONSISTENCIA_DIARIA' AS seccion,
             fecha, COUNT(*) AS filas, COUNT(DISTINCT puesto_id) AS puestos,
             COUNT(*) - COUNT(DISTINCT (fecha||'|'||puesto_id)) AS dups
      FROM d
      GROUP BY fecha
      ORDER BY fecha;
    `;
    
    const consistencia = await query(consistenciaQuery);
    console.log('📊 Consistencia de datos:');
    consistencia.rows.forEach(row => {
      console.log(`   ${row.fecha}: ${row.filas} filas, ${row.puestos} puestos, ${row.dups} duplicados`);
    });
    console.log('');
    
    // 4) Verificar logs
    console.log('📝 4) VERIFICANDO LOGS...\n');
    
    const logsQuery = `
      SELECT 'LOGS_PRESENTES' AS seccion, n.nspname AS table_schema, c.relname AS table_name, c.reltuples::bigint AS approx_rows
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public'
        AND c.relkind='r'
        AND c.relname ILIKE 'logs_%'
      ORDER BY approx_rows DESC, c.relname;
    `;
    
    const logs = await query(logsQuery);
    console.log('📋 Tablas de logs:');
    logs.rows.forEach(row => {
      console.log(`   ${row.table_name}: ~${row.approx_rows} filas`);
    });
    console.log('');
    
    // 5) Muestra de Pauta Diaria
    console.log('📊 5) MUESTRA DE PAUTA DIARIA...\n');
    
    const muestraDiariaQuery = `
      SELECT 'SAMPLE_DIARIA' AS seccion,
             fecha, puesto_id, guardia_trabajo_id, es_ppc, estado_ui, meta
      FROM public.as_turnos_v_pauta_diaria_dedup
      ORDER BY fecha DESC, puesto_id
      LIMIT 5;
    `;
    
    const muestraDiaria = await query(muestraDiariaQuery);
    console.log('📋 Muestra de Pauta Diaria:');
    muestraDiaria.rows.forEach(row => {
      console.log(`   ${row.fecha} | Puesto: ${row.puesto_id} | Guardia: ${row.guardia_trabajo_id} | PPC: ${row.es_ppc} | Estado: ${row.estado_ui} | Meta: ${row.meta ? 'Presente' : 'Vacío'}`);
    });
    console.log('');
    
    // 6) Muestra de Turnos Extra
    console.log('📊 6) MUESTRA DE TURNOS EXTRA...\n');
    
    const muestraExtraQuery = `
      SELECT 'SAMPLE_EXTRA' AS seccion,
             fecha, puesto_id, titular_guardia_id, titular_guardia_nombre,
             cobertura_guardia_id, cobertura_guardia_nombre, origen, extra_uid
      FROM as_turnos.v_turnos_extra
      ORDER BY fecha DESC, puesto_id
      LIMIT 5;
    `;
    
    const muestraExtra = await query(muestraExtraQuery);
    console.log('📋 Muestra de Turnos Extra:');
    muestraExtra.rows.forEach(row => {
      console.log(`   ${row.fecha} | Puesto: ${row.puesto_id} | Titular: ${row.titular_guardia_nombre} | Cobertura: ${row.cobertura_guardia_nombre} | Origen: ${row.origen}`);
    });
    console.log('');
    
    console.log('✅ AUDITORÍA COMPLETADA EXITOSAMENTE');
    
  } catch (error) {
    console.error('❌ Error durante la auditoría:', error);
  } finally {
    await pool.end();
  }
}

// Ejecutar auditoría
ejecutarAuditoria().catch(console.error);
