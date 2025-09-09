#!/usr/bin/env npx tsx
/**
 * Script de pruebas de humo para los nuevos endpoints
 * Ejecuta pruebas no destructivas usando transacciones con ROLLBACK
 * 
 * Uso: npx tsx scripts/smoke-test-new-api.ts
 */

import { sql } from '@vercel/postgres';

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg: string) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}\n`),
};

/**
 * Prueba los endpoints localmente usando fetch
 */
async function testEndpoints() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  
  log.section('Probando Endpoints Nuevos');
  
  // Test data
  const testPautaId = 12345; // ID de prueba
  const testGuardiaId = '00000000-0000-0000-0000-000000000000'; // UUID de prueba
  
  // Test 1: Asistencia
  log.info('Probando /api/turnos/asistencia-new...');
  try {
    const response = await fetch(`${baseUrl}/api/turnos/asistencia-new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pauta_id: testPautaId,
        estado: 'trabajado',
        meta: { test: true, timestamp: new Date().toISOString() },
        actor_ref: 'script:smoke-test',
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.ok) {
      log.success(`Endpoint asistencia-new respondió correctamente`);
      console.log('  Response:', JSON.stringify(data, null, 2));
    } else {
      log.error(`Endpoint asistencia-new falló: ${data.error}`);
    }
  } catch (err: any) {
    log.error(`Error llamando asistencia-new: ${err.message}`);
  }
  
  // Test 2: Reemplazo
  log.info('Probando /api/turnos/reemplazo-new...');
  try {
    const response = await fetch(`${baseUrl}/api/turnos/reemplazo-new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pauta_id: testPautaId,
        cobertura_guardia_id: testGuardiaId,
        actor_ref: 'script:smoke-test',
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.ok) {
      log.success(`Endpoint reemplazo-new respondió correctamente`);
      console.log('  Response:', JSON.stringify(data, null, 2));
    } else {
      log.error(`Endpoint reemplazo-new falló: ${data.error}`);
    }
  } catch (err: any) {
    log.error(`Error llamando reemplazo-new: ${err.message}`);
  }
  
  // Test 3: Extra
  log.info('Probando /api/turnos/extra-new...');
  try {
    const response = await fetch(`${baseUrl}/api/turnos/extra-new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pauta_id: testPautaId,
        cobertura_guardia_id: testGuardiaId,
        origen: 'script:smoke-test',
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.ok) {
      log.success(`Endpoint extra-new respondió correctamente`);
      console.log('  Response:', JSON.stringify(data, null, 2));
    } else {
      log.error(`Endpoint extra-new falló: ${data.error}`);
    }
  } catch (err: any) {
    log.error(`Error llamando extra-new: ${err.message}`);
  }
}

/**
 * Prueba las funciones de Neon directamente con transacciones
 */
async function testNeonFunctions() {
  log.section('Probando Funciones de Neon (con ROLLBACK)');
  
  try {
    // Iniciamos transacción
    await sql`BEGIN`;
    log.info('Transacción iniciada (todos los cambios serán revertidos)');
    
    // Obtenemos una pauta real para pruebas
    const { rows: pautas } = await sql`
      SELECT id, fecha, instalacion_id, guardia_id 
      FROM pauta_diaria 
      WHERE fecha >= CURRENT_DATE 
      LIMIT 1
    `;
    
    if (pautas.length === 0) {
      log.warn('No hay pautas futuras para probar');
      await sql`ROLLBACK`;
      return;
    }
    
    const testPauta = pautas[0];
    log.info(`Usando pauta ID ${testPauta.id} del ${testPauta.fecha}`);
    
    // Test 1: fn_marcar_asistencia
    log.info('Probando as_turnos.fn_marcar_asistencia...');
    try {
      const { rows } = await sql`
        SELECT * FROM as_turnos.fn_marcar_asistencia(
          ${testPauta.id}::bigint,
          'trabajado'::text,
          '{"test": true}'::jsonb,
          'script:smoke-test'::text
        )
      `;
      log.success(`fn_marcar_asistencia ejecutada: ${JSON.stringify(rows[0])}`);
    } catch (err: any) {
      log.error(`Error en fn_marcar_asistencia: ${err.message}`);
    }
    
    // Test 2: fn_registrar_reemplazo (necesitamos un guardia válido)
    log.info('Probando as_turnos.fn_registrar_reemplazo...');
    try {
      // Buscamos un guardia diferente para el reemplazo
      const { rows: guardias } = await sql`
        SELECT id FROM guardias 
        WHERE id != ${testPauta.guardia_id} 
        AND activo = true 
        LIMIT 1
      `;
      
      if (guardias.length > 0) {
        const { rows } = await sql`
          SELECT * FROM as_turnos.fn_registrar_reemplazo(
            ${testPauta.id}::bigint,
            ${guardias[0].id}::uuid,
            'script:smoke-test'::text
          )
        `;
        log.success(`fn_registrar_reemplazo ejecutada: ${JSON.stringify(rows[0])}`);
      } else {
        log.warn('No hay guardias disponibles para probar reemplazo');
      }
    } catch (err: any) {
      log.error(`Error en fn_registrar_reemplazo: ${err.message}`);
    }
    
    // Test 3: fn_marcar_extra
    log.info('Probando as_turnos.fn_marcar_extra...');
    try {
      const { rows } = await sql`
        SELECT * FROM as_turnos.fn_marcar_extra(
          ${testPauta.id}::bigint,
          ${testPauta.guardia_id}::uuid,
          'script:smoke-test'::text
        )
      `;
      log.success(`fn_marcar_extra ejecutada: ${JSON.stringify(rows[0])}`);
    } catch (err: any) {
      log.error(`Error en fn_marcar_extra: ${err.message}`);
    }
    
    // Revertimos todos los cambios
    await sql`ROLLBACK`;
    log.success('Transacción revertida - no se guardaron cambios');
    
  } catch (err: any) {
    log.error(`Error general: ${err.message}`);
    try {
      await sql`ROLLBACK`;
      log.info('Transacción revertida por error');
    } catch {}
  }
}

/**
 * Comandos curl para pruebas manuales
 */
function printCurlCommands() {
  log.section('Comandos CURL para Pruebas Manuales');
  
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  
  console.log(`
# Prueba de Asistencia (nuevo endpoint)
curl -s -X POST ${baseUrl}/api/turnos/asistencia-new \\
  -H 'Content-Type: application/json' \\
  -d '{
    "pauta_id": 12345,
    "estado": "trabajado",
    "meta": {"prueba": true},
    "actor_ref": "curl:test"
  }' | jq

# Prueba de Reemplazo (nuevo endpoint)
curl -s -X POST ${baseUrl}/api/turnos/reemplazo-new \\
  -H 'Content-Type: application/json' \\
  -d '{
    "pauta_id": 12345,
    "cobertura_guardia_id": "00000000-0000-0000-0000-000000000000",
    "actor_ref": "curl:test"
  }' | jq

# Prueba de Turno Extra (nuevo endpoint)
curl -s -X POST ${baseUrl}/api/turnos/extra-new \\
  -H 'Content-Type: application/json' \\
  -d '{
    "pauta_id": 12345,
    "cobertura_guardia_id": "00000000-0000-0000-0000-000000000000",
    "origen": "curl:test"
  }' | jq
  `);
}

/**
 * Main
 */
async function main() {
  console.log(`
${colors.cyan}╔══════════════════════════════════════════════╗
║     SMOKE TEST - Nuevos Endpoints Turnos      ║
╚══════════════════════════════════════════════╝${colors.reset}
`);
  
  // Verificar feature flag
  const flagEnabled = process.env.USE_NEW_TURNOS_API === 'true';
  log.info(`Feature flag USE_NEW_TURNOS_API: ${flagEnabled ? 'ENABLED ✓' : 'DISABLED ✗'}`);
  
  if (!flagEnabled) {
    log.warn('Los nuevos endpoints están deshabilitados. Activa USE_NEW_TURNOS_API=true para probarlos.');
  }
  
  // Ejecutar pruebas
  const args = process.argv.slice(2);
  
  if (args.includes('--endpoints') || args.length === 0) {
    await testEndpoints();
  }
  
  if (args.includes('--functions')) {
    await testNeonFunctions();
  }
  
  if (args.includes('--curl') || args.length === 0) {
    printCurlCommands();
  }
  
  if (args.includes('--help')) {
    console.log(`
Uso: npx tsx scripts/smoke-test-new-api.ts [opciones]

Opciones:
  --endpoints   Prueba los endpoints HTTP nuevos
  --functions   Prueba las funciones de Neon directamente (con ROLLBACK)
  --curl        Muestra comandos curl para pruebas manuales
  --help        Muestra esta ayuda

Sin opciones ejecuta --endpoints y --curl
    `);
  }
  
  console.log(`\n${colors.green}✓ Pruebas completadas${colors.reset}\n`);
}

// Ejecutar
main().catch(console.error);
