// Script de auditoría de parámetros de sueldos
// Compara los parámetros de la imagen con la base de datos actual
// Ejecutar con: npx tsx scripts/auditoria-parametros-sueldos.ts

import { query } from '../src/lib/database';

interface ParametroImagen {
  nombre: string;
  valor: string | number;
  descripcion: string;
  tabla: string;
}

async function auditoriaParametrosSueldos() {
  console.log('🔍 AUDITORÍA COMPLETA DE PARÁMETROS DE SUELDOS');
  console.log('='.repeat(60));
  console.log('Revisando estructura actual vs parámetros de la imagen\n');

  try {
    // 1. VERIFICAR ESTRUCTURA DE TABLAS EXISTENTES
    console.log('📊 1. ESTRUCTURA DE TABLAS ACTUALES');
    console.log('-'.repeat(40));

    const tablas = [
      'sueldo_valor_uf',
      'sueldo_parametros_generales', 
      'sueldo_afp',
      'sueldo_isapre',
      'sueldo_mutualidad',
      'sueldo_tramos_impuesto'
    ];

    const estructuras: { [key: string]: any[] } = {};

    for (const tabla of tablas) {
      console.log(`\n📋 Tabla: ${tabla}`);
      
      // Verificar si existe
      const existe = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tabla]);

      if (!existe.rows[0].exists) {
        console.log('   ❌ NO EXISTE');
        estructuras[tabla] = [];
        continue;
      }

      // Obtener estructura
      const estructura = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position;
      `, [tabla]);

      estructuras[tabla] = estructura.rows;
      
      console.log('   ✅ EXISTE con columnas:');
      estructura.rows.forEach((col: any) => {
        console.log(`      - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });

      // Contar registros
      const count = await query(`SELECT COUNT(*) as count FROM ${tabla}`);
      console.log(`   📊 Registros: ${count.rows[0].count}`);
    }

    // 2. VERIFICAR DATOS ACTUALES
    console.log('\n📊 2. DATOS ACTUALES EN LAS TABLAS');
    console.log('-'.repeat(40));

    // Parámetros generales
    console.log('\n⚙️ Parámetros Generales:');
    const parametrosActuales = await query(`
      SELECT parametro, valor
      FROM sueldo_parametros_generales 
      ORDER BY parametro
    `);
    
    if (parametrosActuales.rows.length > 0) {
      parametrosActuales.rows.forEach((p: any) => {
        console.log(`   - ${p.parametro}: ${p.valor}`);
      });
    } else {
      console.log('   (Sin datos)');
    }

    // AFPs
    console.log('\n🏦 AFPs:');
    const afpsActuales = await query(`
      SELECT nombre, comision, porcentaje_fondo
      FROM sueldo_afp 
      ORDER BY nombre
    `);
    
    if (afpsActuales.rows.length > 0) {
      afpsActuales.rows.forEach((a: any) => {
        console.log(`   - ${a.nombre}: Comisión ${a.comision}% | Fondo ${a.porcentaje_fondo}%`);
      });
    } else {
      console.log('   (Sin datos)');
    }

    // Tramos de impuesto
    console.log('\n💰 Tramos de Impuesto:');
    const tramosActuales = await query(`
      SELECT tramo, desde, hasta, factor, rebaja
      FROM sueldo_tramos_impuesto 
      ORDER BY tramo
    `);
    
    if (tramosActuales.rows.length > 0) {
      tramosActuales.rows.forEach((t: any) => {
        console.log(`   - Tramo ${t.tramo}: ${t.desde} - ${t.hasta || 'Sin límite'} | Factor: ${t.factor} | Rebaja: ${t.rebaja}`);
      });
    } else {
      console.log('   (Sin datos)');
    }

    // 3. COMPARAR CON PARÁMETROS DE LA IMAGEN
    console.log('\n📊 3. COMPARACIÓN CON PARÁMETROS DE LA IMAGEN');
    console.log('-'.repeat(40));

    // Parámetros que aparecen en la imagen "Indicadores"
    const parametrosImagen: ParametroImagen[] = [
      // UF Último Día
      { nombre: 'UF_ULTIMO_DIA', valor: 39133, descripcion: 'Valor UF último día del mes', tabla: 'sueldo_valor_uf' },
      
      // Factores SIS, SS, AFP
      { nombre: 'FAC_SIS', valor: 0.0188, descripcion: 'Factor SIS (Seguro de Invalidez y Sobrevivencia)', tabla: 'sueldo_parametros_generales' },
      { nombre: 'FAC_SS', valor: 0.009, descripcion: 'Factor SS (Seguro Social)', tabla: 'sueldo_parametros_generales' },
      { nombre: 'FAC_AFP_EMP', valor: 0.001, descripcion: 'Factor AFP Empleador', tabla: 'sueldo_parametros_generales' },
      { nombre: 'FAC_RENT_PROT', valor: 0.009, descripcion: 'Factor Renta Protegida', tabla: 'sueldo_parametros_generales' },
      
      // Topes en UF
      { nombre: 'UF_TOPE_AFP', valor: 87.8, descripcion: 'UF Tope AFP', tabla: 'sueldo_parametros_generales' },
      { nombre: 'UF_TOPE_AFC', valor: 131.9, descripcion: 'UF Tope AFC', tabla: 'sueldo_parametros_generales' },
      { nombre: 'UF_TOPE_INP', valor: 60, descripcion: 'UF Tope INP', tabla: 'sueldo_parametros_generales' },
      { nombre: 'UF_TOPE_APV_MENSUAL', valor: 50, descripcion: 'UF Tope APV Mensual', tabla: 'sueldo_parametros_generales' },
      { nombre: 'UF_TOPE_APV_ANUAL', valor: 600, descripcion: 'UF Tope APV Anual', tabla: 'sueldo_parametros_generales' },
      
      // Ingresos mínimos
      { nombre: 'MIN_IMPO', valor: 529000, descripcion: 'Mínimo imponible general', tabla: 'sueldo_parametros_generales' },
      { nombre: 'MIN_IMPO_18_65', valor: 394622, descripcion: 'Mínimo imponible -18 +65 años', tabla: 'sueldo_parametros_generales' },
      { nombre: 'MIN_IMPO_TRAB_CASA_PART', valor: 529000, descripcion: 'Mínimo imponible trabajador casa particular', tabla: 'sueldo_parametros_generales' },
      
      // AFC
      { nombre: 'AFC_EMP_INDEF', valor: 0.024, descripcion: 'AFC Empleador Indefinido', tabla: 'sueldo_parametros_generales' },
      { nombre: 'AFC_EMP_FIJO', valor: 0.03, descripcion: 'AFC Empleador Fijo', tabla: 'sueldo_parametros_generales' },
      { nombre: 'AFC_EMPL_INDEF', valor: 0.006, descripcion: 'AFC Empleado Indefinido', tabla: 'sueldo_parametros_generales' },
      { nombre: 'AFC_EMPL_FIJO', valor: 0, descripcion: 'AFC Empleado Fijo', tabla: 'sueldo_parametros_generales' },
      
      // UTM
      { nombre: 'UTM', valor: 68647, descripcion: 'Unidad Tributaria Mensual', tabla: 'sueldo_parametros_generales' }
    ];

    // Parámetros de Asignación Familiar
    const asignacionFamiliar = [
      { tramo: '-', desde: 0, hasta: 0, monto: 0 },
      { tramo: 'A', desde: 1, hasta: 620251, monto: 22007 },
      { tramo: 'B', desde: 620252, hasta: 905941, monto: 13505 },
      { tramo: 'C', desde: 905942, hasta: 1412957, monto: 4267 },
      { tramo: 'D', desde: 1412958, hasta: null, monto: 0 }
    ];

    // Parámetros de Impuesto Único
    const impuestoUnico = [
      { desde: 0, hasta: 926735, factor: 0, rebaja: 0, tasa_max: 0 },
      { desde: 926735, hasta: 2059410, factor: 0.04, rebaja: 37069.38, tasa_max: 0.02 },
      { desde: 2059410, hasta: 3432350, factor: 0.08, rebaja: 119445.78, tasa_max: 0.05 },
      { desde: 3432350, hasta: 4805290, factor: 0.135, rebaja: 308225.03, tasa_max: 0.07 },
      { desde: 4805290, hasta: 6178230, factor: 0.23, rebaja: 764727.58, tasa_max: 0.11 },
      { desde: 6178230, hasta: 8237640, factor: 0.304, rebaja: 1221916.6, tasa_max: 0.16 },
      { desde: 8237640, hasta: 21280570, factor: 0.35, rebaja: 1600848.04, tasa_max: 0.27 }
    ];

    // AFPs con sus valores
    const afpsImagen = [
      { codigo: 'HABITAT', valor: 11.27 },
      { codigo: 'PROVIDA', valor: 11.45 },
      { codigo: 'PLANVITAL', valor: 11.16 },
      { codigo: 'CUPRUM', valor: 11.44 },
      { codigo: 'EMPART', valor: 21.84 },
      { codigo: 'INP_SSS', valor: 18.84 },
      { codigo: 'CAPITAL', valor: 11.44 },
      { codigo: 'MODELO', valor: 10.58 },
      { codigo: 'UNO', valor: 10.49 },
      { codigo: 'CADDEMED', valor: 20.2 }
    ];

    // Verificar parámetros generales
    console.log('\n⚙️ Parámetros que FALTAN en la base de datos:');
    console.log('='.repeat(50));
    
    const parametrosMap = new Map();
    parametrosActuales.rows.forEach((row: any) => {
      parametrosMap.set(row.parametro, row);
    });

    const parametrosFaltantes: ParametroImagen[] = [];
    
    for (const param of parametrosImagen) {
      if (!parametrosMap.has(param.nombre)) {
        parametrosFaltantes.push(param);
        console.log(`❌ ${param.nombre}: ${param.valor} - ${param.descripcion}`);
      } else {
        const existente = parametrosMap.get(param.nombre);
        if (Number(existente.valor) !== Number(param.valor)) {
          console.log(`⚠️  ${param.nombre}: Valor en BD (${existente.valor}) ≠ Imagen (${param.valor})`);
        }
      }
    }

    if (parametrosFaltantes.length === 0) {
      console.log('✅ Todos los parámetros están presentes');
    }

    // Verificar AFPs
    console.log('\n🏦 AFPs que FALTAN o tienen valores diferentes:');
    console.log('='.repeat(50));
    
    const afpsMap = new Map();
    afpsActuales.rows.forEach((row: any) => {
      afpsMap.set(row.nombre.toUpperCase(), row);
    });

    for (const afp of afpsImagen) {
      if (!afpsMap.has(afp.codigo)) {
        console.log(`❌ ${afp.codigo}: ${afp.valor}% - NO EXISTE`);
      } else {
        const existente = afpsMap.get(afp.codigo);
        const tasaActual = existente.comision + existente.porcentaje_fondo;
        if (Number(tasaActual) !== Number(afp.valor)) {
          console.log(`⚠️  ${afp.codigo}: BD (${tasaActual}%) ≠ Imagen (${afp.valor}%)`);
        }
      }
    }

    // Verificar asignación familiar
    console.log('\n👨‍👩‍👧‍👦 Asignación Familiar:');
    console.log('='.repeat(50));
    
    const tablaAsignacionExiste = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sueldo_asignacion_familiar'
      );
    `);

    if (!tablaAsignacionExiste.rows[0].exists) {
      console.log('❌ Tabla sueldo_asignacion_familiar NO EXISTE');
      console.log('📝 Se necesita crear con los siguientes datos:');
      asignacionFamiliar.forEach(tramo => {
        console.log(`   Tramo ${tramo.tramo}: Desde ${tramo.desde} - Hasta ${tramo.hasta || 'Sin límite'} | Monto: $${tramo.monto}`);
      });
    } else {
      console.log('✅ Tabla sueldo_asignacion_familiar existe');
    }

    // 4. RESUMEN DE PROBLEMAS ENCONTRADOS
    console.log('\n📊 4. RESUMEN DE PROBLEMAS ENCONTRADOS');
    console.log('='.repeat(50));
    
    const problemas = [];
    
    if (parametrosFaltantes.length > 0) {
      problemas.push(`❌ Faltan ${parametrosFaltantes.length} parámetros generales`);
    }
    
    if (!tablaAsignacionExiste.rows[0].exists) {
      problemas.push('❌ No existe tabla de asignación familiar');
    }
    
    // Verificar si hay sistema de versionado por mes
    const tieneVersionadoMensual = estructuras['sueldo_parametros_generales']?.some((col: any) => 
      col.column_name === 'periodo' || col.column_name === 'fecha_vigencia'
    );
    
    if (!tieneVersionadoMensual) {
      problemas.push('❌ No hay sistema de versionado por mes');
    }
    
    if (problemas.length === 0) {
      console.log('✅ No se encontraron problemas críticos');
    } else {
      problemas.forEach(problema => console.log(problema));
    }

    // 5. RECOMENDACIONES
    console.log('\n📊 5. RECOMENDACIONES DE MODIFICACIÓN');
    console.log('='.repeat(50));
    
    console.log('🔧 MODIFICACIONES NECESARIAS EN LAS TABLAS:');
    console.log('');
    console.log('1. TABLA sueldo_parametros_generales:');
    console.log('   - Agregar campo "periodo" (YYYY-MM) para versionado mensual');
    console.log('   - Agregar los parámetros faltantes de la imagen');
    console.log('   - Modificar estructura para soportar múltiples versiones');
    console.log('');
    console.log('2. NUEVA TABLA sueldo_asignacion_familiar:');
    console.log('   - Crear tabla con campos: periodo, tramo, desde, hasta, monto');
    console.log('   - Insertar datos de los tramos A, B, C, D');
    console.log('');
    console.log('3. TABLA sueldo_afp:');
    console.log('   - Agregar campo "periodo" para versionado mensual');
    console.log('   - Agregar nuevas AFPs: EMPART, INP_SSS, CADDEMED');
    console.log('   - Actualizar tasas según imagen');
    console.log('');
    console.log('4. TABLA sueldo_tramos_impuesto:');
    console.log('   - Agregar campo "periodo" para versionado mensual');
    console.log('   - Agregar campo "tasa_max"');
    console.log('   - Actualizar tramos con valores de 2025-08');
    console.log('');
    console.log('🔧 MODIFICACIONES EN LA PÁGINA DE PARÁMETROS:');
    console.log('');
    console.log('1. Agregar pestaña "Asignación Familiar"');
    console.log('2. Agregar selector de período en cada pestaña');
    console.log('3. Modificar formularios para incluir período');
    console.log('4. Agregar función para copiar parámetros de un mes a otro');
    console.log('5. Agregar validación de fechas de vigencia');
    console.log('6. Mostrar historial de cambios por período');

    console.log('\n📊 6. ESTRUCTURA FINAL RECOMENDADA');
    console.log('='.repeat(50));
    console.log('Para manejar parámetros que cambian mes a mes:');
    console.log('');
    console.log('TABLAS CON VERSIONADO MENSUAL:');
    console.log('- sueldo_parametros_generales (periodo, parametro, valor, descripcion)');
    console.log('- sueldo_asignacion_familiar (periodo, tramo, desde, hasta, monto)');
    console.log('- sueldo_afp (periodo, codigo, nombre, tasa)');
    console.log('- sueldo_tramos_impuesto (periodo, tramo, desde, hasta, factor, rebaja, tasa_max)');
    console.log('');
    console.log('FUNCIONES AUTOMÁTICAS:');
    console.log('- obtener_parametros_mensuales(fecha) - Obtiene parámetros del último mes disponible');
    console.log('- obtener_asignacion_familiar(fecha) - Obtiene tramos del último mes disponible');
    console.log('- obtener_afps_mensuales(fecha) - Obtiene AFPs del último mes disponible');
    console.log('- obtener_tramos_impuesto(fecha) - Obtiene tramos del último mes disponible');

  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    throw error;
  }
}

auditoriaParametrosSueldos().catch(console.error);
