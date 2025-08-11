import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// Endpoint para sincronizar coberturas existentes con TE_turnos_extras
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando sincronización de coberturas con turnos extras');
    
    // Buscar todas las coberturas en pauta mensual que no tienen turno extra registrado
    const coberturasQuery = `
      WITH coberturas_pendientes AS (
        SELECT 
          pm.id as pauta_id,
          pm.puesto_id,
          (pm.meta->>'cobertura_guardia_id')::uuid as cobertura_guardia_id,
          pm.guardia_id as titular_guardia_id,
          make_date(pm.anio, pm.mes, pm.dia) as fecha,
          pm.estado,
          pm.estado_ui,
          po.instalacion_id,
          COALESCE(i.valor_turno_extra, 50000) as valor_turno_extra,
          -- Determinar el tipo de turno extra
          CASE 
            WHEN po.es_ppc = true THEN 'ppc'
            ELSE 'reemplazo'
          END as tipo_turno_extra
        FROM as_turnos_pauta_mensual pm
        INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
        INNER JOIN instalaciones i ON po.instalacion_id = i.id
        WHERE 
          -- Tiene cobertura asignada en el meta JSON
          pm.meta->>'cobertura_guardia_id' IS NOT NULL
          -- Y el estado indica que fue trabajado o reemplazado
          AND (
            pm.estado IN ('trabajado', 'T', 'reemplazo', 'cubierto', 'inasistencia')
            OR pm.estado_ui = 'reemplazo'
            OR pm.meta->>'estado_ui' = 'reemplazo'
          )
          -- Y no existe ya un turno extra para esta combinación
          AND NOT EXISTS (
            SELECT 1 FROM TE_turnos_extras te
            WHERE te.pauta_id = pm.id
          )
      )
      SELECT * FROM coberturas_pendientes
      ORDER BY fecha DESC
    `;

    const { rows: coberturasPendientes } = await query(coberturasQuery);
    
    console.log(`📊 Coberturas encontradas sin turno extra: ${coberturasPendientes.length}`);
    
    if (coberturasPendientes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay coberturas pendientes de sincronizar',
        sincronizados: 0
      });
    }

    // Insertar los turnos extras faltantes
    let sincronizados = 0;
    const errores: string[] = [];
    
    for (const cobertura of coberturasPendientes) {
      try {
        if (!cobertura.cobertura_guardia_id) {
          console.log(`⚠️ Saltando pauta ${cobertura.pauta_id}: sin guardia de cobertura`);
          continue;
        }

        // Insertar el turno extra
        await query(`
          INSERT INTO TE_turnos_extras (
            guardia_id,
            instalacion_id,
            puesto_id,
            pauta_id,
            fecha,
            estado,
            valor,
            pagado,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (pauta_id) DO NOTHING
        `, [
          cobertura.cobertura_guardia_id,
          cobertura.instalacion_id,
          cobertura.puesto_id,
          cobertura.pauta_id,
          cobertura.fecha,
          cobertura.tipo_turno_extra,
          cobertura.valor_turno_extra || 0,
          false
        ]);
        
        sincronizados++;
        console.log(`✅ Turno extra creado para pauta ${cobertura.pauta_id} - Fecha: ${cobertura.fecha}`);
        
      } catch (error) {
        const errorMsg = `Error en pauta ${cobertura.pauta_id}: ${error}`;
        console.error(errorMsg);
        errores.push(errorMsg);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sincronización completada: ${sincronizados} turnos extras creados`,
      total_coberturas: coberturasPendientes.length,
      sincronizados,
      errores: errores.length > 0 ? errores : undefined
    });
    
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error al sincronizar coberturas',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// GET para verificar el estado actual
export async function GET(request: NextRequest) {
  try {
    // Contar coberturas sin turno extra
    const pendientesQuery = `
      SELECT COUNT(*) as count
      FROM as_turnos_pauta_mensual pm
      WHERE 
        pm.meta->>'cobertura_guardia_id' IS NOT NULL
        AND (
          pm.estado IN ('trabajado', 'T', 'reemplazo', 'cubierto', 'inasistencia')
          OR pm.estado_ui = 'reemplazo'
          OR pm.meta->>'estado_ui' = 'reemplazo'
        )
        AND NOT EXISTS (
          SELECT 1 FROM TE_turnos_extras te
          WHERE te.pauta_id = pm.id
        )
    `;
    
    const { rows: [{ count: pendientes }] } = await query(pendientesQuery);
    
    // Contar turnos extras existentes
    const { rows: [{ count: turnosExtras }] } = await query('SELECT COUNT(*) as count FROM TE_turnos_extras');
    
    // Obtener ejemplos de coberturas pendientes
    const ejemplosQuery = `
      SELECT 
        pm.id as pauta_id,
        make_date(pm.anio, pm.mes, pm.dia) as fecha,
        pm.meta->>'cobertura_guardia_id' as cobertura_guardia_id,
        g.nombre || ' ' || g.apellido_paterno as guardia_cobertura
      FROM as_turnos_pauta_mensual pm
      LEFT JOIN guardias g ON g.id = (pm.meta->>'cobertura_guardia_id')::uuid
      WHERE 
        pm.meta->>'cobertura_guardia_id' IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM TE_turnos_extras te
          WHERE te.pauta_id = pm.id
        )
      LIMIT 5
    `;
    
    const { rows: ejemplos } = await query(ejemplosQuery);
    
    return NextResponse.json({
      success: true,
      estado: {
        coberturas_sin_turno_extra: parseInt(pendientes),
        turnos_extras_registrados: parseInt(turnosExtras),
        necesita_sincronizacion: parseInt(pendientes) > 0,
        ejemplos_pendientes: ejemplos
      }
    });
    
  } catch (error) {
    console.error('Error verificando estado:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error al verificar estado',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
