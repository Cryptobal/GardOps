import { NextRequest } from 'next/server';
import { withPermission } from '@/app/api/_middleware/withPermission';

export const POST = withPermission('turnos.marcar_asistencia', async (_req: NextRequest) => {
  // TODO: lógica real en Fase 2 (ADO)
  return new Response(null, { status: 204 });
});


