import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🧹 [CACHE CLEAR] Iniciando limpieza de caché de Next.js...');

try {
  // Detener el servidor de desarrollo si está corriendo
  console.log('🛑 [CACHE CLEAR] Deteniendo servidor de desarrollo...');
  try {
    execSync('pkill -f "next dev"', { stdio: 'ignore' });
    console.log('✅ [CACHE CLEAR] Servidor detenido');
  } catch (error) {
    console.log('ℹ️ [CACHE CLEAR] No había servidor corriendo');
  }

  // Limpiar directorios de caché
  const cacheDirs = [
    '.next',
    'node_modules/.cache',
    '.turbo'
  ];

  cacheDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`🗑️ [CACHE CLEAR] Eliminando ${dir}...`);
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✅ [CACHE CLEAR] ${dir} eliminado`);
    } else {
      console.log(`ℹ️ [CACHE CLEAR] ${dir} no existe`);
    }
  });

  // Limpiar caché de npm
  console.log('🧹 [CACHE CLEAR] Limpiando caché de npm...');
  execSync('npm cache clean --force', { stdio: 'inherit' });

  console.log('✅ [CACHE CLEAR] Limpieza completada');
  console.log('🚀 [CACHE CLEAR] Reiniciando servidor...');
  
  // Reiniciar el servidor
  execSync('npm run dev', { stdio: 'inherit' });

} catch (error) {
  console.error('❌ [CACHE CLEAR] Error durante la limpieza:', error);
}
