#!/usr/bin/env ts-node

import pool from '../src/lib/database';

async function fixNombreGuardia() {
  console.log('🔧 CORRIGIENDO FORMATO DE NOMBRE DE GUARDIA\n');

  try {
    console.log('1️⃣ Actualizando vista as_turnos_v_pauta_diaria_unificada...');
    
    await pool.query(`
      -- CORRECCIÓN DE FORMATO DE NOMBRE DE GUARDIA
      -- Cambia el formato de "Apellido1 Apellido2, Nombre" a "Nombre Apellido1"

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
          
          -- NUEVOS CAMPOS PARA TURNOS EXTRAS
          pm.guardia_trabajo_id,
          pm.tipo_cobertura,
          pm.tipo_turno,
          pm.estado_puesto,
          pm.estado_guardia,
          
          -- Información de la instalación
          i.id as instalacion_id,
          i.nombre as instalacion_nombre,
          i.telefono as instalacion_telefono,
          
          -- Información del guardia titular (FORMATO CORREGIDO: Nombre Apellido)
          g.id as guardia_titular_id,
          CASE 
            WHEN g.nombre IS NOT NULL AND g.apellido_paterno IS NOT NULL THEN 
              CONCAT(g.nombre, ' ', g.apellido_paterno)
            WHEN g.nombre IS NOT NULL THEN g.nombre
            WHEN g.apellido_paterno IS NOT NULL THEN g.apellido_paterno
            ELSE NULL
          END as guardia_titular_nombre,
          g.telefono as guardia_titular_telefono,
          
          -- Información del puesto
          po.nombre_puesto,
          po.es_ppc,
          
          -- Información del rol de servicio
          rs.id as rol_id,
          rs.nombre as rol_nombre,
          rs.hora_inicio::text as hora_inicio,
          rs.hora_termino::text as hora_fin
          
        FROM as_turnos_pauta_mensual pm
        INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
        INNER JOIN instalaciones i ON po.instalacion_id = i.id
        LEFT JOIN guardias g ON pm.guardia_id = g.id
        LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
        WHERE po.activo = true
          AND pm.estado IN ('planificado', 'libre', 'sin_cobertura')  
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
        
        -- Estado UI para Pauta Diaria (CORREGIDO PARA MOSTRAR BOTONES)
        CASE 
          -- Si no se ha marcado asistencia, aparece como 'plan' para mostrar botones
          WHEN pd.estado_ui IS NULL OR pd.estado_ui = 'plan' THEN 'plan'
          
          -- Estados de ejecución
          WHEN pd.estado_ui = 'asistio' THEN 'asistido'
          WHEN pd.estado_ui = 'trabajado' THEN 'asistido'
          WHEN pd.estado_ui = 'inasistencia' THEN 'sin_cobertura'
          WHEN pd.estado_ui = 'reemplazo' THEN 'reemplazo'
          WHEN pd.estado_ui = 'sin_cobertura' THEN 'sin_cobertura'
          
          -- Estados de turno extra
          WHEN pd.estado_ui = 'extra' THEN 'te'
          WHEN pd.estado_ui = 'turno_extra' THEN 'te'
          WHEN pd.estado_ui = 'te' THEN 'te'
          
          -- Por defecto, plan para mostrar botones
          ELSE 'plan'
        END as estado_ui,
        
        -- Metadatos en formato JSON
        jsonb_build_object(
          'cobertura_guardia_id', COALESCE(pd.guardia_trabajo_id::text, pd.meta->>'cobertura_guardia_id'),
          'tipo_cobertura', pd.tipo_cobertura,
          'observaciones', pd.observaciones,
          'estado_semaforo', pd.meta->>'estado_semaforo',
          'comentarios', pd.meta->>'comentarios'
        ) as meta,
        
        -- ID del guardia que trabaja (titular o cobertura)
        COALESCE(pd.guardia_trabajo_id, pd.guardia_titular_id)::text as guardia_trabajo_id,
        
        -- Nombre del guardia que trabaja (FORMATO CORREGIDO)
        CASE 
          WHEN pd.guardia_trabajo_id IS NOT NULL THEN 
            (SELECT CASE 
              WHEN nombre IS NOT NULL AND apellido_paterno IS NOT NULL THEN 
                CONCAT(nombre, ' ', apellido_paterno)
              WHEN nombre IS NOT NULL THEN nombre
              WHEN apellido_paterno IS NOT NULL THEN apellido_paterno
              ELSE NULL
            END FROM guardias WHERE id = pd.guardia_trabajo_id)
          ELSE pd.guardia_titular_nombre
        END as guardia_trabajo_nombre,
        
        -- Teléfono del guardia que trabaja
        CASE 
          WHEN pd.guardia_trabajo_id IS NOT NULL THEN 
            (SELECT telefono FROM guardias WHERE id = pd.guardia_trabajo_id)
          ELSE pd.guardia_titular_telefono
        END as guardia_trabajo_telefono,
        
        -- Información del guardia titular
        pd.guardia_titular_id::text,
        pd.guardia_titular_nombre,
        pd.guardia_titular_telefono,
        
        -- Flags de estado
        pd.es_ppc,
        (pd.guardia_trabajo_id IS NOT NULL AND pd.guardia_trabajo_id != pd.guardia_titular_id) as es_reemplazo,
        (pd.estado_ui IN ('sin_cobertura', 'inasistencia')) as es_sin_cobertura,
        (pd.estado_ui = 'inasistencia') as es_falta_sin_aviso,
        (pd.es_ppc AND pd.guardia_titular_id IS NULL) OR 
        (pd.estado_ui IN ('sin_cobertura', 'inasistencia')) as necesita_cobertura,
        
        -- Información del horario
        pd.hora_inicio,
        pd.hora_fin,
        pd.rol_id::text,
        pd.rol_nombre,
        
        -- Nombres de reemplazo/cobertura (FORMATO CORREGIDO)
        CASE 
          WHEN pd.guardia_trabajo_id IS NOT NULL AND pd.guardia_trabajo_id != pd.guardia_titular_id THEN 
            (SELECT CASE 
              WHEN nombre IS NOT NULL AND apellido_paterno IS NOT NULL THEN 
                CONCAT(nombre, ' ', apellido_paterno)
              WHEN nombre IS NOT NULL THEN nombre
              WHEN apellido_paterno IS NOT NULL THEN apellido_paterno
              ELSE NULL
            END FROM guardias WHERE id = pd.guardia_trabajo_id)
          ELSE NULL
        END as reemplazo_guardia_nombre,
        
        CASE 
          WHEN pd.guardia_trabajo_id IS NOT NULL AND pd.guardia_trabajo_id != pd.guardia_titular_id THEN 
            (SELECT CASE 
              WHEN nombre IS NOT NULL AND apellido_paterno IS NOT NULL THEN 
                CONCAT(nombre, ' ', apellido_paterno)
              WHEN nombre IS NOT NULL THEN nombre
              WHEN apellido_paterno IS NOT NULL THEN apellido_paterno
              ELSE NULL
            END FROM guardias WHERE id = pd.guardia_trabajo_id)
          ELSE NULL
        END as cobertura_guardia_nombre,
        
        -- Teléfono de cobertura
        CASE 
          WHEN pd.guardia_trabajo_id IS NOT NULL AND pd.guardia_trabajo_id != pd.guardia_titular_id THEN 
            (SELECT telefono FROM guardias WHERE id = pd.guardia_trabajo_id)
          ELSE NULL
        END as cobertura_guardia_telefono,
        
        -- NUEVA ESTRUCTURA DE ESTADOS
        pd.tipo_turno,
        pd.estado_puesto,
        pd.estado_guardia,
        pd.tipo_cobertura
        
      FROM pauta_dedup pd;
    `);

    console.log('✅ Vista actualizada exitosamente');
    
    // 2. Verificar que funciona
    console.log('\n2️⃣ Verificando funcionamiento...');
    const result = await pool.query(`
      SELECT 
        pauta_id,
        instalacion_nombre,
        rol_nombre,
        puesto_nombre,
        guardia_titular_nombre,
        guardia_trabajo_nombre,
        estado_ui,
        es_ppc
      FROM as_turnos_v_pauta_diaria_unificada 
      WHERE fecha = CURRENT_DATE
      LIMIT 5
    `);
    
    console.log('📊 Muestra de datos:');
    result.rows.forEach((row: any, i: number) => {
      console.log(`${i+1}. ${row.instalacion_nombre} - ${row.rol_nombre}`);
      console.log(`   Guardia titular: "${row.guardia_titular_nombre}"`);
      console.log(`   Guardia trabajo: "${row.guardia_trabajo_nombre}"`);
      console.log(`   Estado UI: "${row.estado_ui}"`);
      console.log(`   Es PPC: ${row.es_ppc}`);
      console.log('');
    });
    
    console.log('✅ Corrección completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  fixNombreGuardia().then(() => process.exit(0));
}

export { fixNombreGuardia };
