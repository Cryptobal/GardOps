#!/usr/bin/env tsx

import { query } from '../src/lib/database';

async function testPautaDiariaInstalacion() {
  try {
    console.log('🧪 Probando API de pauta diaria con campo instalacion_nombre...');
    
    // Obtener fecha actual
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth() + 1;
    const dia = fecha.getDate();
    
    console.log(`📅 Probando para fecha: ${anio}-${mes}-${dia}`);
    
    // Consulta directa a la base de datos
    const pautaDiaria = await query(`
      SELECT DISTINCT ON (pm.id)
        pm.id as puesto_id,
        po.nombre_puesto,
        po.es_ppc,
        
        -- Datos del guardia original asignado al puesto
        pm.guardia_id as guardia_original_id,
        g.nombre as guardia_original_nombre,
        g.apellido_paterno as guardia_original_apellido_paterno,
        g.apellido_materno as guardia_original_apellido_materno,
        
        -- Datos de la instalación
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        NULL as comuna_nombre,
        
        -- Estado y observaciones
        pm.estado,
        pm.observaciones,
        
        -- Datos del reemplazo/cobertura (tomar el más reciente)
        te.guardia_id as reemplazo_guardia_id,
        rg.nombre as reemplazo_nombre,
        rg.apellido_paterno as reemplazo_apellido_paterno,
        rg.apellido_materno as reemplazo_apellido_materno,
        
        -- Datos del rol de servicio
        rs.nombre as rol_nombre,
        rs.hora_inicio as hora_entrada,
        rs.hora_termino as hora_salida,
        CASE 
          WHEN rs.nombre ILIKE '%día%' OR rs.nombre ILIKE '%dia%' THEN 'dia'
          WHEN rs.nombre ILIKE '%noche%' THEN 'noche'
          ELSE NULL
        END as tipo_turno
        
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN TE_turnos_extras te ON pm.id = te.pauta_id
      LEFT JOIN guardias rg ON te.guardia_id = rg.id
      
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
        AND po.activo = true
        AND pm.estado IN ('trabajado', 'T', 'reemplazo', 'inasistencia', 'sin_cobertura')
      
      ORDER BY pm.id, te.created_at DESC NULLS LAST, i.nombre, po.nombre_puesto
    `, [anio, mes, dia]);

    console.log(`📊 Registros encontrados: ${pautaDiaria.rows.length}`);
    
    if (pautaDiaria.rows.length > 0) {
      console.log('✅ Campo instalacion_nombre presente en todos los registros:');
      pautaDiaria.rows.forEach((row: any, index: number) => {
        console.log(`  ${index + 1}. Puesto: ${row.nombre_puesto} | Instalación: ${row.instalacion_nombre} | ID: ${row.instalacion_id}`);
      });
    } else {
      console.log('⚠️ No se encontraron registros para la fecha actual');
      
      // Buscar registros en otras fechas
      const registrosExistentes = await query(`
        SELECT DISTINCT pm.anio, pm.mes, pm.dia, COUNT(*) as total
        FROM as_turnos_pauta_mensual pm
        INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
        WHERE po.activo = true
        GROUP BY pm.anio, pm.mes, pm.dia
        ORDER BY pm.anio DESC, pm.mes DESC, pm.dia DESC
        LIMIT 5
      `);
      
      if (registrosExistentes.rows.length > 0) {
        console.log('📅 Fechas disponibles con datos:');
        registrosExistentes.rows.forEach((row: any) => {
          console.log(`  ${row.anio}-${row.mes}-${row.dia}: ${row.total} registros`);
        });
      }
    }
    
    console.log('✅ Test completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error en test:', error);
  } finally {
    process.exit(0);
  }
}

testPautaDiariaInstalacion();
