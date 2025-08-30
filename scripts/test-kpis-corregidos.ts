#!/usr/bin/env ts-node

import { query } from '../src/lib/database';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testKPIsCorregidos() {
  try {
    const fechas = ['2025-08-30', '2025-08-31'];
    const fechaActual = new Date().toISOString().split('T')[0];
    
    console.log(`📅 Fecha actual del servidor: ${fechaActual}`);
    console.log(`🕐 Hora actual: ${new Date().toLocaleTimeString()}\n`);

    for (const fecha of fechas) {
      console.log(`📊 KPIs para fecha: ${fecha}`);
      
      // Simular la lógica del endpoint de KPIs
      const kpis = await query(`
        SELECT 
          COUNT(*) as total_llamados,
          -- Actuales: solo si es el día actual y en la hora actual
          COUNT(CASE 
            WHEN DATE(programado_para) = $1 
             AND date_trunc('hour', programado_para) = date_trunc('hour', now())
            THEN 1 
          END) as actuales,
          -- Próximos: futuros del día actual + todos los de días futuros
          COUNT(CASE 
            WHEN (DATE(programado_para) = $1 AND programado_para > now())
             OR DATE(programado_para) > $1
            THEN 1 
          END) as proximos,
          -- Urgentes: solo del día actual que ya pasaron >30 min
          COUNT(CASE 
            WHEN DATE(programado_para) = $1 
             AND programado_para < now() - interval '30 minutes'
            THEN 1 
          END) as urgentes
        FROM central_v_llamados_automaticos
        WHERE DATE(programado_para) = $2
      `, [fechaActual, fecha]);

      const stats = kpis.rows[0];
      console.log(`   Total: ${stats.total_llamados}`);
      console.log(`   Actuales: ${stats.actuales}`);
      console.log(`   Próximos: ${stats.proximos}`);
      console.log(`   Urgentes: ${stats.urgentes}`);

      // Mostrar algunos ejemplos de llamados
      const ejemplos = await query(`
        SELECT 
          instalacion_nombre,
          programado_para,
          CASE 
            WHEN DATE(programado_para) = $1 
             AND date_trunc('hour', programado_para) = date_trunc('hour', now())
            THEN 'ACTUAL'
            WHEN (DATE(programado_para) = $1 AND programado_para > now())
             OR DATE(programado_para) > $1
            THEN 'PRÓXIMO'
            WHEN DATE(programado_para) = $1 
             AND programado_para < now() - interval '30 minutes'
            THEN 'URGENTE'
            ELSE 'PASADO'
          END as estado_calculado
        FROM central_v_llamados_automaticos
        WHERE DATE(programado_para) = $2
        ORDER BY programado_para
        LIMIT 5
      `, [fechaActual, fecha]);

      console.log(`   Ejemplos:`);
      ejemplos.rows.forEach((row: any) => {
        console.log(`     • ${row.instalacion_nombre} @ ${row.programado_para} → ${row.estado_calculado}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error probando KPIs:', error);
  } finally {
    process.exit(0);
  }
}

testKPIsCorregidos();
