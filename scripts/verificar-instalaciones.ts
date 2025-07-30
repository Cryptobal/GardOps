#!/usr/bin/env ts-node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

async function verificarInstalaciones(): Promise<void> {
  console.log('🔍 Verificando instalaciones existentes en la base de datos...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  try {
    const result = await pool.query('SELECT id, nombre FROM instalaciones ORDER BY nombre');
    
    console.log('\n📋 Instalaciones existentes en la base de datos:');
    console.log('ID | Nombre');
    console.log('---|-------');
    
    result.rows.forEach(row => {
      console.log(`${row.id.substring(0,8)}... | ${row.nombre}`);
    });
    
    console.log(`\nTotal: ${result.rows.length} instalaciones\n`);
    
    // Leer las instalaciones del CSV
    console.log('📄 Instalaciones mencionadas en el CSV:');
    const csvContent = fs.readFileSync('BBDD GGSS.csv', 'utf-8');
    const lines = csvContent.split('\n');
    
    // La columna de instalaciones está en el índice 11
    const instalacionIndex = 11;
    
    console.log(`Columna de instalaciones en índice: ${instalacionIndex}`);
    
    const instalacionesCSV = new Set<string>();
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim()) {
        const columns = line.split(';');
        if (columns[instalacionIndex]) {
          const instalacion = columns[instalacionIndex].trim().replace(/"/g, '');
          if (instalacion && instalacion !== '') {
            instalacionesCSV.add(instalacion);
          }
        }
      }
    }
    
    console.log('Instalaciones únicas del CSV:');
    Array.from(instalacionesCSV).sort().forEach((instalacion, index) => {
      console.log(`${index + 1}. ${instalacion}`);
    });
    
    console.log(`\nTotal: ${instalacionesCSV.size} instalaciones únicas en el CSV\n`);
    
    // Comparar instalaciones
    console.log('🔍 Comparando instalaciones:');
    const instalacionesDB = result.rows.map(row => row.nombre.toLowerCase());
    const instalacionesCSVArray = Array.from(instalacionesCSV).map(inst => inst.toLowerCase());
    
    console.log('\n✅ Instalaciones que coinciden:');
    instalacionesCSVArray.forEach(instalacionCSV => {
      const coincidencia = instalacionesDB.find(instalacionDB => 
        instalacionDB.includes(instalacionCSV) || instalacionCSV.includes(instalacionDB)
      );
      if (coincidencia) {
        console.log(`  ✓ "${instalacionCSV}" → "${coincidencia}"`);
      }
    });
    
    console.log('\n❌ Instalaciones del CSV que NO coinciden:');
    instalacionesCSVArray.forEach(instalacionCSV => {
      const coincidencia = instalacionesDB.find(instalacionDB => 
        instalacionDB.includes(instalacionCSV) || instalacionCSV.includes(instalacionDB)
      );
      if (!coincidencia) {
        console.log(`  ✗ "${instalacionCSV}"`);
      }
    });
      
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

verificarInstalaciones(); 