import { query } from '../src/lib/database';

async function createSamplePPCs() {
  console.log('🔧 Creando PPCs de ejemplo...\n');

  try {
    // Verificar si ya existen PPCs
    const existingPPCs = await query(`
      SELECT COUNT(*) as count FROM as_turnos_ppc
    `);

    if (parseInt(existingPPCs.rows[0].count) > 0) {
      console.log('✅ Ya existen PPCs en la base de datos');
      return;
    }

    // Obtener requisitos de puestos existentes
    const requisitos = await query(`
      SELECT tr.id, tr.instalacion_id, tr.rol_servicio_id, rs.nombre as rol_nombre
      FROM as_turnos_requisitos tr
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      LIMIT 5
    `);

    if (requisitos.rows.length === 0) {
      console.log('❌ No hay requisitos de puestos disponibles');
      return;
    }

    console.log(`📋 Encontrados ${requisitos.rows.length} requisitos de puestos`);

    // Crear PPCs de ejemplo
    for (let i = 0; i < Math.min(requisitos.rows.length, 3); i++) {
      const requisito = requisitos.rows[i];
      
      await query(`
        INSERT INTO as_turnos_ppc (
          requisito_puesto_id,
          cantidad_faltante,
          motivo,
          prioridad,
          estado,
          observaciones
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        requisito.id,
        Math.floor(Math.random() * 3) + 1, // 1-3 faltantes
        'Falta de personal disponible',
        ['Alta', 'Media', 'Baja'][Math.floor(Math.random() * 3)],
        'Pendiente',
        `PPC de ejemplo para ${requisito.rol_nombre}`
      ]);

      console.log(`✅ PPC creado para ${requisito.rol_nombre}`);
    }

    console.log('\n✅ PPCs de ejemplo creados exitosamente');

  } catch (error) {
    console.error('Error creando PPCs de ejemplo:', error);
  }
}

createSamplePPCs(); 