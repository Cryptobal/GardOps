import React from 'react'
import { renderToString } from 'react-dom/server'

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

jest.mock('@/lib/flags', () => ({
  isFlagEnabled: jest.fn(),
}))

describe('PautaDiariaV2Page', () => {
  const { redirect } = jest.requireMock('next/navigation') as { redirect: jest.Mock }
  const { isFlagEnabled } = jest.requireMock('@/lib/flags') as { isFlagEnabled: jest.Mock }

  beforeEach(() => {
    redirect.mockReset()
    isFlagEnabled.mockReset()
  })

  it('redirige a /legacy/pauta-diaria cuando ado_v2=false', async () => {
    isFlagEnabled.mockResolvedValue(false)
    const mod = await import('./page')
    await mod.default()
    expect(redirect).toHaveBeenCalledWith('/legacy/pauta-diaria')
  })

  it('renderiza título cuando ado_v2=true', async () => {
    isFlagEnabled.mockResolvedValue(true)
    const mod = await import('./page')
    const element = await mod.default()
    const html = renderToString(element as React.ReactElement)
    expect(redirect).not.toHaveBeenCalled()
    expect(html).toContain('Pauta Diaria v2 (beta)')
  })
})


