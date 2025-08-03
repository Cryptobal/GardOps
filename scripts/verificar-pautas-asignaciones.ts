import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function verificarPautasYAsignaciones() {
  console.log('🔍 VERIFICANDO PAUTAS Y ASIGNACIONES');
  console.log('='.repeat(80));

  try {
    // 1. Verificar tabla de pauta mensual
    console.log('\n📋 1. VERIFICANDO TABLA as_turnos_pauta_mensual');
    console.log('-'.repeat(50));

    const pautaMensualExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'as_turnos_pauta_mensual'
      )
    `);

    if (pautaMensualExists.rows[0].exists) {
      console.log('✅ Tabla as_turnos_pauta_mensual existe');
      
      // Contar registros
      const pautaCount = await query('SELECT COUNT(*) as total FROM as_turnos_pauta_mensual');
      console.log(`📊 Total registros: ${pautaCount.rows[0].total}`);
      
      // Mostrar muestra de datos
      const pautaSample = await query(`
        SELECT * FROM as_turnos_pauta_mensual 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      if (pautaSample.rows.length > 0) {
        console.log('\n📋 MUESTRA DE PAUTA MENSUAL:');
        pautaSample.rows.forEach((row: any, index: number) => {
          console.log(`Registro ${index + 1}:`);
          console.log(`  Instalación: ${row.instalacion_id}`);
          console.log(`  Guardia: ${row.guardia_id}`);
          console.log(`  Fecha: ${row.anio}-${row.mes}-${row.dia}`);
          console.log(`  Estado: ${row.estado}`);
          console.log(`  Creado: ${row.created_at}`);
          console.log('');
        });
      }
    } else {
      console.log('❌ Tabla as_turnos_pauta_mensual NO existe');
    }

    // 2. Verificar tabla de asignaciones
    console.log('\n📋 2. VERIFICANDO TABLA as_turnos_asignaciones');
    console.log('-'.repeat(50));

    const asignacionesExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'as_turnos_asignaciones'
      )
    `);

    if (asignacionesExists.rows[0].exists) {
      console.log('✅ Tabla as_turnos_asignaciones existe');
      
      // Contar registros
      const asignacionesCount = await query('SELECT COUNT(*) as total FROM as_turnos_asignaciones');
      console.log(`📊 Total registros: ${asignacionesCount.rows[0].total}`);
      
      // Contar por estado
      const asignacionesPorEstado = await query(`
        SELECT estado, COUNT(*) as total 
        FROM as_turnos_asignaciones 
        GROUP BY estado
      `);
      
      console.log('\n📊 ASIGNACIONES POR ESTADO:');
      asignacionesPorEstado.rows.forEach((row: any) => {
        console.log(`  ${row.estado}: ${row.total}`);
      });
      
      // Mostrar muestra de datos
      const asignacionesSample = await query(`
        SELECT 
          ta.*,
          g.nombre as guardia_nombre,
          g.apellido_paterno as guardia_apellido
        FROM as_turnos_asignaciones ta
        LEFT JOIN guardias g ON ta.guardia_id = g.id
        ORDER BY ta.created_at DESC 
        LIMIT 5
      `);
      
      if (asignacionesSample.rows.length > 0) {
        console.log('\n📋 MUESTRA DE ASIGNACIONES:');
        asignacionesSample.rows.forEach((row: any, index: number) => {
          console.log(`Asignación ${index + 1}:`);
          console.log(`  Guardia: ${row.guardia_nombre} ${row.guardia_apellido}`);
          console.log(`  Instalación: ${row.instalacion_id}`);
          console.log(`  Requisito: ${row.requisito_puesto_id}`);
          console.log(`  Estado: ${row.estado}`);
          console.log(`  Tipo: ${row.tipo_asignacion}`);
          console.log(`  Creado: ${row.created_at}`);
          console.log('');
        });
      }
    } else {
      console.log('❌ Tabla as_turnos_asignaciones NO existe');
    }

    // 3. Verificar PPCs
    console.log('\n📋 3. VERIFICANDO TABLA as_turnos_ppc');
    console.log('-'.repeat(50));

    const ppcExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'as_turnos_ppc'
      )
    `);

    if (ppcExists.rows[0].exists) {
      console.log('✅ Tabla as_turnos_ppc existe');
      
      // Contar registros
      const ppcCount = await query('SELECT COUNT(*) as total FROM as_turnos_ppc');
      console.log(`📊 Total registros: ${ppcCount.rows[0].total}`);
      
      // Contar por estado
      const ppcPorEstado = await query(`
        SELECT estado, COUNT(*) as total 
        FROM as_turnos_ppc 
        GROUP BY estado
      `);
      
      console.log('\n📊 PPCs POR ESTADO:');
      ppcPorEstado.rows.forEach((row: any) => {
        console.log(`  ${row.estado}: ${row.total}`);
      });
      
      // Mostrar PPCs asignados
      const ppcsAsignados = await query(`
        SELECT 
          ppc.*,
          g.nombre as guardia_nombre,
          g.apellido_paterno as guardia_apellido
        FROM as_turnos_ppc ppc
        LEFT JOIN guardias g ON ppc.guardia_asignado_id = g.id
        WHERE ppc.estado = 'Asignado'
        ORDER BY ppc.fecha_asignacion DESC
        LIMIT 5
      `);
      
      if (ppcsAsignados.rows.length > 0) {
        console.log('\n📋 PPCs ASIGNADOS:');
        ppcsAsignados.rows.forEach((ppc: any, index: number) => {
          console.log(`PPC ${index + 1}:`);
          console.log(`  ID: ${ppc.id}`);
          console.log(`  Guardia: ${ppc.guardia_nombre} ${ppc.guardia_apellido}`);
          console.log(`  Instalación: ${ppc.instalacion_id}`);
          console.log(`  Requisito: ${ppc.requisito_puesto_id}`);
          console.log(`  Cantidad faltante: ${ppc.cantidad_faltante}`);
          console.log(`  Fecha asignación: ${ppc.fecha_asignacion}`);
          console.log('');
        });
      }
    } else {
      console.log('❌ Tabla as_turnos_ppc NO existe');
    }

    // 4. Verificar integridad de datos
    console.log('\n📋 4. VERIFICANDO INTEGRIDAD DE DATOS');
    console.log('-'.repeat(50));

    // Verificar guardias con asignaciones activas
    const guardiasConAsignaciones = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        COUNT(ta.id) as asignaciones_activas
      FROM guardias g
      INNER JOIN as_turnos_asignaciones ta ON g.id = ta.guardia_id
      WHERE ta.estado = 'Activa'
      GROUP BY g.id, g.nombre, g.apellido_paterno, g.apellido_materno
      ORDER BY asignaciones_activas DESC
      LIMIT 10
    `);

    console.log('\n📊 GUARDIAS CON ASIGNACIONES ACTIVAS:');
    guardiasConAsignaciones.rows.forEach((guardia: any) => {
      console.log(`  ${guardia.nombre} ${guardia.apellido_paterno}: ${guardia.asignaciones_activas} asignaciones`);
    });

    // Verificar instalaciones con pautas
    const instalacionesConPautas = await query(`
      SELECT 
        i.id,
        i.nombre,
        COUNT(DISTINCT pm.guardia_id) as guardias_en_pauta,
        COUNT(pm.id) as total_registros_pauta
      FROM instalaciones i
      LEFT JOIN as_turnos_pauta_mensual pm ON i.id = pm.instalacion_id
      WHERE pm.id IS NOT NULL
      GROUP BY i.id, i.nombre
      ORDER BY total_registros_pauta DESC
      LIMIT 10
    `);

    console.log('\n📊 INSTALACIONES CON PAUTAS:');
    instalacionesConPautas.rows.forEach((instalacion: any) => {
      console.log(`  ${instalacion.nombre}: ${instalacion.guardias_en_pauta} guardias, ${instalacion.total_registros_pauta} registros`);
    });

    // 5. Verificar fechas recientes
    console.log('\n📋 5. VERIFICANDO DATOS RECIENTES');
    console.log('-'.repeat(50));

    const fechaActual = new Date();
    const anioActual = fechaActual.getFullYear();
    const mesActual = fechaActual.getMonth() + 1;

    // Verificar pautas del mes actual
    const pautasMesActual = await query(`
      SELECT 
        instalacion_id,
        COUNT(DISTINCT guardia_id) as guardias,
        COUNT(*) as registros
      FROM as_turnos_pauta_mensual
      WHERE anio = $1 AND mes = $2
      GROUP BY instalacion_id
    `, [anioActual, mesActual]);

    console.log(`\n📊 PAUTAS DEL MES ACTUAL (${anioActual}-${mesActual}):`);
    if (pautasMesActual.rows.length > 0) {
      pautasMesActual.rows.forEach((pauta: any) => {
        console.log(`  Instalación ${pauta.instalacion_id}: ${pauta.guardias} guardias, ${pauta.registros} registros`);
      });
    } else {
      console.log('  No hay pautas para el mes actual');
    }

    // Verificar asignaciones recientes
    const asignacionesRecientes = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as ultima_semana,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as ultimo_mes
      FROM as_turnos_asignaciones
    `);

    const stats = asignacionesRecientes.rows[0];
    console.log('\n📊 ASIGNACIONES RECIENTES:');
    console.log(`  Total: ${stats.total}`);
    console.log(`  Última semana: ${stats.ultima_semana}`);
    console.log(`  Último mes: ${stats.ultimo_mes}`);

  } catch (error) {
    console.error('❌ Error verificando pautas y asignaciones:', error);
  }
}

// Ejecutar la verificación
verificarPautasYAsignaciones()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }); 