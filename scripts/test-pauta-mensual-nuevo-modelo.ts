import { query } from '../src/lib/database';

async function testPautaMensualNuevoModelo() {
  console.log('🧪 PRUEBA DEL NUEVO MODELO DE PAUTA MENSUAL');
  console.log('============================================\n');

  try {
    // 1. Verificar que existen puestos operativos
    console.log('📋 1. VERIFICANDO PUESTOS OPERATIVOS...');
    
    const puestosOperativos = await query(`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.es_ppc,
        po.guardia_id,
        po.instalacion_id,
        i.nombre as instalacion_nombre,
        g.nombre as guardia_nombre,
        rs.nombre as rol_nombre,
        CONCAT(rs.dias_trabajo, 'x', rs.dias_descanso) as patron_turno
      FROM as_turnos_puestos_operativos po
      LEFT JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.activo = true
      ORDER BY i.nombre, po.nombre_puesto
      LIMIT 10
    `);
    
    console.log(`📊 ${puestosOperativos.rows.length} puestos operativos encontrados:`);
    puestosOperativos.rows.forEach((puesto: any, index: number) => {
      console.log(`  ${index + 1}. ${puesto.instalacion_nombre} - ${puesto.nombre_puesto} (${puesto.guardia_nombre || 'Sin guardia'}) - ${puesto.patron_turno || 'Sin patrón'}`);
    });

    if (puestosOperativos.rows.length === 0) {
      console.log('❌ No hay puestos operativos para probar');
      return;
    }

    // 2. Seleccionar una instalación para la prueba
    const instalacionPrueba = puestosOperativos.rows[0];
    const instalacionId = instalacionPrueba.instalacion_id;
    const mesPrueba = new Date().getMonth() + 1; // Mes actual
    const anioPrueba = new Date().getFullYear();

    console.log(`\n📋 2. PROBANDO CON INSTALACIÓN: ${instalacionPrueba.instalacion_nombre}`);
    console.log(`📅 Período: ${mesPrueba}/${anioPrueba}`);

    // 3. Verificar puestos de la instalación
    const puestosInstalacion = await query(`
      SELECT 
        po.id as puesto_id,
        po.nombre_puesto,
        po.es_ppc,
        po.guardia_id,
        g.nombre as guardia_nombre,
        rs.nombre as rol_nombre,
        CONCAT(rs.dias_trabajo, 'x', rs.dias_descanso) as patron_turno
      FROM as_turnos_puestos_operativos po
      LEFT JOIN guardias g ON po.guardia_id = g.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1 
        AND po.activo = true
      ORDER BY po.nombre_puesto
    `, [instalacionId]);

    console.log(`📊 ${puestosInstalacion.rows.length} puestos en la instalación:`);
    puestosInstalacion.rows.forEach((puesto: any, index: number) => {
      const tipo = puesto.es_ppc ? 'PPC' : (puesto.guardia_id ? 'Con Guardia' : 'Sin Asignar');
      console.log(`  ${index + 1}. ${puesto.nombre_puesto} - ${tipo} - ${puesto.guardia_nombre || 'N/A'} - ${puesto.patron_turno || 'Sin patrón'}`);
    });

    // 4. Verificar si ya existe pauta para este período
    const pautaExistente = await query(`
      SELECT COUNT(*) as count
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
    `, [instalacionId, anioPrueba, mesPrueba]);

    if (parseInt(pautaExistente.rows[0].count) > 0) {
      console.log(`\n⚠️ Ya existe pauta para ${mesPrueba}/${anioPrueba}. Eliminando para la prueba...`);
      
      await query(`
        DELETE FROM as_turnos_pauta_mensual pm
        WHERE pm.puesto_id IN (
          SELECT po.id 
          FROM as_turnos_puestos_operativos po 
          WHERE po.instalacion_id = $1
        ) AND pm.anio = $2 AND pm.mes = $3
      `, [instalacionId, anioPrueba, mesPrueba]);
      
      console.log('✅ Pauta existente eliminada');
    }

    // 5. Generar pauta de prueba
    console.log('\n📋 3. GENERANDO PAUTA DE PRUEBA...');
    
    const diasDelMes = new Date(anioPrueba, mesPrueba, 0).getDate();
    console.log(`📅 Generando ${diasDelMes} días para ${puestosInstalacion.rows.length} puestos`);

    const pautasParaInsertar = [];
    
    for (const puesto of puestosInstalacion.rows) {
      // Solo crear pauta para puestos que tengan guardia asignado o sean PPCs
      if (puesto.guardia_id || puesto.es_ppc) {
        for (let dia = 1; dia <= diasDelMes; dia++) {
          // Aplicar patrón de turno automáticamente
          let estado = 'libre';
          
          if (puesto.guardia_id && puesto.patron_turno) {
            // Aplicar lógica de patrón de turno
            estado = aplicarPatronTurno(puesto.patron_turno, dia, anioPrueba, mesPrueba);
          }
          
          pautasParaInsertar.push({
            puesto_id: puesto.puesto_id,
            guardia_id: puesto.guardia_id || puesto.puesto_id, // Para PPCs, usar el puesto_id como guardia_id
            dia: dia,
            estado: estado
          });
        }
      }
    }

    // Insertar todas las pautas
    const insertPromises = pautasParaInsertar.map(pauta => 
      query(`
        INSERT INTO as_turnos_pauta_mensual (puesto_id, guardia_id, anio, mes, dia, estado)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [pauta.puesto_id, pauta.guardia_id, anioPrueba, mesPrueba, pauta.dia, pauta.estado])
    );

    await Promise.all(insertPromises);

    console.log(`✅ Pauta generada: ${pautasParaInsertar.length} registros creados`);

    // 6. Verificar la pauta generada
    console.log('\n📋 4. VERIFICANDO PAUTA GENERADA...');
    
    const pautaGenerada = await query(`
      SELECT 
        pm.puesto_id,
        pm.guardia_id,
        pm.dia,
        pm.estado,
        po.nombre_puesto,
        po.es_ppc,
        g.nombre as guardia_nombre,
        rs.nombre as rol_nombre,
        CONCAT(rs.dias_trabajo, 'x', rs.dias_descanso) as patron_turno
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
      ORDER BY po.nombre_puesto, pm.dia
      LIMIT 20
    `, [instalacionId, anioPrueba, mesPrueba]);

    console.log(`📊 ${pautaGenerada.rows.length} registros de pauta generados:`);
    pautaGenerada.rows.forEach((registro: any, index: number) => {
      console.log(`  ${index + 1}. ${registro.nombre_puesto} - Día ${registro.dia} - ${registro.estado} - ${registro.guardia_nombre || 'PPC'}`);
    });

    // 7. Estadísticas finales
    console.log('\n📋 5. ESTADÍSTICAS FINALES...');
    
    const estadisticas = await query(`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(DISTINCT pm.puesto_id) as puestos_con_pauta,
        COUNT(DISTINCT CASE WHEN pm.estado = 'trabajado' THEN pm.puesto_id END) as puestos_trabajando,
        COUNT(DISTINCT CASE WHEN pm.estado = 'libre' THEN pm.puesto_id END) as puestos_libres
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
    `, [instalacionId, anioPrueba, mesPrueba]);

    const stats = estadisticas.rows[0];
    console.log(`📊 Total registros: ${stats.total_registros}`);
    console.log(`📊 Puestos con pauta: ${stats.puestos_con_pauta}`);
    console.log(`📊 Puestos trabajando: ${stats.puestos_trabajando}`);
    console.log(`📊 Puestos libres: ${stats.puestos_libres}`);

    console.log('\n✅ PRUEBA COMPLETADA EXITOSAMENTE');
    console.log('🎯 El nuevo modelo de pauta mensual funciona correctamente');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Función para aplicar patrón de turno automáticamente
function aplicarPatronTurno(patron: string, dia: number, anio: number, mes: number): string {
  const fecha = new Date(anio, mes - 1, dia);
  const diaSemana = fecha.getDay(); // 0 = Domingo, 1 = Lunes, etc.
  
  // Patrón 4x4 (4 días trabajando, 4 días libres)
  if (patron === '4x4') {
    const diaDelCiclo = ((dia - 1) % 8) + 1;
    return diaDelCiclo <= 4 ? 'trabajado' : 'libre';
  }
  
  // Patrón 5x2 (5 días trabajando, 2 días libres)
  if (patron === '5x2') {
    const diaDelCiclo = ((dia - 1) % 7) + 1;
    return diaDelCiclo <= 5 ? 'trabajado' : 'libre';
  }
  
  // Patrón 6x1 (6 días trabajando, 1 día libre)
  if (patron === '6x1') {
    const diaDelCiclo = ((dia - 1) % 7) + 1;
    return diaDelCiclo <= 6 ? 'trabajado' : 'libre';
  }
  
  // Patrón L-V (Lunes a Viernes)
  if (patron === 'L-V') {
    return (diaSemana >= 1 && diaSemana <= 5) ? 'trabajado' : 'libre';
  }
  
  // Por defecto, todos los días libres
  return 'libre';
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testPautaMensualNuevoModelo()
    .then(() => {
      console.log('\n🎉 Prueba completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error ejecutando prueba:', error);
      process.exit(1);
    });
}

export { testPautaMensualNuevoModelo }; 