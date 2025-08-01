#!/usr/bin/env ts-node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function diagnosticarServidor() {
  console.log('🔍 Diagnóstico del servidor GardOps...\n');

  try {
    // Verificar si el servidor está ejecutándose
    console.log('1. Verificando estado del servidor...');
    const { stdout: psOutput } = await execAsync("ps aux | grep 'next dev' | grep -v grep");
    
    if (psOutput.trim()) {
      console.log('✅ Servidor Next.js está ejecutándose');
    } else {
      console.log('❌ Servidor Next.js no está ejecutándose');
      return;
    }

    // Verificar respuesta del servidor
    console.log('\n2. Verificando respuesta del servidor...');
    const { stdout: curlOutput } = await execAsync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000');
    
    if (curlOutput.trim() === '200') {
      console.log('✅ Servidor responde correctamente (HTTP 200)');
    } else {
      console.log(`❌ Servidor responde con código: ${curlOutput.trim()}`);
    }

    // Verificar archivos estáticos críticos
    console.log('\n3. Verificando archivos estáticos...');
    
    const archivosEstaticos = [
      '/_next/static/chunks/main-app.js',
      '/_next/static/chunks/app-pages-internals.js',
      '/_next/static/chunks/app/page.js',
      '/icon'
    ];

    for (const archivo of archivosEstaticos) {
      try {
        const { stdout: statusCode } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000${archivo}`);
        if (statusCode.trim() === '200') {
          console.log(`✅ ${archivo} - OK`);
        } else {
          console.log(`❌ ${archivo} - Error ${statusCode.trim()}`);
        }
      } catch (error) {
        console.log(`❌ ${archivo} - Error de conexión`);
      }
    }

    // Verificar compilación de TypeScript
    console.log('\n4. Verificando compilación de TypeScript...');
    try {
      await execAsync('npx tsc --noEmit');
      console.log('✅ Compilación de TypeScript sin errores');
    } catch (error) {
      console.log('❌ Errores en la compilación de TypeScript');
    }

    // Verificar dependencias
    console.log('\n5. Verificando dependencias...');
    try {
      const { stdout: auditOutput } = await execAsync('npm audit --audit-level=high');
      if (auditOutput.includes('found 0 vulnerabilities')) {
        console.log('✅ No hay vulnerabilidades críticas');
      } else {
        console.log('⚠️  Se encontraron vulnerabilidades');
      }
    } catch (error) {
      console.log('❌ Error al verificar dependencias');
    }

    console.log('\n🎉 Diagnóstico completado!');
    console.log('\nSi todos los checks están en verde, tu servidor está funcionando correctamente.');
    console.log('Si hay errores, revisa los logs del servidor con: npm run dev');

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  }
}

diagnosticarServidor(); 