import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando migración: Renombrar tablas con prefijo TE_...');

    // 1. Verificar si las tablas actuales existen
    console.log('🔍 Verificando tablas existentes...');
    
    const { rows: existingTables } = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('planillas_turnos_extras', 'planilla_turno_relacion', 'turnos_extras')
      AND table_schema = 'public'
    `);

    console.log('📋 Tablas encontradas:', existingTables.map(t => t.table_name));

    // 2. Renombrar planillas_turnos_extras a TE_planillas_turnos_extras
    console.log('🔄 Renombrando planillas_turnos_extras...');
    try {
      await query('ALTER TABLE planillas_turnos_extras RENAME TO TE_planillas_turnos_extras');
      console.log('✅ planillas_turnos_extras → TE_planillas_turnos_extras');
    } catch (error) {
      console.log('⚠️ planillas_turnos_extras ya renombrada o no existe');
    }

    // 3. Renombrar turnos_extras a TE_turnos_extras
    console.log('🔄 Renombrando turnos_extras...');
    try {
      await query('ALTER TABLE turnos_extras RENAME TO TE_turnos_extras');
      console.log('✅ turnos_extras → TE_turnos_extras');
    } catch (error) {
      console.log('⚠️ turnos_extras ya renombrada o no existe');
    }

    // 4. Renombrar planilla_turno_relacion a TE_planilla_turno_relacion (si existe)
    console.log('🔄 Renombrando planilla_turno_relacion...');
    try {
      await query('ALTER TABLE planilla_turno_relacion RENAME TO TE_planilla_turno_relacion');
      console.log('✅ planilla_turno_relacion → TE_planilla_turno_relacion');
    } catch (error) {
      console.log('⚠️ planilla_turno_relacion ya renombrada o no existe');
    }

    // 5. Actualizar índices con nuevos nombres
    console.log('📊 Actualizando índices...');
    
    // Índices para TE_planillas_turnos_extras
    const indicesPlanillas = [
      'CREATE INDEX IF NOT EXISTS idx_TE_planillas_turnos_extras_usuario ON TE_planillas_turnos_extras(usuario_id)',
      'CREATE INDEX IF NOT EXISTS idx_TE_planillas_turnos_extras_estado ON TE_planillas_turnos_extras(estado)',
      'CREATE INDEX IF NOT EXISTS idx_TE_planillas_turnos_extras_fecha ON TE_planillas_turnos_extras(fecha_generacion)',
      'CREATE INDEX IF NOT EXISTS idx_TE_planillas_turnos_extras_codigo ON TE_planillas_turnos_extras(codigo)'
    ];

    for (const indexQuery of indicesPlanillas) {
      try {
        await query(indexQuery);
        console.log('✅ Índice creado:', indexQuery.split('IF NOT EXISTS ')[1]);
      } catch (error) {
        console.log('⚠️ Índice ya existe o error:', error);
      }
    }

    // Índices para TE_turnos_extras
    const indicesTurnos = [
      'CREATE INDEX IF NOT EXISTS idx_TE_turnos_extras_guardia_id ON TE_turnos_extras(guardia_id)',
      'CREATE INDEX IF NOT EXISTS idx_TE_turnos_extras_instalacion_id ON TE_turnos_extras(instalacion_id)',
      'CREATE INDEX IF NOT EXISTS idx_TE_turnos_extras_fecha ON TE_turnos_extras(fecha)',
      'CREATE INDEX IF NOT EXISTS idx_TE_turnos_extras_estado ON TE_turnos_extras(estado)',
      'CREATE INDEX IF NOT EXISTS idx_TE_turnos_extras_pagado ON TE_turnos_extras(pagado)',
      'CREATE INDEX IF NOT EXISTS idx_TE_turnos_extras_planilla_id ON TE_turnos_extras(planilla_id)'
    ];

    for (const indexQuery of indicesTurnos) {
      try {
        await query(indexQuery);
        console.log('✅ Índice creado:', indexQuery.split('IF NOT EXISTS ')[1]);
      } catch (error) {
        console.log('⚠️ Índice ya existe o error:', error);
      }
    }

    // 6. Verificar las tablas renombradas
    const { rows: newTables } = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE 'TE_%'
      AND table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📋 Tablas con prefijo TE_:', newTables.map(t => t.table_name));

    // 7. Verificar datos en las tablas
    const { rows: countPlanillas } = await query('SELECT COUNT(*) as count FROM TE_planillas_turnos_extras');
    const { rows: countTurnos } = await query('SELECT COUNT(*) as count FROM TE_turnos_extras');

    const resultado = {
      success: true,
      mensaje: 'Migración de nombres de tablas completada exitosamente',
      tablas_renombradas: newTables.map(t => t.table_name),
      estadisticas: {
        planillas_count: countPlanillas[0]?.count || 0,
        turnos_count: countTurnos[0]?.count || 0
      },
      nuevas_tablas: [
        'TE_planillas_turnos_extras',
        'TE_turnos_extras',
        'TE_planilla_turno_relacion'
      ]
    };

    console.log('✅ Migración completada:', resultado);
    return NextResponse.json(resultado);

  } catch (error) {
    console.error('❌ Error en migración:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error durante la migración de nombres',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
