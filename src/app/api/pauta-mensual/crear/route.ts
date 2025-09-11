import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logCRUD, logError } from '@/lib/logging';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instalacion_id, anio, mes } = body;
    
    // Por ahora usar un tenant_id fijo para testing
    const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337';
    const usuario = 'admin@test.com'; // En producción, obtener del token de autenticación

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
        rs.nombre as patron_turno,
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
      console.log(`🔍 Procesando puesto: ${puesto.nombre_puesto}, Guardia ID: ${puesto.guardia_id}, Es PPC: ${puesto.es_ppc}`);
      
      // Solo crear pauta para puestos que tengan guardia asignado
      if (puesto.guardia_id) {
        console.log(`✅ Puesto ${puesto.nombre_puesto} tiene guardia asignado, creando pauta...`);
        
        for (const dia of diasDelMes) {
          // Aplicar patrón de turno automáticamente
          let estado = '';
          
          if (puesto.patron_turno) {
            // Aplicar lógica de patrón de turno
            estado = aplicarPatronTurno(puesto.patron_turno, dia, parseInt(anio), parseInt(mes));
            console.log(`📅 Día ${dia}: patrón "${puesto.patron_turno}" -> estado "${estado}"`);
          }
          
          // Solo insertar si el estado no está vacío (es decir, si hay un patrón válido)
          if (estado) {
            pautasParaInsertar.push({
              puesto_id: puesto.puesto_id,
              guardia_id: puesto.guardia_id,
              dia: parseInt(dia.toString()),
              estado: estado
            });
          }
        }
      } else {
        console.log(`❌ Puesto ${puesto.nombre_puesto} NO tiene guardia asignado, saltando...`);
      }
      // Para PPCs sin guardia asignada, NO crear registros automáticamente
      // La pauta debe estar vacía hasta que se asigne un guardia
    }

    // Insertar todas las pautas con nueva estructura de estados
    const insertPromises = pautasParaInsertar.map(pauta => {
      const esPPC = !pauta.guardia_id;
      const esLibre = pauta.estado === 'libre';
      
      return query(`
        INSERT INTO as_turnos_pauta_mensual (
          puesto_id, guardia_id, anio, mes, dia, estado,
          tipo_turno, estado_puesto, estado_guardia, tipo_cobertura, guardia_trabajo_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        pauta.puesto_id, 
        pauta.guardia_id, 
        anio, 
        mes, 
        pauta.dia, 
        pauta.estado,
        esLibre ? 'libre' : 'planificado',
        esLibre ? 'libre' : (esPPC ? 'ppc' : 'asignado'),
        esLibre ? null : (esPPC ? null : 'asistido'),
        esLibre ? null : (esPPC ? 'sin_cobertura' : 'guardia_asignado'),
        pauta.guardia_id
      ]);
    });

    await Promise.all(insertPromises);

    // Crear un ID único para la pauta mensual (combinación de instalación, año y mes)
    const pautaId = `${instalacion_id}_${anio}_${mes}`;
    
    // Log de creación de pauta mensual
    await logCRUD(
      'pauta_mensual',
      pautaId,
      'CREATE',
      usuario,
      null, // No hay datos anteriores en creación
      {
        instalacion_id,
        anio: parseInt(anio),
        mes: parseInt(mes),
        puestos_procesados: puestosResult.rows.length,
        registros_creados: pautasParaInsertar.length,
        dias_del_mes: diasDelMes.length,
        pautas_creadas: pautasParaInsertar
      },
      tenantId
    );

    logger.debug(`✅ Pauta mensual creada automáticamente para instalación ${instalacion_id} en ${mes}/${anio}`);
    logger.debug(`📊 Resumen: ${pautasParaInsertar.length} registros creados para ${puestosResult.rows.length} puestos`);
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
    
    // Log del error usando logError específico
    await logError(
      'pauta_mensual',
      'NEW',
      'admin@test.com',
      error,
      { endpoint: '/api/pauta-mensual/crear', method: 'POST' },
      '1397e653-a702-4020-9702-3ae4f3f8b337'
    );
    
    return NextResponse.json(
      { error: 'Error interno del servidor al crear la pauta mensual' },
      { status: 500 }
    );
  }
}

// Función para aplicar patrón de turno automáticamente
function aplicarPatronTurno(rolCompleto: string, dia: number, anio: number, mes: number): string {
  const fecha = new Date(anio, mes - 1, dia);
  const diaSemana = fecha.getDay(); // 0 = Domingo, 1 = Lunes, etc.
  
  // Extraer el patrón del rol completo (ej: "Día 4x4x12 / 08:00 20:00" -> "4x4")
  const patronMatch = rolCompleto.match(/(\d+x\d+)/);
  const patron = patronMatch ? patronMatch[1] : '';
  
  // Patrón 4x4 (4 días trabajando, 4 días libres)
  if (patron === '4x4') {
    const diaDelCiclo = ((dia - 1) % 8) + 1;
    return diaDelCiclo <= 4 ? 'planificado' : 'libre';
  }
  
  // Patrón 5x2 (5 días trabajando, 2 días libres)
  if (patron === '5x2') {
    const diaDelCiclo = ((dia - 1) % 7) + 1;
    return diaDelCiclo <= 5 ? 'planificado' : 'libre';
  }
  
  // Patrón 6x1 (6 días trabajando, 1 día libre)
  if (patron === '6x1') {
    const diaDelCiclo = ((dia - 1) % 7) + 1;
    return diaDelCiclo <= 6 ? 'planificado' : 'libre';
  }
  
  // Patrón L-V (Lunes a Viernes)
  if (patron === 'L-V') {
    return (diaSemana >= 1 && diaSemana <= 5) ? 'planificado' : 'libre';
  }
  
  // Por defecto, días sin asignar
  return '';
} 