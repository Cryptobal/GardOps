import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAuthz } from '@/lib/authz-api';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/payroll/estructuras-unificadas - Iniciando...');
    
    // Verificar permisos
    const authResult = await requireAuthz(request, ['admin', 'manager', 'user']);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    console.log('✅ Permisos verificados correctamente');

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const instalacionId = searchParams.get('instalacionId');
    const rolId = searchParams.get('rolId');
    const guardiaId = searchParams.get('guardiaId');
    const tipo = searchParams.get('tipo') || 'todos';
    const estado = searchParams.get('estado') || 'todos';

    console.log('📊 Parámetros de consulta:', { instalacionId, rolId, guardiaId, tipo, estado });

    // Construir condiciones WHERE
    let whereConditions = ['1=1'];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (instalacionId) {
      whereConditions.push(`(es.instalacion_id = $${paramIndex} OR po.instalacion_id = $${paramIndex})`);
      queryParams.push(instalacionId);
      paramIndex++;
    }

    if (rolId) {
      whereConditions.push(`(es.rol_servicio_id = $${paramIndex} OR po.rol_id = $${paramIndex})`);
      queryParams.push(rolId);
      paramIndex++;
    }

    if (guardiaId) {
      whereConditions.push(`seg.guardia_id = $${paramIndex}`);
      queryParams.push(guardiaId);
      paramIndex++;
    }

    if (estado === 'activos') {
      whereConditions.push(`(es.activo = true OR seg.activo = true)`);
    } else if (estado === 'inactivos') {
      whereConditions.push(`(es.activo = false OR seg.activo = false)`);
    }

    const whereClause = whereConditions.join(' AND ');

    console.log('📊 Ejecutando consulta unificada...');

    // Query SQL unificado
    const query = `
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
      WHERE ${whereClause}
      ${tipo === 'servicio' ? '' : tipo === 'guardia' ? 'AND 1=0' : ''}
      
      UNION ALL 
      
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
      WHERE ${whereClause}
      ${tipo === 'guardia' ? '' : tipo === 'servicio' ? 'AND 1=0' : ''}
      
      ORDER BY instalacion_nombre, rol_nombre, guardia_nombre
    `;

    console.log('Query:', query);
    console.log('Valores:', queryParams);

    const result = await db.query(query, queryParams);
    
    console.log('📊 Resultados obtenidos:', result.rows.length);
    console.log('📊 Datos de las filas:', result.rows);

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('❌ Error en GET /api/payroll/estructuras-unificadas:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 POST /api/payroll/estructuras-unificadas - Iniciando...');
    
    // Verificar permisos
    const authResult = await requireAuthz(request, ['admin', 'manager']);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    console.log('✅ Permisos verificados correctamente');

    const body = await request.json();
    console.log('📝 Datos recibidos:', body);

    const {
      tipo,
      instalacion_id,
      rol_servicio_id,
      guardia_id,
      sueldo_base,
      bono_movilizacion = 0,
      bono_colacion = 0,
      bono_responsabilidad = 0
    } = body;

    // Validaciones
    if (!tipo || !['servicio', 'guardia'].includes(tipo)) {
      return NextResponse.json({
        success: false,
        error: 'Tipo de estructura debe ser "servicio" o "guardia"'
      }, { status: 400 });
    }

    if (tipo === 'servicio') {
      if (!instalacion_id || !rol_servicio_id) {
        return NextResponse.json({
          success: false,
          error: 'Instalación y rol de servicio son requeridos para estructuras de servicio'
        }, { status: 400 });
      }
    } else if (tipo === 'guardia') {
      if (!guardia_id) {
        return NextResponse.json({
          success: false,
          error: 'Guardia es requerido para estructuras por guardia'
        }, { status: 400 });
      }
    }

    if (!sueldo_base || sueldo_base <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Sueldo base debe ser mayor a 0'
      }, { status: 400 });
    }

    // Crear estructura según el tipo
    if (tipo === 'servicio') {
      // Crear estructura de servicio
      const result = await db.query(`
        INSERT INTO sueldo_estructuras_servicio (
          instalacion_id, rol_servicio_id, sueldo_base, 
          bono_movilizacion, bono_colacion, bono_responsabilidad, 
          monto, activo, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
        RETURNING id
      `, [
        instalacion_id, 
        rol_servicio_id, 
        sueldo_base, 
        bono_movilizacion, 
        bono_colacion, 
        bono_responsabilidad, 
        sueldo_base
      ]);

      console.log('✅ Estructura de servicio creada exitosamente');
      return NextResponse.json({
        success: true,
        data: { id: result.rows[0].id, tipo: 'servicio' }
      }, { status: 201 });

    } else if (tipo === 'guardia') {
      // Eliminar estructura anterior si existe
      await db.query(`
        DELETE FROM sueldo_estructura_guardia 
        WHERE guardia_id = $1
      `, [guardia_id]);

      // Crear nueva estructura de guardia
      const result = await db.query(`
        INSERT INTO sueldo_estructura_guardia (
          guardia_id, activo, creado_en, version
        ) VALUES ($1, true, NOW(), 1)
        RETURNING id
      `, [guardia_id]);

      const estructuraGuardiaId = result.rows[0].id;

      // Crear item de sueldo base
      await db.query(`
        INSERT INTO sueldo_estructura_guardia_item (
          estructura_guardia_id, item_id, monto, 
          bono_movilizacion, bono_colacion, bono_responsabilidad
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        estructuraGuardiaId,
        '8aaa3d92-577f-45dd-af44-28e1bf376af4', // ID del item sueldo_base
        sueldo_base,
        bono_movilizacion,
        bono_colacion,
        bono_responsabilidad
      ]);

      console.log('✅ Estructura de guardia creada exitosamente');
      return NextResponse.json({
        success: true,
        data: { id: estructuraGuardiaId, tipo: 'guardia' }
      }, { status: 201 });
    }

  } catch (error) {
    console.error('❌ Error en POST /api/payroll/estructuras-unificadas:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
