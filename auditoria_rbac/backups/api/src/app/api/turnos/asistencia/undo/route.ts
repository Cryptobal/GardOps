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
    
    const { pautaId, pauta_id } = body;
    
    // Normalizar pauta_id
    const pautaIdFinal = pautaId || pauta_id;
    
    if (!pautaIdFinal) {
      return new Response('pauta_id es requerido', { status: 400 });
    }
    
    // Obtener actor (usuario actual)
    const actor = await getCurrentUserRef();
    if (!actor) {
      return new Response('No se pudo identificar al usuario', { status: 401 });
    }
    
    // Llamar a la función SQL con estado 'deshacer'
    const result = await query(
      `SELECT * FROM as_turnos.fn_marcar_asistencia($1::bigint, $2::text, $3::jsonb, $4::text)`,
      [pautaIdFinal, 'deshacer', null, actor]
    );
    
    const row = result.rows[0];
    
    if (!row || !row.success) {
      const errorMsg = row?.message || 'Error al deshacer asistencia';
      console.error('❌ Error en fn_marcar_asistencia (undo):', errorMsg);
      return new Response(errorMsg, { status: 400 });
    }
    
    console.log(`✅ Asistencia deshecha: pauta_id=${pautaIdFinal} por ${actor}`);
    
    // Retornar respuesta exitosa sin contenido (204)
    return new Response(null, { status: 204 });
    
  } catch (error) {
    console.error('❌ Error en endpoint undo:', error);
    return new Response('Error interno del servidor', { status: 500 });
  }
});