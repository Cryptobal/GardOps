import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener esquema de las tablas de estructuras
export async function GET(request: NextRequest) {
  console.log('🔍 GET /api/payroll/estructuras-unificadas/schema - Iniciando...');
  
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
    const response: any = {
      success: true,
      data: {}
    };

    // Verificar tabla sueldo_estructuras_servicio
    const checkTableServicio = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sueldo_estructuras_servicio'
      )
    `);

    if (checkTableServicio.rows[0].exists) {
      const estructuraServicio = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'sueldo_estructuras_servicio'
        ORDER BY ordinal_position
      `);

      const sampleRecordsServicio = await query(`
        SELECT * FROM sueldo_estructuras_servicio LIMIT 2
      `);

      response.data.sueldo_estructuras_servicio = {
        existe: true,
        estructura: estructuraServicio.rows,
        registros_ejemplo: sampleRecordsServicio.rows
      };
    } else {
      response.data.sueldo_estructuras_servicio = { existe: false };
    }

    // Verificar tabla sueldo_estructura_guardia
    const checkTableGuardia = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sueldo_estructura_guardia'
      )
    `);

    if (checkTableGuardia.rows[0].exists) {
      const estructuraGuardia = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'sueldo_estructura_guardia'
        ORDER BY ordinal_position
      `);

      const sampleRecordsGuardia = await query(`
        SELECT * FROM sueldo_estructura_guardia LIMIT 2
      `);

      response.data.sueldo_estructura_guardia = {
        existe: true,
        estructura: estructuraGuardia.rows,
        registros_ejemplo: sampleRecordsGuardia.rows
      };
    } else {
      response.data.sueldo_estructura_guardia = { existe: false };
    }

    // Verificar tabla sueldo_estructura_guardia_item
    const checkTableGuardiaItem = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sueldo_estructura_guardia_item'
      )
    `);

    if (checkTableGuardiaItem.rows[0].exists) {
      const estructuraGuardiaItem = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'sueldo_estructura_guardia_item'
        ORDER BY ordinal_position
      `);

      const sampleRecordsGuardiaItem = await query(`
        SELECT * FROM sueldo_estructura_guardia_item LIMIT 2
      `);

      response.data.sueldo_estructura_guardia_item = {
        existe: true,
        estructura: estructuraGuardiaItem.rows,
        registros_ejemplo: sampleRecordsGuardiaItem.rows
      };
    } else {
      response.data.sueldo_estructura_guardia_item = { existe: false };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error obteniendo esquema:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
