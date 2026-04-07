import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginPage from '../app/(auth)/login/page'

vi.mock('@/lib/auth-client', () => ({
  signIn: {
    magicLink: vi.fn(),
  },
}))

describe('LoginPage', () => {
  it('renders the login form', () => {
    render(<LoginPage />)
    expect(screen.getAllByText(/Control Center/i).length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
  })
})
