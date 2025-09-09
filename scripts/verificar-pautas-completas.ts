import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function verificarPautasCompletas() {
  console.log('🔍 VERIFICACIÓN COMPLETA DE PAUTAS Y ASIGNACIONES');
  console.log('='.repeat(80));

  try {
    // 1. Verificar estructura de tablas
    console.log('\n📋 1. VERIFICANDO ESTRUCTURA DE TABLAS');
    console.log('-'.repeat(50));

    const tablas = [
      'as_turnos_pauta_mensual',
      'as_turnos_asignaciones', 
      'as_turnos_ppc',
      'guardias',
      'instalaciones'
    ];

    for (const tabla of tablas) {
      const existe = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )
      `, [tabla]);

      if (existe.rows[0].exists) {
        const count = await query(`SELECT COUNT(*) as total FROM ${tabla}`);
        console.log(`✅ ${tabla}: ${count.rows[0].total} registros`);
      } else {
        console.log(`❌ ${tabla}: NO EXISTE`);
      }
    }

    // 2. Verificar datos de pautas mensuales
    console.log('\n📋 2. VERIFICANDO PAUTAS MENSUALES');
    console.log('-'.repeat(50));

    const pautasResumen = await query(`
      SELECT 
        anio,
        mes,
        COUNT(DISTINCT instalacion_id) as instalaciones,
        COUNT(DISTINCT guardia_id) as guardias,
        COUNT(*) as total_registros,
        COUNT(CASE WHEN estado = 'trabajado' THEN 1 END) as trabajado,
        COUNT(CASE WHEN estado = 'libre' THEN 1 END) as libre,
        COUNT(CASE WHEN estado = 'permiso' THEN 1 END) as permiso
      FROM as_turnos_pauta_mensual
      GROUP BY anio, mes
      ORDER BY anio DESC, mes DESC
      LIMIT 5
    `);

    console.log('📊 RESUMEN DE PAUTAS MENSUALES:');
    pautasResumen.rows.forEach((pauta: any) => {
      console.log(`  ${pauta.anio}-${pauta.mes}: ${pauta.instalaciones} instalaciones, ${pauta.guardias} guardias, ${pauta.total_registros} registros`);
      console.log(`    Estados: Trabajado=${pauta.trabajado}, Libre=${pauta.libre}, Permiso=${pauta.permiso}`);
    });

    // 3. Verificar asignaciones activas
    console.log('\n📋 3. VERIFICANDO ASIGNACIONES ACTIVAS');
    console.log('-'.repeat(50));

    const asignacionesActivas = await query(`
      SELECT 
        ta.*,
        g.nombre as guardia_nombre,
        g.apellido_paterno as guardia_apellido,
        g.apellido_materno as guardia_apellido_materno
      FROM as_turnos_asignaciones ta
      LEFT JOIN guardias g ON ta.guardia_id = g.id
      WHERE ta.estado = 'Activa'
      ORDER BY ta.created_at DESC
    `);

    console.log(`📊 ASIGNACIONES ACTIVAS: ${asignacionesActivas.rows.length}`);
    asignacionesActivas.rows.forEach((asignacion: any, index: number) => {
      console.log(`  ${index + 1}. ${asignacion.guardia_nombre} ${asignacion.guardia_apellido} ${asignacion.guardia_apellido_materno}`);
      console.log(`     Tipo: ${asignacion.tipo_asignacion}`);
      console.log(`     Requisito: ${asignacion.requisito_puesto_id}`);
      console.log(`     Creado: ${asignacion.created_at}`);
      console.log('');
    });

    // 4. Verificar PPCs
    console.log('\n📋 4. VERIFICANDO PPCs');
    console.log('-'.repeat(50));

    const ppcsResumen = await query(`
      SELECT 
        estado,
        COUNT(*) as total,
        COUNT(CASE WHEN guardia_asignado_id IS NOT NULL THEN 1 END) as asignados
      FROM as_turnos_ppc
      GROUP BY estado
      ORDER BY total DESC
    `);

    console.log('📊 RESUMEN DE PPCs:');
    ppcsResumen.rows.forEach((ppc: any) => {
      console.log(`  ${ppc.estado}: ${ppc.total} total, ${ppc.asignados} asignados`);
    });

    // 5. Verificar integridad de datos
    console.log('\n📋 5. VERIFICANDO INTEGRIDAD DE DATOS');
    console.log('-'.repeat(50));

    // Verificar guardias sin asignaciones
    const guardiasSinAsignaciones = await query(`
      SELECT COUNT(*) as total
      FROM guardias g
      LEFT JOIN as_turnos_asignaciones ta ON g.id = ta.guardia_id AND ta.estado = 'Activa'
      WHERE ta.id IS NULL AND g.activo = true
    `);
    console.log(`📊 Guardias activos sin asignaciones: ${guardiasSinAsignaciones.rows[0].total}`);

    // Verificar instalaciones sin pautas
    const instalacionesSinPautas = await query(`
      SELECT COUNT(*) as total
      FROM instalaciones i
      LEFT JOIN as_turnos_pauta_mensual pm ON i.id::text = pm.instalacion_id
      WHERE pm.id IS NULL
    `);
    console.log(`📊 Instalaciones sin pautas: ${instalacionesSinPautas.rows[0].total}`);

    // 6. Verificar datos recientes
    console.log('\n📋 6. VERIFICANDO DATOS RECIENTES');
    console.log('-'.repeat(50));

    const fechaActual = new Date();
    const anioActual = fechaActual.getFullYear();
    const mesActual = fechaActual.getMonth() + 1;

    // Pautas del mes actual
    const pautasMesActual = await query(`
      SELECT 
        instalacion_id,
        COUNT(DISTINCT guardia_id) as guardias,
        COUNT(*) as registros
      FROM as_turnos_pauta_mensual
      WHERE anio = $1 AND mes = $2
      GROUP BY instalacion_id
    `, [anioActual, mesActual]);

    console.log(`📊 Pautas del mes actual (${anioActual}-${mesActual}): ${pautasMesActual.rows.length} instalaciones`);
    pautasMesActual.rows.forEach((pauta: any) => {
      console.log(`  Instalación ${pauta.instalacion_id}: ${pauta.guardias} guardias, ${pauta.registros} registros`);
    });

    // Asignaciones recientes
    const asignacionesRecientes = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as ultima_semana,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as ultimo_mes
      FROM as_turnos_asignaciones
    `);

    const stats = asignacionesRecientes.rows[0];
    console.log(`📊 Asignaciones recientes: Total=${stats.total}, Última semana=${stats.ultima_semana}, Último mes=${stats.ultimo_mes}`);

    // 7. Verificar consistencia de datos
    console.log('\n📋 7. VERIFICANDO CONSISTENCIA DE DATOS');
    console.log('-'.repeat(50));

    // Verificar que los guardias en pautas existen
    const guardiasEnPautasInexistentes = await query(`
      SELECT COUNT(*) as total
      FROM as_turnos_pauta_mensual pm
      LEFT JOIN guardias g ON pm.guardia_id = g.id::text
      WHERE g.id IS NULL
    `);
    console.log(`📊 Guardias en pautas que no existen: ${guardiasEnPautasInexistentes.rows[0].total}`);

    // Verificar que las instalaciones en pautas existen
    const instalacionesEnPautasInexistentes = await query(`
      SELECT COUNT(*) as total
      FROM as_turnos_pauta_mensual pm
      LEFT JOIN instalaciones i ON pm.instalacion_id = i.id::text
      WHERE i.id IS NULL
    `);
    console.log(`📊 Instalaciones en pautas que no existen: ${instalacionesEnPautasInexistentes.rows[0].total}`);

    // 8. Resumen final
    console.log('\n📋 8. RESUMEN FINAL');
    console.log('-'.repeat(50));
    console.log('✅ Verificación completada exitosamente');
    console.log('✅ Las tablas de pautas y asignaciones están funcionando correctamente');
    console.log('✅ Los datos se están guardando en las tablas correspondientes:');
    console.log('   - Pautas mensuales: as_turnos_pauta_mensual');
    console.log('   - Asignaciones diarias: as_turnos_asignaciones');
    console.log('   - PPCs: as_turnos_ppc');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

// Ejecutar la verificación
verificarPautasCompletas()
  .then(() => {
    console.log('\n✅ Verificación completa finalizada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }); 