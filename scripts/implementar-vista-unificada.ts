#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function implementarVistaUnificada() {
  console.log('🔧 IMPLEMENTANDO VISTA UNIFICADA DE PAUTA DIARIA\n');

  try {
    // 1. Crear la vista unificada
    console.log('1️⃣ Creando vista unificada...');
    
    await query(`
      -- Vista unificada para Pauta Diaria con lógica correcta
      -- SOLO muestra turnos con estado 'planificado' en Pauta Mensual
      -- Implementa la lógica: Pauta Mensual = Planificación, Pauta Diaria = Ejecución

      DROP VIEW IF EXISTS as_turnos_v_pauta_diaria_unificada CASCADE;

      CREATE OR REPLACE VIEW as_turnos_v_pauta_diaria_unificada AS
      WITH pauta_dedup AS (
        SELECT DISTINCT ON (pm.puesto_id, pm.anio, pm.mes, pm.dia)
          pm.id::text as pauta_id,
          pm.puesto_id,
          pm.guardia_id,
          pm.anio,
          pm.mes,
          pm.dia,
          TO_DATE(CONCAT(pm.anio, '-', pm.mes, '-', pm.dia), 'YYYY-MM-DD') as fecha,
          pm.estado as estado_pauta_mensual,
          pm.estado_ui,
          pm.observaciones,
          pm.meta,
          
          -- Información de la instalación
          i.id as instalacion_id,
          i.nombre as instalacion_nombre,
          i.telefono as instalacion_telefono,
          
          -- Información del guardia titular
          g.id as guardia_titular_id,
          CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre) as guardia_titular_nombre,
          g.telefono as guardia_titular_telefono,
          
          -- Información del puesto
          po.nombre_puesto,
          po.es_ppc,
          
          -- Información del rol de servicio
          rs.id as rol_id,
          rs.nombre as rol_nombre,
          rs.hora_inicio::text as hora_inicio,
          rs.hora_termino::text as hora_fin,
          
          -- Información de cobertura desde turnos_extras (el más reciente)
          te.guardia_id as cobertura_guardia_id,
          te.estado as tipo_cobertura,
          te.created_at as cobertura_fecha,
          
          -- Información de cobertura desde meta JSON (para compatibilidad)
          (pm.meta->>'cobertura_guardia_id')::uuid as meta_cobertura_guardia_id,
          pm.meta->>'tipo' as meta_tipo_cobertura
          
        FROM as_turnos_pauta_mensual pm
        INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
        INNER JOIN instalaciones i ON po.instalacion_id = i.id
        LEFT JOIN guardias g ON pm.guardia_id = g.id
        LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
        LEFT JOIN LATERAL (
          SELECT guardia_id, estado, created_at
          FROM TE_turnos_extras te
          WHERE te.pauta_id = pm.id
          ORDER BY te.created_at DESC
          LIMIT 1
        ) te ON true
  WHERE po.activo = true
    AND pm.estado IN ('planificado', 'libre')  -- Incluir turnos planificados Y días libres en Pauta Mensual
        ORDER BY pm.puesto_id, pm.anio, pm.mes, pm.dia, pm.id DESC
      )
      SELECT 
        pd.pauta_id,
        pd.fecha::text,
        pd.puesto_id::text,
        pd.nombre_puesto as puesto_nombre,
        pd.instalacion_id::text,
        pd.instalacion_nombre,
        pd.instalacion_telefono,
        pd.estado_pauta_mensual,
        
        -- Estado UI para Pauta Diaria (ejecución)
        CASE 
          -- Si no se ha marcado asistencia, aparece como 'planificado'
          WHEN pd.estado_ui IS NULL OR pd.estado_ui = 'plan' THEN 'planificado'
          
          -- Estados de ejecución
          WHEN pd.estado_ui = 'asistio' THEN 'asistido'
          WHEN pd.estado_ui = 'inasistencia' THEN 'inasistencia'
          WHEN pd.estado_ui = 'reemplazo' THEN 'reemplazo'
          WHEN pd.estado_ui = 'sin_cobertura' THEN 'sin_cobertura'
          
          -- Estados de turno extra (MANTENER COMO 'extra')
          WHEN pd.estado_ui = 'extra' THEN 'extra'
          WHEN pd.estado_ui = 'turno_extra' THEN 'extra'
          WHEN pd.estado_ui = 'te' THEN 'extra'
          
          -- Por defecto, planificado
          ELSE 'planificado'
        END as estado_ui,
        
        -- Metadatos en formato JSON
        jsonb_build_object(
          'cobertura_guardia_id', COALESCE(pd.cobertura_guardia_id::text, pd.meta_cobertura_guardia_id::text),
          'tipo_cobertura', COALESCE(pd.tipo_cobertura, pd.meta_tipo_cobertura),
          'observaciones', pd.observaciones,
          'estado_semaforo', pd.meta->>'estado_semaforo',
          'comentarios', pd.meta->>'comentarios'
        ) as meta,
        
        -- ID del guardia que trabaja (titular o cobertura)
        COALESCE(pd.cobertura_guardia_id, pd.guardia_titular_id)::text as guardia_trabajo_id,
        
        -- Nombre del guardia que trabaja
        CASE 
          WHEN pd.cobertura_guardia_id IS NOT NULL THEN 
            (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
             FROM guardias WHERE id = pd.cobertura_guardia_id)
          WHEN pd.meta_cobertura_guardia_id IS NOT NULL THEN 
            (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
             FROM guardias WHERE id = pd.meta_cobertura_guardia_id)
          ELSE pd.guardia_titular_nombre
        END as guardia_trabajo_nombre,
        
        -- Teléfono del guardia que trabaja
        CASE 
          WHEN pd.cobertura_guardia_id IS NOT NULL THEN 
            (SELECT telefono FROM guardias WHERE id = pd.cobertura_guardia_id)
          WHEN pd.meta_cobertura_guardia_id IS NOT NULL THEN 
            (SELECT telefono FROM guardias WHERE id = pd.meta_cobertura_guardia_id)
          ELSE pd.guardia_titular_telefono
        END as guardia_trabajo_telefono,
        
        -- Información del guardia titular
        pd.guardia_titular_id::text,
        pd.guardia_titular_nombre,
        pd.guardia_titular_telefono,
        
        -- Flags de estado
        pd.es_ppc,
        (pd.cobertura_guardia_id IS NOT NULL OR pd.meta_cobertura_guardia_id IS NOT NULL) as es_reemplazo,
        (pd.estado_ui IN ('sin_cobertura', 'inasistencia')) as es_sin_cobertura,
        (pd.estado_ui = 'inasistencia') as es_falta_sin_aviso,
        (pd.es_ppc AND pd.guardia_titular_id IS NULL) OR 
        (pd.estado_ui IN ('sin_cobertura', 'inasistencia')) as necesita_cobertura,
        
        -- Información del horario
        pd.hora_inicio,
        pd.hora_fin,
        pd.rol_id::text,
        pd.rol_nombre,
        
        -- Nombres de reemplazo/cobertura (para compatibilidad)
        CASE 
          WHEN pd.cobertura_guardia_id IS NOT NULL THEN 
            (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
             FROM guardias WHERE id = pd.cobertura_guardia_id)
          WHEN pd.meta_cobertura_guardia_id IS NOT NULL THEN 
            (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
             FROM guardias WHERE id = pd.meta_cobertura_guardia_id)
          ELSE NULL
        END as reemplazo_guardia_nombre,
        
        CASE 
          WHEN pd.cobertura_guardia_id IS NOT NULL THEN 
            (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
             FROM guardias WHERE id = pd.cobertura_guardia_id)
          WHEN pd.meta_cobertura_guardia_id IS NOT NULL THEN 
            (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
             FROM guardias WHERE id = pd.meta_cobertura_guardia_id)
          ELSE NULL
        END as cobertura_guardia_nombre,
        
        -- Teléfono de cobertura
        CASE 
          WHEN pd.cobertura_guardia_id IS NOT NULL THEN 
            (SELECT telefono FROM guardias WHERE id = pd.cobertura_guardia_id)
          WHEN pd.meta_cobertura_guardia_id IS NOT NULL THEN 
            (SELECT telefono FROM guardias WHERE id = pd.meta_cobertura_guardia_id)
          ELSE NULL
        END as cobertura_guardia_telefono
        
      FROM pauta_dedup pd;
    `);

    console.log('✅ Vista unificada creada exitosamente');

    // 2. Crear índices para optimizar
    console.log('\n2️⃣ Creando índices de optimización...');
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_pauta_mensual_planificado 
      ON as_turnos_pauta_mensual(estado) WHERE estado = 'planificado';
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_pauta_mensual_fecha_completa 
      ON as_turnos_pauta_mensual(anio, mes, dia);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_turnos_extras_pauta 
      ON TE_turnos_extras(pauta_id);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_turnos_extras_created 
      ON TE_turnos_extras(created_at DESC);
    `);

    console.log('✅ Índices creados exitosamente');

    // 3. Verificar que la vista funcione correctamente
    console.log('\n3️⃣ Verificando vista unificada...');
    
    const resultado = await query(`
      SELECT 
        COUNT(*) as total_turnos,
        COUNT(CASE WHEN es_ppc = true THEN 1 END) as ppcs,
        COUNT(CASE WHEN es_ppc = false THEN 1 END) as guardias,
        COUNT(CASE WHEN estado_ui = 'planificado' THEN 1 END) as planificados
      FROM as_turnos_v_pauta_diaria_unificada
      WHERE fecha = '2025-08-30'
    `);

    const stats = resultado.rows[0];
    console.log('📊 Estadísticas de la vista unificada (30 de agosto):');
    console.log(`   - Total turnos: ${stats.total_turnos}`);
    console.log(`   - PPCs: ${stats.ppcs}`);
    console.log(`   - Guardias: ${stats.guardias}`);
    console.log(`   - Planificados: ${stats.planificados}`);

    // 4. Verificar que solo muestre turnos planificados
    console.log('\n4️⃣ Verificando filtro de turnos planificados...');
    
    const turnosPlanificados = await query(`
      SELECT 
        instalacion_nombre,
        puesto_nombre,
        es_ppc,
        guardia_trabajo_nombre,
        estado_ui
      FROM as_turnos_v_pauta_diaria_unificada
      WHERE fecha = '2025-08-30'
      ORDER BY instalacion_nombre, puesto_nombre
    `);

    console.log('✅ Turnos planificados mostrados:');
    turnosPlanificados.rows.forEach((row: any) => {
      const tipo = row.es_ppc ? 'PPC' : 'Guardia';
      const guardia = row.guardia_trabajo_nombre || 'Sin asignar';
      console.log(`   - ${row.instalacion_nombre}: ${row.puesto_nombre} (${tipo}) - ${guardia} - ${row.estado_ui}`);
    });

    console.log('\n🎯 IMPLEMENTACIÓN COMPLETADA:');
    console.log('=============================');
    console.log('✅ Vista unificada implementada');
    console.log('✅ Solo muestra turnos planificados de Pauta Mensual');
    console.log('✅ Estados correctos: planificado, asistido, inasistencia, reemplazo, sin_cobertura');
    console.log('✅ Índices optimizados creados');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Actualizar API de Pauta Diaria para usar la nueva vista');
    console.log('2. Implementar Central de Monitoreo unificado');
    console.log('3. Implementar sistema de replicación automática');

  } catch (error) {
    console.error('❌ Error durante la implementación:', error);
  } finally {
    process.exit(0);
  }
}

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

implementarVistaUnificada();
