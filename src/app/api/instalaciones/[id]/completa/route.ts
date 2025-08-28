import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { validate as validateUUID } from 'uuid';

// GET: Obtener todos los datos de una instalación
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instalacionId = params.id;
    if (!validateUUID(instalacionId)) {
      return NextResponse.json({ success: false, error: 'ID de instalación inválido' }, { status: 400 });
    }

    console.log('🔍 [COMPLETA] Iniciando endpoint para instalación:', instalacionId);

    // 1. Datos básicos de la instalación
    console.log('📋 [COMPLETA] 1. Consultando instalación...');
    const instalacionResult = await sql`
      SELECT 
        i.id,
        i.nombre,
        i.cliente_id,
        i.direccion,
        i.latitud,
        i.longitud,
        i.ciudad,
        i.comuna,
        i.valor_turno_extra,
        i.estado,
        i.created_at,
        i.updated_at
      FROM instalaciones i
      WHERE i.id = ${instalacionId}
    `;

    if (instalacionResult.rows.length === 0) {
      console.log('❌ [COMPLETA] Instalación no encontrada:', instalacionId);
      return NextResponse.json(
        { success: false, error: 'Instalación no encontrada' },
        { status: 404 }
      );
    }

    const instalacion = instalacionResult.rows[0];
    console.log('✅ [COMPLETA] Instalación encontrada:', instalacion.nombre);

    // 2. Obtener información del cliente
    console.log('📋 [COMPLETA] 2. Consultando cliente...');
    let cliente_nombre = 'Cliente no encontrado';
    if (instalacion.cliente_id) {
      try {
        const clienteResult = await sql`
          SELECT nombre FROM clientes WHERE id = ${instalacion.cliente_id}
        `;
        
        if (clienteResult.rows.length > 0) {
          cliente_nombre = clienteResult.rows[0].nombre;
        }
      } catch (error) {
        console.warn('⚠️ [COMPLETA] Error obteniendo cliente:', error);
      }
    }
    instalacion.cliente_nombre = cliente_nombre;
    console.log('✅ [COMPLETA] Cliente:', cliente_nombre);

    // 3. Consultar puestos operativos REALES de la base de datos
    console.log('📋 [COMPLETA] 3. Consultando puestos operativos...');
    const puestosResult = await sql`
      SELECT 
        po.id,
        po.instalacion_id,
        po.rol_id,
        po.guardia_id,
        po.nombre_puesto,
        po.es_ppc,
        po.activo,
        po.creado_en,
        po.tipo_puesto_id,
        COALESCE(rs.nombre, 'Sin rol asignado') as rol_nombre,
        COALESCE(rs.dias_trabajo, 0) as dias_trabajo,
        COALESCE(rs.dias_descanso, 0) as dias_descanso,
        COALESCE(rs.horas_turno, 0) as horas_turno,
        COALESCE(rs.hora_inicio, '00:00') as hora_inicio,
        COALESCE(rs.hora_termino, '00:00') as hora_termino,
        COALESCE(rs.estado, 'Inactivo') as rol_estado,
        COALESCE(g.nombre || ' ' || g.apellido_paterno, 'Sin guardia') as guardia_nombre,
        COALESCE(tp.nombre, 'Sin tipo') as tipo_nombre,
        COALESCE(tp.emoji, '🏢') as tipo_emoji,
        COALESCE(tp.color, '#666666') as tipo_color
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      LEFT JOIN cat_tipos_puesto tp ON po.tipo_puesto_id = tp.id
      WHERE po.instalacion_id = ${instalacionId}
        AND (po.activo = true OR po.activo IS NULL)
      ORDER BY po.rol_id, po.nombre_puesto
    `;
    

    
    console.log(`✅ [COMPLETA] Puestos operativos encontrados: ${puestosResult.rows.length}`);
    
    // Log detallado de puestos encontrados
    puestosResult.rows.forEach((row: any, index: number) => {
      console.log(`  📍 [COMPLETA] Puesto ${index + 1}: ${row.nombre_puesto} (${row.rol_nombre}) - PPC: ${row.es_ppc}, Activo: ${row.activo}`);
    });
    

    


    // 4. Procesar puestos y crear estructura de turnos
    console.log('📋 [COMPLETA] 4. Procesando puestos y creando estructura de turnos...');
    
    const turnosMap = new Map();
    const puestosIndividuales: any[] = [];
    const ppcs: any[] = [];
    const guardias: any[] = [];

    puestosResult.rows.forEach((row: any) => {
      // Agregar a puestos individuales
      puestosIndividuales.push({
        id: row.id,
        instalacion_id: row.instalacion_id,
        rol_id: row.rol_id,
        guardia_id: row.guardia_id,
        nombre_puesto: row.nombre_puesto,
        es_ppc: row.es_ppc,
        activo: row.activo,
        creado_en: row.creado_en,
        tipo_puesto_id: row.tipo_puesto_id,
        guardia_nombre: row.guardia_nombre,
        tipo_nombre: row.tipo_nombre,
        tipo_emoji: row.tipo_emoji,
        tipo_color: row.tipo_color,
        turno: {
          id: row.rol_id,
          nombre: row.rol_nombre,
          dias_trabajo: row.dias_trabajo,
          dias_descanso: row.dias_descanso,
          horas_turno: row.horas_turno,
          hora_inicio: row.hora_inicio,
          hora_termino: row.hora_termino,
          estado: row.rol_estado
        }
      });

      // Agrupar por turno
      if (!turnosMap.has(row.rol_id)) {
        console.log(`  🔄 [COMPLETA] Creando nuevo turno: ${row.rol_nombre}`);
        turnosMap.set(row.rol_id, {
          id: row.rol_id,
          nombre: row.rol_nombre,
          rol_nombre: row.rol_nombre,
          rol_servicio_nombre: row.rol_nombre,
          dias_trabajo: row.dias_trabajo,
          dias_descanso: row.dias_descanso,
          horas_turno: row.horas_turno,
          hora_inicio: row.hora_inicio,
          hora_termino: row.hora_termino,
          estado: row.rol_estado,
          puestos_asignados: 0,
          ppc_pendientes: 0,
          tipo_puesto_id: row.tipo_puesto_id,
          tipo_puesto_nombre: row.tipo_nombre,
          tipo_puesto_emoji: row.tipo_emoji,
          tipo_puesto_color: row.tipo_color,
          created_at: row.creado_en,
          rol_servicio: {
            nombre: row.rol_nombre,
            dias_trabajo: row.dias_trabajo,
            dias_descanso: row.dias_descanso,
            horas_turno: row.horas_turno,
            hora_inicio: row.hora_inicio,
            hora_termino: row.hora_termino
          },
          puestos: []
        });
      }

      const turno = turnosMap.get(row.rol_id);
      turno.puestos.push({
        id: row.id,
        nombre_puesto: row.nombre_puesto,
        es_ppc: row.es_ppc,
        guardia_asignado_id: row.guardia_id,
        guardia_nombre: row.guardia_nombre,
        tipo_puesto_id: row.tipo_puesto_id,
        tipo_nombre: row.tipo_nombre,
        tipo_emoji: row.tipo_emoji,
        tipo_color: row.tipo_color
      });

      // Contar estadísticas
      if (row.guardia_id) {
        turno.puestos_asignados++;
      } else {
        turno.ppc_pendientes++;
      }

      // Agregar a PPCs si corresponde
      if (row.es_ppc && !row.guardia_id) {
        console.log(`  📍 [COMPLETA] Agregando PPC: ${row.nombre_puesto}`);
        ppcs.push({
          id: row.id,
          instalacion_id: row.instalacion_id,
          rol_servicio_id: row.rol_id,
          motivo: 'Puesto operativo sin asignación',
          observacion: `PPC para puesto: ${row.nombre_puesto}`,
          creado_en: row.creado_en,
          rol_servicio_nombre: row.rol_nombre,
          hora_inicio: row.hora_inicio,
          hora_termino: row.hora_termino,
          cantidad_faltante: 1,
          estado: 'Pendiente',
          guardia_asignado_id: null,
          guardia_nombre: null,
          nombre_puesto: row.nombre_puesto,
          tipo_puesto_id: row.tipo_puesto_id,
          tipo_nombre: row.tipo_nombre,
          tipo_emoji: row.tipo_emoji,
          tipo_color: row.tipo_color
        });
      }

      // Agregar guardia virtual para PPC
      if (row.es_ppc && !row.guardia_id) {
        guardias.push({
          id: row.id,
          nombre: `PPC ${row.id.substring(0, 8)}`,
          apellido_paterno: '',
          apellido_materno: '',
          nombre_completo: `PPC ${row.id.substring(0, 8)}`,
          rut: '',
          comuna: '',
          region: '',
          tipo: 'ppc',
          activo: false,
          rol_servicio: {
            nombre: row.rol_nombre,
            dias_trabajo: row.dias_trabajo,
            dias_descanso: row.dias_descanso,
            horas_turno: row.horas_turno,
            hora_inicio: row.hora_inicio,
            hora_termino: row.hora_termino
          }
        });
      }
    });

    const turnos = Array.from(turnosMap.values());
    


    // 5. Consultar roles de servicio
    console.log('📋 [COMPLETA] 5. Consultando roles de servicio...');
    const rolesResult = await sql`
      SELECT 
        rs.id,
        rs.nombre,
        rs.dias_trabajo,
        rs.dias_descanso,
        rs.horas_turno,
        rs.hora_inicio,
        rs.hora_termino,
        rs.estado,
        rs.tenant_id,
        rs.created_at,
        rs.updated_at
      FROM as_turnos_roles_servicio rs
      WHERE rs.estado = 'Activo'
      ORDER BY rs.nombre
    `;
    console.log(`✅ [COMPLETA] Roles de servicio encontrados: ${rolesResult.rows.length}`);

    // Transformar roles de servicio
    const roles = rolesResult.rows.map((row: any) => ({
      id: row.id,
      nombre: row.nombre,
      dias_trabajo: row.dias_trabajo,
      dias_descanso: row.dias_descanso,
      horas_turno: row.horas_turno,
      hora_inicio: row.hora_inicio,
      hora_termino: row.hora_termino,
      estado: row.estado,
      tenant_id: row.tenant_id,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    console.log(`📊 [COMPLETA] Datos finales: ${turnos.length} turnos, ${puestosIndividuales.length} puestos, ${ppcs.length} PPCs`);
    

    console.log(`✅ [COMPLETA] Endpoint completado exitosamente para instalación: ${instalacion.nombre}`);

    return NextResponse.json({
      success: true,
      data: {
        instalacion,
        turnos,
        puestos: puestosIndividuales,
        ppcs,
        guardias,
        roles,
        pautaMensual: [] // Array vacío porque la tabla no existe
      }
    });

  } catch (error) {
    console.error('❌ [COMPLETA] Error en endpoint completa:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}