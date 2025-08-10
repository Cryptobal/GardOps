import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(req: NextRequest) {
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
      // CAMBIO: Si estado es null, eliminar el registro
      if (estado === null || estado === '') {
        await query(
          `DELETE FROM as_turnos_pauta_mensual 
           WHERE puesto_id = $1 AND anio = $2 AND mes = $3 AND dia = $4`,
          [puesto_id, anio, mes, dia]
        );
        eliminados++;
        console.log(`🗑️ Eliminado turno para puesto ${puesto_id}, día ${dia}`);
      } else {
        // Validación de estado solo si no es null
        if (!['trabajado', 'libre', 'planificado'].includes(estado)) {
          errores.push(`Estado inválido: ${estado} - debe ser 'trabajado', 'libre', 'planificado', o null para eliminar`);
          continue;
        }

        await query(
          `
          INSERT INTO as_turnos_pauta_mensual (
            puesto_id, guardia_id, anio, mes, dia, estado,
            observaciones, reemplazo_guardia_id, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          ON CONFLICT (puesto_id, anio, mes, dia)
          DO UPDATE SET
            guardia_id = EXCLUDED.guardia_id,
            estado = EXCLUDED.estado,
            observaciones = EXCLUDED.observaciones,
            reemplazo_guardia_id = EXCLUDED.reemplazo_guardia_id,
            updated_at = NOW()
        `,
          [
            puesto_id,
            guardia_id || null,
            anio,
            mes,
            dia,
            estado,
            observaciones || null,
            reemplazo_guardia_id || null,
          ]
        );
        guardados++;
      }
    } catch (dbError) {
      console.error('Error en turno específico:', { turno, error: dbError });
      errores.push(`Error procesando turno para puesto ${puesto_id}, día ${dia}: ${dbError instanceof Error ? dbError.message : 'Error desconocido'}`);
    }
  }

  console.log(`✅ Guardados ${guardados} turnos, eliminados ${eliminados} turnos de ${turnos.length} totales`);
  
  if (errores.length > 0) {
    console.warn('⚠️ Errores encontrados:', errores);
  }

  return NextResponse.json({ 
    success: true, 
    total_guardados: guardados,
    total_eliminados: eliminados,
    total_procesados: turnos.length,
    errores: errores.length > 0 ? errores : undefined
  });
} 