import { NextRequest } from 'next/server';
import { withPermission } from '@/app/api/_middleware/withPermission';
import { getCurrentUserRef } from '@/lib/auth';
import { query } from '@/lib/database';

export const POST = withPermission('turnos.marcar_asistencia', async (req: NextRequest) => {
  try {
    // Obtener datos del body
    const body = await req.json().catch(() => null);
    
    if (!body) {
      return new Response('Invalid JSON', { status: 400 });
    }
    
    const { pautaId, pauta_id, estado, motivo, reemplazo_guardia_id } = body;
    
    // Normalizar pauta_id (algunos clientes usan pautaId, otros pauta_id)
    const pautaIdFinal = pautaId || pauta_id;
    
    if (!pautaIdFinal || !estado) {
      return new Response('pauta_id y estado son requeridos', { status: 400 });
    }
    
    // Mapear estados del cliente a estados de la función SQL
    let estadoSQL: string;
    switch (estado) {
      case 'trabajado':
      case 'asistio':
        estadoSQL = 'asistio';
        break;
      case 'inasistencia':
      case 'no_asistio':
        estadoSQL = 'no_asistio';
        break;
      case 'deshacer':
      case 'revertir':
        estadoSQL = 'deshacer';
        break;
      case 'reemplazo':
        // Para reemplazo, usamos no_asistio con meta especial
        estadoSQL = 'no_asistio';
        break;
      case 'sin_cobertura':
        // Sin cobertura se maneja automáticamente en la función
        estadoSQL = 'no_asistio';
        break;
      default:
        return new Response(`Estado inválido: ${estado}`, { status: 400 });
    }
    
    // Construir metadata
    let meta: any = null;
    
    if (motivo) {
      meta = { motivo };
    }
    
    if (reemplazo_guardia_id) {
      meta = { ...meta, reemplazo_guardia_id };
    }
    
    // Obtener actor (usuario actual)
    const actor = await getCurrentUserRef();
    if (!actor) {
      return new Response('No se pudo identificar al usuario', { status: 401 });
    }
    
    // Llamar a la función SQL
    const result = await query(
      `SELECT * FROM as_turnos.fn_marcar_asistencia($1::bigint, $2::text, $3::jsonb, $4::text)`,
      [pautaIdFinal, estadoSQL, meta ? JSON.stringify(meta) : null, actor]
    );
    
    const row = result.rows[0];
    
    if (!row || !row.success) {
      const errorMsg = row?.message || 'Error al marcar asistencia';
      console.error('❌ Error en fn_marcar_asistencia:', errorMsg);
      return new Response(errorMsg, { status: 400 });
    }
    
    console.log(`✅ Asistencia actualizada: pauta_id=${pautaIdFinal}, estado=${estado} por ${actor}`);
    
    // Retornar respuesta exitosa sin contenido (204)
    return new Response(null, { status: 204 });
    
  } catch (error) {
    console.error('❌ Error en endpoint de asistencia:', error);
    return new Response('Error interno del servidor', { status: 500 });
  }
});