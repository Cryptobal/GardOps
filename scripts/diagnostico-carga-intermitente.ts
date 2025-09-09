import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Crear pool de conexión
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  maxUses: 7500,
});

async function query(text: string, params?: any[]): Promise<any> {
  const client = await pool.connect();
  try {
    const startTime = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - startTime;
    
    if (duration > 500) {
      console.log(`🐌 Query lento (${duration}ms): ${text.substring(0, 100)}...`);
    }
    
    return result;
  } finally {
    client.release();
  }
}

async function diagnosticarProblema() {
  console.log('🔍 Iniciando diagnóstico de carga intermitente...\n');

  try {
    // 1. Verificar conexión a la base de datos
    console.log('1️⃣ Verificando conexión a la base de datos...');
    const connectionTest = await query('SELECT 1 as test');
    console.log('✅ Conexión exitosa\n');

    // 2. Verificar estado de las tablas principales
    console.log('2️⃣ Verificando estado de tablas principales...');
    const tables = ['clientes', 'instalaciones', 'guardias'];
    
    for (const table of tables) {
      try {
        const countResult = await query(`SELECT COUNT(*) FROM ${table}`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`   📊 ${table}: ${count} registros`);
      } catch (error) {
        console.log(`   ❌ ${table}: Error - ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }
    console.log('');

    // 3. Verificar queries complejas que podrían estar causando problemas
    console.log('3️⃣ Probando queries complejas...');
    
    // Query de instalaciones con estadísticas (la que está fallando)
    console.log('   🔍 Probando query de instalaciones con estadísticas...');
    try {
      const startTime = Date.now();
      const instalacionesQuery = `
        SELECT 
          i.id,
          i.nombre,
          i.cliente_id,
          i.direccion,
          i.latitud,
          i.longitud,
          i.ciudad,
          i.comuna,
          i.valor_turno_extra,
          i.estado,
          i.created_at,
          i.updated_at,
          COALESCE(c.nombre, 'Cliente no encontrado') as cliente_nombre,
          COALESCE(stats.puestos_creados, 0) as puestos_creados,
          COALESCE(stats.puestos_asignados, 0) as puestos_asignados,
          COALESCE(stats.ppc_pendientes, 0) as ppc_pendientes,
          COALESCE(stats.ppc_totales, 0) as ppc_totales,
          COALESCE(stats.puestos_disponibles, 0) as puestos_disponibles
        FROM instalaciones i
        LEFT JOIN clientes c ON i.cliente_id = c.id
        LEFT JOIN (
          SELECT 
            tr.instalacion_id,
            SUM(tr.cantidad_guardias) as puestos_creados,
            COALESCE(asignaciones.total_asignados, 0) as puestos_asignados,
            SUM(tr.cantidad_guardias) - COALESCE(asignaciones.total_asignados, 0) as ppc_pendientes,
            SUM(tr.cantidad_guardias) as ppc_totales,
            SUM(tr.cantidad_guardias) - COALESCE(asignaciones.total_asignados, 0) as puestos_disponibles
          FROM as_turnos_requisitos tr
          LEFT JOIN (
            SELECT 
              tr2.instalacion_id,
              COUNT(ta.id) as total_asignados
            FROM as_turnos_asignaciones ta
            INNER JOIN as_turnos_requisitos tr2 ON ta.requisito_puesto_id = tr2.id
            WHERE ta.estado = 'Activa'
            GROUP BY tr2.instalacion_id
          ) asignaciones ON asignaciones.instalacion_id = tr.instalacion_id
          GROUP BY tr.instalacion_id, asignaciones.total_asignados
        ) stats ON stats.instalacion_id = i.id
        ORDER BY i.nombre
        LIMIT 5
      `;
      
      const result = await query(instalacionesQuery);
      const duration = Date.now() - startTime;
      console.log(`   ✅ Query exitosa en ${duration}ms - ${result.rows.length} resultados`);
    } catch (error) {
      console.log(`   ❌ Query falló: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    // 4. Verificar tablas relacionadas que podrían estar causando problemas
    console.log('\n4️⃣ Verificando tablas relacionadas...');
    const relatedTables = ['as_turnos_requisitos', 'as_turnos_asignaciones', 'as_turnos_roles_servicio'];
    
    for (const table of relatedTables) {
      try {
        const countResult = await query(`SELECT COUNT(*) FROM ${table}`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`   📊 ${table}: ${count} registros`);
      } catch (error) {
        console.log(`   ❌ ${table}: Error - ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    // 5. Verificar configuración del pool de conexiones
    console.log('\n5️⃣ Verificando configuración del pool...');
    console.log(`   📊 Conexiones activas: ${pool.totalCount}`);
    console.log(`   📊 Conexiones inactivas: ${pool.idleCount}`);
    console.log(`   📊 Conexiones en espera: ${pool.waitingCount}`);

    // 6. Simular múltiples requests simultáneos
    console.log('\n6️⃣ Simulando requests simultáneos...');
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        query('SELECT COUNT(*) FROM instalaciones').catch(error => ({
          error: error instanceof Error ? error.message : 'Error desconocido'
        }))
      );
    }
    
    const results = await Promise.all(promises);
    const successCount = results.filter(r => !r.error).length;
    const errorCount = results.filter(r => r.error).length;
    
    console.log(`   📊 Requests exitosos: ${successCount}/5`);
    console.log(`   📊 Requests fallidos: ${errorCount}/5`);
    
    if (errorCount > 0) {
      console.log('   ⚠️  Se detectaron errores en requests simultáneos');
    }

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  } finally {
    await pool.end();
    console.log('\n🏁 Diagnóstico completado');
  }
}

diagnosticarProblema(); 