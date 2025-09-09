import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    logger.debug('🚀 Iniciando migración de parámetros de sueldos...');

    // 1. Agregar campo periodo a sueldo_parametros_generales
    logger.debug('📝 Agregando campo periodo a sueldo_parametros_generales...');
    await sql`
      ALTER TABLE sueldo_parametros_generales 
      ADD COLUMN IF NOT EXISTS periodo VARCHAR(7),
      ADD COLUMN IF NOT EXISTS descripcion TEXT
    `;

    // 2. Agregar campo periodo a sueldo_afp
    logger.debug('📝 Agregando campo periodo a sueldo_afp...');
    await sql`
      ALTER TABLE sueldo_afp 
      ADD COLUMN IF NOT EXISTS periodo VARCHAR(7)
    `;

    // 3. Agregar campo periodo a sueldo_tramos_impuesto
    logger.debug('📝 Agregando campo periodo a sueldo_tramos_impuesto...');
    await sql`
      ALTER TABLE sueldo_tramos_impuesto 
      ADD COLUMN IF NOT EXISTS periodo VARCHAR(7),
      ADD COLUMN IF NOT EXISTS tasa_max DECIMAL(5,2)
    `;

    // 4. Crear tabla sueldo_asignacion_familiar
    logger.debug('📝 Creando tabla sueldo_asignacion_familiar...');
    await sql`
      CREATE TABLE IF NOT EXISTS sueldo_asignacion_familiar (
        id SERIAL PRIMARY KEY,
        periodo VARCHAR(7) NOT NULL,
        tramo VARCHAR(1) NOT NULL,
        desde DECIMAL(12,2) NOT NULL,
        hasta DECIMAL(12,2) NOT NULL,
        monto DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(periodo, tramo)
      )
    `;

    // 5. Migrar datos existentes al período 2025-08
    logger.debug('📝 Migrando datos existentes al período 2025-08...');
    
    // Migrar parámetros generales
    await sql`
      UPDATE sueldo_parametros_generales 
      SET periodo = '2025-08' 
      WHERE periodo IS NULL
    `;

    // Migrar AFPs
    await sql`
      UPDATE sueldo_afp 
      SET periodo = '2025-08' 
      WHERE periodo IS NULL
    `;

    // Migrar tramos de impuesto
    await sql`
      UPDATE sueldo_tramos_impuesto 
      SET periodo = '2025-08' 
      WHERE periodo IS NULL
    `;

    // 6. Insertar parámetros generales faltantes
    logger.debug('📝 Insertando parámetros generales faltantes...');
    const parametrosFaltantes = [
      { parametro: 'UF_ULTIMO_DIA', valor: '0', descripcion: 'Valor UF último día del mes' },
      { parametro: 'FAC_SIS', valor: '0.007', descripcion: 'Factor SIS' },
      { parametro: 'FAC_SS', valor: '0.007', descripcion: 'Factor Seguro Social' },
      { parametro: 'FAC_CCAF', valor: '0.007', descripcion: 'Factor CCAF' },
      { parametro: 'FAC_MUTUAL', valor: '0.007', descripcion: 'Factor Mutual' },
      { parametro: 'FAC_ISAPRE', valor: '0.007', descripcion: 'Factor ISAPRE' },
      { parametro: 'FAC_AFP', valor: '0.007', descripcion: 'Factor AFP' },
      { parametro: 'FAC_SALUD', valor: '0.007', descripcion: 'Factor Salud' },
      { parametro: 'FAC_IMP_RENTA', valor: '0.007', descripcion: 'Factor Impuesto Renta' },
      { parametro: 'FAC_ASIG_FAM', valor: '0.007', descripcion: 'Factor Asignación Familiar' },
      { parametro: 'FAC_GRATIF', valor: '0.007', descripcion: 'Factor Gratificación' },
      { parametro: 'FAC_COLACION', valor: '0.007', descripcion: 'Factor Colación' },
      { parametro: 'FAC_MOVILIZACION', valor: '0.007', descripcion: 'Factor Movilización' },
      { parametro: 'FAC_VIATICOS', valor: '0.007', descripcion: 'Factor Viáticos' },
      { parametro: 'FAC_OTROS', valor: '0.007', descripcion: 'Factor Otros' },
      { parametro: 'FAC_TOTAL', valor: '0.007', descripcion: 'Factor Total' },
      { parametro: 'FAC_LIQUIDO', valor: '0.007', descripcion: 'Factor Líquido' }
    ];

    for (const param of parametrosFaltantes) {
      await sql`
        INSERT INTO sueldo_parametros_generales (periodo, parametro, valor, descripcion)
        VALUES ('2025-08', ${param.parametro}, ${param.valor}, ${param.descripcion})
        ON CONFLICT (periodo, parametro) DO NOTHING
      `;
    }

    // 7. Insertar AFPs faltantes
    logger.debug('📝 Insertando AFPs faltantes...');
    const afpsFaltantes = [
      { codigo: 'EMPART', nombre: 'Empart', tasa: 21.84 },
      { codigo: 'INP_SSS', nombre: 'INP SSS', tasa: 18.84 },
      { codigo: 'CADDEMED', nombre: 'Caddemed', tasa: 20.2 }
    ];

    for (const afp of afpsFaltantes) {
      await sql`
        INSERT INTO sueldo_afp (periodo, codigo, nombre, tasa)
        VALUES ('2025-08', ${afp.codigo}, ${afp.nombre}, ${afp.tasa})
        ON CONFLICT (periodo, codigo) DO NOTHING
      `;
    }

    // 8. Insertar datos de asignación familiar
    logger.debug('📝 Insertando datos de asignación familiar...');
    const tramosAsignacion = [
      { tramo: 'A', desde: 0, hasta: 1350000, monto: 0 },
      { tramo: 'B', desde: 1350001, hasta: 2000000, monto: 0 },
      { tramo: 'C', desde: 2000001, hasta: 3000000, monto: 0 },
      { tramo: 'D', desde: 3000001, hasta: 999999999, monto: 0 }
    ];

    for (const tramo of tramosAsignacion) {
      await sql`
        INSERT INTO sueldo_asignacion_familiar (periodo, tramo, desde, hasta, monto)
        VALUES ('2025-08', ${tramo.tramo}, ${tramo.desde}, ${tramo.hasta}, ${tramo.monto})
        ON CONFLICT (periodo, tramo) DO NOTHING
      `;
    }

    // 9. Actualizar tramos de impuesto con valores de 2025-08
    logger.debug('📝 Actualizando tramos de impuesto...');
    const tramosImpuesto = [
      { tramo: 1, desde: 0, hasta: 1500000, factor: 0, rebaja: 0, tasa_max: 0 },
      { tramo: 2, desde: 1500001, hasta: 2500000, factor: 0.04, rebaja: 60000, tasa_max: 4 },
      { tramo: 3, desde: 2500001, hasta: 3500000, factor: 0.08, rebaja: 160000, tasa_max: 8 },
      { tramo: 4, desde: 3500001, hasta: 4500000, factor: 0.135, rebaja: 327500, tasa_max: 13.5 },
      { tramo: 5, desde: 4500001, hasta: 5500000, factor: 0.23, rebaja: 765000, tasa_max: 23 },
      { tramo: 6, desde: 5500001, hasta: 6500000, factor: 0.304, rebaja: 1127000, tasa_max: 30.4 },
      { tramo: 7, desde: 6500001, hasta: 999999999, factor: 0.35, rebaja: 1627000, tasa_max: 35 }
    ];

    for (const tramo of tramosImpuesto) {
      await sql`
        UPDATE sueldo_tramos_impuesto 
        SET desde = ${tramo.desde}, hasta = ${tramo.hasta}, 
            factor = ${tramo.factor}, rebaja = ${tramo.rebaja}, tasa_max = ${tramo.tasa_max}
        WHERE periodo = '2025-08' AND tramo = ${tramo.tramo}
      `;
    }

    logger.debug('✅ Migración completada exitosamente!');

    return NextResponse.json({
      success: true,
      message: 'Migración completada exitosamente',
      cambios: [
        'Agregado campo periodo a todas las tablas',
        'Creada tabla sueldo_asignacion_familiar',
        'Migrados datos al período 2025-08',
        'Insertados 17 parámetros generales faltantes',
        'Insertadas 3 AFPs nuevas',
        'Actualizados tramos de impuesto'
      ]
    });

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error durante la migración',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
