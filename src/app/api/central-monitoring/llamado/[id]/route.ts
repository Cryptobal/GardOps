import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { sql } from '@vercel/postgres';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'central_monitoring', action: 'record' });
  if (deny) return deny;

  try {
    const llamadoId = params.id;
    const body = await request.json();
    const { 
      estado, 
      observaciones, 
      canal, 
      contacto_tipo, 
      contacto_id, 
      contacto_nombre, 
      contacto_telefono,
      forzarRegistro = false
    } = body;

    // Validar estado
    const estadosValidos = ['exitoso', 'no_contesta', 'ocupado', 'incidente', 'cancelado'];
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json(
        { success: false, error: 'Estado inválido' },
        { status: 400 }
      );
    }

    // Validar contacto_tipo
    const tiposValidos = ['instalacion', 'guardia'];
    if (contacto_tipo && !tiposValidos.includes(contacto_tipo)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de contacto inválido' },
        { status: 400 }
      );
    }

    // SOLUCIÓN DEFINITIVA: Buscar el llamado por ID, o tomar cualquier llamado pendiente si no existe
    let llamadoVista = await sql`
      SELECT 
        id,
        instalacion_id,
        programado_para,
        estado_llamado,
        contacto_telefono,
        instalacion_nombre,
        intervalo_minutos
      FROM central_v_llamados_automaticos
      WHERE id = ${llamadoId}
    `;

    // Si no encuentra el ID específico, retornar error
    if (llamadoVista.rows.length === 0) {
      console.log(`[CENTRAL-MONITORING] ID ${llamadoId} no encontrado en la vista`);
      return NextResponse.json(
        { success: false, error: `Llamada con ID ${llamadoId} no encontrada en la agenda` },
        { status: 404 }
      );
    }

    const llamado = llamadoVista.rows[0];
    const ahora = new Date();
    const programadoPara = new Date(llamado.programado_para);
    const intervaloMinutos = llamado.intervalo_minutos || 60;

    // En desarrollo, ser más flexible con la validación de tiempo
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Si forzarRegistro es true, saltar validación de tiempo
    if (!forzarRegistro) {
      if (!isDevelopment) {
        // Calcular ventana de tiempo válida (1 hora antes y después de la hora programada)
        const ventanaInicio = new Date(programadoPara);
        ventanaInicio.setHours(ventanaInicio.getHours() - 1);
        
        const ventanaFin = new Date(programadoPara);
        ventanaFin.setHours(ventanaFin.getHours() + 1);

        // Verificar si estamos en la ventana de tiempo válida
        if (ahora < ventanaInicio || ahora > ventanaFin) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Solo se pueden registrar llamadas en su ventana de tiempo correspondiente',
              ventana: {
                inicio: ventanaInicio.toISOString(),
                fin: ventanaFin.toISOString(),
                actual: ahora.toISOString()
              }
            },
            { status: 400 }
          );
        }
      } else {
        // En desarrollo, permitir registrar llamadas hasta 24 horas en el pasado y futuro
        const ventanaDesarrollo = new Date(programadoPara);
        ventanaDesarrollo.setHours(ventanaDesarrollo.getHours() + 24); // 24 horas en el futuro
        
        const limitePasado = new Date(programadoPara);
        limitePasado.setHours(limitePasado.getHours() - 24); // 24 horas en el pasado
        
        if (ahora > ventanaDesarrollo) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Llamada demasiado antigua para registrar (más de 24 horas)',
              programado: programadoPara.toISOString(),
              actual: ahora.toISOString(),
              requiereConfirmacion: true
            },
            { status: 400 }
          );
        }
        
        if (ahora < limitePasado) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Llamada demasiado futura para registrar (más de 24 horas)',
              programado: programadoPara.toISOString(),
              actual: ahora.toISOString(),
              requiereConfirmacion: true
            },
            { status: 400 }
          );
        }
      }
    } else {
      console.log(`[CENTRAL-MONITORING] ⚠️ Registro forzado para ID: ${llamadoId} - Saltando validación de tiempo`);
    }

    // Verificar si el llamado ya existe en la tabla central_llamados
    const llamadaExistente = await sql`
      SELECT 
        id,
        estado,
        programado_para
      FROM central_llamados
      WHERE id = ${llamadoId}
    `;

    // Calcular SLA (tiempo de respuesta)
    const slaSegundos = Math.floor((ahora.getTime() - programadoPara.getTime()) / 1000);

    let result;

    if (llamadaExistente.rows.length > 0) {
      // El llamado ya existe, verificar que no esté ya registrado
      const llamada = llamadaExistente.rows[0];
      
      if (llamada.estado !== 'pendiente' && llamada.estado !== 'no_registrado') {
        return NextResponse.json(
          { success: false, error: 'Esta llamada ya fue registrada' },
          { status: 400 }
        );
      }

      // Actualizar el llamado existente
      result = await sql`
        UPDATE central_llamados SET
          estado = ${estado},
          observaciones = ${observaciones || null},
          canal = ${canal || 'whatsapp'},
          contacto_tipo = ${contacto_tipo || null},
          contacto_id = ${contacto_id || null},
          contacto_nombre = ${contacto_nombre || null},
          contacto_telefono = ${contacto_telefono || null},
          ejecutado_en = ${ahora.toISOString()},
          sla_segundos = ${slaSegundos},
          operador_id = (SELECT id FROM usuarios WHERE email = ${request.headers.get('x-user-email')}),
          updated_at = now()
        WHERE id = ${llamadoId}
        RETURNING *
      `;
      
      console.log(`[CENTRAL-MONITORING] 🔄 Llamado actualizado con ID: ${llamadoId}`);
      console.log(`[CENTRAL-MONITORING] 📊 Actualización: ${llamado.instalacion_nombre} - ${estado} - ${ahora.toISOString()}`);
    } else {
      // El llamado no existe, crearlo usando el ID que envía el frontend
      result = await sql`
        INSERT INTO central_llamados (
          id,
          instalacion_id,
          programado_para,
          estado,
          observaciones,
          canal,
          contacto_tipo,
          contacto_id,
          contacto_nombre,
          contacto_telefono,
          ejecutado_en,
          sla_segundos,
          operador_id,
          tenant_id,
          created_at,
          updated_at
        ) VALUES (
          ${llamadoId},
          ${llamado.instalacion_id},
          ${programadoPara.toISOString()},
          ${estado},
          ${observaciones || null},
          ${canal || 'whatsapp'},
          ${contacto_tipo || null},
          ${contacto_id || null},
          ${contacto_nombre || null},
          ${contacto_telefono || null},
          ${ahora.toISOString()},
          ${slaSegundos},
          (SELECT id FROM usuarios WHERE email = ${request.headers.get('x-user-email')}),
          (SELECT tenant_id FROM instalaciones WHERE id = ${llamado.instalacion_id}),
          now(),
          now()
        )
        RETURNING *
      `;
      
      console.log(`[CENTRAL-MONITORING] ✅ Llamado creado con ID: ${llamadoId}`);
      console.log(`[CENTRAL-MONITORING] 📊 Registro: ${llamado.instalacion_nombre} - ${estado} - ${ahora.toISOString()}`);
    }

    // Si es un incidente, crear registro de incidente
    if (estado === 'incidente') {
      await sql`
        INSERT INTO central_incidentes (
          llamado_id, tipo, severidad, detalle, tenant_id
        ) VALUES (
          ${llamadoId},
          'Llamada fallida',
          'media',
          ${observaciones || 'Incidente reportado durante monitoreo'},
          (SELECT tenant_id FROM instalaciones WHERE id = ${llamado.instalacion_id})
        )
      `;
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error actualizando llamada::', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
