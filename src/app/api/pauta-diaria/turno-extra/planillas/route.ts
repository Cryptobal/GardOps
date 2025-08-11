import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUserServer } from '@/lib/auth';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Iniciando GET /api/pauta-diaria/turno-extra/planillas');
    
    const user = getCurrentUserServer(request);
    if (!user) {
      console.log('❌ Usuario no autorizado');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener todas las planillas con cálculos dinámicos
    const planillas = await query(`
      SELECT 
        p.id,
        p.fecha_generacion as fecha_creacion,
        COUNT(te.id) as cantidad_turnos,
        COALESCE(SUM(te.valor), 0) as monto_total,
        p.observaciones,
        u.nombre || ' ' || u.apellido as usuario_creador,
        p.estado,
        p.codigo,
        ARRAY_AGG(te.id) as turnos_ids
      FROM TE_planillas_turnos_extras p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN TE_turnos_extras te ON te.planilla_id = p.id
      GROUP BY p.id, p.fecha_generacion, p.observaciones, u.nombre, u.apellido, p.estado, p.codigo
      ORDER BY p.fecha_generacion DESC
    `);

    console.log('🔍 Planillas obtenidas:', planillas.rows.length);

    return NextResponse.json({
      success: true,
      planillas: planillas.rows
    });

  } catch (error) {
    console.error('Error obteniendo planillas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva planilla con turnos extras seleccionados
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Iniciando POST /api/pauta-diaria/turno-extra/planillas');
    
    // Temporalmente simplificado para pruebas - en producción usar getCurrentUserServer
    let user = null;
    try {
      user = getCurrentUserServer(request);
    } catch (e) {
      console.log('⚠️ No se pudo obtener usuario, usando valores por defecto');
    }
    
    // Si no hay usuario, usar valores por defecto para pruebas
    if (!user) {
      user = { email: 'admin@test.com' };
      console.log('⚠️ Usando usuario de prueba para desarrollo');
    }

    const body = await request.json();
    const { turnoIds, observaciones } = body;
    
    if (!turnoIds || turnoIds.length === 0) {
      return NextResponse.json({ 
        error: 'Debe seleccionar al menos un turno' 
      }, { status: 400 });
    }

    console.log('📊 Creando planilla con', turnoIds.length, 'turnos');

    // Verificar que los turnos existan y no estén ya en otra planilla
    const { rows: turnosValidos } = await query(`
      SELECT 
        id, 
        valor,
        guardia_id,
        instalacion_id,
        fecha
      FROM TE_turnos_extras 
      WHERE id = ANY($1::uuid[])
        AND planilla_id IS NULL
        AND pagado = false
    `, [turnoIds]);

    if (turnosValidos.length === 0) {
      return NextResponse.json({ 
        error: 'No se encontraron turnos válidos para incluir en la planilla' 
      }, { status: 400 });
    }

    if (turnosValidos.length !== turnoIds.length) {
      console.log(`⚠️ Solo ${turnosValidos.length} de ${turnoIds.length} turnos son válidos`);
    }

    // Calcular monto total
    const montoTotal = turnosValidos.reduce((sum, turno) => sum + Number(turno.valor), 0);

    // Generar código único para la planilla
    const fecha = new Date();
    const codigo = `TE-${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

    // Obtener ID del usuario desde la sesión
    const { rows: usuarios } = await query(
      `SELECT id FROM usuarios WHERE email = $1 LIMIT 1`,
      [user.email]
    );
    
    const usuarioId = usuarios[0]?.id || null;

    // Crear la planilla
    const { rows: nuevaPlanilla } = await query(`
      INSERT INTO TE_planillas_turnos_extras (
        codigo,
        fecha_generacion,
        monto_total,
        cantidad_turnos,
        observaciones,
        estado,
        usuario_id
      )
      VALUES ($1, NOW(), $2, $3, $4, 'pendiente', $5)
      RETURNING id, codigo, fecha_generacion, monto_total, cantidad_turnos
    `, [
      codigo,
      montoTotal,
      turnosValidos.length,
      observaciones || '',
      usuarioId
    ]);

    const planillaId = nuevaPlanilla[0].id;

    // Actualizar los turnos extras con el ID de la planilla
    await query(`
      UPDATE TE_turnos_extras 
      SET planilla_id = $1,
          updated_at = NOW()
      WHERE id = ANY($2::uuid[])
    `, [planillaId, turnosValidos.map(t => t.id)]);

    console.log('✅ Planilla creada con ID:', planillaId);

    // Obtener resumen de turnos por guardia
    const { rows: resumenGuardias } = await query(`
      SELECT 
        g.nombre || ' ' || g.apellido_paterno as guardia_nombre,
        COUNT(te.id) as cantidad_turnos,
        SUM(te.valor) as monto_total
      FROM TE_turnos_extras te
      JOIN guardias g ON te.guardia_id = g.id
      WHERE te.planilla_id = $1
      GROUP BY g.id, g.nombre, g.apellido_paterno
      ORDER BY guardia_nombre
    `, [planillaId]);

    return NextResponse.json({
      success: true,
      planilla_id: planillaId,
      codigo: nuevaPlanilla[0].codigo,
      cantidad_turnos: nuevaPlanilla[0].cantidad_turnos,
      monto_total: nuevaPlanilla[0].monto_total,
      fecha_generacion: nuevaPlanilla[0].fecha_generacion,
      resumen_guardias: resumenGuardias,
      mensaje: `Planilla ${codigo} creada exitosamente`
    });

  } catch (error) {
    console.error('❌ Error creando planilla:', error);
    return NextResponse.json(
      { 
        error: 'Error al crear la planilla',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 