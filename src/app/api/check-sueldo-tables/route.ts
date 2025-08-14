import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database-vercel';

export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'check_sueldo_tables', action: 'read:list' });
if (deny) return deny;

  try {
    // Verificar qué tablas existen
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'sueldo_%'
      ORDER BY table_name
    `;

    const tables = tablesResult.rows.map(row => row.table_name);

    // Para cada tabla, obtener su estructura
    const tableStructures: any = {};
    
    for (const tableName of tables) {
      const structureResult = await sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = ${tableName}
        ORDER BY ordinal_position
      `;
      
      tableStructures[tableName] = structureResult.rows;
    }

    return NextResponse.json({
      success: true,
      tables,
      structures: tableStructures
    });

  } catch (error) {
    console.error('Error verificando tablas:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error verificando tablas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
