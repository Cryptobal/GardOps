#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function main() {
  console.log('🧹 Limpieza de TE_turnos_extras inconsistentes');
  try {
    // 1) Listar TE sin cobertura actual (pm.meta->>'cobertura_guardia_id' IS NULL)
    const { rows: invalidByMeta } = await query(`
      SELECT te.id, te.pauta_id, te.fecha, te.estado, te.pagado, te.planilla_id
      FROM TE_turnos_extras te
      JOIN as_turnos_pauta_mensual pm ON pm.id = te.pauta_id
      WHERE COALESCE(pm.meta->>'cobertura_guardia_id','') = ''
    `);

    // 2) Listar TE con pauta inexistente (dangling)
    const { rows: dangling } = await query(`
      SELECT te.id, te.pauta_id, te.fecha, te.estado, te.pagado, te.planilla_id
      FROM TE_turnos_extras te
      LEFT JOIN as_turnos_pauta_mensual pm ON pm.id = te.pauta_id
      WHERE pm.id IS NULL
    `);

    // 3) Listar TE cuyo meta cobertura existe pero no coincide con estado_ui='te' y sin cobertura (opcional)
    const { rows: mismatch } = await query(`
      SELECT te.id, te.pauta_id, te.fecha, te.estado, te.pagado, te.planilla_id
      FROM TE_turnos_extras te
      JOIN as_turnos_pauta_mensual pm ON pm.id = te.pauta_id
      WHERE pm.meta->>'cobertura_guardia_id' IS NOT NULL
        AND pm.estado_ui NOT IN ('te','reemplazo')
    `);

    console.log(`→ Inconsistentes por meta SIN cobertura: ${invalidByMeta.length}`);
    console.log(`→ Inconsistentes sin pauta (dangling): ${dangling.length}`);
    console.log(`→ Inconsistentes por mismatch de estado: ${mismatch.length}`);

    const candidates = [...invalidByMeta, ...dangling, ...mismatch];
    // Filtrar duplicados por id
    const map = new Map<string, any>();
    for (const r of candidates) map.set(r.id, r);
    const unique = Array.from(map.values());

    // Dejar fuera pagados o con planilla
    const deletables = unique.filter((r: any) => !r.pagado && !r.planilla_id);

    if (deletables.length === 0) {
      console.log('✅ No hay TE para eliminar (o están pagados/planillados)');
      process.exit(0);
    }

    console.log(`🗑️ Eliminando ${deletables.length} TE no pagados y sin planilla...`);

    const ids = deletables.map((r: any) => r.id);
    await query(`DELETE FROM TE_turnos_extras WHERE id = ANY($1::uuid[])`, [ids]);

    console.log('✅ Eliminación completada');

    // Mostrar conteo final
    const { rows: countRows } = await query(`SELECT COUNT(*)::int as count FROM TE_turnos_extras`);
    console.log(`📊 TE_turnos_extras restantes: ${countRows[0].count}`);
  } catch (err) {
    console.error('❌ Error en limpieza:', err);
    process.exit(1);
  }
  process.exit(0);
}

main();
