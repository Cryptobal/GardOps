import { redirect } from 'next/navigation'

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

jest.mock('@/lib/flags', () => ({
  isFlagEnabled: jest.fn(),
}))

describe('/pauta-diaria redirect', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('redirige a /pauta-diaria-v2 cuando ado_v2 es true', async () => {
    const { isFlagEnabled } = await import('@/lib/flags') as any
    ;(isFlagEnabled as jest.Mock).mockResolvedValue(true)
    const mod = await import('./page')
    await mod.default()
    expect(redirect).toHaveBeenCalledWith('/pauta-diaria-v2')
  })

  it('redirige a /legacy/pauta-diaria cuando ado_v2 es false', async () => {
    const { isFlagEnabled } = await import('@/lib/flags') as any
    ;(isFlagEnabled as jest.Mock).mockResolvedValue(false)
    const mod = await import('./page')
    await mod.default()
    expect(redirect).toHaveBeenCalledWith('/legacy/pauta-diaria')
  })
})


