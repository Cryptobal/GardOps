#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function resetPautaMes() {
  const anio = 2025;
  const mes = 9; // Septiembre
  const inicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const fin = `${anio}-${String(mes).padStart(2, '0')}-30`;

  console.log(`🔧 Reseteando pauta mensual ${anio}-${String(mes).padStart(2, '0')}...\n`);

  try {
    await query('BEGIN');

    // 1) Resetear pauta mensual del mes a plan + limpiar meta + sin guardia
    console.log('1️⃣ Reseteando as_turnos_pauta_mensual...');
    const upd = await query(
      `UPDATE public.as_turnos_pauta_mensual
       SET 
         estado = 'planificado',
         estado_ui = 'plan',
         meta = '{}'::jsonb,
         guardia_id = NULL,
         updated_at = NOW()
       WHERE make_date(anio, mes, dia) BETWEEN $1::date AND $2::date
       RETURNING id`,
      [inicio, fin]
    );
    console.log(`   - Filas actualizadas: ${upd.rows.length}`);

    await query('COMMIT');
    console.log('\n✅ Reset completado. Refresca la Pauta Diaria para ver los cambios.');
  } catch (err) {
    console.error('❌ Error:', err);
    await query('ROLLBACK').catch(() => {});
    process.exit(1);
  }
  process.exit(0);
}

resetPautaMes();
