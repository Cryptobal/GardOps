require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function testControlAsistencia() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337';

  try {
    console.log('🔍 Probando query de Control de Asistencia...');

    // Query exacta de la API
    const query = `
      SELECT
        pm.id as pauta_id,
        pm.anio,
        pm.mes,
        pm.dia,
        CONCAT(pm.anio, '-', LPAD(pm.mes::text, 2, '0'), '-', LPAD(pm.dia::text, 2, '0')) as fecha,
        pm.estado_operacion as estado_pauta,
        pm.estado_operacion as estado_ui,
        pm.meta,
        pm.meta->>'estado_semaforo' as estado_semaforo,
        pm.meta->>'observaciones_semaforo' as observaciones_semaforo,
        pm.meta->>'ultima_actualizacion_semaforo' as ultima_actualizacion,
        pm.estado_operacion as estado_pauta_ui,
        g.id as guardia_id,
        CONCAT(g.nombre, ' ', COALESCE(g.apellido_paterno, ''), ' ', COALESCE(g.apellido_materno, '')) as guardia_nombre,
        g.apellido_paterno,
        g.apellido_materno,
        g.telefono as guardia_telefono,
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        i.telefono as instalacion_telefono,
        po.id as puesto_id,
        po.nombre_puesto,
        rs.id as rol_id,
        rs.nombre as rol_nombre,
        rs.hora_inicio,
        rs.hora_termino,
        CASE
          WHEN rs.hora_inicio::time < '12:00'::time THEN 'dia'
          ELSE 'noche'
        END as tipo_turno,
        CASE
          WHEN pm.meta->>'estado_semaforo' IS NULL THEN 'pendiente'
          ELSE pm.meta->>'estado_semaforo'
        END as estado_monitoreo
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
        AND po.activo = true
        AND pm.tenant_id = $4
        -- AND NOT (pm.plan_base = 'libre' OR pm.estado_operacion = 'libre')
    `;

    // Primero verificar estados de turnos
    const estadosResult = await pool.query(`
      SELECT pm.plan_base, pm.estado_operacion, COUNT(*) as total 
      FROM as_turnos_pauta_mensual pm 
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id 
      WHERE pm.anio = 2025 AND pm.mes = 9 AND pm.dia = 17 
        AND po.activo = true AND pm.tenant_id = $1 
      GROUP BY pm.plan_base, pm.estado_operacion
    `, [tenantId]);
    
    console.log('📊 Estados de turnos:', JSON.stringify(estadosResult.rows, null, 2));

    const result = await pool.query(query, [2025, 9, 17, tenantId]);
    console.log('✅ Total turnos encontrados:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('📋 Primer turno:', {
        pauta_id: result.rows[0].pauta_id,
        instalacion_nombre: result.rows[0].instalacion_nombre,
        guardia_nombre: result.rows[0].guardia_nombre,
        rol_nombre: result.rows[0].rol_nombre,
        estado_monitoreo: result.rows[0].estado_monitoreo
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testControlAsistencia();
