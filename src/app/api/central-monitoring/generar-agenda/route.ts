import { requireAuthz } from '@/lib/authz-api';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'central_monitoring', action: 'configure' });
  if (deny) return deny;

  try {
    const { fecha } = await req.json();
    const fechaObj = fecha ? new Date(fecha) : new Date();
    const fechaStr = fechaObj.toISOString().split('T')[0];

    console.log('📅 Generando agenda para fecha:', fechaStr);
    console.log('📊 Instalaciones encontradas:', instalacionesQuery.rows.length);

    // 1. Obtener todas las instalaciones con monitoreo habilitado
    const instalacionesQuery = await sql`
      SELECT 
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        i.telefono as instalacion_telefono,
        60 as intervalo_minutos,
        '22:00' as ventana_inicio,
        '06:00' as ventana_fin,
        'Monitoreo de {instalacion} a las {hora}' as mensaje_template
      FROM instalaciones i
      WHERE i.telefono IS NOT NULL AND i.telefono != ''
      ORDER BY i.nombre ASC
    `;

    const llamadosGenerados: any[] = [];

    for (const instalacion of instalacionesQuery.rows) {
      const instalacionId = instalacion.instalacion_id;
      
      // 2. Generar horarios de llamados para esta instalación
      const horarios = generarHorariosLlamados(
        instalacion.ventana_inicio,
        instalacion.ventana_fin,
        instalacion.intervalo_minutos,
        fechaStr
      );
      
      console.log(`🏢 ${instalacion.instalacion_nombre}: ${horarios.length} horarios generados`);
      console.log(`   Ventana: ${instalacion.ventana_inicio} - ${instalacion.ventana_fin}`);
      console.log(`   Intervalo: ${instalacion.intervalo_minutos} minutos`);

      // 3. Para cada horario, crear llamados
      for (const horario of horarios) {
        // 3a. Determinar el contacto principal
        let contactoPrincipal = null;
        
        if (instalacion.instalacion_telefono) {
          // Si la instalación tiene teléfono, usarlo como contacto principal
          contactoPrincipal = {
            tipo: 'instalacion',
            telefono: instalacion.instalacion_telefono,
            nombre: instalacion.instalacion_nombre
          };
        } else {
          // Si no tiene teléfono, buscar guardias asignados en ese horario
          const guardiasQuery = await sql`
            SELECT 
              g.id as guardia_id,
              CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre) as guardia_nombre,
              g.telefono as guardia_telefono,
              rs.nombre as rol_nombre,
              po.nombre_puesto
            FROM as_turnos_puestos_operativos po
            INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
            INNER JOIN as_turnos_pauta_mensual pm ON pm.puesto_id = po.id
            LEFT JOIN guardias g ON pm.guardia_id = g.id
            WHERE po.instalacion_id = ${instalacionId}
              AND po.activo = true
              AND pm.anio = EXTRACT(YEAR FROM ${fechaStr}::date)::int
              AND pm.mes = EXTRACT(MONTH FROM ${fechaStr}::date)::int
              AND pm.dia = EXTRACT(DAY FROM ${fechaStr}::date)::int
              AND pm.estado IN ('trabajado', 'T', 'reemplazo', 'cubierto')
              AND g.telefono IS NOT NULL
              AND g.telefono != ''
              AND ${horario}::time BETWEEN rs.hora_inicio AND rs.hora_termino
            ORDER BY rs.hora_inicio ASC
            LIMIT 1
          `;

          if (guardiasQuery.rows.length > 0) {
            const guardia = guardiasQuery.rows[0];
            contactoPrincipal = {
              tipo: 'guardia',
              telefono: guardia.guardia_telefono,
              nombre: guardia.guardia_nombre,
              guardia_id: guardia.guardia_id,
              puesto: guardia.nombre_puesto
            };
          }

          // Si no hay guardias regulares, buscar turnos extras
          if (!contactoPrincipal) {
            const turnosExtrasQuery = await sql`
              SELECT 
                te.guardia_id,
                CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre) as guardia_nombre,
                g.telefono as guardia_telefono,
                rs.nombre as rol_nombre,
                po.nombre_puesto,
                te.estado as tipo_turno_extra
              FROM TE_turnos_extras te
              LEFT JOIN guardias g ON te.guardia_id = g.id
              LEFT JOIN as_turnos_puestos_operativos po ON te.puesto_id = po.id
              LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
              WHERE te.instalacion_id = ${instalacionId}
                AND te.fecha = ${fechaStr}::date
                AND g.telefono IS NOT NULL
                AND g.telefono != ''
                AND ${horario}::time BETWEEN rs.hora_inicio AND rs.hora_termino
              ORDER BY rs.hora_inicio ASC
              LIMIT 1
            `;

            if (turnosExtrasQuery.rows.length > 0) {
              const turnoExtra = turnosExtrasQuery.rows[0];
              contactoPrincipal = {
                tipo: 'turno_extra',
                telefono: turnoExtra.guardia_telefono,
                nombre: `${turnoExtra.guardia_nombre} (Extra)`,
                guardia_id: turnoExtra.guardia_id,
                puesto: turnoExtra.nombre_puesto,
                tipo_turno_extra: turnoExtra.tipo_turno_extra
              };
            }
          }
        }

        // 3b. Si hay contacto disponible, crear el llamado
        if (contactoPrincipal) {
          const llamado = {
            instalacion_id: instalacionId,
            instalacion_nombre: instalacion.instalacion_nombre,
            programado_para: `${fechaStr}T${horario}:00`,
            contacto_tipo: contactoPrincipal.tipo,
            contacto_nombre: contactoPrincipal.nombre,
            contacto_telefono: contactoPrincipal.telefono,
            guardia_id: contactoPrincipal.guardia_id || null,
            estado: 'pendiente',
            canal: 'whatsapp',
            observaciones: generarMensajeTemplate(
              instalacion.mensaje_template,
              instalacion.instalacion_nombre,
              horario
            )
          };

          // 3c. Insertar en la base de datos (versión simplificada)
          const insertResult = await sql`
            INSERT INTO central_llamados (
              instalacion_id,
              guardia_id,
              programado_para,
              estado,
              observaciones
            ) VALUES (
              ${llamado.instalacion_id},
              ${llamado.guardia_id || null},
              ${llamado.programado_para}::timestamptz,
              ${llamado.estado},
              ${llamado.observaciones}
            ) RETURNING id
          `;

          llamadosGenerados.push({
            ...llamado,
            id: insertResult.rows[0].id
          });
        }
      }
    }

    console.log(`✅ Agenda generada: ${llamadosGenerados.length} llamados creados`);

    return NextResponse.json({ 
      success: true, 
      fecha: fechaStr,
      llamados_generados: llamadosGenerados.length,
      data: llamadosGenerados
    });

  } catch (error) {
    console.error('Error generando agenda:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función auxiliar para generar horarios de llamados
function generarHorariosLlamados(
  ventanaInicio: string,
  ventanaFin: string,
  intervaloMinutos: number,
  fecha: string
): string[] {
  const horarios: string[] = [];
  
  const inicio = new Date(`${fecha}T${ventanaInicio}:00`);
  const fin = new Date(`${fecha}T${ventanaFin}:00`);
  
  // Si la ventana cruza la medianoche, ajustar
  if (fin < inicio) {
    fin.setDate(fin.getDate() + 1);
  }
  
  let actual = new Date(inicio);
  
  while (actual <= fin) {
    horarios.push(actual.toTimeString().slice(0, 5)); // HH:MM
    actual.setMinutes(actual.getMinutes() + intervaloMinutos);
  }
  
  return horarios;
}

// Función auxiliar para generar mensaje personalizado
function generarMensajeTemplate(
  template: string,
  instalacionNombre: string,
  hora: string
): string {
  return template
    .replace('{instalacion}', instalacionNombre)
    .replace('{hora}', hora);
}
