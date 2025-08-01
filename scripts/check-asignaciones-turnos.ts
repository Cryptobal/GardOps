import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function checkAsignacionesTurnos() {
  console.log('🔍 Verificando tabla as_turnos_asignaciones...\n');

  try {
    // Verificar si la tabla existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'as_turnos_asignaciones'
      )
    `);

    if (!tableExists.rows[0].exists) {
      console.log('❌ La tabla as_turnos_asignaciones no existe');
      return;
    }

    console.log('✅ La tabla as_turnos_asignaciones existe');

    // Obtener estructura de columnas
    const columns = await query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns
      WHERE table_name = 'as_turnos_asignaciones'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 ESTRUCTURA DE LA TABLA as_turnos_asignaciones:');
    console.log('='.repeat(80));

    columns.rows.forEach((col: any) => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultValue = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`• ${col.column_name.padEnd(25)} (${col.data_type.padEnd(20)}) ${nullable}${defaultValue}`);
    });

    // Verificar datos existentes
    const dataCount = await query(`
      SELECT COUNT(*) as total FROM as_turnos_asignaciones
    `);

    console.log('\n📊 DATOS EXISTENTES:');
    console.log('='.repeat(80));
    console.log(`Total de registros: ${dataCount.rows[0].total}`);

    if (dataCount.rows[0].total > 0) {
      const sampleData = await query(`
        SELECT * FROM as_turnos_asignaciones LIMIT 3
      `);

      console.log('\n📋 MUESTRA DE DATOS:');
      sampleData.rows.forEach((row: any, index: number) => {
        console.log(`Registro ${index + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
        console.log('');
      });
    }

    // Verificar PPCs disponibles
    const ppcsDisponibles = await query(`
      SELECT 
        ppc.id,
        ppc.estado,
        ppc.cantidad_faltante,
        ppc.motivo,
        ppc.fecha_limite_cobertura,
        rp.nombre as requisito_nombre,
        rs.nombre as rol_nombre,
        i.nombre as instalacion_nombre
      FROM as_turnos_ppc ppc
      LEFT JOIN as_turnos_requisitos rp ON ppc.requisito_puesto_id = rp.id
      LEFT JOIN as_turnos_roles_servicio rs ON rp.rol_servicio_id = rs.id
      LEFT JOIN instalaciones i ON rp.instalacion_id = i.id
      WHERE ppc.estado = 'Pendiente'
      ORDER BY ppc.fecha_limite_cobertura ASC
    `);

    console.log('\n📊 PPCs PENDIENTES DISPONIBLES:');
    console.log('='.repeat(80));
    
    if (ppcsDisponibles.rows.length > 0) {
      ppcsDisponibles.rows.forEach((ppc: any, index: number) => {
        console.log(`${index + 1}. PPC ID: ${ppc.id}`);
        console.log(`   Estado: ${ppc.estado}`);
        console.log(`   Cantidad faltante: ${ppc.cantidad_faltante}`);
        console.log(`   Motivo: ${ppc.motivo}`);
        console.log(`   Instalación: ${ppc.instalacion_nombre}`);
        console.log(`   Rol: ${ppc.rol_nombre}`);
        console.log(`   Fecha límite: ${ppc.fecha_limite_cobertura}`);
        console.log('');
      });
    } else {
      console.log('No hay PPCs pendientes disponibles');
    }

  } catch (error) {
    console.error('❌ Error verificando tabla:', error);
  }
}

// Ejecutar la verificación
checkAsignacionesTurnos()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }); 