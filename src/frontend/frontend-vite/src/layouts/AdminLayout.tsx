import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Bell, LogOut, Edit, Settings, X } from 'lucide-react';
import { Icon } from '@iconify/react';
import { useAuthStore, useThemeStore } from '../store/useStore';
import { cn } from '../utils/cn';
import { getUnreadNotificationCount } from '../api/notification';
import request from '../utils/request';

const AdminLayout = () => {
  const { userInfo, logout } = useAuthStore();
  const { setTheme } = useThemeStore();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });
  const [announcementError, setAnnouncementError] = useState('');
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await getUnreadNotificationCount();
        setUnreadCount(res.count || 0);
      } catch (error) {
        // 接口不存在或请求失败时，默认不显示红点
        console.error('获取未读消息数量失败:', error);
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();
  }, []);

  useEffect(() => {
    setTheme('admin');
    // Apply theme class to body for global variable access if needed, 
    // but preferably we wrap the layout.
    document.body.className = 'theme-admin bg-slate-50';
    return () => {
      document.body.className = '';
    };
  }, [setTheme]);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const handlePublishAnnouncement = async () => {
    setAnnouncementError('');
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
      setAnnouncementError('标题和内容均为必填');
      return;
    }
    setSubmittingAnnouncement(true);
    try {
      await request.post('/api/v1/announcement/update', {
        title: announcementForm.title,
        content: announcementForm.content,
      });
      setShowAnnouncementModal(false);
      setAnnouncementForm({ title: '', content: '' });
      alert('公告发布成功！');
    } catch (e: any) {
      const errorMsg = e?.message || '发布失败，请重试';
      setAnnouncementError(errorMsg);
      console.error('发布公告失败:', e);
    } finally {
      setSubmittingAnnouncement(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen overflow-hidden font-sans text-slate-600">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col items-stretch shrink-0 z-20">
        <div className="h-16 flex items-center px-6 space-x-2 border-b">
          <Icon icon="solar:shield-user-bold" className="text-3xl text-[#F5A623]" />
          <span className="text-xl font-bold tracking-tight text-slate-800">MediVision AI</span>
        </div>
        
        <div className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-400 px-2 mb-2 uppercase tracking-widest">系统管理</div>
          
          <Link 
            to="/admin" 
            className={cn(
              "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all",
              isActive('/admin') 
                ? "bg-[#F5A623]/10 text-[#F5A623]" 
                : "text-slate-600 hover:bg-[#F5A623]/5 hover:text-[#F5A623]"
            )}
          >
            <Icon icon="solar:users-group-rounded-bold" className="text-xl" />
            <span className="font-bold">用户管理</span>
          </Link>

          <Link 
            to="/admin/models" 
            className={cn(
              "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all",
              isActive('/admin/models') 
                ? "bg-[#F5A623]/10 text-[#F5A623]" 
                : "text-slate-600 hover:bg-[#F5A623]/5 hover:text-[#F5A623]"
            )}
          >
            <Icon icon="solar:box-bold" className="text-xl" />
            <span className="font-bold">模型管理</span>
          </Link>

          <Link 
            to="/admin/settings" 
            className={cn(
              "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all",
              isActive('/admin/settings') 
                ? "bg-[#F5A623]/10 text-[#F5A623]" 
                : "text-slate-600 hover:bg-[#F5A623]/5 hover:text-[#F5A623]"
            )}
          >
            <Icon icon="solar:tuning-2-bold" className="text-xl" />
            <span className="font-bold">系统参数设置</span>
          </Link>

          <div className="text-[10px] font-bold text-slate-400 px-2 mb-2 mt-6 uppercase tracking-widest">监控审计</div>
          
          <Link 
            to="/admin/logs" 
            className={cn(
              "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all",
              isActive('/admin/logs') 
                ? "bg-[#F5A623]/10 text-[#F5A623]" 
                : "text-slate-600 hover:bg-[#F5A623]/5 hover:text-[#F5A623]"
            )}
          >
            <Icon icon="solar:document-text-bold" className="text-xl" />
            <span className="font-bold">系统运行日志</span>
          </Link>

          <Link 
            to="/admin/audit" 
            className={cn(
              "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all",
              isActive('/admin/audit') 
                ? "bg-[#F5A623]/10 text-[#F5A623]" 
                : "text-slate-600 hover:bg-[#F5A623]/5 hover:text-[#F5A623]"
            )}
          >
            <Icon icon="solar:eye-bold" className="text-xl" />
            <span className="font-bold">敏感操作审计</span>
          </Link>
        </div>

        {/* User Profile */}
        <div className="p-4 bg-gradient-to-br from-slate-50 to-orange-50/30 border-t">
          <div className="flex items-center space-x-3 mb-3 px-2">
            <img
              alt="Admin profile"
              className="w-10 h-10 rounded-full border-2 border-[#F5A623] shadow-sm object-cover"
              src={userInfo?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo?.name || userInfo?.username || 'A')}&background=F5A623&color=fff`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-700">{userInfo?.name || userInfo?.username || ''}</p>
              <p className="text-xs text-[#F5A623]">系统管理员</p>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => setShowPasswordModal(true)} className="text-slate-400 hover:text-orange-500 transition-colors" title="修改密码">
                <Settings className="w-4 h-4" />
              </button>
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors" title="退出登录">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-3 px-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-sm"></div>
            <span className="text-xs text-slate-500">在线</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#f7f5fb]">
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-bold text-slate-800">
              {isActive('/admin') && '用户管理'}
              {isActive('/admin/models') && '模型管理'}
              {isActive('/admin/settings') && '系统参数设置'}
              {isActive('/admin/logs') && '系统运行日志'}
              {isActive('/admin/audit') && '敏感操作审计'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                setShowAnnouncementModal(true);
                setAnnouncementError('');
                setAnnouncementForm({ title: '', content: '' });
              }}
              className="flex items-center space-x-2 bg-[#F5A623] hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>编辑公告</span>
            </button>
            <div className="relative cursor-pointer group">
              <Bell className="w-6 h-6 text-slate-400 group-hover:text-orange-500 transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAnnouncementModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-800">编辑公告</h3>
              <button onClick={() => setShowAnnouncementModal(false)} className="text-slate-400 hover:text-slate-600">
                <Icon icon="solar:close-circle-bold" className="text-2xl" />
              </button>
            </div>

            {announcementError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {announcementError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">公告标题</label>
                <input
                  type="text"
                  value={announcementForm.title}
                  onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                  placeholder="请输入公告标题"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">公告内容</label>
                <textarea
                  value={announcementForm.content}
                  onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 min-h-[200px]"
                  placeholder="请输入公告内容"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="px-6 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handlePublishAnnouncement}
                disabled={submittingAnnouncement}
                className="px-6 py-2 bg-[#F5A623] hover:bg-orange-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingAnnouncement ? '发布中...' : '发布'}
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
            <Settings className="mr-3 text-orange-600" size={28} />
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
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="请输入旧密码"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">新密码</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="9-20位，必须包含字母和数字"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
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
            className="px-6 py-2 bg-[#F5A623] hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          >
            {loading ? '提交中...' : '确认修改'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
