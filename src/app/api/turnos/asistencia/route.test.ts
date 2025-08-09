import { POST } from './route';

const requirePermissionMock = jest.fn();

jest.mock('@/lib/auth', () => ({
  requirePermission: (...args: any[]) => requirePermissionMock(...args),
}));

describe('POST /api/turnos/asistencia', () => {
  beforeEach(() => {
    requirePermissionMock.mockReset();
  });

  it('devuelve 204 cuando tiene permiso', async () => {
    requirePermissionMock.mockResolvedValueOnce(undefined);
    const req = new Request('http://localhost/api/turnos/asistencia', { method: 'POST' });
    const res = await POST(req as any);
    expect(res.status).toBe(204);
  });

  it('devuelve 403 cuando NO tiene permiso', async () => {
    requirePermissionMock.mockRejectedValueOnce(new Error('FORBIDDEN'));
    const req = new Request('http://localhost/api/turnos/asistencia', { method: 'POST' });
    const res = await POST(req as any);
    expect(res.status).toBe(403);
  });
});


