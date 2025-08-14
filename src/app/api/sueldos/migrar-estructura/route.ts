import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database-vercel';

export async function POST(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'sueldos', action: 'create' });
if (deny) return deny;

  try {
    console.log('🔧 Migrando estructura de tablas de sueldos...');

    const cambios = [];

    // 1. Agregar campo periodo a sueldo_parametros_generales
    console.log('📝 Agregando campo periodo a sueldo_parametros_generales...');
    try {
      await sql`
        ALTER TABLE sueldo_parametros_generales 
        ADD COLUMN IF NOT EXISTS periodo VARCHAR(7),
        ADD COLUMN IF NOT EXISTS descripcion TEXT
      `;
      cambios.push('Agregado campo periodo a sueldo_parametros_generales');
    } catch (error) {
      console.log('Campo periodo ya existe en sueldo_parametros_generales');
    }

    // 2. Agregar campo periodo a sueldo_afp
    console.log('📝 Agregando campo periodo a sueldo_afp...');
    try {
      await sql`
        ALTER TABLE sueldo_afp 
        ADD COLUMN IF NOT EXISTS periodo VARCHAR(7)
      `;
      cambios.push('Agregado campo periodo a sueldo_afp');
    } catch (error) {
      console.log('Campo periodo ya existe en sueldo_afp');
    }

    // 3. Agregar campo periodo a sueldo_tramos_impuesto
    console.log('📝 Agregando campo periodo a sueldo_tramos_impuesto...');
    try {
      await sql`
        ALTER TABLE sueldo_tramos_impuesto 
        ADD COLUMN IF NOT EXISTS periodo VARCHAR(7),
        ADD COLUMN IF NOT EXISTS tasa_max DECIMAL(5,2)
      `;
      cambios.push('Agregado campo periodo a sueldo_tramos_impuesto');
    } catch (error) {
      console.log('Campo periodo ya existe en sueldo_tramos_impuesto');
    }

    // 4. Crear tabla sueldo_asignacion_familiar si no existe
    console.log('📝 Verificando tabla sueldo_asignacion_familiar...');
    const tablaExiste = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sueldo_asignacion_familiar'
      )
    `;

    if (!tablaExiste.rows[0].exists) {
      console.log('📝 Creando tabla sueldo_asignacion_familiar...');
      await sql`
        CREATE TABLE sueldo_asignacion_familiar (
          id SERIAL PRIMARY KEY,
          periodo VARCHAR(7) NOT NULL,
          tramo VARCHAR(10) NOT NULL,
          desde DECIMAL(15,2) NOT NULL,
          hasta DECIMAL(15,2),
          monto DECIMAL(15,2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(periodo, tramo)
        )
      `;
      cambios.push('Creada tabla sueldo_asignacion_familiar');
    } else {
      console.log('✅ Tabla sueldo_asignacion_familiar ya existe');
    }

    // 5. Migrar datos existentes al período 2025-08
    console.log('📝 Migrando datos existentes al período 2025-08...');
    
    // Migrar parámetros generales
    await sql`
      UPDATE sueldo_parametros_generales 
      SET periodo = '2025-08' 
      WHERE periodo IS NULL
    `;
    cambios.push('Migrados parámetros generales a 2025-08');

    // Migrar AFPs
    await sql`
      UPDATE sueldo_afp 
      SET periodo = '2025-08' 
      WHERE periodo IS NULL
    `;
    cambios.push('Migradas AFPs a 2025-08');

    // Migrar tramos de impuesto
    await sql`
      UPDATE sueldo_tramos_impuesto 
      SET periodo = '2025-08' 
      WHERE periodo IS NULL
    `;
    cambios.push('Migrados tramos de impuesto a 2025-08');

    console.log('✅ Migración de estructura completada!');

    return NextResponse.json({
      success: true,
      message: 'Migración de estructura completada exitosamente',
      cambios
    });

  } catch (error) {
    console.error('❌ Error durante la migración de estructura:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error durante la migración de estructura',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
