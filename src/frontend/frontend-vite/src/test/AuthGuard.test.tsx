import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard } from '@/components/auth/AuthGuard'

vi.mock('@/store/useStore', () => ({
  useAuthStore: vi.fn(),
}))

import { useAuthStore } from '@/store/useStore'
const mockStore = useAuthStore as unknown as ReturnType<typeof vi.fn>

const renderWithRouter = (ui: React.ReactNode, initialPath = '/protected') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/admin" element={<div>Admin Page</div>} />
        <Route path="/doctor" element={<div>Doctor Page</div>} />
        <Route path="/researcher" element={<div>Researcher Page</div>} />
        <Route path="/protected" element={ui} />
      </Routes>
    </MemoryRouter>
  )

describe('AuthGuard', () => {
  it('redirects to /login when no token', () => {
    mockStore.mockReturnValue({ token: null, role: null })
    renderWithRouter(
      <AuthGuard allowedRoles={['admin']}>
        <div>Protected Content</div>
      </AuthGuard>
    )
    expect(screen.queryByText('Protected Content')).toBeNull()
    expect(screen.getByText('Login Page')).toBeDefined()
  })

  it('renders children when token and role match', () => {
    mockStore.mockReturnValue({ token: 'abc', role: 'admin' })
    renderWithRouter(
      <AuthGuard allowedRoles={['admin']}>
        <div>Protected Content</div>
      </AuthGuard>
    )
    expect(screen.getByText('Protected Content')).toBeDefined()
  })

  it('redirects to role dashboard when role does not match', () => {
    mockStore.mockReturnValue({ token: 'abc', role: 'doctor' })
    renderWithRouter(
      <AuthGuard allowedRoles={['admin']}>
        <div>Protected Content</div>
      </AuthGuard>
    )
    expect(screen.queryByText('Protected Content')).toBeNull()
    expect(screen.getByText('Doctor Page')).toBeDefined()
  })
})
