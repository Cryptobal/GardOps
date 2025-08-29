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

async function auditPermisosModulos() {
  try {
    console.log('🔍 AUDITORÍA DE PERMISOS POR MÓDULO');
    console.log('====================================\n');

    // 1. Obtener todos los permisos existentes
    console.log('📋 1. PERMISOS EXISTENTES EN LA BASE DE DATOS:');
    const permisosResult = await sql`
      SELECT id, clave, descripcion, categoria
      FROM permisos
      ORDER BY categoria NULLS FIRST, clave
    `;

    const permisosExistentes = permisosResult.rows;
    console.log(`   Total de permisos encontrados: ${permisosExistentes.length}\n`);

    // 2. Analizar permisos por módulo
    console.log('📊 2. ANÁLISIS POR MÓDULO:');
    console.log('==========================');

    const analisisModulos: Record<string, {
      permisos: string[],
      faltantes: string[],
      extras: string[]
    }> = {};

    // Inicializar análisis para cada módulo esperado
    MODULOS_ESPERADOS.forEach(modulo => {
      analisisModulos[modulo] = {
        permisos: [],
        faltantes: [],
        extras: []
      };
    });

    // Clasificar permisos existentes por módulo
    permisosExistentes.forEach(permiso => {
      const clave = permiso.clave;
      
      // Buscar el módulo correspondiente
      let moduloEncontrado = false;
      
      for (const modulo of MODULOS_ESPERADOS) {
        if (clave.startsWith(modulo + '.')) {
          analisisModulos[modulo].permisos.push(clave);
          moduloEncontrado = true;
          break;
        }
      }

      // Si no coincide con ningún módulo esperado, buscar otros patrones
      if (!moduloEncontrado) {
        if (clave.includes('rbac')) {
          analisisModulos['roles'].permisos.push(clave);
        } else if (clave.includes('admin')) {
          analisisModulos['usuarios'].permisos.push(clave);
        } else {
          // Agregar a un módulo "otros" o al módulo más cercano
          console.log(`   ⚠️  Permiso no clasificado: ${clave}`);
        }
      }
    });

    // Verificar permisos faltantes y extras para cada módulo
    MODULOS_ESPERADOS.forEach(modulo => {
      const analisis = analisisModulos[modulo];
      const permisosModulo = analisis.permisos;
      
      console.log(`\n🏢 MÓDULO: ${modulo.toUpperCase()}`);
      console.log(`   Permisos encontrados (${permisosModulo.length}):`);
      
      if (permisosModulo.length === 0) {
        console.log(`   ❌ NO HAY PERMISOS DEFINIDOS`);
        analisis.faltantes = PERMISOS_BASICOS;
      } else {
        permisosModulo.forEach(permiso => {
          console.log(`   ✅ ${permiso}`);
        });

        // Verificar permisos básicos faltantes
        PERMISOS_BASICOS.forEach(permisoBasico => {
          const permisoCompleto = `${modulo}.${permisoBasico}`;
          if (!permisosModulo.includes(permisoCompleto)) {
            analisis.faltantes.push(permisoBasico);
          }
        });

        // Identificar permisos extras
        permisosModulo.forEach(permiso => {
          const accion = permiso.split('.')[1];
          if (!PERMISOS_BASICOS.includes(accion)) {
            analisis.extras.push(accion);
          }
        });
      }

      if (analisis.faltantes.length > 0) {
        console.log(`   ❌ PERMISOS FALTANTES: ${analisis.faltantes.join(', ')}`);
      }
      
      if (analisis.extras.length > 0) {
        console.log(`   🔧 PERMISOS EXTRAS: ${analisis.extras.join(', ')}`);
      }
    });

    // 3. Resumen general
    console.log('\n📈 3. RESUMEN GENERAL:');
    console.log('======================');
    
    let modulosSinPermisos = 0;
    let modulosIncompletos = 0;
    let modulosCompletos = 0;

    MODULOS_ESPERADOS.forEach(modulo => {
      const analisis = analisisModulos[modulo];
      if (analisis.permisos.length === 0) {
        modulosSinPermisos++;
      } else if (analisis.faltantes.length > 0) {
        modulosIncompletos++;
      } else {
        modulosCompletos++;
      }
    });

    console.log(`   ✅ Módulos completos: ${modulosCompletos}`);
    console.log(`   ⚠️  Módulos incompletos: ${modulosIncompletos}`);
    console.log(`   ❌ Módulos sin permisos: ${modulosSinPermisos}`);
    console.log(`   📊 Total de módulos analizados: ${MODULOS_ESPERADOS.length}`);

    // 4. Lista de permisos que faltan crear
    console.log('\n🔧 4. PERMISOS QUE FALTAN CREAR:');
    console.log('================================');
    
    let totalFaltantes = 0;
    MODULOS_ESPERADOS.forEach(modulo => {
      const analisis = analisisModulos[modulo];
      if (analisis.faltantes.length > 0) {
        console.log(`\n   📋 ${modulo.toUpperCase()}:`);
        analisis.faltantes.forEach(permiso => {
          console.log(`      INSERT INTO permisos (clave, descripcion, categoria) VALUES ('${modulo}.${permiso}', '${permiso} ${modulo}', '${modulo}');`);
          totalFaltantes++;
        });
      }
    });

    console.log(`\n   📊 Total de permisos faltantes: ${totalFaltantes}`);

  } catch (error) {
    console.error('❌ Error durante la auditoría:', error);
  }
}

auditPermisosModulos();
