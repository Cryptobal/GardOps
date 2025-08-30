// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');

async function verificarEstadosPermitidos() {
  console.log('🔍 Verificando estados permitidos en as_turnos_pauta_mensual...\n');

  try {
    // 1. Verificar la restricción de verificación
    console.log('1. Verificando restricción de verificación...');
    const restricciones = await sql`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'as_turnos_pauta_mensual'::regclass
        AND contype = 'c'
    `;

    console.log(`✅ Restricciones encontradas: ${restricciones.rows.length}`);
    restricciones.rows.forEach(restriccion => {
      console.log(`   - ${restriccion.constraint_name}: ${restriccion.constraint_definition}`);
    });

    // 2. Verificar valores únicos en el campo estado
    console.log('\n2. Verificando valores únicos en el campo estado...');
    const estadosUnicos = await sql`
      SELECT DISTINCT estado
      FROM as_turnos_pauta_mensual
      ORDER BY estado
    `;

    console.log(`✅ Estados únicos encontrados: ${estadosUnicos.rows.length}`);
    estadosUnicos.rows.forEach(estado => {
      console.log(`   - "${estado.estado}"`);
    });

    // 3. Verificar datos del día anterior para ver qué estados se usan
    console.log('\n3. Verificando estados del día anterior (29 de agosto)...');
    const estadosAnterior = await sql`
      SELECT 
        pm.estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.anio = 2025
        AND pm.mes = 8
        AND pm.dia = 29
        AND po.activo = true
      GROUP BY pm.estado
      ORDER BY pm.estado
    `;

    console.log(`✅ Estados del 29 de agosto:`);
    estadosAnterior.rows.forEach(estado => {
      console.log(`   - ${estado.estado}: ${estado.cantidad} registros`);
    });

    // 4. Verificar si hay registros con estado 'Activo' en otros días
    console.log('\n4. Verificando registros con estado "Activo"...');
    const registrosActivos = await sql`
      SELECT 
        pm.anio,
        pm.mes,
        pm.dia,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual pm
      WHERE pm.estado = 'Activo'
      GROUP BY pm.anio, pm.mes, pm.dia
      ORDER BY pm.anio, pm.mes, pm.dia
      LIMIT 5
    `;

    console.log(`✅ Registros con estado "Activo": ${registrosActivos.rows.length}`);
    registrosActivos.rows.forEach(registro => {
      console.log(`   - ${registro.anio}-${registro.mes}-${registro.dia}: ${registro.cantidad} registros`);
    });

    console.log('\n🎯 ANÁLISIS DE ESTADOS:');
    console.log('========================');
    
    if (registrosActivos.rows.length > 0) {
      console.log('✅ El estado "Activo" SÍ está permitido');
      console.log('   - Se usa en otros días del sistema');
    } else {
      console.log('❌ El estado "Activo" NO está permitido');
      console.log('   - No se encontraron registros con este estado');
    }

    console.log('\n🔧 RECOMENDACIONES:');
    console.log('==================');
    console.log('1. Verificar si el estado correcto es "activo" (minúscula)');
    console.log('2. Verificar si el estado correcto es otro valor');
    console.log('3. Revisar la restricción de verificación en la base de datos');

  } catch (error) {
    console.error('❌ Error en la verificación:', error);
  } finally {
    process.exit(0);
  }
}

verificarEstadosPermitidos();
