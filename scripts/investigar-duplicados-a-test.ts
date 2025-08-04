import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function investigarDuplicadosATest() {
  console.log('🔍 INVESTIGACIÓN DE DUPLICADOS EN INSTALACIÓN A-TEST\n');

  const instalacionId = '7e05a55d-8db6-4c20-b51c-509f09d69f74';

  try {
    // 1. Verificar la instalación
    console.log('1️⃣ VERIFICANDO INSTALACIÓN...');
    const instalacion = await query(`
      SELECT id, nombre, cliente_id
      FROM instalaciones 
      WHERE id = $1
    `, [instalacionId]);

    if (instalacion.rows.length === 0) {
      console.log('❌ Instalación no encontrada');
      return;
    }

    console.log(`✅ Instalación: ${instalacion.rows[0].nombre}`);

    // 2. Verificar puestos operativos
    console.log('\n2️⃣ VERIFICANDO PUESTOS OPERATIVOS...');
    const puestosOperativos = await query(`
      SELECT 
        id,
        instalacion_id,
        rol_id,
        guardia_id,
        nombre_puesto,
        es_ppc,
        creado_en
      FROM as_turnos_puestos_operativos
      WHERE instalacion_id = $1
      ORDER BY nombre_puesto, creado_en
    `, [instalacionId]);

    console.log(`Total puestos operativos: ${puestosOperativos.rows.length}`);
    
    if (puestosOperativos.rows.length > 0) {
      console.log('\nDetalles de puestos operativos:');
      puestosOperativos.rows.forEach((puesto: any, index: number) => {
        console.log(`  ${index + 1}. ID: ${puesto.id}`);
        console.log(`     Nombre: ${puesto.nombre_puesto}`);
        console.log(`     Guardia ID: ${puesto.guardia_id || 'NULL'}`);
        console.log(`     Es PPC: ${puesto.es_ppc}`);
        console.log(`     Creado: ${puesto.creado_en}`);
        console.log('');
      });
    }

    // 3. Verificar guardias asignados
    console.log('3️⃣ VERIFICANDO GUARDIAS ASIGNADOS...');
    const guardiasAsignados = await query(`
      SELECT DISTINCT
        po.guardia_id,
        g.nombre as nombre_guardia,
        po.nombre_puesto,
        po.es_ppc,
        po.creado_en
      FROM as_turnos_puestos_operativos po
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.instalacion_id = $1 AND po.guardia_id IS NOT NULL
      ORDER BY g.nombre, po.creado_en
    `, [instalacionId]);

    console.log(`Total guardias asignados únicos: ${guardiasAsignados.rows.length}`);
    
    if (guardiasAsignados.rows.length > 0) {
      console.log('\nDetalles de guardias asignados:');
      guardiasAsignados.rows.forEach((guardia: any, index: number) => {
        console.log(`  ${index + 1}. Guardia ID: ${guardia.guardia_id}`);
        console.log(`     Nombre: ${guardia.nombre_guardia}`);
        console.log(`     Puesto: ${guardia.nombre_puesto}`);
        console.log(`     Es PPC: ${guardia.es_ppc}`);
        console.log(`     Creado: ${guardia.creado_en}`);
        console.log('');
      });
    }

    // 4. Verificar duplicados por guardia
    console.log('4️⃣ VERIFICANDO DUPLICADOS POR GUARDIA...');
    const duplicadosPorGuardia = await query(`
      SELECT 
        po.guardia_id,
        g.nombre as nombre_guardia,
        COUNT(*) as cantidad_asignaciones
      FROM as_turnos_puestos_operativos po
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.instalacion_id = $1 AND po.guardia_id IS NOT NULL
      GROUP BY po.guardia_id, g.nombre
      HAVING COUNT(*) > 1
      ORDER BY g.nombre
    `, [instalacionId]);

    if (duplicadosPorGuardia.rows.length > 0) {
      console.log('❌ DUPLICADOS ENCONTRADOS:');
      duplicadosPorGuardia.rows.forEach((dup: any) => {
        console.log(`  Guardia: ${dup.nombre_guardia} (ID: ${dup.guardia_id})`);
        console.log(`  Cantidad de asignaciones: ${dup.cantidad_asignaciones}`);
        console.log('');
      });
    } else {
      console.log('✅ No se encontraron duplicados por guardia');
    }

    // 5. Verificar duplicados por nombre de puesto
    console.log('\n5️⃣ VERIFICANDO DUPLICADOS POR NOMBRE DE PUESTO...');
    const duplicadosPorPuesto = await query(`
      SELECT 
        nombre_puesto,
        COUNT(*) as cantidad
      FROM as_turnos_puestos_operativos
      WHERE instalacion_id = $1
      GROUP BY nombre_puesto
      HAVING COUNT(*) > 1
      ORDER BY nombre_puesto
    `, [instalacionId]);

    if (duplicadosPorPuesto.rows.length > 0) {
      console.log('❌ DUPLICADOS ENCONTRADOS:');
      duplicadosPorPuesto.rows.forEach((dup: any) => {
        console.log(`  Puesto: ${dup.nombre_puesto}`);
        console.log(`  Cantidad: ${dup.cantidad}`);
        console.log('');
      });
    } else {
      console.log('✅ No se encontraron duplicados por nombre de puesto');
    }

    // 6. Verificar roles de servicio
    console.log('\n6️⃣ VERIFICANDO ROLES DE SERVICIO...');
    const rolesServicio = await query(`
      SELECT DISTINCT
        po.rol_id,
        rs.nombre as nombre_rol,
        rs.patron_turno,
        COUNT(*) as cantidad_puestos
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1
      GROUP BY po.rol_id, rs.nombre, rs.patron_turno
      ORDER BY rs.nombre
    `, [instalacionId]);

    console.log(`Total roles de servicio: ${rolesServicio.rows.length}`);
    
    if (rolesServicio.rows.length > 0) {
      console.log('\nDetalles de roles de servicio:');
      rolesServicio.rows.forEach((rol: any, index: number) => {
        console.log(`  ${index + 1}. Rol: ${rol.nombre_rol}`);
        console.log(`     Patrón: ${rol.patron_turno}`);
        console.log(`     Cantidad puestos: ${rol.cantidad_puestos}`);
        console.log('');
      });
    }

    // 7. Verificar pauta mensual
    console.log('\n7️⃣ VERIFICANDO PAUTA MENSUAL...');
    const pautaMensual = await query(`
      SELECT 
        guardia_id,
        guardia_nombre,
        COUNT(*) as cantidad_registros
      FROM as_turnos_pauta_mensual
      WHERE instalacion_id = $1 AND anio = 2025 AND mes = 8
      GROUP BY guardia_id, guardia_nombre
      ORDER BY guardia_nombre
    `, [instalacionId]);

    console.log(`Total guardias en pauta mensual: ${pautaMensual.rows.length}`);
    
    if (pautaMensual.rows.length > 0) {
      console.log('\nDetalles de pauta mensual:');
      pautaMensual.rows.forEach((pauta: any, index: number) => {
        console.log(`  ${index + 1}. Guardia: ${pauta.guardia_nombre}`);
        console.log(`     ID: ${pauta.guardia_id}`);
        console.log(`     Registros: ${pauta.cantidad_registros}`);
        console.log('');
      });
    }

    // 8. Comparar puestos operativos vs pauta mensual
    console.log('\n8️⃣ COMPARANDO PUESTOS OPERATIVOS vs PAUTA MENSUAL...');
    
    const puestosEnPauta = await query(`
      SELECT DISTINCT guardia_id, guardia_nombre
      FROM as_turnos_pauta_mensual
      WHERE instalacion_id = $1 AND anio = 2025 AND mes = 8
    `, [instalacionId]);

    const puestosOperativosUnicos = await query(`
      SELECT DISTINCT guardia_id
      FROM as_turnos_puestos_operativos
      WHERE instalacion_id = $1 AND guardia_id IS NOT NULL
    `, [instalacionId]);

    console.log(`Guardias en pauta mensual: ${puestosEnPauta.rows.length}`);
    console.log(`Guardias en puestos operativos: ${puestosOperativosUnicos.rows.length}`);

    // Verificar si hay guardias en pauta que no están en puestos operativos
    const guardiasSoloEnPauta = puestosEnPauta.rows.filter((pauta: any) => 
      !puestosOperativosUnicos.rows.some((puesto: any) => 
        puesto.guardia_id === pauta.guardia_id
      )
    );

    if (guardiasSoloEnPauta.length > 0) {
      console.log('\n❌ GUARDIAS EN PAUTA PERO NO EN PUESTOS OPERATIVOS:');
      guardiasSoloEnPauta.forEach((guardia: any) => {
        console.log(`  - ${guardia.guardia_nombre} (ID: ${guardia.guardia_id})`);
      });
    }

    // Verificar si hay guardias en puestos operativos que no están en pauta
    const guardiasSoloEnPuestos = puestosOperativosUnicos.rows.filter((puesto: any) => 
      !puestosEnPauta.rows.some((pauta: any) => 
        pauta.guardia_id === puesto.guardia_id
      )
    );

    if (guardiasSoloEnPuestos.length > 0) {
      console.log('\n❌ GUARDIAS EN PUESTOS OPERATIVOS PERO NO EN PAUTA:');
      guardiasSoloEnPuestos.forEach((puesto: any) => {
        console.log(`  - ID: ${puesto.guardia_id}`);
      });
    }

    console.log('\n✅ INVESTIGACIÓN COMPLETADA');

  } catch (error) {
    console.error('❌ Error durante la investigación:', error);
  }
}

investigarDuplicadosATest(); 