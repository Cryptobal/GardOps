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

async function crearPermisosFaltantes() {
  try {
    console.log('🔧 CREANDO PERMISOS FALTANTES');
    console.log('==============================\n');

    // 1. Obtener todos los permisos existentes
    console.log('📋 1. OBTENIENDO PERMISOS EXISTENTES...');
    const permisosResult = await sql`
      SELECT id, clave, descripcion, categoria
      FROM permisos
      ORDER BY categoria NULLS FIRST, clave
    `;

    const permisosExistentes = permisosResult.rows;
    console.log(`   Total de permisos existentes: ${permisosExistentes.length}\n`);

    // 2. Identificar permisos faltantes
    console.log('🔍 2. IDENTIFICANDO PERMISOS FALTANTES...');
    const permisosFaltantes: Array<{modulo: string, permiso: string, clave: string, descripcion: string, categoria: string}> = [];

    MODULOS_ESPERADOS.forEach(modulo => {
      PERMISOS_BASICOS.forEach(permisoBasico => {
        const clave = `${modulo}.${permisoBasico}`;
        const existe = permisosExistentes.some(p => p.clave === clave);
        
        if (!existe) {
          permisosFaltantes.push({
            modulo,
            permiso: permisoBasico,
            clave,
            descripcion: `${permisoBasico} ${modulo}`,
            categoria: modulo
          });
        }
      });
    });

    console.log(`   Permisos faltantes identificados: ${permisosFaltantes.length}\n`);

    if (permisosFaltantes.length === 0) {
      console.log('✅ No hay permisos faltantes. Todos los módulos tienen sus permisos básicos.');
      return;
    }

    // 3. Crear permisos faltantes
    console.log('🔧 3. CREANDO PERMISOS FALTANTES...');
    let creados = 0;
    let errores = 0;

    for (const permiso of permisosFaltantes) {
      try {
        const result = await sql`
          INSERT INTO permisos (clave, descripcion, categoria)
          VALUES (${permiso.clave}, ${permiso.descripcion}, ${permiso.categoria})
          ON CONFLICT (clave) DO NOTHING
        `;
        
        if (result.rowCount > 0) {
          console.log(`   ✅ Creado: ${permiso.clave}`);
          creados++;
        } else {
          console.log(`   ⚠️  Ya existía: ${permiso.clave}`);
        }
      } catch (error) {
        console.error(`   ❌ Error creando ${permiso.clave}:`, error);
        errores++;
      }
    }

    console.log(`\n📊 RESUMEN:`);
    console.log(`   ✅ Permisos creados: ${creados}`);
    console.log(`   ⚠️  Ya existían: ${permisosFaltantes.length - creados - errores}`);
    console.log(`   ❌ Errores: ${errores}`);

    // 4. Verificar resultado final
    console.log('\n🔍 4. VERIFICANDO RESULTADO FINAL...');
    const permisosFinales = await sql`
      SELECT id, clave, descripcion, categoria
      FROM permisos
      ORDER BY categoria NULLS FIRST, clave
    `;

    console.log(`   Total de permisos después de la creación: ${permisosFinales.rows.length}`);

    // 5. Mostrar permisos por módulo
    console.log('\n📋 5. PERMISOS POR MÓDULO:');
    MODULOS_ESPERADOS.forEach(modulo => {
      const permisosModulo = permisosFinales.rows.filter(p => p.clave.startsWith(`${modulo}.`));
      console.log(`\n   🏢 ${modulo.toUpperCase()} (${permisosModulo.length} permisos):`);
      permisosModulo.forEach(p => {
        console.log(`      ✅ ${p.clave}`);
      });
    });

  } catch (error) {
    console.error('❌ Error durante la creación de permisos:', error);
  }
}

crearPermisosFaltantes();
