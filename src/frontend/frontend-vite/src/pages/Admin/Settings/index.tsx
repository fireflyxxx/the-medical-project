import { useState } from 'react';
import { Icon } from '@iconify/react';

const AdminSettings = () => {
  const [form, setForm] = useState({
    confidenceThreshold: '0.85',
    highRiskThreshold: '0.75',
    maxConcurrent: '50',
    sessionTimeout: '30',
    imageDays: '365',
    logDays: '90',
    notifyHighRisk: true,
    notifySystemError: true,
    notifyDailyReport: false,
  });

  const handleChange = (key: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setForm({
      confidenceThreshold: '0.85',
      highRiskThreshold: '0.75',
      maxConcurrent: '50',
      sessionTimeout: '30',
      imageDays: '365',
      logDays: '90',
      notifyHighRisk: true,
      notifySystemError: true,
      notifyDailyReport: false,
    });
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6">
        <h3 className="font-bold text-lg flex items-center mb-6">
          <Icon icon="solar:tuning-2-bold" className="mr-2 text-[#F5A623] text-xl" />
          系统参数配置
        </h3>

        <div className="space-y-6">

          {/* AI模型参数 */}
          <div className="border-b pb-6">
            <h4 className="font-bold text-slate-700 mb-4">AI模型参数</h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-slate-600 mb-2 block">置信度阈值</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.confidenceThreshold}
                  onChange={e => handleChange('confidenceThreshold', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 text-sm outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">低于此值的预测将标记为“需复核”</p>
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-2 block">高风险阈值</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.highRiskThreshold}
                  onChange={e => handleChange('highRiskThreshold', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 text-sm outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">高于此值将触发高风险预警</p>
              </div>
            </div>
          </div>

          {/* 系统运行参数 */}
          <div className="border-b pb-6">
            <h4 className="font-bold text-slate-700 mb-4">系统运行参数</h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-slate-600 mb-2 block">最大并发处理数</label>
                <input
                  type="number"
                  value={form.maxConcurrent}
                  onChange={e => handleChange('maxConcurrent', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 text-sm outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">同时处理的最大影像数量</p>
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-2 block">会话超时时间 (分钟)</label>
                <input
                  type="number"
                  value={form.sessionTimeout}
                  onChange={e => handleChange('sessionTimeout', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 text-sm outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">用户无操作自动登出时间</p>
              </div>
            </div>
          </div>

          {/* 数据存储参数 */}
          <div className="border-b pb-6">
            <h4 className="font-bold text-slate-700 mb-4">数据存储参数</h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-slate-600 mb-2 block">影像保存期限 (天)</label>
                <input
                  type="number"
                  value={form.imageDays}
                  onChange={e => handleChange('imageDays', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 text-sm outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">超期影像将自动归档</p>
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-2 block">日志保存期限 (天)</label>
                <input
                  type="number"
                  value={form.logDays}
                  onChange={e => handleChange('logDays', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 text-sm outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">超期日志将自动清理</p>
              </div>
            </div>
          </div>

          {/* 通知设置 */}
          <div>
            <h4 className="font-bold text-slate-700 mb-4">通知设置</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={form.notifyHighRisk}
                  onChange={e => handleChange('notifyHighRisk', e.target.checked)}
                  className="w-4 h-4 text-orange-500"
                />
                <span className="text-sm text-slate-600">启用高风险病例实时通知</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={form.notifySystemError}
                  onChange={e => handleChange('notifySystemError', e.target.checked)}
                  className="w-4 h-4 text-orange-500"
                />
                <span className="text-sm text-slate-600">启用系统异常邮件通知</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={form.notifyDailyReport}
                  onChange={e => handleChange('notifyDailyReport', e.target.checked)}
                  className="w-4 h-4 text-orange-500"
                />
                <span className="text-sm text-slate-600">启用每日统计报告推送</span>
              </label>
            </div>
          </div>

        </div>

        <div className="flex space-x-3 mt-8">
          <button
            onClick={() => {}}
            className="bg-[#F5A623] hover:bg-[#d89420] text-white px-6 py-2 rounded-lg text-sm font-bold transition-all"
          >
            保存配置
          </button>
          <button
            onClick={handleReset}
            className="bg-slate-100 text-slate-600 px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-all"
          >
            重置为默认
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
