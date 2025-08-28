import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function testQueryCompletaFull() {
  console.log('🧪 PROBANDO CONSULTA COMPLETA DEL ENDPOINT');
  console.log('==========================================\n');

  try {
    const instalacionId = '0e8ba906-e64b-4d4d-a104-ba29f21f48a9';
    
    console.log('🔍 Probando instalación:', instalacionId);

    // Consulta completa del endpoint
    console.log('\n1️⃣ CONSULTA COMPLETA DEL ENDPOINT:');
    const puestosCompletos = await query(`
      SELECT 
        po.id,
        po.instalacion_id,
        po.rol_id,
        po.guardia_id,
        po.nombre_puesto,
        po.es_ppc,
        po.activo,
        po.creado_en,
        po.tipo_puesto_id,
        COALESCE(rs.nombre, 'Sin rol asignado') as rol_nombre,
        COALESCE(rs.dias_trabajo, 0) as dias_trabajo,
        COALESCE(rs.dias_descanso, 0) as dias_descanso,
        COALESCE(rs.horas_turno, 0) as horas_turno,
        COALESCE(rs.hora_inicio, '00:00') as hora_inicio,
        COALESCE(rs.hora_termino, '00:00') as hora_termino,
        COALESCE(rs.estado, 'Inactivo') as rol_estado,
        COALESCE(g.nombre || ' ' || g.apellido_paterno, 'Sin guardia') as guardia_nombre,
        COALESCE(tp.nombre, 'Sin tipo') as tipo_nombre,
        COALESCE(tp.emoji, '🏢') as tipo_emoji,
        COALESCE(tp.color, '#666666') as tipo_color
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      LEFT JOIN cat_tipos_puesto tp ON po.tipo_puesto_id = tp.id
      WHERE po.instalacion_id = $1
        AND po.activo = true
      ORDER BY po.rol_id, po.nombre_puesto
    `, [instalacionId]);
    
    console.log(`Puestos encontrados: ${puestosCompletos.rows.length}`);
    puestosCompletos.rows.forEach((row: any, index: number) => {
      console.log(`  ${index + 1}. ${row.nombre_puesto}`);
      console.log(`     - ID: ${row.id}`);
      console.log(`     - Rol: ${row.rol_nombre}`);
      console.log(`     - Activo: ${row.activo}`);
      console.log(`     - PPC: ${row.es_ppc}`);
      console.log(`     - Guardia: ${row.guardia_nombre}`);
      console.log(`     - Tipo: ${row.tipo_nombre}`);
    });

    // Simular el procesamiento del endpoint
    console.log('\n2️⃣ SIMULANDO PROCESAMIENTO DEL ENDPOINT:');
    
    const turnosMap = new Map();
    const puestosIndividuales = [];
    const ppcs = [];
    const guardias = [];

    puestosCompletos.rows.forEach((row: any) => {
      console.log(`Procesando puesto: ${row.nombre_puesto}`);
      
      // Agregar a puestos individuales
      puestosIndividuales.push({
        id: row.id,
        instalacion_id: row.instalacion_id,
        rol_id: row.rol_id,
        guardia_id: row.guardia_id,
        nombre_puesto: row.nombre_puesto,
        es_ppc: row.es_ppc,
        activo: row.activo,
        creado_en: row.creado_en,
        tipo_puesto_id: row.tipo_puesto_id,
        guardia_nombre: row.guardia_nombre,
        tipo_nombre: row.tipo_nombre,
        tipo_emoji: row.tipo_emoji,
        tipo_color: row.tipo_color
      });

      // Agrupar por turno
      if (!turnosMap.has(row.rol_id)) {
        console.log(`  Creando nuevo turno: ${row.rol_nombre}`);
        turnosMap.set(row.rol_id, {
          id: row.rol_id,
          nombre: row.rol_nombre,
          rol_nombre: row.rol_nombre,
          rol_servicio_nombre: row.rol_nombre,
          dias_trabajo: row.dias_trabajo,
          dias_descanso: row.dias_descanso,
          horas_turno: row.horas_turno,
          hora_inicio: row.hora_inicio,
          hora_termino: row.hora_termino,
          estado: row.rol_estado,
          puestos_asignados: 0,
          ppc_pendientes: 0,
          tipo_puesto_id: row.tipo_puesto_id,
          tipo_puesto_nombre: row.tipo_nombre,
          tipo_puesto_emoji: row.tipo_emoji,
          tipo_puesto_color: row.tipo_color,
          created_at: row.creado_en,
          puestos: []
        });
      }

      const turno = turnosMap.get(row.rol_id);
      turno.puestos.push({
        id: row.id,
        nombre_puesto: row.nombre_puesto,
        es_ppc: row.es_ppc,
        guardia_asignado_id: row.guardia_id,
        guardia_nombre: row.guardia_nombre,
        tipo_puesto_id: row.tipo_puesto_id,
        tipo_nombre: row.tipo_nombre,
        tipo_emoji: row.tipo_emoji,
        tipo_color: row.tipo_color
      });

      // Contar estadísticas
      if (row.guardia_id) {
        turno.puestos_asignados++;
      } else {
        turno.ppc_pendientes++;
      }

      // Agregar a PPCs si corresponde
      if (row.es_ppc && !row.guardia_id) {
        console.log(`  Agregando PPC: ${row.nombre_puesto}`);
        ppcs.push({
          id: row.id,
          instalacion_id: row.instalacion_id,
          rol_servicio_id: row.rol_id,
          motivo: 'Puesto operativo sin asignación',
          observacion: `PPC para puesto: ${row.nombre_puesto}`,
          creado_en: row.creado_en,
          rol_servicio_nombre: row.rol_nombre,
          hora_inicio: row.hora_inicio,
          hora_termino: row.hora_termino,
          cantidad_faltante: 1,
          estado: 'Pendiente',
          guardia_asignado_id: null,
          guardia_nombre: null,
          nombre_puesto: row.nombre_puesto,
          tipo_puesto_id: row.tipo_puesto_id,
          tipo_nombre: row.tipo_nombre,
          tipo_emoji: row.tipo_emoji,
          tipo_color: row.tipo_color
        });
      }
    });

    const turnos = Array.from(turnosMap.values());

    console.log('\n3️⃣ RESULTADOS DEL PROCESAMIENTO:');
    console.log(`  - Turnos: ${turnos.length}`);
    console.log(`  - Puestos individuales: ${puestosIndividuales.length}`);
    console.log(`  - PPCs: ${ppcs.length}`);
    console.log(`  - Guardias: ${guardias.length}`);

    if (turnos.length > 0) {
      console.log('\n4️⃣ TURNOS PROCESADOS:');
      turnos.forEach((turno: any, index: number) => {
        console.log(`  ${index + 1}. ${turno.nombre}`);
        console.log(`     - Puestos asignados: ${turno.puestos_asignados}`);
        console.log(`     - PPC pendientes: ${turno.ppc_pendientes}`);
        console.log(`     - Total puestos: ${turno.puestos.length}`);
      });
    }

  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testQueryCompletaFull().then(() => {
    console.log('\n✅ Test completado');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { testQueryCompletaFull };
