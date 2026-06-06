import { create } from 'zustand';

interface UserInfo {
  id?: string;
  username: string;
  name?: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  token: string | null;
  userInfo: UserInfo | null;
  login: (token: string, userInfo: UserInfo) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? sessionStorage.getItem('token') : null,
  userInfo: typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('userInfo') || 'null') : null,

  login: (token, userInfo) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
    }
    set({ token, userInfo });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('userInfo');
    }
    set({ token: null, userInfo: null });
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
