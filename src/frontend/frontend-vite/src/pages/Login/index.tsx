import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Atom, User, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/useStore';
import styles from './Login.module.css';
import { cn } from '../../utils/cn';
import request from '../../utils/request';

type Role = 'admin' | 'doctor' | 'tech';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username || !password) return;

    setIsLoading(true);
    try {
      const res = await request.post<{ token: string; role: Role }>('/api/v1/account/login', {
        username: username,
        password,
      }) as unknown as { token: string; role: Role };

      const token: string = res.token;
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const returnedRole: Role = payload.role as Role;

      login(token, returnedRole, { name: username, role: returnedRole });

      if (returnedRole === 'doctor') {
        // token 已经通过 login() 存入 sessionStorage
        // 生产环境下同域部署，Next.js 可以从同一个 sessionStorage 读取
        window.location.href = '/doctor';
      } else if (returnedRole === 'admin') {
        navigate('/admin');
      } else if (returnedRole === 'tech') {
        navigate('/tech');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || '登录失败，请检查用户名和密码');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("min-h-screen flex items-center justify-center p-4 overflow-hidden font-sans", styles.gradientBg)}>
      {/* Floating Shapes */}
      <div className={cn(styles.floatingShape, styles.shape1)}></div>
      <div className={cn(styles.floatingShape, styles.shape2)}></div>
      <div className={cn(styles.floatingShape, styles.shape3)}></div>

      {/* Login Card */}
      <div className={cn("rounded-3xl shadow-2xl w-full max-w-md p-8 relative z-10", styles.glassEffect)}>
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" 
            style={{ background: 'linear-gradient(135deg, #8FA5B8 0%, #7B9EA8 100%)' }}
          >
            <Atom className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-[#4A4A48]">MediVision AI</h1>
          <p className="text-sm text-[#8B8580]">医疗影像AI分析平台</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[#4A4A48]">用户名</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4A48] w-5 h-5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={cn(
                  styles.inputFocus,
                  "w-full pl-11 pr-4 py-3 rounded-xl text-sm transition-all bg-white"
                )}
                style={{ border: '1.5px solid #C5D5DB', color: '#4A4A48' }}
                placeholder="请输入用户名"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[#4A4A48]">密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4A48] w-5 h-5" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  styles.inputFocus,
                  "w-full pl-11 pr-12 py-3 rounded-xl text-sm transition-all bg-white"
                )}
                style={{ border: '1.5px solid #C5D5DB', color: '#4A4A48' }}
                placeholder="请输入密码"
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors text-[#8B8580] hover:text-[#4A4A48]"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded cursor-pointer" 
                style={{ accentColor: '#7B9EA8' }} 
              />
              <span className="ml-2 text-[#8B8580]">记住我</span>
            </label>
            <a href="#" className="font-medium transition-colors text-[#8FA5B8] hover:text-[#7B9EA8]">忘记密码？</a>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <p className="text-sm text-red-500 text-center">{errorMsg}</p>
          )}

          {/* Login Button */}
          <div className="px-4">
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                styles.loginBtn,
                "w-full text-white font-semibold py-3 rounded-xl shadow-lg flex justify-center items-center"
              )}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  登录中...
                </>
              ) : '登录'}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-6 pt-6 border-t border-[#D8E3E7]">
          <p className="text-xs text-[#8B8580]">
            登录即表示您同意我们的
            <a href="#" className="transition-colors text-[#8FA5B8] mx-1 hover:underline">服务条款</a>
            和
            <a href="#" className="transition-colors text-[#8FA5B8] mx-1 hover:underline">隐私政策</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
