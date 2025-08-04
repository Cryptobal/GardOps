import { query } from '../src/lib/database';

async function verificarRegistrosExistentes() {
  try {
    console.log('🔍 Verificando registros existentes en base de datos...\n');

    const instalacion_id = '15631bd6-03a9-459d-ae60-fc480f7f3e84';
    const anio = 2025;
    const mes = 8;

    // 1. Verificar todos los registros existentes
    console.log('=== REGISTROS EXISTENTES ===');
    const registrosExistentes = await query(`
      SELECT 
        pm.puesto_id,
        pm.guardia_id,
        pm.dia,
        pm.estado,
        po.nombre_puesto,
        po.es_ppc,
        COUNT(*) OVER (PARTITION BY pm.puesto_id) as total_por_puesto
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
      ORDER BY po.nombre_puesto, pm.dia
      LIMIT 10
    `, [instalacion_id, anio, mes]);

    console.log(`📊 Total registros encontrados: ${registrosExistentes.rows.length}`);
    if (registrosExistentes.rows.length > 0) {
      console.log('Primeros 10 registros:');
      registrosExistentes.rows.forEach((reg: any, index: number) => {
        console.log(`   ${index + 1}. ${reg.nombre_puesto} (PPC: ${reg.es_ppc}) - Día ${reg.dia}: ${reg.estado}`);
        console.log(`      Puesto ID: ${reg.puesto_id}`);
        console.log(`      Guardia ID: ${reg.guardia_id}`);
        console.log(`      Total por puesto: ${reg.total_por_puesto}`);
      });
    }

    // 2. Contar por puesto
    console.log('\n=== CONTEO POR PUESTO ===');
    const conteoPorPuesto = await query(`
      SELECT 
        po.nombre_puesto,
        po.es_ppc,
        pm.puesto_id,
        pm.guardia_id,
        COUNT(*) as total_registros
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
      GROUP BY po.nombre_puesto, po.es_ppc, pm.puesto_id, pm.guardia_id
      ORDER BY po.nombre_puesto
    `, [instalacion_id, anio, mes]);

    console.log(`📊 Puestos con registros: ${conteoPorPuesto.rows.length}`);
    conteoPorPuesto.rows.forEach((puesto: any, index: number) => {
      console.log(`   ${index + 1}. ${puesto.nombre_puesto} (PPC: ${puesto.es_ppc})`);
      console.log(`      Puesto ID: ${puesto.puesto_id}`);
      console.log(`      Guardia ID: ${puesto.guardia_id}`);
      console.log(`      Total registros: ${puesto.total_registros}`);
    });

    // 3. Verificar puestos sin registros
    console.log('\n=== PUESTOS SIN REGISTROS ===');
    const puestosSinRegistros = await query(`
      SELECT 
        po.id as puesto_id,
        po.nombre_puesto,
        po.es_ppc,
        po.guardia_id
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1 
        AND po.activo = true
        AND po.id NOT IN (
          SELECT DISTINCT pm.puesto_id
          FROM as_turnos_pauta_mensual pm
          WHERE pm.anio = $2 AND pm.mes = $3
        )
      ORDER BY po.nombre_puesto
    `, [instalacion_id, anio, mes]);

    console.log(`📊 Puestos sin registros: ${puestosSinRegistros.rows.length}`);
    puestosSinRegistros.rows.forEach((puesto: any, index: number) => {
      console.log(`   ${index + 1}. ${puesto.nombre_puesto} (PPC: ${puesto.es_ppc})`);
      console.log(`      Puesto ID: ${puesto.puesto_id}`);
      console.log(`      Guardia ID: ${puesto.guardia_id}`);
    });

    // 4. Simular que la función verifica pauta existente
    console.log('\n=== SIMULANDO VERIFICACIÓN DE PAUTA EXISTENTE ===');
    const pautaExistente = await query(`
      SELECT COUNT(*) as count
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
    `, [instalacion_id, anio, mes]);

    const tienePautaBase = parseInt(pautaExistente.rows[0].count) > 0;
    console.log(`📊 ¿Tiene pauta base? ${tienePautaBase ? 'SÍ' : 'NO'} (${pautaExistente.rows[0].count} registros)`);

    if (tienePautaBase) {
      console.log('🔍 Como tiene pauta base, el endpoint usa UPDATE en lugar de INSERT');
      console.log('❌ Esto es problemático si algunos puestos no tienen registros previos');
    }

    // 5. Mostrar qué UPDATE fallaría
    console.log('\n=== SIMULANDO UPDATES QUE FALLARÍAN ===');
    
    if (puestosSinRegistros.rows.length > 0) {
      for (const puesto of puestosSinRegistros.rows) {
        console.log(`\n🔄 Para puesto: ${puesto.nombre_puesto}`);
        const guardiaId = puesto.guardia_id || puesto.puesto_id;
        
        // Simular UPDATE para día 1
        const updateTest = await query(`
          UPDATE as_turnos_pauta_mensual 
          SET estado = 'libre', updated_at = NOW()
          WHERE puesto_id = $1 
            AND guardia_id = $2 
            AND anio = $3 
            AND mes = $4 
            AND dia = 1
        `, [puesto.puesto_id, guardiaId, anio, mes]);
        
        console.log(`   📝 UPDATE día 1: ${updateTest.rowCount} filas afectadas`);
        
        if (updateTest.rowCount === 0) {
          console.log(`   ❌ UPDATE falló - no existe registro para actualizar`);
        } else {
          console.log(`   ✅ UPDATE exitoso`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

verificarRegistrosExistentes();