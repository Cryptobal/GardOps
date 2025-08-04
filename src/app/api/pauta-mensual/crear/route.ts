import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instalacion_id, anio, mes } = body;

    if (!instalacion_id || !anio || !mes) {
      return NextResponse.json(
        { error: 'Parámetros requeridos: instalacion_id, anio, mes' },
        { status: 400 }
      );
    }

    // Verificar si ya existe pauta para esta instalación en este mes
    const pautaExistente = await query(`
      SELECT COUNT(*) as count
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
    `, [instalacion_id, anio, mes]);

    if (parseInt(pautaExistente.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Ya existe una pauta mensual para esta instalación en el mes especificado' },
        { status: 409 }
      );
    }

    // 1. PRIMERO: Verificar si hay puestos operativos activos para la instalación
    const puestosResult = await query(`
      SELECT 
        po.id as puesto_id,
        po.nombre_puesto,
        po.guardia_id,
        po.es_ppc,
        po.activo,
        rs.nombre as rol_nombre,
        CONCAT(rs.dias_trabajo, 'x', rs.dias_descanso) as patron_turno,
        g.nombre as guardia_nombre,
        g.apellido_paterno,
        g.apellido_materno
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.instalacion_id = $1 
        AND po.activo = true
      ORDER BY po.nombre_puesto
    `, [instalacion_id]);

    if (puestosResult.rows.length === 0) {
      return NextResponse.json(
        { 
          error: 'Instalación sin puestos operativos activos. Por favor, crea puestos operativos desde el módulo de asignaciones en la instalación.',
          tipo: 'sin_puestos'
        },
        { status: 400 }
      );
    }

    // Generar días del mes
    const diasDelMes = Array.from(
      { length: new Date(parseInt(anio), parseInt(mes), 0).getDate() }, 
      (_, i) => i + 1
    );

    // Crear pauta base para cada puesto operativo
    const pautasParaInsertar = [];
    
    for (const puesto of puestosResult.rows) {
      // Solo crear pauta para puestos que tengan guardia asignado o sean PPCs
      if (puesto.guardia_id || puesto.es_ppc) {
        for (const dia of diasDelMes) {
          // Aplicar patrón de turno automáticamente
          let estado = 'libre';
          
          if (puesto.guardia_id && puesto.patron_turno) {
            // Aplicar lógica de patrón de turno
            estado = aplicarPatronTurno(puesto.patron_turno, dia, parseInt(anio), parseInt(mes));
          }
          
          pautasParaInsertar.push({
            puesto_id: puesto.puesto_id,
            guardia_id: puesto.guardia_id || puesto.puesto_id, // Para PPCs, usar el puesto_id como guardia_id
            dia: parseInt(dia.toString()),
            estado: estado
          });
        }
      }
    }

    // Insertar todas las pautas
    const insertPromises = pautasParaInsertar.map(pauta => 
      query(`
        INSERT INTO as_turnos_pauta_mensual (puesto_id, guardia_id, anio, mes, dia, estado)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [pauta.puesto_id, pauta.guardia_id, anio, mes, pauta.dia, pauta.estado])
    );

    await Promise.all(insertPromises);

    console.log(`✅ Pauta mensual creada automáticamente para instalación ${instalacion_id} en ${mes}/${anio}`);
    console.log(`📊 Resumen: ${pautasParaInsertar.length} registros creados para ${puestosResult.rows.length} puestos`);
    console.log(`🔍 Puestos con guardia: ${puestosResult.rows.filter((p: any) => p.guardia_id).length}, PPCs: ${puestosResult.rows.filter((p: any) => p.es_ppc).length}`);

    return NextResponse.json({
      success: true,
      message: 'Pauta mensual creada exitosamente',
      instalacion_id,
      anio: parseInt(anio),
      mes: parseInt(mes),
      puestos_procesados: puestosResult.rows.length,
      registros_creados: pautasParaInsertar.length,
      dias_del_mes: diasDelMes.length
    });

  } catch (error) {
    console.error('❌ Error creando pauta mensual automática:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al crear la pauta mensual' },
      { status: 500 }
    );
  }
}

// Función para aplicar patrón de turno automáticamente
function aplicarPatronTurno(patron: string, dia: number, anio: number, mes: number): string {
  const fecha = new Date(anio, mes - 1, dia);
  const diaSemana = fecha.getDay(); // 0 = Domingo, 1 = Lunes, etc.
  
  // Patrón 4x4 (4 días trabajando, 4 días libres)
  if (patron === '4x4') {
    const diaDelCiclo = ((dia - 1) % 8) + 1;
    return diaDelCiclo <= 4 ? 'trabajado' : 'libre';
  }
  
  // Patrón 5x2 (5 días trabajando, 2 días libres)
  if (patron === '5x2') {
    const diaDelCiclo = ((dia - 1) % 7) + 1;
    return diaDelCiclo <= 5 ? 'trabajado' : 'libre';
  }
  
  // Patrón 6x1 (6 días trabajando, 1 día libre)
  if (patron === '6x1') {
    const diaDelCiclo = ((dia - 1) % 7) + 1;
    return diaDelCiclo <= 6 ? 'trabajado' : 'libre';
  }
  
  // Patrón L-V (Lunes a Viernes)
  if (patron === 'L-V') {
    return (diaSemana >= 1 && diaSemana <= 5) ? 'trabajado' : 'libre';
  }
  
  // Por defecto, todos los días libres
  return 'libre';
} 