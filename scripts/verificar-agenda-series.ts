#!/usr/bin/env ts-node

import { query } from '../src/lib/database';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verificarAgendaSeries() {
  try {
    const fechas = ['2025-08-30', '2025-08-31'];
    for (const fecha of fechas) {
      console.log(`\n📅 Fecha: ${fecha}`);
      const total = await query(
        `SELECT COUNT(*)::int AS total FROM central_v_llamados_automaticos WHERE DATE(programado_para) = $1`,
        [fecha]
      );
      console.log(`   Total llamados: ${total.rows[0].total}`);

      const flags = await query(
        `SELECT 
           COUNT(*) FILTER (WHERE es_actual)   ::int AS actuales,
           COUNT(*) FILTER (WHERE es_proximo)  ::int AS proximos,
           COUNT(*) FILTER (WHERE es_urgente)  ::int AS urgentes
         FROM central_v_llamados_automaticos
         WHERE DATE(programado_para) = $1`,
        [fecha]
      );
      const f = flags.rows[0];
      console.log(`   Flags → actuales: ${f.actuales}, próximos: ${f.proximos}, urgentes: ${f.urgentes}`);

      const porInst = await query(
        `SELECT instalacion_nombre, COUNT(*)::int AS cantidad
         FROM central_v_llamados_automaticos
         WHERE DATE(programado_para) = $1
         GROUP BY instalacion_nombre
         ORDER BY instalacion_nombre`,
        [fecha]
      );
      porInst.rows.forEach((r: any) => {
        console.log(`   - ${r.instalacion_nombre}: ${r.cantidad}`);
      });

      const sample = await query(
        `SELECT instalacion_nombre, programado_para, intervalo_minutos, ventana_inicio, ventana_fin, es_actual, es_proximo, es_urgente
         FROM central_v_llamados_automaticos
         WHERE DATE(programado_para) = $1
         ORDER BY instalacion_nombre, programado_para
         LIMIT 10`,
        [fecha]
      );
      if (sample.rows.length > 0) {
        console.log('   Muestra:');
        sample.rows.forEach((r: any) => {
          console.log(`     • ${r.instalacion_nombre} @ ${r.programado_para} (${r.intervalo_minutos}m ${r.ventana_inicio}-${r.ventana_fin}) [act:${r.es_actual?'1':'0'} prox:${r.es_proximo?'1':'0'} urg:${r.es_urgente?'1':'0'}]`);
        });
      }
    }
  } catch (err) {
    console.error('❌ Error verificando agenda:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

verificarAgendaSeries();
