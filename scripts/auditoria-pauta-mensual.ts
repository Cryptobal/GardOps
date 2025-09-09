import { query } from '../src/lib/database';

async function auditoriaPautaMensual() {
  try {
    console.log('🔍 INICIANDO AUDITORÍA COMPLETA DE PAUTA MENSUAL');
    console.log('='.repeat(80));
    
    const instalacionId = '7e05a55d-8db6-4c20-b51c-509f09d69f74';
    const anio = 2025;
    const mes = 8;
    
    console.log(`📋 PARÁMETROS DE AUDITORÍA:`);
    console.log(`   - Instalación ID: ${instalacionId}`);
    console.log(`   - Año: ${anio}`);
    console.log(`   - Mes: ${mes}`);
    console.log('');
    
    // 1. AUDITORÍA DE INSTALACIÓN
    console.log('🏢 1. AUDITORÍA DE INSTALACIÓN');
    console.log('-'.repeat(50));
    
    const instalacionResult = await query(`
      SELECT id, nombre, direccion, cliente_id
      FROM instalaciones 
      WHERE id = $1
    `, [instalacionId]);
    
    if (instalacionResult.rows.length === 0) {
      console.log('❌ Instalación no encontrada');
      return;
    }
    
    const instalacion = instalacionResult.rows[0];
    console.log(`✅ Instalación encontrada: ${instalacion.nombre}`);
    console.log(`   - ID: ${instalacion.id}`);
    console.log(`   - Dirección: ${instalacion.direccion}`);
    console.log(`   - Cliente ID: ${instalacion.cliente_id}`);
    console.log('');
    
    // 2. AUDITORÍA DE REQUISITOS/PUESTOS
    console.log('🔧 2. AUDITORÍA DE REQUISITOS/PUESTOS');
    console.log('-'.repeat(50));
    
    const requisitosResult = await query(`
      SELECT 
        tr.id,
        tr.rol_servicio_id,
        tr.cantidad_guardias,
        tr.estado,
        tr.vigente_desde,
        tr.vigente_hasta
      FROM as_turnos_requisitos tr
      WHERE tr.instalacion_id = $1
      ORDER BY tr.created_at
    `, [instalacionId]);
    
    console.log(`📊 Requisitos encontrados: ${requisitosResult.rows.length}`);
    requisitosResult.rows.forEach((req: any, index: number) => {
      console.log(`   ${index + 1}. Requisito ID: ${req.id}`);
      console.log(`      - Rol servicio ID: ${req.rol_servicio_id}`);
      console.log(`      - Cantidad guardias: ${req.cantidad_guardias}`);
      console.log(`      - Estado: ${req.estado}`);
      console.log(`      - Vigente desde: ${req.vigente_desde}`);
      console.log(`      - Vigente hasta: ${req.vigente_hasta}`);
    });
    console.log('');
    
    // 3. AUDITORÍA DE ASIGNACIONES
    console.log('👥 3. AUDITORÍA DE ASIGNACIONES');
    console.log('-'.repeat(50));
    
    const asignacionesResult = await query(`
      SELECT 
        ta.id as asignacion_id,
        ta.guardia_id,
        ta.requisito_puesto_id,
        ta.estado as asignacion_estado,
        ta.fecha_inicio,
        ta.fecha_termino,
        ta.tipo_asignacion,
        g.nombre as guardia_nombre,
        g.apellido_paterno,
        g.activo as guardia_activo
      FROM as_turnos_asignaciones ta
      INNER JOIN guardias g ON ta.guardia_id = g.id
      INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1
      ORDER BY g.nombre
    `, [instalacionId]);
    
    console.log(`📊 Asignaciones encontradas: ${asignacionesResult.rows.length}`);
    asignacionesResult.rows.forEach((asig: any, index: number) => {
      console.log(`   ${index + 1}. ${asig.guardia_nombre} ${asig.apellido_paterno}`);
      console.log(`      - ID Guardia: ${asig.guardia_id}`);
      console.log(`      - Requisito puesto ID: ${asig.requisito_puesto_id}`);
      console.log(`      - Estado: ${asig.asignacion_estado}`);
      console.log(`      - Tipo asignación: ${asig.tipo_asignacion}`);
      console.log(`      - Guardia activo: ${asig.guardia_activo}`);
      console.log(`      - Fecha inicio: ${asig.fecha_inicio}`);
      console.log(`      - Fecha término: ${asig.fecha_termino}`);
    });
    console.log('');
    
    // 4. AUDITORÍA DE PPCs
    console.log('🔧 4. AUDITORÍA DE PPCs');
    console.log('-'.repeat(50));
    
    const ppcsResult = await query(`
      SELECT 
        ppc.id,
        ppc.estado,
        ppc.cantidad_faltante,
        ppc.motivo,
        ppc.prioridad,
        ppc.fecha_deteccion,
        ppc.fecha_limite_cobertura,
        ppc.guardia_asignado_id,
        ppc.fecha_asignacion,
        tr.id as requisito_id
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1
      ORDER BY ppc.estado, ppc.fecha_deteccion
    `, [instalacionId]);
    
    console.log(`📊 PPCs encontrados: ${ppcsResult.rows.length}`);
    ppcsResult.rows.forEach((ppc: any, index: number) => {
      console.log(`   ${index + 1}. PPC ${ppc.id.substring(0, 8)}...`);
      console.log(`      - Estado: ${ppc.estado}`);
      console.log(`      - Cantidad faltante: ${ppc.cantidad_faltante}`);
      console.log(`      - Motivo: ${ppc.motivo}`);
      console.log(`      - Prioridad: ${ppc.prioridad}`);
      console.log(`      - Requisito ID: ${ppc.requisito_id}`);
      console.log(`      - Guardia asignado: ${ppc.guardia_asignado_id || 'Sin asignar'}`);
      console.log(`      - Fecha detección: ${ppc.fecha_deteccion}`);
      console.log(`      - Fecha límite: ${ppc.fecha_limite_cobertura}`);
    });
    console.log('');
    
    // 5. AUDITORÍA DE PAUTA MENSUAL
    console.log('📅 5. AUDITORÍA DE PAUTA MENSUAL');
    console.log('-'.repeat(50));
    
    const pautaResult = await query(`
      SELECT 
        id,
        guardia_id,
        dia,
        estado,
        created_at,
        updated_at
      FROM as_turnos_pauta_mensual
      WHERE instalacion_id = $1 AND anio = $2 AND mes = $3
      ORDER BY guardia_id, dia
    `, [instalacionId, anio, mes]);
    
    console.log(`📊 Registros de pauta encontrados: ${pautaResult.rows.length}`);
    
    if (pautaResult.rows.length > 0) {
      // Agrupar por guardia_id
      const pautaPorGuardia: { [key: string]: any[] } = {};
      pautaResult.rows.forEach((row: any) => {
        if (!pautaPorGuardia[row.guardia_id]) {
          pautaPorGuardia[row.guardia_id] = [];
        }
        pautaPorGuardia[row.guardia_id].push(row);
      });
      
      Object.keys(pautaPorGuardia).forEach(guardiaId => {
        const registros = pautaPorGuardia[guardiaId];
        console.log(`   Guardia ID: ${guardiaId}`);
        console.log(`   - Registros: ${registros.length}`);
        console.log(`   - Días con estado: ${registros.map((r: any) => `${r.dia}(${r.estado})`).join(', ')}`);
        console.log(`   - Última actualización: ${registros[0].updated_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No hay registros de pauta para este mes/año');
    }
    
    // 6. ANÁLISIS DE COHERENCIA
    console.log('🔍 6. ANÁLISIS DE COHERENCIA');
    console.log('-'.repeat(50));
    
    // Verificar si los guardias en la pauta corresponden a asignaciones reales
    const guardiasEnPauta = Array.from(new Set(pautaResult.rows.map((r: any) => r.guardia_id)));
    console.log(`📊 Guardias únicos en pauta: ${guardiasEnPauta.length}`);
    guardiasEnPauta.forEach((guardiaId: any) => {
      console.log(`   - ${guardiaId}`);
    });
    
    // Verificar asignaciones reales
    const guardiasAsignados = asignacionesResult.rows.map((a: any) => a.guardia_id);
    console.log(`📊 Guardias asignados reales: ${guardiasAsignados.length}`);
    guardiasAsignados.forEach((guardiaId: any) => {
      console.log(`   - ${guardiaId}`);
    });
    
    // Verificar PPCs
    const ppcsIds = ppcsResult.rows.map((p: any) => p.id);
    console.log(`📊 PPCs disponibles: ${ppcsIds.length}`);
    ppcsIds.forEach((ppcId: any) => {
      console.log(`   - ${ppcId}`);
    });
    
    // 7. CONCLUSIONES
    console.log('📋 7. CONCLUSIONES');
    console.log('-'.repeat(50));
    
    console.log(`✅ Instalación: ${instalacion.nombre}`);
    console.log(`✅ Requisitos activos: ${requisitosResult.rows.filter((r: any) => r.activo).length}`);
    console.log(`✅ Asignaciones activas: ${asignacionesResult.rows.filter((a: any) => a.asignacion_estado === 'Activa').length}`);
    console.log(`✅ PPCs disponibles: ${ppcsResult.rows.length}`);
    console.log(`✅ Registros de pauta: ${pautaResult.rows.length}`);
    
    // Verificar inconsistencias
    const guardiasSinAsignacion = guardiasEnPauta.filter((g: any) => !guardiasAsignados.includes(g));
    if (guardiasSinAsignacion.length > 0) {
      console.log(`⚠️ Guardias en pauta sin asignación real: ${guardiasSinAsignacion.length}`);
      guardiasSinAsignacion.forEach((g: any) => console.log(`   - ${g}`));
    }
    
    const asignacionesSinPauta = guardiasAsignados.filter((g: any) => !guardiasEnPauta.includes(g));
    if (asignacionesSinPauta.length > 0) {
      console.log(`⚠️ Asignaciones sin registros en pauta: ${asignacionesSinPauta.length}`);
      asignacionesSinPauta.forEach((g: any) => console.log(`   - ${g}`));
    }
    
    console.log('');
    console.log('='.repeat(80));
    console.log('✅ AUDITORÍA COMPLETADA');
    
  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    throw error;
  }
}

// Ejecutar la auditoría
auditoriaPautaMensual()
  .then(() => {
    console.log('✅ Auditoría completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Auditoría falló:', error);
    process.exit(1);
  }); 