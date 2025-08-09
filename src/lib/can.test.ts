/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { useCan } from './can';

describe('useCan', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn();
  });

  it('retorna true cuando el endpoint responde 204', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => useCan('perm.x'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(true);
  });

  it('retorna false cuando el endpoint responde 403', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    const { result } = renderHook(() => useCan('perm.y'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(false);
  });
});


