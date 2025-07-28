#!/usr/bin/env ts-node

import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { createPuestosPorCubrirTable, createTurnosExtrasTable } from '../src/lib/database-migrations';
import { checkConnection } from '../src/lib/database';

async function createPpcTurnosExtrasScript() {
  console.log('🚀 Iniciando creación de tablas PPC y Turnos Extras...\n');
  
  try {
    // 1. Verificar conexión
    console.log('🔍 Verificando conexión a la base de datos...');
    const connected = await checkConnection();
    if (!connected) {
      console.error('❌ Error: No se pudo conectar a la base de datos');
      console.error('   Verifica que DATABASE_URL esté configurado correctamente');
      process.exit(1);
    }
    console.log('✅ Conexión establecida\n');

    // 2. Crear tabla puestos_por_cubrir
    console.log('📋 Creando tabla puestos_por_cubrir...');
    const ppcResult = await createPuestosPorCubrirTable();
    
    if (!ppcResult.success) {
      console.error('\n❌ Error creando tabla puestos_por_cubrir:');
      ppcResult.errors.forEach(error => console.error(`   ${error}`));
      process.exit(1);
    }

    console.log('✅ Tabla puestos_por_cubrir completada\n');

    // 3. Crear tabla turnos_extras
    console.log('📋 Creando tabla turnos_extras...');
    const turnosExtrasResult = await createTurnosExtrasTable();
    
    if (!turnosExtrasResult.success) {
      console.error('\n❌ Error creando tabla turnos_extras:');
      turnosExtrasResult.errors.forEach(error => console.error(`   ${error}`));
      process.exit(1);
    }

    console.log('\n🎉 ¡ÉXITO TOTAL!');
    console.log('✅ Tabla puestos_por_cubrir creada con éxito para gestión de PPC operativos.');
    console.log('✅ Tabla turnos_extras creada con éxito para gestión de turnos adicionales y coberturas.');
    console.log('\n🔧 Sistema completo de gestión diaria implementado:');
    console.log('   • Control de asistencia diaria');
    console.log('   • Gestión de puestos por cubrir (PPC)');
    console.log('   • Turnos extras y coberturas');
    console.log('   • Índices optimizados para consultas eficientes');

  } catch (error) {
    console.error('\n❌ Error inesperado:', error);
    process.exit(1);
  }
}

// Ejecutar el script
createPpcTurnosExtrasScript(); 