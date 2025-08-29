#!/usr/bin/env tsx

import { sql } from '@vercel/postgres';

// Definir todos los módulos que deberían existir
const MODULOS_ESPERADOS = [
  'home',
  'clientes', 
  'instalaciones',
  'guardias',
  'pauta_mensual',
  'pauta_diaria',
  'payroll',
  'configuracion',
  'documentos',
  'alertas',
  'asignaciones',
  'turnos_extras',
  'usuarios',
  'roles',
  'permisos',
  'tenants',
  'ppc',
  'estructuras',
  'sueldos',
  'planillas',
  'logs'
];

// Permisos básicos que cada módulo debería tener
const PERMISOS_BASICOS = ['view', 'create', 'edit', 'delete'];

async function verificarPermisosCreados() {
  try {
    console.log('🔍 VERIFICANDO PERMISOS CREADOS');
    console.log('================================\n');

    // 1. Obtener todos los permisos existentes
    console.log('📋 1. OBTENIENDO PERMISOS EXISTENTES...');
    const permisosResult = await sql`
      SELECT id, clave, descripcion, categoria
      FROM permisos
      ORDER BY categoria NULLS FIRST, clave
    `;

    const permisosExistentes = permisosResult.rows;
    console.log(`   Total de permisos encontrados: ${permisosExistentes.length}\n`);

    // 2. Verificar permisos por módulo
    console.log('📊 2. VERIFICACIÓN POR MÓDULO:');
    console.log('==============================');

    let modulosCompletos = 0;
    let modulosIncompletos = 0;
    let modulosSinPermisos = 0;

    MODULOS_ESPERADOS.forEach(modulo => {
      const permisosModulo = permisosExistentes.filter(p => p.clave.startsWith(`${modulo}.`));
      
      console.log(`\n🏢 MÓDULO: ${modulo.toUpperCase()}`);
      console.log(`   Permisos encontrados: ${permisosModulo.length}/4`);
      
      if (permisosModulo.length === 0) {
        console.log(`   ❌ NO HAY PERMISOS DEFINIDOS`);
        modulosSinPermisos++;
      } else if (permisosModulo.length === 4) {
        console.log(`   ✅ MÓDULO COMPLETO`);
        permisosModulo.forEach(p => {
          console.log(`      ✅ ${p.clave}`);
        });
        modulosCompletos++;
      } else {
        console.log(`   ⚠️  MÓDULO INCOMPLETO`);
        permisosModulo.forEach(p => {
          console.log(`      ✅ ${p.clave}`);
        });
        
        // Mostrar permisos faltantes
        PERMISOS_BASICOS.forEach(permisoBasico => {
          const permisoCompleto = `${modulo}.${permisoBasico}`;
          const existe = permisosModulo.some(p => p.clave === permisoCompleto);
          if (!existe) {
            console.log(`      ❌ FALTA: ${permisoCompleto}`);
          }
        });
        modulosIncompletos++;
      }
    });

    // 3. Resumen general
    console.log('\n📈 3. RESUMEN GENERAL:');
    console.log('======================');
    console.log(`   ✅ Módulos completos: ${modulosCompletos}`);
    console.log(`   ⚠️  Módulos incompletos: ${modulosIncompletos}`);
    console.log(`   ❌ Módulos sin permisos: ${modulosSinPermisos}`);
    console.log(`   📊 Total de módulos analizados: ${MODULOS_ESPERADOS.length}`);
    console.log(`   🔢 Total de permisos en BD: ${permisosExistentes.length}`);

    // 4. Mostrar permisos no clasificados
    const permisosNoClasificados = permisosExistentes.filter(p => {
      return !MODULOS_ESPERADOS.some(modulo => p.clave.startsWith(`${modulo}.`));
    });

    if (permisosNoClasificados.length > 0) {
      console.log('\n🔧 4. PERMISOS NO CLASIFICADOS:');
      console.log('================================');
      permisosNoClasificados.forEach(p => {
        console.log(`   📝 ${p.clave} (${p.categoria || 'Sin categoría'})`);
      });
    }

    // 5. Verificar permisos especiales del Super Admin
    console.log('\n👑 5. PERMISOS ESPECIALES DEL SUPER ADMIN:');
    console.log('==========================================');
    const permisosEspeciales = permisosExistentes.filter(p => 
      p.clave.includes('rbac.') || p.clave.includes('admin') || p.clave.includes('platform')
    );
    permisosEspeciales.forEach(p => {
      console.log(`   👑 ${p.clave} (${p.categoria || 'Sin categoría'})`);
    });

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

verificarPermisosCreados();
