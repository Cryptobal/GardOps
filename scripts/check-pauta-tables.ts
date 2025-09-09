import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function checkPautaTables() {
  console.log('🔍 Verificando tablas necesarias para el sistema de pautas...\n');

  const tables = [
    'as_turnos_configuracion',
    'as_turnos_roles_servicio',
    'as_turnos_ppc',
    'as_turnos_requisitos',
    'as_turnos_asignaciones',
    'as_turnos_pauta_mensual',
    'guardias',
    'instalaciones'
  ];

  for (const tableName of tables) {
    console.log(`\n📋 Verificando tabla: ${tableName}`);
    console.log('='.repeat(50));

    try {
      // Verificar si la tabla existe
      const tableExists = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )
      `, [tableName]);

      if (!tableExists.rows[0].exists) {
        console.log(`❌ La tabla ${tableName} NO existe`);
        continue;
      }

      console.log(`✅ La tabla ${tableName} existe`);

      // Obtener estructura de columnas
      const columns = await query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          ordinal_position
        FROM information_schema.columns
        WHERE table_name = $1
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);

      console.log(`\n📋 Estructura de ${tableName}:`);
      columns.rows.forEach((col: any) => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultValue = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`  • ${col.column_name.padEnd(25)} (${col.data_type.padEnd(20)}) ${nullable}${defaultValue}`);
      });

      // Verificar datos existentes
      const dataCount = await query(`SELECT COUNT(*) as total FROM ${tableName}`);
      console.log(`\n📊 Total de registros en ${tableName}: ${dataCount.rows[0].total}`);

      // Mostrar algunos datos de ejemplo si existen
      if (parseInt(dataCount.rows[0].total) > 0) {
        const sampleData = await query(`SELECT * FROM ${tableName} LIMIT 2`);
        console.log(`\n📋 Muestra de datos en ${tableName}:`);
        sampleData.rows.forEach((row: any, index: number) => {
          console.log(`  Registro ${index + 1}:`);
          Object.entries(row).forEach(([key, value]) => {
            console.log(`    ${key}: ${value}`);
          });
        });
      }

    } catch (error) {
      console.error(`❌ Error verificando tabla ${tableName}:`, error);
    }
  }

  // Verificar relaciones específicas para el endpoint de verificar roles
  console.log('\n\n🔍 Verificando consultas específicas del endpoint de verificar roles...');
  console.log('='.repeat(80));

  try {
    // Consulta 1: Verificar roles de servicio
    console.log('\n1️⃣ Verificando roles de servicio...');
    const rolesResult = await query(`
      SELECT 
        tc.id,
        tc.rol_servicio_id,
        rs.nombre as rol_nombre,
        tc.cantidad_guardias
      FROM as_turnos_configuracion tc
      INNER JOIN as_turnos_roles_servicio rs ON tc.rol_servicio_id = rs.id
      WHERE tc.instalacion_id = $1 AND tc.estado = 'Activo'
      ORDER BY rs.nombre
    `, ['15631bd6-03a9-459d-ae60-fc480f7f3e84']); // ID de la instalación de prueba

    console.log(`✅ Roles encontrados: ${rolesResult.rows.length}`);
    if (rolesResult.rows.length > 0) {
      console.log('📋 Roles:');
      rolesResult.rows.forEach((row: any) => {
        console.log(`  • ${row.rol_nombre} (ID: ${row.id})`);
      });
    }

    // Consulta 2: Verificar PPCs
    console.log('\n2️⃣ Verificando PPCs...');
    const ppcsResult = await query(`
      SELECT 
        ppc.id,
        ppc.estado,
        rs.nombre as rol_servicio_nombre,
        ppc.cantidad_faltante
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      LEFT JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      WHERE tr.instalacion_id = $1 AND ppc.estado = 'Pendiente'
      ORDER BY rs.nombre
    `, ['15631bd6-03a9-459d-ae60-fc480f7f3e84']);

    console.log(`✅ PPCs encontrados: ${ppcsResult.rows.length}`);
    if (ppcsResult.rows.length > 0) {
      console.log('📋 PPCs:');
      ppcsResult.rows.forEach((row: any) => {
        console.log(`  • ${row.rol_servicio_nombre} - ${row.estado} (ID: ${row.id})`);
      });
    }

    // Consulta 3: Verificar guardias asignados
    console.log('\n3️⃣ Verificando guardias asignados...');
    const guardiasResult = await query(`
      SELECT 
        g.id::text as id,
        g.nombre,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo
      FROM guardias g
      INNER JOIN as_turnos_asignaciones ta ON g.id = ta.guardia_id
      INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1 
        AND g.activo = true 
        AND ta.estado = 'Activa'
      ORDER BY g.nombre
    `, ['15631bd6-03a9-459d-ae60-fc480f7f3e84']);

    console.log(`✅ Guardias asignados encontrados: ${guardiasResult.rows.length}`);
    if (guardiasResult.rows.length > 0) {
      console.log('📋 Guardias:');
      guardiasResult.rows.forEach((row: any) => {
        console.log(`  • ${row.nombre_completo} (ID: ${row.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error en consultas específicas:', error);
  }

  console.log('\n✅ Verificación completada');
}

checkPautaTables().catch(console.error); 