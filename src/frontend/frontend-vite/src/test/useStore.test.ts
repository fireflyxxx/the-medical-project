import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore, useThemeStore } from '@/store/useStore'

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, role: null, userInfo: null })
    localStorage.clear()
  })

  it('initial state has null token and role', () => {
    const { token, role } = useAuthStore.getState()
    expect(token).toBeNull()
    expect(role).toBeNull()
  })

  it('login sets token, role, userInfo and persists to localStorage', () => {
    const { login } = useAuthStore.getState()
    login('tok123', 'doctor', { name: '李医生' })
    const state = useAuthStore.getState()
    expect(state.token).toBe('tok123')
    expect(state.role).toBe('doctor')
    expect(state.userInfo).toEqual({ name: '李医生' })
    expect(localStorage.getItem('token')).toBe('tok123')
    expect(localStorage.getItem('role')).toBe('doctor')
  })

  it('logout clears token, role, userInfo and localStorage', () => {
    const { login, logout } = useAuthStore.getState()
    login('tok123', 'admin', { name: '张伟' })
    logout()
    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.role).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })
})

describe('useThemeStore', () => {
  it('default theme is "default"', () => {
    expect(useThemeStore.getState().theme).toBe('default')
  })

  it('setTheme updates the theme', () => {
    useThemeStore.getState().setTheme('admin')
    expect(useThemeStore.getState().theme).toBe('admin')
  })
})
