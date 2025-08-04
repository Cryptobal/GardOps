import { query } from '../src/lib/database';

async function verificarPautaGuardada() {
  try {
    console.log('🔍 Verificando pauta guardada...\n');

    // 1. Buscar la instalación "A Test"
    console.log('1. Buscando instalación "A Test"...');
    const instalacionResult = await query(`
      SELECT id, nombre, estado FROM instalaciones 
      WHERE nombre ILIKE '%A Test%'
    `);
    
    if (instalacionResult.rows.length === 0) {
      console.log('❌ No se encontró la instalación "A Test"');
      return;
    }
    
    const instalacion = instalacionResult.rows[0];
    console.log(`✅ Instalación encontrada: ${instalacion.nombre} (${instalacion.id})`);

    // 2. Verificar registros guardados
    console.log('\n2. Verificando registros guardados...');
    const pautaGuardada = await query(`
      SELECT 
        pm.*,
        po.nombre_puesto,
        po.es_ppc,
        po.guardia_id as puesto_guardia_id,
        g.nombre as guardia_nombre,
        g.apellido_paterno,
        g.apellido_materno
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
      ORDER BY po.nombre_puesto, pm.dia
    `, [instalacion.id, 2025, 8]);

    console.log(`📊 Registros encontrados: ${pautaGuardada.rows.length}`);
    
    if (pautaGuardada.rows.length === 0) {
      console.log('❌ No se encontraron registros de pauta');
      return;
    }

    // 3. Agrupar por puesto
    const puestosAgrupados = new Map();
    for (const registro of pautaGuardada.rows) {
      const puestoId = registro.puesto_id;
      if (!puestosAgrupados.has(puestoId)) {
        puestosAgrupados.set(puestoId, {
          puesto_id: puestoId,
          nombre_puesto: registro.nombre_puesto,
          es_ppc: registro.es_ppc,
          guardia_id: registro.guardia_id,
          puesto_guardia_id: registro.puesto_guardia_id,
          guardia_nombre: registro.guardia_nombre,
          apellido_paterno: registro.apellido_paterno,
          apellido_materno: registro.apellido_materno,
          registros: []
        });
      }
      puestosAgrupados.get(puestoId).registros.push(registro);
    }

    // 4. Mostrar resumen por puesto
    console.log('\n3. Resumen por puesto:');
    for (const [puestoId, puesto] of puestosAgrupados) {
      console.log(`\n   📋 ${puesto.nombre_puesto}:`);
      console.log(`      - Es PPC: ${puesto.es_ppc ? 'SÍ' : 'NO'}`);
      console.log(`      - Guardia ID: ${puesto.guardia_id}`);
      console.log(`      - Puesto Guardia ID: ${puesto.puesto_guardia_id}`);
      if (puesto.guardia_nombre) {
        console.log(`      - Guardia: ${puesto.guardia_nombre} ${puesto.apellido_paterno} ${puesto.apellido_materno}`);
      }
      console.log(`      - Total registros: ${puesto.registros.length}`);
      
      // Contar estados
      const estados = {
        trabajado: 0,
        libre: 0,
        permiso: 0
      };
      
      for (const registro of puesto.registros) {
        estados[registro.estado]++;
      }
      
      console.log(`      - Estados: trabajado=${estados.trabajado}, libre=${estados.libre}, permiso=${estados.permiso}`);
      
      // Mostrar algunos días de ejemplo
      console.log(`      - Ejemplo días 1-5: ${puesto.registros.slice(0, 5).map(r => `${r.dia}:${r.estado}`).join(', ')}`);
    }

    // 5. Verificar totales
    console.log('\n4. Verificación de totales:');
    const totales = await query(`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(DISTINCT pm.puesto_id) as puestos_unicos,
        COUNT(DISTINCT pm.guardia_id) as guardias_unicas,
        COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as registros_ppc,
        COUNT(CASE WHEN po.es_ppc = false THEN 1 END) as registros_guardias
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
    `, [instalacion.id, 2025, 8]);

    const total = totales.rows[0];
    console.log(`   - Total registros: ${total.total_registros}`);
    console.log(`   - Puestos únicos: ${total.puestos_unicos}`);
    console.log(`   - Guardias únicas: ${total.guardias_unicas}`);
    console.log(`   - Registros PPC: ${total.registros_ppc}`);
    console.log(`   - Registros guardias: ${total.registros_guardias}`);

    // 6. Verificar que los números coinciden
    const diasDelMes = new Date(2025, 8, 0).getDate();
    const puestosEsperados = puestosAgrupados.size;
    const registrosEsperados = puestosEsperados * diasDelMes;
    
    console.log('\n5. Verificación de coherencia:');
    console.log(`   - Días del mes: ${diasDelMes}`);
    console.log(`   - Puestos esperados: ${puestosEsperados}`);
    console.log(`   - Registros esperados: ${registrosEsperados}`);
    console.log(`   - Registros reales: ${total.total_registros}`);
    console.log(`   - ✅ Coincide: ${registrosEsperados === total.total_registros ? 'SÍ' : 'NO'}`);

    console.log('\n✅ Verificación completada exitosamente');

  } catch (error) {
    console.error('❌ Error en la verificación:', error);
  } finally {
    process.exit(0);
  }
}

verificarPautaGuardada(); 