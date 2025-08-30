import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(req: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🚀 Endpoint de guardado de pauta mensual ejecutándose`);
  
  try {
    const body = await req.json();
    
    console.log('📝 Datos recibidos en endpoint:', {
      bodyType: typeof body,
      isArray: Array.isArray(body),
      hasInstalacionId: body && typeof body === 'object' && 'instalacion_id' in body,
      hasPauta: body && typeof body === 'object' && 'pauta' in body,
      hasActualizaciones: body && typeof body === 'object' && 'actualizaciones' in body,
      bodyKeys: body && typeof body === 'object' ? Object.keys(body) : 'N/A',
      pautaLength: body && typeof body === 'object' && 'pauta' in body ? body.pauta?.length : 'N/A',
      actualizacionesLength: body && typeof body === 'object' && 'actualizaciones' in body ? body.actualizaciones?.length : 'N/A'
    });

    // Verificar si es el formato del frontend (objeto con instalacion_id, mes, anio, pauta/actualizaciones)
    if (body && typeof body === 'object' && 'instalacion_id' in body && ('pauta' in body || 'actualizaciones' in body)) {
      console.log('📝 Formato frontend detectado:', { 
        instalacion_id: body.instalacion_id, 
        mes: body.mes, 
        anio: body.anio,
        pauta_length: body.pauta?.length,
        actualizaciones_length: body.actualizaciones?.length
      });

      // Si tiene actualizaciones, procesarlas directamente
      if (body.actualizaciones && Array.isArray(body.actualizaciones) && body.actualizaciones.length > 0) {
        console.log('📝 Procesando actualizaciones directamente:', body.actualizaciones.length);
        console.log('📝 Datos recibidos:', JSON.stringify(body.actualizaciones.slice(0, 3), null, 2)); // Mostrar solo los primeros 3
        return await procesarTurnos(body.actualizaciones);
      }

      // Convertir el formato del frontend al formato esperado por la base de datos
      const turnos = [];
      const { instalacion_id, mes, anio } = body;
      
      // Usar 'pauta' o 'actualizaciones', cualquiera que esté presente
      const pauta = body.pauta || body.actualizaciones;

      if (!Array.isArray(pauta) || pauta.length === 0) {
        console.log('❌ Pauta/actualizaciones no es un array válido:', { pauta, pautaType: typeof pauta });
        return NextResponse.json({ error: 'No se enviaron datos de pauta válidos' }, { status: 400 });
      }

      // Obtener puestos operativos de la instalación
      const puestosResult = await query(`
        SELECT id, nombre_puesto, guardia_id, es_ppc
        FROM as_turnos_puestos_operativos
        WHERE instalacion_id = $1 AND (activo = true OR activo IS NULL)
      `, [instalacion_id]);

      if (puestosResult.rows.length === 0) {
        console.log('❌ No se encontraron puestos operativos para instalación:', instalacion_id);
        return NextResponse.json({ error: 'No se encontraron puestos operativos para esta instalación' }, { status: 400 });
      }

      console.log('📋 Puestos operativos encontrados:', puestosResult.rows.length);

      // Generar turnos para cada día del mes
      const diasEnMes = new Date(anio, mes, 0).getDate();
      console.log('📅 Generando turnos para', diasEnMes, 'días del mes');
      
      for (let dia = 1; dia <= diasEnMes; dia++) {
        for (const puesto of puestosResult.rows) {
          // Buscar si hay un guardia asignado para este puesto en este día
          const guardiaAsignado = pauta.find((g: any) => {
            // El frontend envía guardia_id que puede ser el ID del puesto (para PPCs) o el ID del guardia
            if (g.guardia_id === puesto.id && puesto.es_ppc) {
              // Es un PPC, verificar si tiene asignación para este día
              const diaIndex = dia - 1;
              return g.dias && g.dias[diaIndex] === 'planificado'; // 'planificado' = TRABAJA
            } else if (g.guardia_id === puesto.guardia_id && !puesto.es_ppc) {
              // Es un guardia asignado, verificar si trabaja este día
              const diaIndex = dia - 1;
              return g.dias && g.dias[diaIndex] === 'planificado'; // 'planificado' = TRABAJA
            }
            return false;
          });

          const turno = {
            puesto_id: puesto.id,
            guardia_id: guardiaAsignado ? (puesto.es_ppc ? null : puesto.guardia_id) : null,
            anio: anio,
            mes: mes,
            dia: dia,
            estado: guardiaAsignado ? 'trabajado' : 'libre',
            observaciones: guardiaAsignado ? 'Turno asignado' : null,
            reemplazo_guardia_id: null,
          };

          turnos.push(turno);
        }
      }

      console.log(`🔄 Convertidos ${pauta.length} guardias a ${turnos.length} turnos para ${diasEnMes} días`);
      
      // Continuar con el procesamiento normal usando el array de turnos
      return await procesarTurnos(turnos);

    } else if (Array.isArray(body) && body.length > 0) {
      // Formato directo de array de turnos (para tests y otros usos)
      console.log('📝 Formato directo detectado:', { turnos_count: body.length });
      return await procesarTurnos(body);
    } else {
      console.log('❌ Formato no reconocido:', { 
        bodyType: typeof body, 
        isArray: Array.isArray(body),
        body: body 
      });
      return NextResponse.json({ error: 'No se enviaron datos válidos' }, { status: 400 });
    }

  } catch (err) {
    console.error('❌ Error guardando pauta mensual:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor al guardar la pauta mensual' },
      { status: 500 }
    );
  }
}

async function procesarTurnos(turnos: any[]) {
  let guardados = 0;
  let eliminados = 0;
  const errores = [];

  for (const turno of turnos) {
    const {
      puesto_id,
      guardia_id,
      anio,
      mes,
      dia,
      estado,
      observaciones,
      reemplazo_guardia_id,
    } = turno;

    // Validación de campos requeridos (estado puede ser null para eliminar)
    if (!puesto_id || !anio || !mes || !dia) {
      errores.push(`Turno inválido: faltan campos requeridos - puesto_id: ${puesto_id}, anio: ${anio}, mes: ${mes}, dia: ${dia}`);
      continue;
    }

    try {
      // CAMBIO: Si estado es null, intentar eliminar SOLO si no es TE/diaria ni tiene cobertura
      if (estado === null || estado === '') {
        const { rowCount } = await query(
          `DELETE FROM as_turnos_pauta_mensual 
           WHERE puesto_id = $1 
             AND anio = $2 
             AND mes = $3 
             AND dia = $4
             AND COALESCE(estado_ui, '') <> 'te'
             AND COALESCE(meta->>'tipo', '') <> 'turno_extra'
             AND COALESCE(estado, '') NOT IN ('trabajado', 'inasistencia', 'permiso', 'vacaciones')
             AND COALESCE(meta->>'cobertura_guardia_id', '') = ''`,
          [puesto_id, anio, mes, dia]
        );
        if (rowCount && rowCount > 0) {
          eliminados++;
          console.log(`🗑️ Eliminado turno para puesto ${puesto_id}, día ${dia}`);
        } else {
          // No se eliminó por protección de TE/cobertura
          errores.push(`Salto eliminación segura en puesto ${puesto_id}, día ${dia} (TE/cobertura protegida)`);
        }
      } else {
        // Validación de estado solo si no es null
        if (!['trabajado', 'libre', 'planificado'].includes(estado)) {
          errores.push(`Estado inválido: ${estado} - debe ser 'trabajado', 'libre', 'planificado', o null para eliminar`);
          continue;
        }

        // Regla de unicidad por guardia/día: antes de insertar, liberar otros puestos del mismo guardia en ese día
        if (guardia_id && estado === 'planificado') {
          try {
            await query(
              `
              UPDATE as_turnos_pauta_mensual
              SET guardia_id = NULL,
                  estado = 'libre',
                  estado_ui = 'libre',
                  updated_at = NOW()
              WHERE guardia_id = $1
                AND anio = $2 AND mes = $3 AND dia = $4
                AND puesto_id <> $5
                AND COALESCE(estado_ui, '') <> 'te'
                AND COALESCE(meta->>'tipo', '') <> 'turno_extra'
                AND COALESCE(estado, '') NOT IN ('trabajado', 'inasistencia', 'permiso', 'vacaciones')
                AND COALESCE(meta->>'cobertura_guardia_id', '') = ''
              `,
              [guardia_id, anio, mes, dia, puesto_id]
            );
          } catch (preCleanErr) {
            console.warn('⚠️ No se pudo pre-liberar duplicados guardia/día:', { turno, error: preCleanErr });
          }
        }

        // Limpieza previa: si el día quedó marcado con cobertura (reemplazo/PPC) o 'te' en estado_ui,
        // y NO es turno extra real ni tiene marcaje de diaria, limpiamos esas banderas para permitir la planificación.
        try {
          await query(
            `
            UPDATE as_turnos_pauta_mensual
            SET 
              estado_ui = CASE WHEN LOWER(COALESCE(estado_ui,'')) = 'te' THEN NULL ELSE estado_ui END,
              meta = CASE 
                       WHEN meta ? 'cobertura_guardia_id' THEN (meta - 'cobertura_guardia_id')
                       ELSE meta
                     END,
              updated_at = NOW()
            WHERE puesto_id = $1 AND anio = $2 AND mes = $3 AND dia = $4
              AND COALESCE(meta->>'tipo', '') <> 'turno_extra'
              AND COALESCE(estado, '') NOT IN ('trabajado', 'inasistencia', 'permiso', 'vacaciones')
            `,
            [puesto_id, anio, mes, dia]
          );
        } catch (preCleanFlagsErr) {
          console.warn('⚠️ No se pudo limpiar banderas de cobertura/te antes del upsert:', { turno, error: preCleanFlagsErr });
        }

        await query(
          `
          INSERT INTO as_turnos_pauta_mensual (
            puesto_id, guardia_id, anio, mes, dia, estado, estado_ui,
            observaciones, reemplazo_guardia_id, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          ON CONFLICT (puesto_id, anio, mes, dia)
          DO UPDATE SET
            guardia_id = EXCLUDED.guardia_id,
            estado = EXCLUDED.estado,
            estado_ui = EXCLUDED.estado_ui,
            observaciones = EXCLUDED.observaciones,
            reemplazo_guardia_id = EXCLUDED.reemplazo_guardia_id,
            updated_at = NOW()
          WHERE 
            COALESCE(as_turnos_pauta_mensual.estado_ui, '') <> 'te'
            AND COALESCE(as_turnos_pauta_mensual.meta->>'tipo', '') <> 'turno_extra'
            AND COALESCE(as_turnos_pauta_mensual.estado, '') NOT IN ('trabajado', 'inasistencia', 'permiso', 'vacaciones')
            AND COALESCE(as_turnos_pauta_mensual.meta->>'cobertura_guardia_id', '') = ''
        `,
          [
            puesto_id,
            guardia_id || null,
            anio,
            mes,
            dia,
            estado,
            // Establecer estado_ui correctamente según el estado
            estado === 'planificado' ? 'plan' : 
            estado === 'libre' ? 'libre' : null,
            observaciones || null,
            reemplazo_guardia_id || null,
          ]
        );
        guardados++;
      }
    } catch (dbError) {
      // Manejo específico: clave duplicada (guardia ya tiene turno ese día en otro puesto)
      const pgErr = dbError as any;
      if (pgErr && (pgErr.code === '23505' || (pgErr.message && pgErr.message.toLowerCase().includes('duplicate key')))) {
        try {
          // Solo intentamos resolver si hay guardia_id (no aplica a PPC con guardia_id null)
          if (guardia_id) {
            const { rowCount } = await query(
              `
              UPDATE as_turnos_pauta_mensual
              SET 
                puesto_id = $1,
                estado = $2,
                estado_ui = $3,
                observaciones = $4,
                reemplazo_guardia_id = $5,
                updated_at = NOW()
              WHERE 
                guardia_id = $6
                AND anio = $7 
                AND mes = $8 
                AND dia = $9
                AND COALESCE(estado_ui, '') <> 'te'
                AND COALESCE(meta->>'tipo', '') <> 'turno_extra'
                AND COALESCE(estado, '') NOT IN ('trabajado', 'inasistencia', 'permiso', 'vacaciones')
                AND COALESCE(meta->>'cobertura_guardia_id', '') = ''
              `,
              [
                puesto_id,
                estado,
                estado === 'planificado' ? 'plan' : (estado === 'libre' ? 'libre' : null),
                observaciones || null,
                reemplazo_guardia_id || null,
                guardia_id,
                anio,
                mes,
                dia,
              ]
            );
            if (rowCount && rowCount > 0) {
              console.log(`♻️ Resuelto duplicado moviendo turno del guardia ${guardia_id} al puesto ${puesto_id} para día ${dia}`);
              guardados++;
              continue;
            }
          }
        } catch (resolveErr) {
          console.error('❌ Error resolviendo duplicado (guardia/día):', { turno, error: resolveErr });
        }
      }

      console.error('Error en turno específico:', { turno, error: dbError });
      errores.push(`Error procesando turno para puesto ${puesto_id}, día ${dia}: ${dbError instanceof Error ? dbError.message : 'Error desconocido'}`);
    }
  }

  console.log(`✅ Guardados ${guardados} turnos, eliminados ${eliminados} turnos de ${turnos.length} totales`);
  
  if (errores.length > 0) {
    console.warn('⚠️ Errores encontrados:', errores);
    console.warn('⚠️ Detalle de errores:', JSON.stringify(errores, null, 2));
    console.warn('⚠️ Primeros 5 errores:', errores.slice(0, 5));
  }

  return NextResponse.json({ 
    success: true, 
    total_guardados: guardados,
    total_eliminados: eliminados,
    total_procesados: turnos.length,
    errores: errores.length > 0 ? errores : undefined
  });
} 