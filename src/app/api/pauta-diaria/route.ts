import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logCRUD, logError } from '@/lib/logging';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Iniciando endpoint pauta-diaria refactorizado');
    
    const { searchParams } = new URL(request.url);
    const anio = searchParams.get('anio');
    const mes = searchParams.get('mes');
    const dia = searchParams.get('dia');

    console.log('📅 Parámetros recibidos:', { anio, mes, dia });

    if (!anio || !mes || !dia) {
      return NextResponse.json(
        { error: 'anio, mes y dia son requeridos' },
        { status: 400 }
      );
    }

    console.log(`🔍 Consultando pauta diaria para: ${anio}-${mes}-${dia}`);

    // Consulta optimizada para obtener TODOS los turnos asignados para ese día
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
      LEFT JOIN turnos_extras te ON pm.id = te.pauta_id
      LEFT JOIN guardias rg ON te.guardia_id = rg.id
      
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
        AND po.activo = true
        AND pm.estado IN ('trabajado', 'T', 'reemplazo', 'inasistencia', 'sin_cobertura')  -- CORREGIDO: Mostrar todos los turnos asignados
      
      ORDER BY pm.id, te.created_at DESC NULLS LAST, i.nombre, po.nombre_puesto
    `, [anio, mes, dia]);

    console.log(`📊 Pauta diaria para ${anio}-${mes}-${dia}: ${pautaDiaria.rows.length} registros`);

    // Debug: Verificar si hay datos en las tablas
    const debugQuery = await query(`
      SELECT 
        (SELECT COUNT(*) FROM as_turnos_pauta_mensual WHERE anio = $1 AND mes = $2 AND dia = $3) as total_pauta,
        (SELECT COUNT(*) FROM as_turnos_puestos_operativos WHERE activo = true) as total_puestos,
        (SELECT COUNT(*) FROM instalaciones) as total_instalaciones,
        (SELECT COUNT(*) FROM guardias) as total_guardias
    `, [anio, mes, dia]);
    
    console.log('🔍 Debug - Datos disponibles:', debugQuery.rows[0]);

    console.log(`📊 Pauta diaria para ${anio}-${mes}-${dia}: ${pautaDiaria.rows.length} registros`);

    // Debug: Ver los datos que llegan de la base de datos
    console.log('🔍 Datos raw de la base de datos:', pautaDiaria.rows.map((row: any) => ({
      puesto_id: row.puesto_id,
      nombre_puesto: row.nombre_puesto,
      instalacion_nombre: row.instalacion_nombre,
      guardia_original_id: row.guardia_original_id,
      estado: row.estado
    })));

    // Procesar los datos según el formato requerido
    const resultado = pautaDiaria.rows.map((row: {
      puesto_id: string;
      nombre_puesto: string;
      es_ppc: boolean;
      guardia_original_id: string | null;
      guardia_original_nombre: string | null;
      guardia_original_apellido_paterno: string | null;
      guardia_original_apellido_materno: string | null;
      instalacion_id: string;
      instalacion_nombre: string;
      comuna_nombre: string | null;
      estado: string;
      observaciones: string | null;
      reemplazo_guardia_id: string | null;
      reemplazo_nombre: string | null;
      reemplazo_apellido_paterno: string | null;
      reemplazo_apellido_materno: string | null;
      rol_nombre: string | null;
      hora_entrada: string | null;
      hora_salida: string | null;
      tipo_turno: string | null;
    }) => {
      // Determinar asignación real
      let asignacionReal = "PPC - Sin asignar";
      if (row.guardia_original_id) {
        const nombreCompleto = `${row.guardia_original_nombre} ${row.guardia_original_apellido_paterno} ${row.guardia_original_apellido_materno || ''}`.trim();
        asignacionReal = nombreCompleto;
      }

      // Determinar cobertura real
      let coberturaReal = null;
      if (row.reemplazo_guardia_id) {
        const nombreCompleto = `${row.reemplazo_nombre} ${row.reemplazo_apellido_paterno} ${row.reemplazo_apellido_materno || ''}`.trim();
        coberturaReal = nombreCompleto;
      }

      // Lógica simplificada para el estado: mantener estados reales de la BD
      let estadoCorregido = row.estado;
      
      // Solo normalizar casos especiales
      if (!row.estado || row.estado === '') {
        estadoCorregido = row.guardia_original_id ? 'T' : 'sin_cobertura';
      } else if (row.estado === 'asignado') {
        // Normalizar 'asignado' a 'T' por consistencia
        estadoCorregido = 'T';
      }
      
      console.log(`📊 Puesto ${row.puesto_id}: estado original=${row.estado}, corregido=${estadoCorregido}, guardia=${row.guardia_original_id ? 'Sí' : 'No'}, reemplazo=${row.reemplazo_guardia_id ? 'Sí' : 'No'}`);

      return {
        puesto_id: row.puesto_id,
        nombre_puesto: row.nombre_puesto,
        guardia_original: row.guardia_original_id ? {
          id: row.guardia_original_id,
          nombre: `${row.guardia_original_nombre} ${row.guardia_original_apellido_paterno} ${row.guardia_original_apellido_materno || ''}`.trim()
        } : null,
        asignacion_real: asignacionReal,
        cobertura_real: coberturaReal,
        estado: estadoCorregido,
        observaciones: row.observaciones,
        instalacion_id: row.instalacion_id,
        instalacion_nombre: row.instalacion_nombre,
        comuna_nombre: row.comuna_nombre,
        es_ppc: row.es_ppc,
        rol_nombre: row.rol_nombre,
        horario_entrada: row.hora_entrada,
        horario_salida: row.hora_salida,
        tipo_turno: row.tipo_turno
      };
    });

    console.log("✅ API Pauta Diaria: Estados procesados - estado 'trabajado' mantenido para guardias asistidos");
    return NextResponse.json(resultado);

  } catch (error) {
    console.error('❌ Error en pauta-diaria API:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para actualizar estado de asistencia
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { turnoId, accion, guardiaId, motivo, observaciones } = body;
    
    // Por ahora usar un tenant_id fijo para testing
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';
    const usuario = 'admin@test.com'; // En producción, obtener del token de autenticación

    console.log('🔄 Actualizando estado de asistencia:', { turnoId, accion, guardiaId, motivo, observaciones });

    // Obtener datos anteriores para el log
    const turnoAnterior = await query(`
      SELECT pm.*, po.nombre_puesto, po.es_ppc, i.nombre as instalacion_nombre
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE pm.id = $1
    `, [turnoId]);

    if (turnoAnterior.rows.length === 0) {
      return NextResponse.json(
        { error: 'Turno no encontrado' },
        { status: 404 }
      );
    }

    const datosAnteriores = turnoAnterior.rows[0];

    let queryUpdate = '';
    let params: any[] = [];

    switch (accion) {
      case 'asistio':
        // Marcar como trabajado y actualizar la pauta mensual
        // Para PPCs, mantener el estado 'trabajado' si ya tienen cobertura
        queryUpdate = `
          UPDATE as_turnos_pauta_mensual 
          SET estado = 'trabajado', 
              updated_at = NOW()
          WHERE id = $1
        `;
        params = [turnoId];
        break;

      case 'no_asistio':
        // Verificar si es PPC para determinar el estado correcto
        const esPpcInasistencia = await query(`
          SELECT po.es_ppc 
          FROM as_turnos_pauta_mensual pm
          INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
          WHERE pm.id = $1
        `, [turnoId]);

        // Para PPCs usar 'sin_cobertura', para puestos regulares usar 'inasistencia'
        const estadoInasistencia = esPpcInasistencia.rows[0]?.es_ppc ? 'sin_cobertura' : 'inasistencia';
        
        queryUpdate = `
          UPDATE as_turnos_pauta_mensual 
          SET estado = $3,
              observaciones = $2,
              updated_at = NOW()
          WHERE id = $1
        `;
        params = [turnoId, observaciones || null, estadoInasistencia];
        break;

      case 'reemplazo':
        if (!guardiaId) {
          return NextResponse.json(
            { error: 'Guardia de reemplazo requerido' },
            { status: 400 }
          );
        }
        
        // Obtener datos del turno original
        const turnoData = await query(`
          SELECT pm.anio, pm.mes, pm.dia, pm.guardia_id as guardia_original_id, po.instalacion_id, po.id as puesto_id, po.es_ppc, i.valor_turno_extra
          FROM as_turnos_pauta_mensual pm
          INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
          INNER JOIN instalaciones i ON po.instalacion_id = i.id
          WHERE pm.id = $1
        `, [turnoId]);

        if (turnoData.rows.length === 0) {
          return NextResponse.json(
            { error: 'Turno no encontrado' },
            { status: 404 }
          );
        }

        const turno = turnoData.rows[0];
        const fechaTurno = `${turno.anio}-${String(turno.mes).padStart(2, '0')}-${String(turno.dia).padStart(2, '0')}`;
        
        // Determinar el estado correcto: 'reemplazo' para puestos regulares, 'trabajado' para PPCs
        const estadoReemplazo = turno.es_ppc ? 'trabajado' : 'reemplazo';
        
        // Actualizar el turno con el reemplazo
        queryUpdate = `
          UPDATE as_turnos_pauta_mensual 
          SET estado = $4, 
              reemplazo_guardia_id = $2,
              observaciones = $3,
              updated_at = NOW()
          WHERE id = $1
        `;
        params = [turnoId, guardiaId, observaciones || null, estadoReemplazo];

        // Crear registro en turnos_extras
        await query(`
          INSERT INTO turnos_extras (
            guardia_id, 
            puesto_id, 
            instalacion_id, 
            pauta_id,
            fecha, 
            estado, 
            valor
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          guardiaId,
          turno.puesto_id,
          turno.instalacion_id,
          turnoId,
          fechaTurno,
          turno.es_ppc ? 'ppc' : 'reemplazo',
          turno.valor_turno_extra
        ]);
        break;

      case 'sin_cobertura':
        // Marcar como sin cobertura (válido para PPCs y puestos regulares)
        queryUpdate = `
          UPDATE as_turnos_pauta_mensual 
          SET estado = 'sin_cobertura',
              observaciones = $2,
              updated_at = NOW()
          WHERE id = $1
        `;
        params = [turnoId, observaciones || null];
        break;

      case 'asignar_ppc':
        if (!guardiaId) {
          return NextResponse.json(
            { error: 'Guardia requerido para PPC' },
            { status: 400 }
          );
        }
        
        // Obtener datos del PPC
        const ppcData = await query(`
          SELECT pm.anio, pm.mes, pm.dia, po.instalacion_id, i.valor_turno_extra, po.id as puesto_id
          FROM as_turnos_pauta_mensual pm
          INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
          INNER JOIN instalaciones i ON po.instalacion_id = i.id
          WHERE pm.id = $1
        `, [turnoId]);

        if (ppcData.rows.length === 0) {
          return NextResponse.json(
            { error: 'PPC no encontrado' },
            { status: 404 }
          );
        }

        const ppc = ppcData.rows[0];
        const fechaPpc = `${ppc.anio}-${String(ppc.mes).padStart(2, '0')}-${String(ppc.dia).padStart(2, '0')}`;
        
        // Asignar guardia al PPC - usar estado 'trabajado' para PPCs cubiertos
        queryUpdate = `
          UPDATE as_turnos_pauta_mensual 
          SET reemplazo_guardia_id = $2, 
              estado = 'trabajado',
              observaciones = $3,
              updated_at = NOW()
          WHERE id = $1
        `;
        params = [turnoId, guardiaId, observaciones || null];

        // Crear registro en turnos_extras
        await query(`
          INSERT INTO turnos_extras (
            guardia_id, 
            puesto_id, 
            instalacion_id, 
            pauta_id,
            fecha, 
            estado, 
            valor
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          guardiaId,
          ppc.puesto_id,
          ppc.instalacion_id,
          turnoId,
          fechaPpc,
          'ppc',
          ppc.valor_turno_extra
        ]);
        break;

      case 'eliminar_cobertura':
        // Verificar si es PPC para determinar el estado correcto
        const esPpc = await query(`
          SELECT po.es_ppc 
          FROM as_turnos_pauta_mensual pm
          INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
          WHERE pm.id = $1
        `, [turnoId]);

        // CORRECCIÓN: Para puestos regulares (no PPC), volver a 'T' (asignado) en lugar de 'trabajado'
        const estadoDestino = esPpc.rows[0]?.es_ppc ? 'T' : 'T';
        
        // Eliminar cobertura y volver al estado apropiado
        queryUpdate = `
          UPDATE as_turnos_pauta_mensual 
          SET estado = $3,
              reemplazo_guardia_id = NULL,
              observaciones = $2,
              updated_at = NOW()
          WHERE id = $1
        `;
        params = [turnoId, observaciones || null, estadoDestino];

        // Eliminar registro de turnos_extras
        await query(`
          DELETE FROM turnos_extras 
          WHERE pauta_id = $1
        `, [turnoId]);
        break;

      case 'agregar_observaciones':
        // Agregar observaciones al turno
        queryUpdate = `
          UPDATE as_turnos_pauta_mensual 
          SET observaciones = $2,
              updated_at = NOW()
          WHERE id = $1
        `;
        params = [turnoId, observaciones];
        break;

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }

    await query(queryUpdate, params);

    // Obtener datos después de la actualización para el log
    const turnoDespues = await query(`
      SELECT pm.*, po.nombre_puesto, po.es_ppc, i.nombre as instalacion_nombre
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE pm.id = $1
    `, [turnoId]);

    const datosDespues = turnoDespues.rows[0];

    // Log de actualización de pauta diaria
    await logCRUD(
      'pauta_diaria',
      turnoId,
      'UPDATE',
      usuario,
      {
        ...datosAnteriores,
        accion_realizada: accion,
        guardia_id_solicitado: guardiaId,
        motivo: motivo,
        observaciones_solicitadas: observaciones
      },
      {
        ...datosDespues,
        accion_realizada: accion,
        guardia_id_asignado: guardiaId,
        motivo: motivo,
        observaciones_finales: observaciones
      },
      tenantId
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Error actualizando asistencia:', error);
    
    // Log del error
    await logError(
      'pauta_diaria',
      'UPDATE',
      'admin@test.com',
      error,
      { endpoint: '/api/pauta-diaria', method: 'PUT' },
      'accebf8a-bacc-41fa-9601-ed39cb320a52'
    );
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 