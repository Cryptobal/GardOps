import { query } from '../src/lib/database';

async function testTurnosPPC() {
  console.log('🧪 Probando creación de turnos y PPCs...');
  
  const instalacionId = 'fb0d4f19-75f3-457e-8181-df032266441c';
  const rolServicioId = 'bb4abe42-7e84-45a0-8b55-0a38b163c886'; // Noche 6x2x10
  const cantidadGuardias = 3;

  try {
    // 1. Crear turno
    console.log('📝 Creando turno...');
    const turnoResult = await query(`
      INSERT INTO turnos_instalacion (
        instalacion_id,
        rol_servicio_id,
        cantidad_guardias,
        estado
      ) VALUES ($1, $2, $3, 'Activo')
      RETURNING *
    `, [instalacionId, rolServicioId, cantidadGuardias]);

    const nuevoTurno = turnoResult.rows[0];
    console.log('✅ Turno creado:', nuevoTurno.id);

    // 2. Obtener puesto operativo
    console.log('🏢 Obteniendo puesto operativo...');
    let puestoOperativoResult = await query(`
      SELECT id FROM puestos_operativos 
      WHERE instalacion_id = $1 AND estado = 'Activo'
      LIMIT 1
    `, [instalacionId]);

    let puestoOperativoId;
    if (puestoOperativoResult.rows.length === 0) {
      console.log('🏢 Creando puesto operativo...');
      const nuevoPuestoResult = await query(`
        INSERT INTO puestos_operativos (instalacion_id, nombre, estado)
        VALUES ($1, 'Puesto Principal', 'Activo')
        RETURNING id
      `, [instalacionId]);
      puestoOperativoId = nuevoPuestoResult.rows[0].id;
    } else {
      puestoOperativoId = puestoOperativoResult.rows[0].id;
    }
    console.log('✅ Puesto operativo:', puestoOperativoId);

    // 3. Crear requisito de puesto
    console.log('📋 Creando requisito de puesto...');
    const requisitoResult = await query(`
      INSERT INTO requisitos_puesto (
        instalacion_id,
        puesto_operativo_id,
        rol_servicio_id,
        cantidad_guardias,
        vigente_desde,
        vigente_hasta,
        estado
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE, NULL, 'Activo')
      RETURNING id
    `, [instalacionId, puestoOperativoId, rolServicioId, cantidadGuardias]);

    const requisitoId = requisitoResult.rows[0].id;
    console.log('✅ Requisito creado:', requisitoId);

    // 4. Crear PPC
    console.log('🚨 Creando PPC...');
    const ppcResult = await query(`
      INSERT INTO puestos_por_cubrir (
        requisito_puesto_id,
        cantidad_faltante,
        motivo,
        prioridad,
        fecha_deteccion,
        estado
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE, 'Pendiente')
      RETURNING *
    `, [requisitoId, cantidadGuardias, 'falta_asignacion', 'Media']);

    console.log('✅ PPC creado:', ppcResult.rows[0].id);

    // 5. Verificar resultados
    console.log('🔍 Verificando resultados...');
    
    const turnos = await query(`
      SELECT COUNT(*) as total FROM turnos_instalacion 
      WHERE instalacion_id = $1
    `, [instalacionId]);
    
    const requisitos = await query(`
      SELECT COUNT(*) as total FROM requisitos_puesto 
      WHERE instalacion_id = $1
    `, [instalacionId]);
    
    const ppcs = await query(`
      SELECT COUNT(*) as total FROM puestos_por_cubrir ppc
      INNER JOIN requisitos_puesto rp ON ppc.requisito_puesto_id = rp.id
      WHERE rp.instalacion_id = $1
    `, [instalacionId]);

    console.log('📊 Resumen:');
    console.log(`  - Turnos: ${turnos.rows[0].total}`);
    console.log(`  - Requisitos: ${requisitos.rows[0].total}`);
    console.log(`  - PPCs: ${ppcs.rows[0].total}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testTurnosPPC(); 