const { query } = require('./src/lib/database');

async function investigarProblemaPPC() {
  console.log('🔍 INVESTIGANDO PROBLEMA DE PPCs Y AARON AGUILERA\n');
  
  try {
    // 1. Buscar registros de Aaron Aguilera en la base de datos
    console.log('1️⃣ Buscando registros de Aaron Aguilera...');
    const aaronQuery = `
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        g.estado,
        g.tenant_id
      FROM guardias g
      WHERE g.nombre ILIKE '%Aaron%' 
         OR g.apellido_paterno ILIKE '%Aguilera%'
         OR g.apellido_materno ILIKE '%Toro%'
      ORDER BY g.nombre, g.apellido_paterno
    `;
    
    const aaronResult = await query(aaronQuery);
    console.log('📋 Registros de Aaron encontrados:', aaronResult.rows.length);
    aaronResult.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Nombre: ${row.nombre} ${row.apellido_paterno} ${row.apellido_materno}, Estado: ${row.estado}`);
    });
    
    // 2. Buscar PPCs activos
    console.log('\n2️⃣ Buscando PPCs activos...');
    const ppcQuery = `
      SELECT 
        po.id,
        po.instalacion_id,
        po.nombre_puesto,
        po.es_ppc,
        po.guardia_id,
        po.activo,
        i.nombre as instalacion_nombre,
        g.nombre || ' ' || g.apellido_paterno as guardia_nombre
      FROM as_turnos_puestos_operativos po
      LEFT JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.es_ppc = true OR po.guardia_id IS NOT NULL
      ORDER BY i.nombre, po.nombre_puesto
    `;
    
    const ppcResult = await query(ppcQuery);
    console.log('📋 PPCs encontrados:', ppcResult.rows.length);
    ppcResult.rows.forEach(row => {
      console.log(`  - Puesto: ${row.nombre_puesto} (${row.instalacion_nombre}), PPC: ${row.es_ppc}, Guardia: ${row.guardia_nombre || 'Sin asignar'}`);
    });
    
    // 3. Buscar en pauta mensual para hoy
    console.log('\n3️⃣ Buscando registros en pauta mensual para hoy...');
    const pautaQuery = `
      SELECT 
        pm.id,
        pm.puesto_id,
        pm.guardia_id,
        pm.estado,
        pm.estado_ui,
        pm.meta,
        po.nombre_puesto,
        i.nombre as instalacion_nombre,
        g.nombre || ' ' || g.apellido_paterno as guardia_nombre
      FROM as_turnos_pauta_mensual pm
      JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      WHERE pm.anio = EXTRACT(YEAR FROM CURRENT_DATE)
        AND pm.mes = EXTRACT(MONTH FROM CURRENT_DATE)
        AND pm.dia = EXTRACT(DAY FROM CURRENT_DATE)
      ORDER BY i.nombre, po.nombre_puesto
    `;
    
    const pautaResult = await query(pautaQuery);
    console.log('📋 Registros en pauta mensual para hoy:', pautaResult.rows.length);
    pautaResult.rows.forEach(row => {
      console.log(`  - Puesto: ${row.nombre_puesto} (${row.instalacion_nombre}), Estado: ${row.estado_ui}, Guardia: ${row.guardia_nombre || 'Sin asignar'}`);
    });
    
    // 4. Buscar en la vista unificada para hoy
    console.log('\n4️⃣ Buscando en vista unificada para hoy...');
    const vistaQuery = `
      SELECT 
        pauta_id,
        puesto_id,
        instalacion_nombre,
        puesto_nombre,
        estado_ui,
        es_ppc,
        guardia_trabajo_nombre,
        guardia_titular_nombre,
        cobertura_guardia_nombre
      FROM as_turnos_v_pauta_diaria_unificada
      WHERE fecha = CURRENT_DATE::text
      ORDER BY instalacion_nombre, puesto_nombre
    `;
    
    const vistaResult = await query(vistaQuery);
    console.log('📋 Registros en vista unificada para hoy:', vistaResult.rows.length);
    vistaResult.rows.forEach(row => {
      console.log(`  - Puesto: ${row.puesto_nombre} (${row.instalacion_nombre}), Estado: ${row.estado_ui}, PPC: ${row.es_ppc}, Trabajo: ${row.guardia_trabajo_nombre || 'Sin asignar'}`);
    });
    
  } catch (error) {
    console.error('❌ Error en investigación:', error);
  }
}

investigarProblemaPPC();
