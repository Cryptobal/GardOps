#!/usr/bin/env ts-node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

// Lista de RUTs a verificar
const RUTS_A_VERIFICAR = [
  '9166943-9', '16563350-4', '16032595-K', '16147407-k', '19139275-2',
  '20382235-9', '16304718-7', '25629118-5', '25933812-3', '18563612-7',
  '18830186-K', '8332329-9', '9061144-5', '21381703-5', '9146689-9',
  '9178825-K', '9350807-6', '9920483-4', '18883244-K', '16412103-8',
  '19104063-5', '9991272-3', '19222820-4', '19284975-6', '16441461-2',
  '19448798-3', '16519729-1', '19683046-4', '19707020-k', '10122151-2',
  '10150927-3', '19787268-3', '10165663-2', '19887162-1', '10198125-8',
  '10396288-9', '20122675-9', '10826281-8', '11207494-5', '16696412-1',
  '20131346-5', '20216227-4', '20228775-1', '16744067-3', '20432415-8',
  '20453936-7', '20721061-7', '11614357-7', '12003583-5', '12833245-6',
  '12864761-9', '13173493-k', '13211292-4', '16755015-0', '16866346-3',
  '20904805-1', '21112460-1', '13281478-3', '16924218-6', '21194404-8',
  '13283511-K', '24378420-4', '13344687-7', '25978430-1', '16953359-8',
  '26952355-7', '17414800-7', '13401103-3', '17462903-K', '13479418-6',
  '17548578-3', '17122247-8', '13566525-8', '13596911-7', '17564802-K',
  '13871754-2', '17614310-K', '13980816', '17689223-4', '15071621-7',
  '17689964-6', '17902401-2', '15184055-8', '15976054-5'
];

async function verificarCamposGuardias(): Promise<void> {
  console.log('🔍 Verificando campos de guardias específicos...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  try {
    console.log(`\n📋 Verificando ${RUTS_A_VERIFICAR.length} guardias...`);
    
    for (const rut of RUTS_A_VERIFICAR) {
      const result = await pool.query(`
        SELECT 
          rut,
          nombre,
          apellido_paterno,
          apellido_materno,
          email,
          telefono,
          sexo,
          activo,
          direccion,
          comuna,
          ciudad,
          nacionalidad,
          fecha_os10,
          tenant_id,
          latitud,
          longitud,
          instalacion_id,
          created_at,
          updated_at
        FROM guardias 
        WHERE rut = $1
      `, [rut]);
      
      if (result.rows.length > 0) {
        const guardia = result.rows[0];
        console.log(`\n📊 Guardia: ${rut}`);
        console.log(`  ✅ Nombre: ${guardia.nombre || '❌ FALTA'}`);
        console.log(`  ✅ Apellido Paterno: ${guardia.apellido_paterno || '❌ FALTA'}`);
        console.log(`  ✅ Apellido Materno: ${guardia.apellido_materno || '❌ FALTA'}`);
        console.log(`  ✅ Email: ${guardia.email || '❌ FALTA'}`);
        console.log(`  ✅ Teléfono: ${guardia.telefono || '❌ FALTA'}`);
        console.log(`  ✅ Sexo: ${guardia.sexo || '❌ FALTA'}`);
        console.log(`  ✅ Activo: ${guardia.activo !== null ? guardia.activo : '❌ FALTA'}`);
        console.log(`  ✅ Dirección: ${guardia.direccion || '❌ FALTA'}`);
        console.log(`  ✅ Comuna: ${guardia.comuna || '❌ FALTA'}`);
        console.log(`  ✅ Ciudad: ${guardia.ciudad || '❌ FALTA'}`);
        console.log(`  ✅ Nacionalidad: ${guardia.nacionalidad || '❌ FALTA'}`);
        console.log(`  ✅ Fecha OS10: ${guardia.fecha_os10 || '❌ FALTA'}`);
        console.log(`  ✅ Tenant ID: ${guardia.tenant_id || '❌ FALTA'}`);
        console.log(`  ✅ Latitud: ${guardia.latitud || '❌ FALTA'}`);
        console.log(`  ✅ Longitud: ${guardia.longitud || '❌ FALTA'}`);
        console.log(`  ✅ Instalación ID: ${guardia.instalacion_id || '❌ FALTA'}`);
        console.log(`  ✅ Created At: ${guardia.created_at || '❌ FALTA'}`);
        console.log(`  ✅ Updated At: ${guardia.updated_at || '❌ FALTA'}`);
      } else {
        console.log(`\n❌ Guardia ${rut} NO ENCONTRADO en la base de datos`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

verificarCamposGuardias(); 