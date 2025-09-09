#!/usr/bin/env ts-node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

async function limpiarYCargarGuardias(): Promise<void> {
  console.log('🚀 Limpiando y cargando guardias...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  try {
    // 1. Verificar estado actual
    console.log('\n📊 Estado actual en Neon:');
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN rut IS NULL OR rut = \'\' THEN 1 END) as sin_rut,
        COUNT(CASE WHEN rut IS NOT NULL AND rut != \'\' THEN 1 END) as con_rut
      FROM guardias
    `);
    
    const stats = statsResult.rows[0];
    console.log(`  📊 Total guardias: ${stats.total}`);
    console.log(`  ❌ Sin RUT: ${stats.sin_rut}`);
    console.log(`  ✅ Con RUT: ${stats.con_rut}`);
    
    // 2. Eliminar guardias sin RUT
    if (stats.sin_rut > 0) {
      console.log(`\n🗑️ Eliminando ${stats.sin_rut} guardias sin RUT...`);
      const deleteResult = await pool.query('DELETE FROM guardias WHERE rut IS NULL OR rut = \'\'');
      console.log(`  ✅ Eliminados: ${deleteResult.rowCount} guardias`);
    }
    
    // 3. Obtener RUTs existentes en Neon
    console.log('\n📋 Obteniendo RUTs existentes en Neon...');
    const rutResult = await pool.query('SELECT rut FROM guardias WHERE rut IS NOT NULL AND rut != \'\'');
    const rutsExistentes = new Set(rutResult.rows.map(row => row.rut));
    console.log(`  📊 RUTs existentes: ${rutsExistentes.size}`);
    
    // 4. Leer CSV y encontrar guardias faltantes
    console.log('\n📄 Analizando CSV para encontrar guardias faltantes...');
    const csvContent = fs.readFileSync('BBDD GGSS.csv', 'utf-8');
    const lines = csvContent.split('\n');
    
    const guardiasFaltantes: any[] = [];
    const rutsCSV = new Set<string>();
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim()) {
        const columns = line.split(';');
        
        const rut = columns[2]?.trim().replace(/"/g, '');
        const apellidoPaterno = columns[3]?.trim().replace(/"/g, '');
        const apellidoMaterno = columns[4]?.trim().replace(/"/g, '');
        const nombre = columns[5]?.trim().replace(/"/g, '');
        const email = columns[6]?.trim().replace(/"/g, '');
        const telefono = columns[7]?.trim().replace(/"/g, '');
        const sexo = columns[8]?.trim().replace(/"/g, '');
        const activo = columns[9]?.trim().replace(/"/g, '') === 'TRUE';
        const fechaContrato = columns[10]?.trim().replace(/"/g, '');
        const instalacion = columns[11]?.trim().replace(/"/g, '');
        const jornada = columns[12]?.trim().replace(/"/g, '');
        const banco = columns[13]?.trim().replace(/"/g, '');
        const tipoCuenta = columns[14]?.trim().replace(/"/g, '');
        const numeroCuenta = columns[15]?.trim().replace(/"/g, '');
        const anticipo = columns[16]?.trim().replace(/"/g, '');
        const fechaNacimiento = columns[17]?.trim().replace(/"/g, '');
        const direccion = columns[18]?.trim().replace(/"/g, '');
        const comuna = columns[19]?.trim().replace(/"/g, '');
        const ciudad = columns[20]?.trim().replace(/"/g, '');
        const nacionalidad = columns[21]?.trim().replace(/"/g, '');
        const fechaOS10 = columns[22]?.trim().replace(/"/g, '');
        
        if (rut && rut !== '') {
          rutsCSV.add(rut);
          
          // Verificar si este guardia ya existe en Neon
          if (!rutsExistentes.has(rut)) {
            guardiasFaltantes.push({
              rut,
              apellido_paterno: apellidoPaterno,
              apellido_materno: apellidoMaterno,
              nombre,
              email,
              telefono,
              sexo,
              activo,
              fecha_contrato: fechaContrato,
              instalacion,
              jornada,
              banco,
              tipo_cuenta: tipoCuenta,
              numero_cuenta: numeroCuenta,
              anticipo,
              fecha_nacimiento: fechaNacimiento,
              direccion,
              comuna,
              ciudad,
              nacionalidad,
              fecha_os10: fechaOS10
            });
          }
        }
      }
    }
    
    console.log(`\n📊 Análisis del CSV:`);
    console.log(`  📄 Total RUTs en CSV: ${rutsCSV.size}`);
    console.log(`  ✅ RUTs ya en Neon: ${rutsExistentes.size}`);
    console.log(`  ➕ Guardias faltantes: ${guardiasFaltantes.length}`);
    
    // 5. Cargar guardias faltantes
    if (guardiasFaltantes.length > 0) {
      console.log(`\n🚀 Cargando ${guardiasFaltantes.length} guardias faltantes...`);
      
      let cargados = 0;
      let errores = 0;
      
      for (const guardia of guardiasFaltantes) {
        try {
          const result = await pool.query(`
            INSERT INTO guardias (
              rut, apellido_paterno, apellido_materno, nombre, email, telefono,
              sexo, activo, direccion, comuna, ciudad, nacionalidad, fecha_os10
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, [
            guardia.rut,
            guardia.apellido_paterno,
            guardia.apellido_materno,
            guardia.nombre,
            guardia.email,
            guardia.telefono,
            guardia.sexo,
            guardia.activo,
            guardia.direccion,
            guardia.comuna,
            guardia.ciudad,
            guardia.nacionalidad,
            guardia.fecha_os10
          ]);
          
          cargados++;
          console.log(`  ✓ ${guardia.rut} - ${guardia.nombre} ${guardia.apellido_paterno}`);
        } catch (error) {
          errores++;
          console.log(`  ❌ Error con ${guardia.rut}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }
      
      console.log(`\n📊 Resumen de carga:`);
      console.log(`  ✅ Cargados: ${cargados}`);
      console.log(`  ❌ Errores: ${errores}`);
    }
    
    // 6. Estadísticas finales
    console.log('\n📈 Estadísticas finales:');
    const finalStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN rut IS NULL OR rut = \'\' THEN 1 END) as sin_rut,
        COUNT(CASE WHEN rut IS NOT NULL AND rut != \'\' THEN 1 END) as con_rut
      FROM guardias
    `);
    
    const final = finalStats.rows[0];
    console.log(`  📊 Total guardias: ${final.total}`);
    console.log(`  ❌ Sin RUT: ${final.sin_rut}`);
    console.log(`  ✅ Con RUT: ${final.con_rut}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

limpiarYCargarGuardias(); 