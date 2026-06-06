import { create } from 'zustand';

interface UserState {
  token: string | null;
  role: 'admin' | 'doctor' | 'tech' | null;
  userInfo: any | null;
  login: (token: string, role: 'admin' | 'doctor' | 'tech', userInfo: any) => void;
  logout: () => void;
}

export const useAuthStore = create<UserState>((set) => ({
  token: sessionStorage.getItem('token'),
  role: (sessionStorage.getItem('role') as 'admin' | 'doctor' | 'tech') || null,
  userInfo: JSON.parse(sessionStorage.getItem('userInfo') || 'null'),

  login: (token, role, userInfo) => {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('role', role);
    sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
    set({ token, role, userInfo });
  },

  logout: () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('userInfo');
    set({ token: null, role: null, userInfo: null });
  },
}));

interface ThemeState {
  theme: 'default' | 'admin' | 'doctor' | 'tech';
  setTheme: (theme: 'default' | 'admin' | 'doctor' | 'tech') => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'default',
  setTheme: (theme) => set({ theme }),
}));
