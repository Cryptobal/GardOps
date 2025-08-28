import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener estructuras unificadas
export async function GET(request: NextRequest) {
  console.log('🔍 GET /api/payroll/estructuras-unificadas - Iniciando...');
  
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'read:list' });
    if (maybeDeny && (maybeDeny as any).status === 403) {
      console.log('❌ Acceso denegado por permisos');
      return maybeDeny;
    }
    console.log('✅ Permisos verificados correctamente');
  } catch (error) {
    console.log('⚠️ Error verificando permisos:', error);
  }

  try {
    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const instalacionId = searchParams.get('instalacion');
    const rolId = searchParams.get('rol');
    const guardiaId = searchParams.get('guardia');
    const tipo = searchParams.get('tipo') || 'todos';
    const estado = searchParams.get('estado') || 'activos';

    console.log('📊 Parámetros de consulta:', { instalacionId, rolId, guardiaId, tipo, estado });

    // Construir consulta base para estructuras de servicio
    let estructurasServicioQuery = `
      SELECT 
        'servicio' as tipo,
        es.id,
        es.instalacion_id,
        i.nombre as instalacion_nombre,
        es.rol_servicio_id,
        rs.nombre as rol_nombre,
        rs.dias_trabajo,
        rs.dias_descanso,
        rs.hora_inicio,
        rs.hora_termino,
        NULL as guardia_id,
        NULL as guardia_nombre,
        NULL as guardia_rut,
        es.sueldo_base,
        es.bono_movilizacion,
        es.bono_colacion,
        es.bono_responsabilidad,
        CASE 
          WHEN es.bono_movilizacion > 0 OR es.bono_colacion > 0 OR es.bono_responsabilidad > 0 
          THEN '🚌 Movilización: ' || COALESCE(es.bono_movilizacion, 0) || 
               ' | 🍽️ Colación: ' || COALESCE(es.bono_colacion, 0) || 
               ' | ⭐ Responsabilidad: ' || COALESCE(es.bono_responsabilidad, 0)
          ELSE 'Sin bonos'
        END as bonos_detalle,
        es.activo,
        es.created_at as fecha_creacion,
        NULL as fecha_inactivacion,
        '🟡 Estructura de Servicio' as prioridad
      FROM sueldo_estructuras_servicio es
      INNER JOIN instalaciones i ON i.id = es.instalacion_id
      INNER JOIN as_turnos_roles_servicio rs ON rs.id = es.rol_servicio_id
      WHERE 1=1
    `;

    // Construir consulta base para estructuras por guardia
    let estructurasGuardiaQuery = `
      SELECT 
        'guardia' as tipo,
        seg.id,
        po.instalacion_id,
        i.nombre as instalacion_nombre,
        po.rol_id as rol_servicio_id,
        rs.nombre as rol_nombre,
        rs.dias_trabajo,
        rs.dias_descanso,
        rs.hora_inicio,
        rs.hora_termino,
        seg.guardia_id,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', g.apellido_materno) as guardia_nombre,
        g.rut as guardia_rut,
        segi.monto as sueldo_base,
        segi.bono_movilizacion,
        segi.bono_colacion,
        segi.bono_responsabilidad,
        CASE 
          WHEN segi.bono_movilizacion > 0 OR segi.bono_colacion > 0 OR segi.bono_responsabilidad > 0 
          THEN '🚌 Movilización: ' || COALESCE(segi.bono_movilizacion, 0) || 
               ' | 🍽️ Colación: ' || COALESCE(segi.bono_colacion, 0) || 
               ' | ⭐ Responsabilidad: ' || COALESCE(segi.bono_responsabilidad, 0)
          ELSE 'Sin bonos'
        END as bonos_detalle,
        seg.activo,
        seg.creado_en as fecha_creacion,
        seg.vigencia_hasta as fecha_inactivacion,
        '🟢 Estructura Personal' as prioridad
      FROM sueldo_estructura_guardia seg
      INNER JOIN sueldo_estructura_guardia_item segi ON segi.estructura_guardia_id = seg.id
      LEFT JOIN as_turnos_puestos_operativos po ON po.guardia_id = seg.guardia_id
      LEFT JOIN instalaciones i ON i.id = po.instalacion_id
      LEFT JOIN as_turnos_roles_servicio rs ON rs.id = po.rol_id
      INNER JOIN guardias g ON g.id = seg.guardia_id
      WHERE 1=1
    `;

    // Aplicar filtros comunes
    const filtrosComunes = [];
    const valores = [];

    if (instalacionId && instalacionId !== 'todas') {
      filtrosComunes.push('instalacion_id = $' + (valores.length + 1));
      valores.push(instalacionId);
    }

    if (rolId && rolId !== 'todos') {
      filtrosComunes.push('rol_servicio_id = $' + (valores.length + 1));
      valores.push(rolId);
    }

    if (guardiaId && guardiaId !== 'todos') {
      filtrosComunes.push('guardia_id = $' + (valores.length + 1));
      valores.push(guardiaId);
    }

    // Aplicar filtros específicos para cada query
    let filtrosServicio = [...filtrosComunes];
    let filtrosGuardia = [...filtrosComunes];

    // Filtro de estado para estructuras de servicio
    if (estado === 'activos') {
      filtrosServicio.push('es.activo = true');
    } else if (estado === 'inactivos') {
      filtrosServicio.push('es.activo = false');
    }

    // Filtro de estado para estructuras por guardia
    if (estado === 'activos') {
      filtrosGuardia.push('seg.activo = true');
    } else if (estado === 'inactivos') {
      filtrosGuardia.push('seg.activo = false');
    }

    // Aplicar filtros a las queries
    if (filtrosServicio.length > 0) {
      const whereClause = ' AND ' + filtrosServicio.join(' AND ');
      estructurasServicioQuery += whereClause;
    }

    if (filtrosGuardia.length > 0) {
      const whereClause = ' AND ' + filtrosGuardia.join(' AND ');
      estructurasGuardiaQuery += whereClause;
    }

    // Combinar consultas según el tipo
    let queryFinal = '';
    if (tipo === 'servicio') {
      queryFinal = estructurasServicioQuery;
    } else if (tipo === 'guardia') {
      queryFinal = estructurasGuardiaQuery;
    } else {
      queryFinal = `${estructurasServicioQuery} UNION ALL ${estructurasGuardiaQuery}`;
    }

    queryFinal += ' ORDER BY instalacion_nombre, rol_nombre, guardia_nombre';

    console.log('📊 Ejecutando consulta unificada...');
    console.log('Query:', queryFinal);
    console.log('Valores:', valores);
    
    const result = await query(queryFinal, valores);

    console.log('📊 Resultados obtenidos:', result.rows?.length || 0);
    console.log('📊 Datos de las filas:', JSON.stringify(result.rows, null, 2));

    const response = {
      success: true,
      data: result.rows || []
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error al obtener estructuras unificadas:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Crear estructura unificada
export async function POST(request: NextRequest) {
  console.log('🔍 POST /api/payroll/estructuras-unificadas - Iniciando...');
  
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'create' });
    if (maybeDeny && (maybeDeny as any).status === 403) {
      console.log('❌ Acceso denegado por permisos');
      return maybeDeny;
    }
    console.log('✅ Permisos verificados correctamente');
  } catch (error) {
    console.log('⚠️ Error verificando permisos:', error);
  }

  try {
    const body = await request.json();
    const {
      tipo,
      instalacion_id,
      rol_servicio_id,
      guardia_id,
      sueldo_base,
      bono_movilizacion,
      bono_colacion,
      bono_responsabilidad,
      descripcion
    } = body;

    console.log('📝 Datos recibidos:', { tipo, instalacion_id, rol_servicio_id, guardia_id, sueldo_base, bono_movilizacion, bono_colacion, bono_responsabilidad });

    // Validaciones
    if (!tipo || !['servicio', 'guardia'].includes(tipo)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de estructura inválido' },
        { status: 400 }
      );
    }

    if (tipo === 'servicio') {
      if (!instalacion_id) {
        return NextResponse.json(
          { success: false, error: 'ID de instalación requerido para estructuras de servicio' },
          { status: 400 }
        );
      }

      if (!rol_servicio_id) {
        return NextResponse.json(
          { success: false, error: 'ID de rol de servicio requerido para estructuras de servicio' },
          { status: 400 }
        );
      }
    }

    if (tipo === 'guardia' && !guardia_id) {
      return NextResponse.json(
        { success: false, error: 'ID de guardia requerido para estructuras por guardia' },
        { status: 400 }
      );
    }

    if (!sueldo_base || sueldo_base <= 0) {
      return NextResponse.json(
        { success: false, error: 'Sueldo base debe ser mayor a 0' },
        { status: 400 }
      );
    }

    // Verificar que la instalación existe solo para estructuras de servicio
    if (tipo === 'servicio') {
      const instalacionCheck = await query(
        'SELECT id FROM instalaciones WHERE id = $1',
        [instalacion_id]
      );

      if (!instalacionCheck.rows || instalacionCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Instalación no encontrada' },
          { status: 404 }
        );
      }

      // Verificar que el rol existe solo para estructuras de servicio
      const rolCheck = await query(
        'SELECT id FROM as_turnos_roles_servicio WHERE id = $1',
        [rol_servicio_id]
      );

      if (!rolCheck.rows || rolCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Rol de servicio no encontrado' },
          { status: 404 }
        );
      }
    }

    // Verificar que el guardia existe si es estructura por guardia
    if (tipo === 'guardia') {
      const guardiaCheck = await query(
        'SELECT id FROM guardias WHERE id = $1',
        [guardia_id]
      );

      if (!guardiaCheck.rows || guardiaCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Guardia no encontrado' },
          { status: 404 }
        );
      }

      // Para estructuras por guardia, no necesitamos validar instalación y rol
      // ya que estos se obtienen automáticamente de la asignación del guardia
    }

    let result;

    if (tipo === 'servicio') {
      // Crear estructura de servicio
      const insertQuery = `
        INSERT INTO sueldo_estructuras_servicio (
          instalacion_id, 
          rol_servicio_id, 
          sueldo_base, 
          monto,
          bono_movilizacion,
          bono_colacion,
          bono_responsabilidad,
          activo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING id
      `;

      result = await query(insertQuery, [
        instalacion_id,
        rol_servicio_id,
        sueldo_base,
        sueldo_base, // monto = sueldo_base
        bono_movilizacion || 0,
        bono_colacion || 0,
        bono_responsabilidad || 0
      ]);

    } else {
      // Crear estructura por guardia - versión simplificada
      // Eliminar estructuras anteriores del guardia
      await query(`
        DELETE FROM sueldo_estructura_guardia_item 
        WHERE estructura_guardia_id IN (
          SELECT id FROM sueldo_estructura_guardia WHERE guardia_id = $1
        )
      `, [guardia_id]);

      await query(`
        DELETE FROM sueldo_estructura_guardia 
        WHERE guardia_id = $1
      `, [guardia_id]);

      // Crear la cabecera
      const insertCabeceraQuery = `
        INSERT INTO sueldo_estructura_guardia (
          guardia_id, 
          version, 
          creado_por, 
          activo
        ) VALUES ($1, 1, 'sistema', true)
        RETURNING id
      `;

      const cabeceraResult = await query(insertCabeceraQuery, [guardia_id]);
      const estructuraId = cabeceraResult.rows[0].id;

      // Luego crear el ítem con todos los bonos
      const insertItemQuery = `
        INSERT INTO sueldo_estructura_guardia_item (
          estructura_guardia_id, 
          item_id, 
          monto,
          bono_movilizacion,
          bono_colacion,
          bono_responsabilidad
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;

      result = await query(insertItemQuery, [
        estructuraId,
        '8aaa3d92-577f-45dd-af44-28e1bf376af4', // item_id para sueldo base
        sueldo_base,
        bono_movilizacion || 0,
        bono_colacion || 0,
        bono_responsabilidad || 0
      ]);
    }

    console.log('✅ Estructura creada exitosamente');

    const response = {
      success: true,
      data: {
        id: result.rows[0].id,
        tipo,
        mensaje: `Estructura de ${tipo} creada exitosamente`
      }
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Error al crear estructura unificada:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
