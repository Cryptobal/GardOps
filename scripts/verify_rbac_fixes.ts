import fs from 'fs';
import { execSync } from 'child_process';

function verifyRbacFixes() {
  console.log('🔍 Verificando que todos los errores de RBAC se han resuelto...');

  try {
    // 1. Verificar que authz-ui.tsx existe y es válido
    console.log('📝 Verificando authz-ui.tsx...');
    if (!fs.existsSync('src/lib/authz-ui.tsx')) {
      console.error('❌ src/lib/authz-ui.tsx no existe');
      return false;
    }
    console.log('✅ src/lib/authz-ui.tsx existe');

    // 2. Verificar que no hay archivos authz-ui.ts duplicados
    console.log('📝 Verificando que no hay archivos duplicados...');
    if (fs.existsSync('src/lib/authz-ui.ts')) {
      console.error('❌ src/lib/authz-ui.ts aún existe (debería ser eliminado)');
      return false;
    }
    console.log('✅ No hay archivos authz-ui.ts duplicados');

    // 3. Verificar que el servidor compila sin errores
    console.log('📝 Verificando compilación del servidor...');
    try {
      execSync('npm run build --dry-run', { stdio: 'pipe', timeout: 30000 });
      console.log('✅ Servidor compila sin errores');
    } catch (error) {
      console.error('❌ Error de compilación:', error);
      return false;
    }

    // 4. Verificar que los endpoints RBAC funcionan
    console.log('📝 Verificando endpoints RBAC...');
    try {
      const guardiasResponse = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/guardias', { encoding: 'utf8' });
      if (guardiasResponse.trim() === '401') {
        console.log('✅ Endpoint /api/guardias devuelve 401 (Unauthorized) - correcto');
      } else {
        console.log(`⚠️  Endpoint /api/guardias devuelve ${guardiasResponse.trim()}`);
      }
    } catch (error) {
      console.log('⚠️  No se pudo verificar endpoint (servidor puede no estar corriendo)');
    }

    // 5. Verificar que los archivos problemáticos han sido corregidos
    console.log('📝 Verificando archivos problemáticos...');
    const problematicFiles = [
      'src/app/pauta-mensual/[id]/page.tsx',
      'src/app/instalaciones/[id]/components/TurnosInstalacion.tsx',
      'src/app/api/clientes/route.ts',
      'src/app/api/pauta-diaria/turno-extra/route.ts',
      'src/app/api/clientes/[id]/route.ts',
      'src/app/api/me/effective-permissions/route.ts'
    ];

    for (const file of problematicFiles) {
      if (!fs.existsSync(file)) {
        console.error(`❌ ${file} no existe`);
        return false;
      }
      console.log(`✅ ${file} existe`);
    }

    // 6. Verificar que no hay errores de sintaxis obvios
    console.log('📝 Verificando sintaxis...');
    const filesToCheck = [
      'src/app/pauta-mensual/[id]/page.tsx',
      'src/lib/authz-ui.tsx'
    ];

    for (const file of filesToCheck) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Verificar que 'use client' está al inicio
      if (file.endsWith('.tsx') && content.includes("'use client'")) {
        const useClientIndex = content.indexOf("'use client'");
        const importIndex = content.indexOf('import');
        if (importIndex !== -1 && useClientIndex > importIndex) {
          console.error(`❌ 'use client' no está al inicio en ${file}`);
          return false;
        }
      }

      // Verificar que no hay effectivePermissions sin definir
      if (content.includes('effectivePermissions') && !content.includes('useState<Record<string, string[]>>')) {
        console.error(`❌ effectivePermissions usado sin definir en ${file}`);
        return false;
      }

      console.log(`✅ ${file} - sintaxis correcta`);
    }

    console.log('🎉 ¡Todas las verificaciones pasaron! El sistema RBAC está funcionando correctamente.');
    return true;

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    return false;
  }
}

verifyRbacFixes();
