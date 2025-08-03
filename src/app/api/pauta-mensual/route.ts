import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[${timestamp}] 🚀 Iniciando carga de pauta mensual`);
    
    const { searchParams } = new URL(request.url);
    const instalacion_id = searchParams.get('instalacion_id');
    const anio = searchParams.get('anio');
    const mes = searchParams.get('mes');

    console.log(`[${timestamp}] 📥 Parámetros recibidos:`, { instalacion_id, anio, mes });

    if (!instalacion_id || !anio || !mes) {
      console.log(`[${timestamp}] ❌ Validación fallida: parámetros requeridos faltantes`);
      return NextResponse.json(
        { error: 'Parámetros requeridos: instalacion_id, anio, mes' },
        { status: 400 }
      );
    }

    // Obtener la pauta mensual desde la base de datos
    const pautaQueryStart = Date.now();
    const pautaResult = await query(`
      SELECT 
        pm.guardia_id,
        pm.dia,
        pm.estado
      FROM as_turnos_pauta_mensual pm
      WHERE pm.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
      ORDER BY pm.guardia_id, pm.dia
    `, [instalacion_id, anio, mes]);
    
    const pautaQueryEnd = Date.now();
    console.log(`[${timestamp}] 🐌 Query pauta mensual: ${pautaQueryEnd - pautaQueryStart}ms, ${pautaResult.rows.length} registros encontrados`);

    // Obtener todos los guardias asignados a la instalación Y PPCs pendientes
    const guardiasQueryStart = Date.now();
    const [guardiasResult, ppcsResult] = await Promise.all([
      // Guardias asignados reales
      // Migrado al nuevo modelo as_turnos_puestos_operativos
      query(`
        SELECT 
          g.id,
          g.nombre,
          g.apellido_paterno,
          g.apellido_materno,
          CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo,
          'asignado' as tipo
        FROM guardias g
        INNER JOIN as_turnos_puestos_operativos po ON g.id = po.guardia_id
        WHERE po.instalacion_id = $1 
          AND g.activo = true
          AND po.es_ppc = false
        ORDER BY g.nombre
      `, [instalacion_id]),
      
      // PPCs - incluir todos los PPCs relevantes, no solo pendientes
      // Migrado al nuevo modelo as_turnos_puestos_operativos
      query(`
        SELECT 
          po.id || '_' || generate_series(1, po.cantidad_faltante) as id,
          'PPC ' || substring(po.id::text, 1, 2) || 'XX' || substring(po.id::text, 35, 2) || ' #' || generate_series(1, po.cantidad_faltante) as nombre,
          '' as apellido_paterno,
          '' as apellido_materno,
          'PPC ' || substring(po.id::text, 1, 2) || 'XX' || substring(po.id::text, 35, 2) || ' #' || generate_series(1, po.cantidad_faltante) as nombre_completo,
          'ppc' as tipo,
          po.estado as ppc_estado
        FROM as_turnos_puestos_operativos po
        WHERE po.instalacion_id = $1 
          AND po.es_ppc = true
          AND po.estado IN ('Pendiente', 'Asignado')
        ORDER BY po.id, generate_series(1, po.cantidad_faltante)
      `, [instalacion_id])
    ]);
    
    // Combinar guardias reales y PPCs pendientes
    const guardiasCompletos = [
      ...guardiasResult.rows,
      ...ppcsResult.rows
    ];
    
    const guardiasQueryEnd = Date.now();
    console.log(`[${timestamp}] 🐌 Query guardias: ${guardiasQueryEnd - guardiasQueryStart}ms, ${guardiasCompletos.length} guardias encontrados (${guardiasResult.rows.length} reales, ${ppcsResult.rows.length} PPCs)`);

    // Generar días del mes
    const diasDelMes = Array.from(
      { length: new Date(parseInt(anio), parseInt(mes), 0).getDate() }, 
      (_, i) => i + 1
    );

    console.log(`[${timestamp}] 📅 Generando pauta para ${diasDelMes.length} días del mes`);

    // Crear pauta en el formato esperado por el frontend
    const pauta = guardiasCompletos.map((guardia: any) => {
      // Buscar registros de pauta para este guardia específico
      const pautaGuardia = pautaResult.rows.filter((p: any) => {
        // Para PPCs, necesitamos manejar el ID con sufijo
        if (guardia.tipo === 'ppc') {
          // Los PPCs tienen IDs con sufijo (ej: "20d640b3-e6b5-4868-af91-2571a313b766_1")
          // Buscar registros que coincidan con el ID base del PPC
          const ppcBaseId = guardia.id.split('_')[0];
          return p.guardia_id.startsWith(ppcBaseId);
        }
        // Para guardias reales, buscar coincidencia exacta
        return p.guardia_id === guardia.id;
      });
      
      console.log(`[${timestamp}] 🔍 Guardia ${guardia.id} (${guardia.nombre_completo}): ${pautaGuardia.length} registros encontrados`);
      
      // Crear array de días para este guardia
      const dias = diasDelMes.map(dia => {
        const pautaDia = pautaGuardia.find((p: any) => p.dia === dia);
        const estado = pautaDia?.estado || 'libre';
        // Convertir estado de BD a formato frontend
        switch (estado) {
          case 'trabajado':
            return 'T';
          case 'libre':
            return 'L';
          case 'permiso':
            return 'P';
          default:
            return 'L';
        }
      });

      return {
        id: guardia.id,
        nombre: guardia.nombre_completo,
        patron_turno: '4x4', // TODO: Obtener desde la configuración
        dias: dias,
        tipo: guardia.tipo
      };
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`[${timestamp}] ✅ Pauta mensual cargada exitosamente`);
    console.log(`[${timestamp}] 📊 Resumen: ${pauta.length} guardias, ${diasDelMes.length} días por guardia`);
    console.log(`[${timestamp}] ⏱️ Tiempo total: ${duration}ms`);

    return NextResponse.json({
      success: true,
      instalacion_id,
      anio: parseInt(anio),
      mes: parseInt(mes),
      pauta: pauta,
      metadata: {
        total_guardias: pauta.length,
        dias_mes: diasDelMes.length,
        tiempo_procesamiento_ms: duration,
        timestamp: timestamp
      }
    });

  } catch (error) {
    const errorTime = new Date().toISOString();
    console.error(`[${errorTime}] ❌ Error obteniendo pauta mensual:`, error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor al obtener la pauta mensual',
        timestamp: errorTime,
        detalles: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 