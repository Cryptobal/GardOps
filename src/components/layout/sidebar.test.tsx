import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Sidebar } from './sidebar'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/'),
}))

jest.mock('@/lib/flags.client', () => ({
  useFlag: jest.fn().mockReturnValue(true),
}))

describe('Sidebar - Pauta Diaria link', () => {
  it('apunta a /pauta-diaria (ado_v2 ON)', () => {
    const { useFlag } = require('@/lib/flags.client') as { useFlag: jest.Mock }
    useFlag.mockReturnValue(true)
    render(<Sidebar />)
    const link = screen.getByRole('link', { name: /Pauta Diaria/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href')
    expect(link.getAttribute('href') || '').toContain('/pauta-diaria')
    expect(link.getAttribute('href') || '').not.toContain('/legacy/pauta-diaria')
  })

  it('apunta a /pauta-diaria (ado_v2 OFF)', () => {
    const { useFlag } = require('@/lib/flags.client') as { useFlag: jest.Mock }
    useFlag.mockReturnValue(false)
    render(<Sidebar />)
    const link = screen.getByRole('link', { name: /Pauta Diaria/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href')
    expect(link.getAttribute('href') || '').toContain('/pauta-diaria')
    expect(link.getAttribute('href') || '').not.toContain('/legacy/pauta-diaria')
  })
})


