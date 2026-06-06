import { useEffect, useState } from 'react';
import { Outlet, Link, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Bell, LogOut, X, Settings } from 'lucide-react';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { cn } from '../utils/cn';
import request from '../utils/request';

interface Announcement {
  title: string;
  content: string;
  updatedTime: string;
}

const ResearcherLayout = () => {
  const { userInfo, logout } = useAuthStore();
  const { setTheme } = useThemeStore();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loadingAnnouncement, setLoadingAnnouncement] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    setTheme('tech');
    document.body.style.backgroundColor = '#f7f5fb';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [setTheme]);

  // 自动获取并显示公告
  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const res = await request.get('/api/v1/announcement/latest') as any;
        if (res && res.content) {
          setAnnouncement(res);
          setShowAnnouncementModal(true);
        }
      } catch (error) {
        console.error('获取公告失败:', error);
      }
    };

    fetchAnnouncement();
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const handleBellClick = async () => {
    setShowAnnouncementModal(true);
    setLoadingAnnouncement(true);
    try {
      const res = await request.get('/api/v1/announcement/latest') as any;
      if (res) {
        setAnnouncement(res);
      }
    } catch (error) {
      console.error('获取公告失败:', error);
      setAnnouncement(null);
    } finally {
      setLoadingAnnouncement(false);
    }
  };

  const basicItems = [
    { tab: 'overview', icon: 'solar:chart-2-bold', label: '统计报表' },
    { tab: 'datasets', icon: 'solar:clipboard-list-bold', label: '影像数据审查' },
  ];
  const modelItems = [
    { tab: 'models', icon: 'solar:box-bold', label: '模型库' },
    { tab: 'config', icon: 'solar:settings-minimalistic-bold', label: 'AI模型配置' },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#f7f5fb' }}>
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col items-stretch shrink-0">
        <div className="h-16 flex items-center px-6 space-x-2 border-b">
          <Icon icon="solar:atom-bold" className="text-3xl" style={{ color: '#722ED1' }} />
          <span className="text-xl font-bold tracking-tight">MediVision AI</span>
        </div>

        <div className="flex-1 p-4 space-y-2 mt-4">
          <div className="text-[10px] font-bold text-slate-400 px-2 mb-2 uppercase tracking-widest">基础工作区</div>
          {basicItems.map(item => (
            <Link
              key={item.tab}
              to={`/tech?tab=${item.tab}`}
              className={cn(
                'flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all text-slate-600',
                tab === item.tab
                  ? 'bg-purple-50 text-[#722ED1]'
                  : 'hover:bg-purple-50 hover:text-[#722ED1]'
              )}
            >
              <Icon icon={item.icon} className="text-xl" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
          <div className="text-[10px] font-bold text-slate-400 px-2 mt-4 mb-2 uppercase tracking-widest">模型管理</div>
          {modelItems.map(item => (
            <Link
              key={item.tab}
              to={`/tech?tab=${item.tab}`}
              className={cn(
                'flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all text-slate-600',
                tab === item.tab
                  ? 'bg-purple-50 text-[#722ED1]'
                  : 'hover:bg-purple-50 hover:text-[#722ED1]'
              )}
            >
              <Icon icon={item.icon} className="text-xl" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* User Info */}
        <div className="p-4 border-t" style={{ background: 'linear-gradient(to bottom right, #f8fafc, rgba(245,243,255,0.3))' }}>
          <div className="flex items-center space-x-3 mb-3 px-2">
            <div className="w-10 h-10 rounded-full border-2 border-[#722ED1] shadow-sm bg-purple-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-[#722ED1]">
                {userInfo?.name?.charAt(0) || '李'}
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">{userInfo?.name || userInfo?.username || ''}</p>
              <p className="text-xs text-[#722ED1]">AI研究员</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs text-slate-500">在线</span>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => setShowPasswordModal(true)} className="text-slate-400 hover:text-purple-500 transition-colors" title="修改密码">
                <Settings className="w-4 h-4" />
              </button>
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors" title="退出登录">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-bold text-slate-800">当前部署模型</h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative cursor-pointer group" onClick={handleBellClick}>
              <Bell className="w-6 h-6 text-slate-400 group-hover:text-purple-500 transition-colors" />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAnnouncementModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-800">系统公告</h3>
              <button onClick={() => setShowAnnouncementModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {loadingAnnouncement ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
                <p className="mt-4 text-slate-500">加载中...</p>
              </div>
            ) : announcement ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xl font-bold text-slate-800 mb-2">{announcement.title}</h4>
                  <p className="text-sm text-slate-400">发布时间: {announcement.updatedTime}</p>
                </div>
                <div className="border-t pt-4">
                  <p className="text-base text-slate-700 leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Icon icon="solar:inbox-line-bold" className="text-6xl text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">暂无公告</p>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="px-6 py-2 bg-[#722ED1] hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
};

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validatePassword = (password: string) => {
    if (password.length < 9 || password.length > 20) {
      return '密码长度必须为9-20位';
    }
    if (!/[a-zA-Z]/.test(password)) {
      return '密码必须包含字母';
    }
    if (!/[0-9]/.test(password)) {
      return '密码必须包含数字';
    }
    return '';
  };

  const handleSubmit = async () => {
    setError('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('请填写所有字段');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await request.post('/api/v1/account/change_password', {
        old_password: oldPassword,
        new_password: newPassword
      });
      alert('密码修改成功，请重新登录');
      onClose();
      // 清除token并跳转到登录页
      localStorage.removeItem('token');
      window.location.href = '/login';
    } catch (err: any) {
      setError(err.response?.data?.message || '修改密码失败，请检查旧密码是否正确');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-slate-800 flex items-center">
            <Settings className="mr-3 text-purple-600" size={28} />
            修改密码
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">旧密码</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="请输入旧密码"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">新密码</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="9-20位，必须包含字母和数字"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="请再次输入新密码"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              密码要求：9-20位，必须同时包含字母和数字
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-[#722ED1] hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          >
            {loading ? '提交中...' : '确认修改'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResearcherLayout;
