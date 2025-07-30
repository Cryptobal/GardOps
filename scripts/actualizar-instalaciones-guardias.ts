#!/usr/bin/env ts-node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

// Mapeo de instalaciones del CSV a las de la base de datos
const MAPEO_INSTALACIONES: { [key: string]: string } = {
  'Embajada Brasil': 'Embajada Brasil',
  'Transmat': 'Transmat la Negra',
  'Jugabet': 'JugaBet',
  'Coronel': 'Coronel',
  'Quilicura': 'Quilicura',
  'Emecar': 'Emecar',
  'El Bosque': 'El Bosque',
  'Chañaral': 'Chañaral',
  'Lo Barnechea': 'Obra Lo Barnechea',
  'Condominio la Florida': 'Condominio La Florida',
  'Polpaico Mejillones ': 'Mejillones',
  'Pedemonte - Calama': 'Pedemonte',
  'Newtree': 'Newtree',
  'Moova': 'Moova',
  'Metropolitan': 'Metropolitan',
  'Bodega Santa Amalia': 'Santa Amalia',
  'FMT': 'FMT',
  'Placilla': 'Placilla',
  'Caicoma Cerro Navia- Escuela': 'Caicoma',
  'Asfalcura San Felipe': 'Asfalcura',
  'Pine': 'Pine', // Esta no existe en la BD, se creará
  'Gard': 'Gard', // Esta no existe en la BD, se creará
  'Condominio Robinson Crusoe': 'Condominio Crusoe',
  'Tattersall Antofagasta': 'Tattersall Antofagasta', // Esta no existe en la BD, se creará
  'Condominio Alta Vista II': 'Condominio Alta Vista 2',
  'Centro Gestión': 'Centro de Gestion',
  'PIikala Gran Av': 'Pikala',
  'Zerando': 'Zerando' // Esta no existe en la BD, se creará
};

async function actualizarInstalacionesGuardias(): Promise<void> {
  console.log('🚀 Actualizando instalaciones de guardias...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  try {
    // 1. Obtener todas las instalaciones de la base de datos
    const instalacionesResult = await pool.query('SELECT id, nombre FROM instalaciones');
    const instalacionesDB = new Map<string, string>();
    instalacionesResult.rows.forEach(row => {
      instalacionesDB.set(row.nombre.toLowerCase(), row.id);
    });
    
    console.log(`📋 Instalaciones en BD: ${instalacionesDB.size}`);
    
    // 2. Crear instalaciones faltantes
    const instalacionesFaltantes = new Set<string>();
    Object.values(MAPEO_INSTALACIONES).forEach(instalacion => {
      if (!instalacionesDB.has(instalacion.toLowerCase())) {
        instalacionesFaltantes.add(instalacion);
      }
    });
    
    if (instalacionesFaltantes.size > 0) {
      console.log(`\n➕ Creando instalaciones faltantes: ${instalacionesFaltantes.size}`);
      const instalacionesArray = Array.from(instalacionesFaltantes);
      for (const instalacion of instalacionesArray) {
        console.log(`  - Creando: ${instalacion}`);
        const result = await pool.query(
          'INSERT INTO instalaciones (nombre) VALUES ($1) RETURNING id',
          [instalacion]
        );
        instalacionesDB.set(instalacion.toLowerCase(), result.rows[0].id);
      }
    }
    
    // 3. Leer el CSV y actualizar guardias
    console.log('\n📄 Leyendo CSV y actualizando guardias...');
    const csvContent = fs.readFileSync('BBDD GGSS.csv', 'utf-8');
    const lines = csvContent.split('\n');
    const instalacionIndex = 11; // Índice de la columna de instalaciones
    const emailIndex = 6; // Índice de la columna de email
    
    let actualizados = 0;
    let noEncontrados = 0;
    let sinInstalacion = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim()) {
        const columns = line.split(';');
        const email = columns[emailIndex]?.trim().replace(/"/g, '');
        const instalacionCSV = columns[instalacionIndex]?.trim().replace(/"/g, '');
        
        if (email && instalacionCSV) {
          const instalacionMapeada = MAPEO_INSTALACIONES[instalacionCSV];
          
          if (instalacionMapeada) {
            const instalacionId = instalacionesDB.get(instalacionMapeada.toLowerCase());
            
            if (instalacionId) {
              // Actualizar el guardia
              const updateResult = await pool.query(
                'UPDATE guardias SET instalacion_id = $1 WHERE email = $2',
                [instalacionId, email]
              );
              
              if (updateResult.rowCount && updateResult.rowCount > 0) {
                actualizados++;
                console.log(`  ✓ ${email} → ${instalacionMapeada}`);
              } else {
                noEncontrados++;
                console.log(`  ✗ No encontrado: ${email}`);
              }
            } else {
              console.log(`  ❌ No se encontró ID para instalación: ${instalacionMapeada}`);
            }
          } else {
            sinInstalacion++;
            console.log(`  ⚠️ Sin mapeo: ${instalacionCSV} (${email})`);
          }
        }
      }
    }
    
    console.log('\n📊 Resumen de actualización:');
    console.log(`  ✅ Guardias actualizados: ${actualizados}`);
    console.log(`  ❌ Guardias no encontrados: ${noEncontrados}`);
    console.log(`  ⚠️ Sin mapeo de instalación: ${sinInstalacion}`);
    
    // 4. Verificar resultados
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_guardias,
        COUNT(instalacion_id) as con_instalacion,
        COUNT(*) - COUNT(instalacion_id) as sin_instalacion
      FROM guardias
    `);
    
    const stats = statsResult.rows[0];
    console.log('\n📈 Estadísticas finales:');
    console.log(`  📊 Total guardias: ${stats.total_guardias}`);
    console.log(`  ✅ Con instalación: ${stats.con_instalacion}`);
    console.log(`  ❌ Sin instalación: ${stats.sin_instalacion}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

actualizarInstalacionesGuardias(); 