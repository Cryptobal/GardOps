import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function DELETE() {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'logs', action: 'delete' });
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

  const logsEliminados: Record<string, number> = {};
  const errores: string[] = [];

  for (const tabla of tablasLogs) {
    try {
      const result = await query(
        `DELETE FROM ${tabla} WHERE accion = 'Prueba automática' AND usuario = 'auto@test.cl'`
      );
      
      logsEliminados[tabla] = result.rowCount;
    } catch (error) {
      console.error(`Error eliminando logs de prueba en ${tabla}:`, error);
      errores.push(`${tabla}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  const totalEliminados = Object.values(logsEliminados).reduce((sum, count) => sum + count, 0);

  return NextResponse.json({
    status: 'ok',
    logsEliminados,
    totalEliminados,
    errores,
    mensaje: `Se eliminaron ${totalEliminados} logs de prueba.`,
    timestamp: new Date().toISOString(),
  });
} 