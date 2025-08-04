import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logCRUD, logError } from '@/lib/logging';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Iniciando endpoint pauta-diaria optimizado');
    
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');

    console.log('📅 Fecha recibida:', fecha);

    if (!fecha) {
      return NextResponse.json(
        { error: 'Fecha requerida' },
        { status: 400 }
      );
    }

    // Extraer año, mes y día de la fecha
    const fechaObj = new Date(fecha + 'T00:00:00.000Z');
    const anio = fechaObj.getUTCFullYear();
    const mes = fechaObj.getUTCMonth() + 1;
    const dia = fechaObj.getUTCDate();

    console.log(`🔍 Consultando pauta diaria para: ${fecha} (${anio}-${mes}-${dia})`);

    // Consulta optimizada para obtener todos los datos necesarios incluyendo reemplazos y PPCs cubiertos
    const pautaDiaria = await query(`
      SELECT 
        pm.id,
        pm.puesto_id,
        pm.guardia_id,
        pm.anio,
        pm.mes,
        pm.dia,
        pm.estado,
        pm.observaciones,
        
        -- Datos de la instalación
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        i.valor_turno_extra,
        
        -- Datos del puesto
        po.nombre_puesto,
        po.es_ppc,
        
        -- Datos del guardia asignado originalmente
        g.nombre as guardia_nombre,
        g.apellido_paterno as guardia_apellido_paterno,
        g.apellido_materno as guardia_apellido_materno,
        g.rut as guardia_rut,
        
        -- Datos del guardia que cubrió el turno (reemplazo o PPC)
        CASE 
          WHEN po.es_ppc = true THEN te.guardia_id
          ELSE COALESCE(te.guardia_id, pm.guardia_id)
        END as guardia_actual_id,
        CASE 
          WHEN po.es_ppc = true THEN rg.nombre
          ELSE COALESCE(rg.nombre, g.nombre)
        END as guardia_actual_nombre,
        CASE 
          WHEN po.es_ppc = true THEN rg.apellido_paterno
          ELSE COALESCE(rg.apellido_paterno, g.apellido_paterno)
        END as guardia_actual_apellido_paterno,
        CASE 
          WHEN po.es_ppc = true THEN rg.apellido_materno
          ELSE COALESCE(rg.apellido_materno, g.apellido_materno)
        END as guardia_actual_apellido_materno,
        CASE 
          WHEN po.es_ppc = true THEN rg.rut
          ELSE COALESCE(rg.rut, g.rut)
        END as guardia_actual_rut,
        
        -- Datos del reemplazo (si existe)
        te.guardia_id as reemplazo_guardia_id,
        rg.nombre as reemplazo_nombre,
        rg.apellido_paterno as reemplazo_apellido_paterno,
        rg.apellido_materno as reemplazo_apellido_materno,
        rg.rut as reemplazo_rut,
        te.estado as tipo_reemplazo,
        
        -- Datos del rol para el turno
        rs.nombre as rol_nombre,
        rs.hora_inicio,
        rs.hora_termino,
        
        -- Información adicional para determinar el tipo de cobertura
        CASE 
          WHEN te.estado = 'reemplazo' THEN 'reemplazo'
          WHEN te.estado = 'ppc' AND po.es_ppc = true THEN 'ppc_cubierto'
          WHEN po.es_ppc = true AND te.guardia_id IS NOT NULL THEN 'ppc_cubierto'
          WHEN pm.estado = 'reemplazo' THEN 'reemplazo'
          ELSE 'normal'
        END as tipo_cobertura
        
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN turnos_extras te ON pm.id = te.pauta_id
      LEFT JOIN guardias rg ON te.guardia_id = rg.id
      
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
        AND po.activo = true
      
      ORDER BY i.nombre, po.nombre_puesto
    `, [anio, mes, dia]);

    console.log(`📊 Pauta diaria para ${fecha}: ${pautaDiaria.rows.length} registros`);

    // Procesar los datos para agrupar por instalación
    const instalaciones = new Map();
    
    pautaDiaria.rows.forEach((row: any) => {
      const instalacionId = row.instalacion_id;
      
      if (!instalaciones.has(instalacionId)) {
        instalaciones.set(instalacionId, {
          id: instalacionId,
          nombre: row.instalacion_nombre,
          valor_turno_extra: row.valor_turno_extra,
          turnos: []
        });
      }
      
      const instalacion = instalaciones.get(instalacionId);
      
      // Determinar el nombre completo del guardia actual
      const guardiaActualNombre = row.guardia_actual_nombre ? 
        `${row.guardia_actual_nombre} ${row.guardia_actual_apellido_paterno} ${row.guardia_actual_apellido_materno || ''}`.trim() : null;
      
      // Determinar el nombre completo del guardia original
      const guardiaOriginalNombre = row.guardia_nombre ? 
        `${row.guardia_nombre} ${row.guardia_apellido_paterno} ${row.guardia_apellido_materno || ''}`.trim() : null;
      
      // Determinar el nombre completo del reemplazo
      const reemplazoNombre = row.reemplazo_nombre ? 
        `${row.reemplazo_nombre} ${row.reemplazo_apellido_paterno} ${row.reemplazo_apellido_materno || ''}`.trim() : null;
      
      instalacion.turnos.push({
        id: row.id,
        puesto_id: row.puesto_id,
        guardia_id: row.guardia_id,
        guardia_nombre: guardiaOriginalNombre,
        guardia_rut: row.guardia_rut,
        
        // Información del guardia que está actualmente cubriendo el turno
        guardia_actual_id: row.guardia_actual_id,
        guardia_actual_nombre: guardiaActualNombre,
        guardia_actual_rut: row.guardia_actual_rut,
        
        // Información del reemplazo
        reemplazo_guardia_id: row.reemplazo_guardia_id,
        reemplazo_nombre: reemplazoNombre,
        reemplazo_rut: row.reemplazo_rut,
        tipo_reemplazo: row.tipo_reemplazo,
        
        // Tipo de cobertura para mostrar correctamente
        tipo_cobertura: row.tipo_cobertura,
        
        nombre_puesto: row.nombre_puesto,
        es_ppc: row.es_ppc,
        estado: (() => {
          // Si es PPC y no tiene guardia asignado específicamente para cubrirlo, debe estar sin cubrir
          if (row.es_ppc && !row.guardia_actual_id) {
            return 'sin_cubrir';
          }
          // Si es PPC con guardia asignado específicamente para cubrirlo, usar el estado de la base de datos
          if (row.es_ppc && row.guardia_actual_id) {
            // Si el estado es 'sin_cubrir', mantenerlo
            if (row.estado === 'sin_cubrir') {
              return 'sin_cubrir';
            }
            // Si tiene otro estado, usar 'cubierto'
            return 'cubierto';
          }
          // Para turnos normales (no PPC), usar la lógica original
          if (row.estado) {
            return row.estado;
          }
          // Estado por defecto
          return row.es_ppc ? 'sin_cubrir' : 'sin_marcar';
        })(),
        observaciones: row.observaciones || null,
        rol_nombre: row.rol_nombre,
        hora_inicio: row.hora_inicio,
        hora_termino: row.hora_termino,
        turno_nombre: (() => {
          if (!row.hora_inicio || !row.hora_termino) return 'Turno';
          const inicio = parseInt(row.hora_inicio.split(':')[0]);
          const termino = parseInt(row.hora_termino.split(':')[0]);
          
          // Si el turno cruza la medianoche (termino < inicio), es turno de noche
          if (termino < inicio) return 'Noche';
          // Si empieza antes de las 12, es turno de día
          if (inicio < 12) return 'Día';
          // Si empieza después de las 12, es turno de tarde/noche
          return 'Tarde';
        })()
      });
    });

    const resultado = Array.from(instalaciones.values());

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
        // Verificar si es PPC y tiene guardia asignado
        const turnoInfo = await query(`
          SELECT pm.guardia_id, po.es_ppc
          FROM as_turnos_pauta_mensual pm
          INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
          WHERE pm.id = $1
        `, [turnoId]);

        if (turnoInfo.rows.length === 0) {
          return NextResponse.json(
            { error: 'Turno no encontrado' },
            { status: 404 }
          );
        }

        const turnoAsistencia = turnoInfo.rows[0];
        
        // Si es PPC y no tiene guardia asignado, no se puede marcar como trabajado
        if (turnoAsistencia.es_ppc && !turnoAsistencia.guardia_id) {
          return NextResponse.json(
            { error: 'No se puede marcar asistencia para un PPC sin guardia asignado' },
            { status: 400 }
          );
        }

        queryUpdate = `
          UPDATE as_turnos_pauta_mensual 
          SET estado = 'trabajado', 
              updated_at = NOW()
          WHERE id = $1
        `;
        params = [turnoId];
        break;

      case 'inasistencia':
        queryUpdate = `
          UPDATE as_turnos_pauta_mensual 
          SET estado = 'inasistencia', 
              updated_at = NOW()
          WHERE id = $1
        `;
        params = [turnoId];
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
          SELECT pm.anio, pm.mes, pm.dia, pm.guardia_id as guardia_original_id, po.instalacion_id, po.id as puesto_id, i.valor_turno_extra
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
        
        // Actualizar el turno con el reemplazo
        queryUpdate = `
          UPDATE as_turnos_pauta_mensual 
          SET estado = 'reemplazo', 
              guardia_id = $2,
              updated_at = NOW()
          WHERE id = $1
        `;
        params = [turnoId, guardiaId];

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
          turnoId, // pauta_id es el ID del turno en as_turnos_pauta_mensual
          fechaTurno,
          'reemplazo',
          turno.valor_turno_extra
        ]);
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
        
        // Asignar guardia al PPC
        queryUpdate = `
          UPDATE as_turnos_pauta_mensual 
          SET guardia_id = $2, 
              estado = 'cubierto',
              updated_at = NOW()
          WHERE id = $1
        `;
        params = [turnoId, guardiaId];

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
          turnoId, // pauta_id es el ID del turno en as_turnos_pauta_mensual
          fechaPpc,
          'ppc',
          ppc.valor_turno_extra
        ]);
        break;

      case 'editar_reemplazo':
        if (!guardiaId) {
          return NextResponse.json(
            { error: 'Guardia requerido para editar reemplazo' },
            { status: 400 }
          );
        }
        
        // Actualizar el turno con el nuevo reemplazo
        queryUpdate = `
          UPDATE as_turnos_pauta_mensual 
          SET guardia_id = $2,
              observaciones = $3,
              updated_at = NOW()
          WHERE id = $1
        `;
        params = [turnoId, guardiaId, observaciones || null];
        break;

      case 'eliminar_ppc':
        // Eliminar la cobertura del PPC - volver a estado sin cubrir
        // En lugar de establecer guardia_id como NULL, lo mantenemos pero cambiamos el estado
        // y limpiamos reemplazo_guardia_id
        queryUpdate = `
          UPDATE as_turnos_pauta_mensual 
          SET estado = 'sin_cubrir',
              reemplazo_guardia_id = NULL,
              observaciones = $2,
              updated_at = NOW()
          WHERE id = $1
        `;
        params = [turnoId, observaciones || null];

        // Eliminar registro de turnos_extras
        await query(`
          DELETE FROM turnos_extras 
          WHERE pauta_id = $1 AND estado = 'ppc'
        `, [turnoId]);
        break;

      case 'eliminar_guardia':
        // Eliminar el guardia asignado al turno normal - volver a estado sin marcar
        queryUpdate = `
          UPDATE as_turnos_pauta_mensual 
          SET guardia_id = NULL,
              estado = 'sin_marcar',
              observaciones = $2,
              updated_at = NOW()
          WHERE id = $1
        `;
        params = [turnoId, observaciones || null];

        // Eliminar registro de turnos_extras si existe (para reemplazos)
        try {
          await query(`
            DELETE FROM turnos_extras 
            WHERE pauta_id = $1 AND estado = 'reemplazo'
          `, [turnoId]);
        } catch (error) {
          console.log('⚠️ No se pudo eliminar registro de turnos_extras:', error);
          // Continuar con la actualización principal
        }
        break;

      case 'editar_ppc':
        if (!guardiaId) {
          return NextResponse.json(
            { error: 'Guardia requerido para editar PPC' },
            { status: 400 }
          );
        }
        
        // Actualizar el guardia asignado al PPC
        queryUpdate = `
          UPDATE as_turnos_pauta_mensual 
          SET guardia_id = $2,
              observaciones = $3,
              updated_at = NOW()
          WHERE id = $1
        `;
        params = [turnoId, guardiaId, observaciones || null];

        // Actualizar registro en turnos_extras
        await query(`
          UPDATE turnos_extras 
          SET guardia_id = $2,
              updated_at = NOW()
          WHERE pauta_id = $1 AND estado = 'ppc'
        `, [turnoId, guardiaId]);
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

      case 'deshacer':
        // Deshacer marcado - volver a sin_marcar
        queryUpdate = `
          UPDATE as_turnos_pauta_mensual 
          SET estado = 'sin_marcar',
              updated_at = NOW()
          WHERE id = $1
        `;
        params = [turnoId];
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