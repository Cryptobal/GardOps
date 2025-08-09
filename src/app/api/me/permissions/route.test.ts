import { GET } from './route';

const userHasMock = jest.fn();

jest.mock('@/lib/auth', () => ({
  userHas: (...args: any[]) => userHasMock(...args),
}));

describe('GET /api/me/permissions', () => {
  beforeEach(() => {
    userHasMock.mockReset();
  });

  it('400 si falta perm', async () => {
    const req = new Request('http://localhost/api/me/permissions');
    const res = await GET(req as any);
    expect(res.status).toBe(400);
  });

  it('204 si userHas devuelve true', async () => {
    userHasMock.mockResolvedValueOnce(true);
    const req = new Request('http://localhost/api/me/permissions?perm=x');
    const res = await GET(req as any);
    expect(res.status).toBe(204);
  });

  it('403 si userHas devuelve false', async () => {
    userHasMock.mockResolvedValueOnce(false);
    const req = new Request('http://localhost/api/me/permissions?perm=x');
    const res = await GET(req as any);
    expect(res.status).toBe(403);
  });
});


