import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function checkAsignacionesTable() {
  console.log('🔍 Verificando tabla asignaciones_guardias...\n');

  try {
    // Verificar si la tabla existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'asignaciones_guardias'
      )
    `);

    if (!tableExists.rows[0].exists) {
      console.log('❌ La tabla asignaciones_guardias no existe');
      console.log('\n📋 CREANDO TABLA asignaciones_guardias...');
      
      await query(`
        CREATE TABLE asignaciones_guardias (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          guardia_id UUID NOT NULL REFERENCES guardias(id),
          instalacion_id UUID NOT NULL REFERENCES instalaciones(id),
          ppc_id UUID NOT NULL REFERENCES puestos_por_cubrir(id),
          fecha_asignacion TIMESTAMP NOT NULL DEFAULT NOW(),
          fecha_fin TIMESTAMP NULL,
          estado TEXT NOT NULL DEFAULT 'Activa' CHECK (estado IN ('Activa', 'Finalizada', 'Cancelada')),
          observaciones TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          tenant_id UUID NULL
        )
      `);
      
      console.log('✅ Tabla asignaciones_guardias creada');
    } else {
      console.log('✅ La tabla asignaciones_guardias existe');
    }

    // Obtener estructura de columnas
    const columns = await query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns
      WHERE table_name = 'asignaciones_guardias'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 ESTRUCTURA DE LA TABLA asignaciones_guardias:');
    console.log('='.repeat(80));

    columns.rows.forEach((col: any) => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultValue = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`• ${col.column_name.padEnd(25)} (${col.data_type.padEnd(20)}) ${nullable}${defaultValue}`);
    });

    // Verificar datos existentes
    const dataCount = await query(`
      SELECT COUNT(*) as total FROM asignaciones_guardias
    `);

    console.log('\n📊 DATOS EXISTENTES:');
    console.log('='.repeat(80));
    console.log(`Total de registros: ${dataCount.rows[0].total}`);

    if (dataCount.rows[0].total > 0) {
      const sampleData = await query(`
        SELECT * FROM asignaciones_guardias LIMIT 3
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

    // Verificar PPCs asignados
    const ppcsAsignados = await query(`
      SELECT 
        ppc.id,
        ppc.estado,
        ppc.guardia_asignado_id,
        ppc.fecha_asignacion,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        i.nombre as instalacion_nombre
      FROM puestos_por_cubrir ppc
      LEFT JOIN guardias g ON ppc.guardia_asignado_id = g.id
      LEFT JOIN requisitos_puesto rp ON ppc.requisito_puesto_id = rp.id
      LEFT JOIN instalaciones i ON rp.instalacion_id = i.id
      WHERE ppc.estado = 'Asignado'
      ORDER BY ppc.fecha_asignacion DESC
    `);

    console.log('\n📊 PPCs ASIGNADOS EN puestos_por_cubrir:');
    console.log('='.repeat(80));
    
    if (ppcsAsignados.rows.length > 0) {
      ppcsAsignados.rows.forEach((ppc: any, index: number) => {
        console.log(`${index + 1}. PPC ID: ${ppc.id}`);
        console.log(`   Estado: ${ppc.estado}`);
        console.log(`   Guardia: ${ppc.nombre} ${ppc.apellido_paterno} ${ppc.apellido_materno}`);
        console.log(`   Instalación: ${ppc.instalacion_nombre}`);
        console.log(`   Fecha Asignación: ${ppc.fecha_asignacion}`);
        console.log('');
      });
    } else {
      console.log('No hay PPCs asignados');
    }

  } catch (error) {
    console.error('❌ Error verificando tabla:', error);
  }
}

// Ejecutar la verificación
checkAsignacionesTable()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }); 