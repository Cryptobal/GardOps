import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'logs', action: 'read:list' });
if (deny) return deny;

  const tablasLogs = [
    'logs_guardias',
    'logs_pauta_mensual', 
    'logs_pauta_diaria',
    'logs_turnos_extras',
    'logs_puestos_operativos',
    'logs_documentos',
    'logs_usuarios',
    'logs_instalaciones',
    'logs_clientes'
  ];

  const resultados: Record<string, any> = {};

  for (const tabla of tablasLogs) {
    try {
      // Verificar si la tabla existe
      const existe = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tabla]);

      if (!existe.rows[0].exists) {
        resultados[tabla] = {
          existe: false,
          columnas: [],
          error: 'Tabla no existe'
        };
        continue;
      }

      // Obtener estructura de columnas
      const columnas = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [tabla]);

      // Contar registros
      const count = await query(`SELECT COUNT(*) as total FROM ${tabla}`);

      resultados[tabla] = {
        existe: true,
        columnas: columnas.rows,
        total_registros: parseInt(count.rows[0].total),
        error: null
      };

    } catch (error) {
      resultados[tabla] = {
        existe: false,
        columnas: [],
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    tablas: resultados
  });
} 