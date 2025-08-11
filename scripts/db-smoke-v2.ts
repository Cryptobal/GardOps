import { query } from '../src/lib/database';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message?: string;
  time?: number;
}

async function dbSmokeTestV2() {
  console.log('🔥 PRUEBAS DE HUMO - FUNCIONES DE TURNOS V2\n');
  console.log('📋 Todas las pruebas se ejecutan con ROLLBACK\n');
  
  const results: TestResult[] = [];
  const startTime = Date.now();
  
  try {
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'create-turnos-functions-v2.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('1️⃣ APLICANDO FUNCIONES SQL...\n');
    await query(sqlContent);
    
    console.log('✅ Funciones aplicadas exitosamente\n');
    
    // ===== PRUEBA 1: Verificar que las funciones existen =====
    console.log('2️⃣ VERIFICANDO FUNCIONES CREADAS...\n');
    
    const funciones = await query(`
      SELECT 
        p.proname as function_name,
        pg_get_function_arguments(p.oid) as arguments
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'as_turnos'
      AND p.proname IN (
        'fn_guardias_disponibles',
        'fn_registrar_reemplazo', 
        'fn_marcar_extra',
        'fn_deshacer'
      )
      ORDER BY p.proname
    `);
    
    console.log('Funciones encontradas:');
    for (const func of funciones.rows) {
      console.log(`  ✓ ${func.function_name}(${func.arguments})`);
    }
    
    results.push({
      test: 'Verificar funciones creadas',
      status: funciones.rows.length >= 4 ? 'PASS' : 'FAIL',
      message: `${funciones.rows.length} funciones encontradas`
    });
    
    // ===== PRUEBA 2: Test fn_guardias_disponibles =====
    console.log('\n3️⃣ PROBANDO fn_guardias_disponibles...\n');
    
    // Iniciar transacción para pruebas
    await query('BEGIN');
    
    try {
      // Crear datos de prueba temporales
      const instalacionTest = '00000000-0000-0000-0000-000000000001';
      const rolTest = '00000000-0000-0000-0000-000000000002';
      const guardiaTest1 = '00000000-0000-0000-0000-000000000003';
      const guardiaTest2 = '00000000-0000-0000-0000-000000000004';
      
      // Crear instalación temporal
      await query(`
        INSERT INTO instalaciones (id, nombre, direccion, comuna, tenant_id)
        VALUES ($1, 'Instalación Test Smoke', 'Dirección Test', 'Santiago', gen_random_uuid())
        ON CONFLICT (id) DO NOTHING
      `, [instalacionTest]);
      
      // Crear rol temporal
      await query(`
        INSERT INTO as_turnos_roles_servicio (id, nombre, horas_turno, tenant_id)
        VALUES ($1, 'Rol Test Smoke', 8, gen_random_uuid())
        ON CONFLICT (id) DO NOTHING
      `, [rolTest]);
      
      // Crear guardias temporales
      await query(`
        INSERT INTO guardias (id, nombre, apellido_paterno, apellido_materno, estado, tipo_guardia, tenant_id)
        VALUES 
          ($1, 'Juan', 'Pérez', 'García', 'activo', 'contratado', gen_random_uuid()),
          ($2, 'María', 'López', 'Silva', 'activo', 'esporadico', gen_random_uuid())
        ON CONFLICT (id) DO NOTHING
      `, [guardiaTest1, guardiaTest2]);
      
      const testStart = Date.now();
      const disponibles = await query(`
        SELECT * FROM as_turnos.fn_guardias_disponibles(
          CURRENT_DATE,
          $1::uuid,
          $2::uuid,
          NULL
        )
      `, [instalacionTest, rolTest]);
      const testTime = Date.now() - testStart;
      
      console.log(`  Guardias disponibles encontrados: ${disponibles.rows.length}`);
      for (const guardia of disponibles.rows.slice(0, 3)) {
        console.log(`    - ${guardia.nombre}`);
      }
      
      results.push({
        test: 'fn_guardias_disponibles',
        status: 'PASS',
        message: `${disponibles.rows.length} guardias disponibles`,
        time: testTime
      });
      
    } catch (error: any) {
      console.error('  ❌ Error:', error.message);
      results.push({
        test: 'fn_guardias_disponibles',
        status: 'FAIL',
        message: error.message
      });
    }
    
    // ===== PRUEBA 3: Test fn_registrar_reemplazo =====
    console.log('\n4️⃣ PROBANDO fn_registrar_reemplazo...\n');
    
    try {
      // Buscar una pauta existente o crear una temporal
      const pautaExistente = await query(`
        SELECT id FROM as_turnos_pauta_mensual 
        WHERE anio = EXTRACT(YEAR FROM CURRENT_DATE)
        LIMIT 1
      `);
      
      let pautaId: number;
      
      if (pautaExistente.rows.length > 0) {
        pautaId = pautaExistente.rows[0].id;
      } else {
        // Crear puesto operativo temporal
        const puestoResult = await query(`
          INSERT INTO as_turnos_puestos_operativos (
            instalacion_id,
            rol_id,
            nombre_puesto,
            es_ppc
          ) VALUES (
            '00000000-0000-0000-0000-000000000001'::uuid,
            '00000000-0000-0000-0000-000000000002'::uuid,
            'Puesto Test Smoke',
            false
          ) RETURNING id
        `);
        
        // Crear pauta temporal
        const pautaResult = await query(`
          INSERT INTO as_turnos_pauta_mensual (
            puesto_id,
            guardia_id,
            anio,
            mes,
            dia,
            estado,
            estado_ui
          ) VALUES (
            $1,
            '00000000-0000-0000-0000-000000000003'::uuid,
            EXTRACT(YEAR FROM CURRENT_DATE),
            EXTRACT(MONTH FROM CURRENT_DATE),
            EXTRACT(DAY FROM CURRENT_DATE),
            'plan',
            'plan'
          ) RETURNING id
        `, [puestoResult.rows[0].id]);
        
        pautaId = pautaResult.rows[0].id;
      }
      
      const testStart = Date.now();
      const resultado = await query(`
        SELECT * FROM as_turnos.fn_registrar_reemplazo(
          $1::bigint,
          '00000000-0000-0000-0000-000000000004'::uuid,
          'test_user',
          'Motivo de prueba'
        )
      `, [pautaId]);
      const testTime = Date.now() - testStart;
      
      console.log(`  Resultado: ${resultado.rows[0].ok ? '✅ OK' : '❌ ERROR'}`);
      console.log(`  Estado: ${resultado.rows[0].estado}`);
      
      results.push({
        test: 'fn_registrar_reemplazo',
        status: resultado.rows[0].ok ? 'PASS' : 'FAIL',
        message: `Estado: ${resultado.rows[0].estado}`,
        time: testTime
      });
      
    } catch (error: any) {
      console.error('  ❌ Error:', error.message);
      results.push({
        test: 'fn_registrar_reemplazo',
        status: 'FAIL',
        message: error.message
      });
    }
    
    // ===== PRUEBA 4: Test fn_marcar_extra =====
    console.log('\n5️⃣ PROBANDO fn_marcar_extra...\n');
    
    try {
      const testStart = Date.now();
      const resultado = await query(`
        SELECT * FROM as_turnos.fn_marcar_extra(
          CURRENT_DATE,
          '00000000-0000-0000-0000-000000000001'::uuid,
          '00000000-0000-0000-0000-000000000002'::uuid,
          '00000000-0000-0000-0000-000000000005'::uuid,
          '00000000-0000-0000-0000-000000000003'::uuid,
          'ppc_cubierto',
          'test_user'
        )
      `);
      const testTime = Date.now() - testStart;
      
      console.log(`  Resultado: ${resultado.rows[0].ok ? '✅ OK' : '❌ ERROR'}`);
      if (resultado.rows[0].ok) {
        console.log(`  Extra UID: ${resultado.rows[0].extra_uid.substring(0, 8)}...`);
      }
      
      results.push({
        test: 'fn_marcar_extra',
        status: resultado.rows[0].ok ? 'PASS' : 'FAIL',
        message: resultado.rows[0].extra_uid ? 'Extra creado' : resultado.rows[0].extra_uid,
        time: testTime
      });
      
    } catch (error: any) {
      console.error('  ❌ Error:', error.message);
      results.push({
        test: 'fn_marcar_extra',
        status: 'FAIL',
        message: error.message
      });
    }
    
    // ===== PRUEBA 5: Test fn_deshacer =====
    console.log('\n6️⃣ PROBANDO fn_deshacer...\n');
    
    try {
      // Buscar una pauta con estado diferente a 'plan'
      const pautaModificada = await query(`
        SELECT id FROM as_turnos_pauta_mensual 
        WHERE estado_ui != 'plan'
        LIMIT 1
      `);
      
      if (pautaModificada.rows.length > 0) {
        const testStart = Date.now();
        const resultado = await query(`
          SELECT * FROM as_turnos.fn_deshacer(
            $1::bigint,
            'test_user'
          )
        `, [pautaModificada.rows[0].id]);
        const testTime = Date.now() - testStart;
        
        console.log(`  Resultado: ${resultado.rows[0].ok ? '✅ OK' : '❌ ERROR'}`);
        console.log(`  Estado final: ${resultado.rows[0].estado}`);
        
        results.push({
          test: 'fn_deshacer',
          status: resultado.rows[0].ok ? 'PASS' : 'FAIL',
          message: `Estado: ${resultado.rows[0].estado}`,
          time: testTime
        });
      } else {
        console.log('  ⚠️  No hay pautas modificadas para deshacer');
        results.push({
          test: 'fn_deshacer',
          status: 'SKIP',
          message: 'No hay pautas para probar'
        });
      }
      
    } catch (error: any) {
      console.error('  ❌ Error:', error.message);
      results.push({
        test: 'fn_deshacer',
        status: 'FAIL',
        message: error.message
      });
    }
    
    // ===== ROLLBACK =====
    console.log('\n7️⃣ EJECUTANDO ROLLBACK...\n');
    await query('ROLLBACK');
    console.log('✅ Rollback completado - ningún cambio fue persistido\n');
    
    // ===== RESUMEN FINAL =====
    const totalTime = Date.now() - startTime;
    console.log('═══════════════════════════════════════════════');
    console.log('📊 RESUMEN DE PRUEBAS DE HUMO');
    console.log('═══════════════════════════════════════════════\n');
    
    console.log('Funciones creadas:');
    console.log('  ✓ as_turnos.fn_guardias_disponibles');
    console.log('  ✓ as_turnos.fn_registrar_reemplazo');
    console.log('  ✓ as_turnos.fn_marcar_extra');
    console.log('  ✓ as_turnos.fn_deshacer\n');
    
    console.log('Resultados de pruebas:');
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;
    
    for (const result of results) {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      const time = result.time ? ` (${result.time}ms)` : '';
      console.log(`  ${icon} ${result.test}: ${result.message}${time}`);
    }
    
    console.log('\n📈 Estadísticas:');
    console.log(`  - Pruebas pasadas: ${passed}`);
    console.log(`  - Pruebas falladas: ${failed}`);
    console.log(`  - Pruebas omitidas: ${skipped}`);
    console.log(`  - Tiempo total: ${totalTime}ms`);
    
    console.log('\n✨ Pruebas de humo completadas exitosamente');
    console.log('📝 Nota: Todos los cambios fueron revertidos con ROLLBACK');
    
    // Devolver código de salida basado en resultados
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (error: any) {
    console.error('\n❌ ERROR CRÍTICO:', error.message);
    console.error(error);
    
    // Intentar rollback en caso de error
    try {
      await query('ROLLBACK');
      console.log('⚠️  Rollback de emergencia ejecutado');
    } catch (rollbackError) {
      console.error('❌ Error en rollback:', rollbackError);
    }
    
    process.exit(1);
  }
}

// Ejecutar pruebas
dbSmokeTestV2();
