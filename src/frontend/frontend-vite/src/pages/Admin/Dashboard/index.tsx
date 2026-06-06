import { useState, useEffect } from 'react';
import { UserPlus, Search, X } from 'lucide-react';
import request from '../../../utils/request';

interface UserDto {
  id: number;
  username: string;
  role: string;
  status: string;
  createdTime: string;
}

const roleLabel: Record<string, string> = {
  admin: '管理员',
  doctor: '医生',
  tech: '科研人员',
};

const roleColor: Record<string, string> = {
  admin: 'bg-orange-100 text-orange-700',
  doctor: 'bg-blue-100 text-blue-700',
  tech: 'bg-purple-100 text-purple-700',
};

const INIT_FORM = { username: '', password: '', job_number: '', role: 'doctor' };

const AdminDashboard = () => {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INIT_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await request.get('/api/v1/account/get') as any;
      console.log('用户数据:', res.users); // 调试：查看实际返回的数据
      setUsers(res.users || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const padId = (id: number) => String(id).padStart(6, '0');

  const handleBanToggle = async (user: UserDto) => {
    const action = user.status === 'ACTIVE' ? 'ban' : 'unban';
    setActionError('');
    try {
      await request.post(`/api/v1/account/${padId(user.id)}/${action}`, {});
      fetchUsers();
    } catch (e: any) {
      setActionError(e?.message || `${action === 'ban' ? '禁用' : '启用'}失败，请重试`);
    }
  };

  const handleDelete = async (user: UserDto) => {
    if (!window.confirm(`确认删除账号 ${user.username}？`)) return;
    setActionError('');
    try {
      await request.post(`/api/v1/account/${padId(user.id)}/delete`, {});
      fetchUsers();
    } catch (e: any) {
      setActionError(e?.message || '删除失败，请重试');
    }
  };
  const handleCreate = async () => {
    setFormError('');
    if (!form.username || !form.password || !form.job_number) {
      setFormError('所有字段均为必填');
      return;
    }
    if (!/^\d{6}$/.test(form.job_number)) {
      setFormError('工号必须为6位数字');
      return;
    }
    if (form.password.length < 9 || form.password.length > 20 || !/(?=.*[A-Za-z])(?=.*\d)/.test(form.password)) {
      setFormError('密码需9-20位，且同时包含字母和数字');
      return;
    }
    setSubmitting(true);
    try {
      await request.post('/api/v1/account/create', {
        username: form.username,
        password: form.password,
        job_number: form.job_number,
        role: form.role,
      });
      setShowModal(false);
      setForm(INIT_FORM);
      fetchUsers();
    } catch (e: any) {
      setFormError(e?.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (roleLabel[u.role] || u.role).includes(search)
  );

  const total = users.length;
  const banned = users.filter(u => u.status === 'BANNED').length;

  return (
    <div className="space-y-8">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-orange-100 shadow-sm">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">总用户数</p>
          <span className="text-3xl font-bold font-mono text-slate-800">{total}</span>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">禁用账号</p>
          <span className="text-3xl font-bold font-mono text-red-600">{banned}</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="pl-9 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            placeholder="搜索用户名或角色…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => { setShowModal(true); setFormError(''); setForm(INIT_FORM); }}
          className="flex items-center space-x-2 bg-[#F5A623] hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>添加账号</span>
        </button>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-xl">{actionError}</div>
      )}

      {/* User Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-base font-bold text-slate-400 uppercase">用户名</th>
              <th className="px-6 py-3 text-left text-base font-bold text-slate-400 uppercase">角色</th>
              <th className="px-6 py-3 text-left text-base font-bold text-slate-400 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-base font-bold text-slate-400 uppercase">创建时间</th>
              <th className="px-6 py-3 text-left text-base font-bold text-slate-400 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">加载中…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">暂无用户</td></tr>
            ) : filtered.map(user => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800 text-lg">{user.username}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-sm font-bold ${roleColor[user.role] || 'bg-slate-100 text-slate-600'}`}>
                    {roleLabel[user.role] || user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {user.status === 'ACTIVE'
                    ? <span className="flex items-center text-green-600 text-base"><div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>正常</span>
                    : <span className="flex items-center text-red-600 text-base"><div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>已禁用</span>}
                </td>
                <td className="px-6 py-4 text-base text-slate-500">
                  {user.createdTime ? user.createdTime.slice(0, 19).replace('T', ' ') : '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex space-x-3">
                    <button onClick={() => handleBanToggle(user)} className={`text-base hover:underline ${user.status === 'ACTIVE' ? 'text-orange-600' : 'text-green-600'}`}>
                      {user.status === 'ACTIVE' ? '禁用' : '启用'}
                    </button>
                    {user.role !== 'admin' && (
                      <button onClick={() => handleDelete(user)} className="text-base text-red-600 hover:underline">删除</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Account Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold text-slate-800 mb-6">添加账号</h3>
            <div className="space-y-4">
            <div>
              <label className="block text-base font-medium text-slate-500 mb-1">用户名</label>
              <input className="w-full border rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-orange-300" value={form.username} onChange={e => setForm(f => ({...f, username: e.target.value}))} placeholder="1-20个字符" />
            </div>
            <div>
              <label className="block text-base font-medium text-slate-500 mb-1">密码</label>
              <input type="password" className="w-full border rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-orange-300" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} placeholder="9-20位，含字母和数字" />
            </div>
            <div>
              <label className="block text-base font-medium text-slate-500 mb-1">工号（6位数字）</label>
              <input className="w-full border rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-orange-300" value={form.job_number} onChange={e => setForm(f => ({...f, job_number: e.target.value}))} placeholder="000001" />
            </div>
            <div>
              <label className="block text-base font-medium text-slate-500 mb-1">角色</label>
              <select className="w-full border rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-orange-300" value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
                <option value="doctor">医生</option>
                <option value="tech">科研人员</option>
                <option value="admin">管理员</option>
              </select>
            </div>
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <button onClick={handleCreate} disabled={submitting} className="w-full bg-[#F5A623] hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50">
                {submitting ? '创建中…' : '创建账号'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
