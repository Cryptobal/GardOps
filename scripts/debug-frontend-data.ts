import { query } from '../src/lib/database';

async function debugFrontendData() {
  try {
    console.log('🔍 Debuggeando datos del frontend...\\n');

    const instalacion_id = '15631bd6-03a9-459d-ae60-fc480f7f3e84';
    const anio = 2025;
    const mes = 8;

    // 1. Simular exactamente lo que hace el endpoint GET de pauta mensual
    console.log('=== SIMULANDO GET /api/pauta-mensual ===');
    
    // Query para obtener puestos operativos (básica)
    const puestosOperativos = await query(`
      SELECT 
        po.id as puesto_id,
        po.guardia_id,
        po.nombre_puesto,
        po.es_ppc
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1 AND po.activo = true
      ORDER BY po.es_ppc ASC, po.nombre_puesto
    `, [instalacion_id]);

    console.log(`📋 Puestos operativos encontrados: ${puestosOperativos.rows.length}`);
    
    puestosOperativos.rows.forEach((puesto: any, index: number) => {
      console.log(`   ${index + 1}. ${puesto.nombre_puesto}:`);
      console.log(`      - Puesto ID: ${puesto.puesto_id}`);
      console.log(`      - Guardia ID: ${puesto.guardia_id || 'NULL'}`);
      console.log(`      - Es PPC: ${puesto.es_ppc}`);
      console.log(`      - Tipo: ${puesto.es_ppc ? 'PPC' : 'Guardia'}`);
    });

    // 2. Verificar qué IDs está usando el frontend para cada tipo
    console.log('\\n=== ANÁLISIS DE IDs PARA FRONTEND ===');
    
    puestosOperativos.rows.forEach((puesto: any, index: number) => {
      const frontendId = puesto.es_ppc ? puesto.puesto_id : (puesto.guardia_id || puesto.puesto_id);
      
      console.log(`\\n   Puesto ${index + 1} (${puesto.nombre_puesto}):`);
      console.log(`      - Es PPC: ${puesto.es_ppc}`);
      console.log(`      - Frontend usaría ID: ${frontendId}`);
      console.log(`      - Tipo de ID: ${puesto.es_ppc ? 'puesto_id' : 'guardia_id'}`);
      
      if (puesto.es_ppc) {
        console.log(`      ✅ PPC: Frontend usa puesto_id = ${puesto.puesto_id}`);
      } else if (puesto.guardia_id) {
        console.log(`      ✅ Guardia: Frontend usa guardia_id = ${puesto.guardia_id}`);
      } else {
        console.log(`      ⚠️ Pendiente: Frontend usa puesto_id = ${puesto.puesto_id} (por defecto)`);
      }
    });

    // 3. Simular los datos que enviaría el frontend
    console.log('\\n=== DATOS QUE ENVIARÍA EL FRONTEND ===');
    
    const pautaParaGuardar = puestosOperativos.rows.map((puesto: any) => {
      const frontendId = puesto.es_ppc ? puesto.puesto_id : (puesto.guardia_id || puesto.puesto_id);
      const diasDelMes = new Date(anio, mes, 0).getDate();
      
      return {
        guardia_id: frontendId,
        dias: Array.from({ length: diasDelMes }, (_, i) => {
          if (puesto.es_ppc) {
            return 'L'; // PPCs siempre libres por defecto
          } else if (puesto.guardia_id) {
            // Patrón alternado para guardias asignadas
            return (i + 1) % 2 === 0 ? 'T' : 'L';
          } else {
            return ''; // Pendientes vacíos
          }
        })
      };
    });

    console.log('📤 Datos que enviaría el frontend:');
    pautaParaGuardar.forEach((item: any, index: number) => {
      console.log(`   ${index + 1}. guardia_id: ${item.guardia_id}`);
      console.log(`      - Primeros 5 días: [${item.dias.slice(0, 5).join(', ')}]`);
      console.log(`      - Total días: ${item.dias.length}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugFrontendData();