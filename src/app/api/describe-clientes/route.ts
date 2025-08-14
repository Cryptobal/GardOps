import { requireAuthz } from '@/lib/authz-api'
import { NextResponse } from 'next/server';
import { query } from '../../../lib/database';

export async function GET() {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'describe_clientes', action: 'read:list' });
if (deny) return deny;

  try {
    console.log('🔍 Inspeccionando estructura de tabla clientes...');

    // Verificar si la tabla existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clientes'
      );
    `);

    if (!tableExists.rows[0].exists) {
      return NextResponse.json({
        success: false,
        message: 'La tabla clientes no existe'
      });
    }

    // Obtener estructura de columnas
    const columns = await query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'clientes'
      ORDER BY ordinal_position;
    `);

    // Obtener algunos datos de ejemplo
    const sampleData = await query(`
      SELECT * FROM clientes LIMIT 3;
    `);

    // Contar total de registros
    const count = await query(`
      SELECT COUNT(*) as total FROM clientes;
    `);

    const response = {
      success: true,
      tableExists: true,
      totalRecords: parseInt(count.rows[0].total),
      columns: columns.rows,
      sampleData: sampleData.rows,
      message: 'Estructura de tabla clientes obtenida'
    };

    console.log('📋 Estructura actual de clientes:');
    console.log('Columnas:', columns.rows.map((col: any) => `${col.column_name} (${col.data_type})`));
    console.log('Total registros:', count.rows[0].total);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error inspeccionando tabla clientes:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error inspeccionando tabla clientes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 