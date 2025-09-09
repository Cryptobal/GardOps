import { getFlags } from './flags';

describe('getFlags', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch as any;
  });

  it('retorna flags desde /api/flags', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ flags: { test: true } }),
    });

    const flags = await getFlags();
    expect(flags).toEqual({ test: true });
  });

  it('maneja error devolviendo {}', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('net'));
    const flags = await getFlags();
    expect(flags).toEqual({});
  });
});


