/** @jest-environment node */
import { fetchCan } from './can';

describe('fetchCan', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn();
  });

  it('retorna true cuando el endpoint responde 204', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    const ok = await fetchCan('perm.x');
    expect(ok).toBe(true);
  });

  it('retorna false cuando el endpoint responde 403', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    const ok = await fetchCan('perm.y');
    expect(ok).toBe(false);
  });
});


