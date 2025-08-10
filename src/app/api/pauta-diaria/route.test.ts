import { GET } from './route';

// Mock del pool de base de datos
const queryMock = jest.fn();

jest.mock('@/lib/database', () => ({
  __esModule: true,
  default: { query: (...args: any[]) => queryMock(...args) },
}));

describe('GET /api/pauta-diaria', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('400 cuando falta fecha', async () => {
    const req = new Request('http://localhost/api/pauta-diaria');
    const res = await GET(req as any);
    expect(res.status).toBe(400);
  });

  it('200 con arreglo vacío si no hay filas', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const req = new Request('http://localhost/api/pauta-diaria?fecha=2025-08-05');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ data: [] });
  });
});


