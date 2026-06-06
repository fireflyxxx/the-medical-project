import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import request from '../../../utils/request';

const POLL_INTERVAL = 30000;

interface ModelItem {
  id: number;
  modelName: string;
  modelVersion: string;
  algorithmType: string;
  status: string; // 'PENDING', 'ACTIVE', 'INACTIVE'
  defaultThreshold: number;
  createdTime: string;
  description?: string;
  labelsMapping?: string;
}

interface ModelDetailData {
  id: number;
  modelName: string;
  modelVersion: string;
  description?: string;
  algorithmType: string;
  defaultThreshold: number;
  status: string;
  createdTime: string;
  labelsMapping?: string;
}

function ModelDetailModal({ model, onClose }: { model: ModelDetailData; onClose: () => void }) {
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'ACTIVE': return { text: '启用中', class: 'bg-green-500' };
      case 'PENDING': return { text: '待审批', class: 'bg-orange-500' };
      case 'INACTIVE': return { text: '已停用', class: 'bg-slate-400' };
      default: return { text: status, class: 'bg-slate-400' };
    }
  };

  const statusDisplay = getStatusDisplay(model.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-8 py-6 flex items-center justify-between z-10 rounded-t-2xl">
          <div>
            <h3 className="text-2xl font-bold text-slate-800 flex items-center">
              <Icon icon="solar:box-bold" className="mr-3 text-[#F5A623] text-3xl" />
              模型详情
            </h3>
            <p className="text-sm text-slate-500 mt-1">查看模型的详细信息</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <Icon icon="solar:close-circle-bold" className="text-3xl" />
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div className="p-6 rounded-2xl border border-orange-100" style={{ background: 'linear-gradient(to bottom right, #fff7ed, #fef3c7)' }}>
            <h4 className="font-bold text-slate-800 mb-4 flex items-center">
              <Icon icon="solar:document-text-bold" className="mr-2 text-[#F5A623]" />
              基本信息
            </h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500 mb-1">模型名称</p>
                <p className="font-medium text-slate-800">{model.modelName} {model.modelVersion}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">模型状态</p>
                <span className={`text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase ${statusDisplay.class}`}>
                  {statusDisplay.text}
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">算法类型</p>
                <p className="font-medium text-slate-800">{model.algorithmType}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">默认阈值</p>
                <p className="font-medium text-slate-800">{model.defaultThreshold}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">创建时间</p>
                <p className="font-medium text-slate-800">{new Date(model.createdTime).toLocaleString('zh-CN')}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">模型ID</p>
                <p className="font-medium text-slate-800">{model.id}</p>
              </div>
              {model.description && (
                <div className="col-span-2">
                  <p className="text-sm text-slate-500 mb-1">模型描述</p>
                  <p className="font-medium text-slate-800">{model.description}</p>
                </div>
              )}
              {model.labelsMapping && (
                <div className="col-span-2">
                  <p className="text-sm text-slate-500 mb-1">标签映射</p>
                  <pre className="font-medium text-slate-800 text-xs bg-slate-50 p-2 rounded border border-slate-200 overflow-x-auto">{model.labelsMapping}</pre>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t">
            <button onClick={onClose} className="px-6 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">关闭</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const AdminModels = () => {
  const [activeModels, setActiveModels] = useState<ModelItem[]>([]);
  const [pendingModels, setPendingModels] = useState<ModelItem[]>([]);
  const [inactiveModels, setInactiveModels] = useState<ModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailModel, setDetailModel] = useState<ModelItem | null>(null);

  const fetchModels = async () => {
    try {
      const res = await request.get('/api/v1/model/all') as any;
      // request拦截器已经返回了data，所以res直接就是数组
      const all: ModelItem[] = Array.isArray(res) ? res : (res?.data ?? []);
      console.log('[Admin Models] 获取到的模型列表:', all);
      setActiveModels(all.filter(m => m.status === 'ACTIVE'));
      setPendingModels(all.filter(m => m.status === 'PENDING'));
      setInactiveModels(all.filter(m => m.status === 'INACTIVE'));
    } catch (error) {
      console.error('[Admin Models] 获取模型列表失败:', error);
      setActiveModels([]);
      setPendingModels([]);
      setInactiveModels([]);
    } finally {
      setLoading(false);
    }
  };

  const updateModelStatus = async (modelId: number, status: string) => {
    try {
      await request.post(`/api/v1/model/${modelId}/status?status=${status}`);
      await fetchModels();
    } catch (error) {
      console.error('更新模型状态失败:', error);
      alert('操作失败，请重试');
    }
  };

  useEffect(() => {
    fetchModels();
    const id = setInterval(fetchModels, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const EmptyRow = ({ text }: { text: string }) => (
    <div className="p-8 text-center text-sm text-slate-400">{text}</div>
  );

  return (
    <div className="space-y-8">
      {detailModel && <ModelDetailModal model={detailModel} onClose={() => setDetailModel(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 flex items-center">
            <Icon icon="solar:box-bold" className="mr-3 text-[#F5A623] text-3xl" />
            模型库管理
          </h3>
          <p className="text-sm text-slate-500 mt-1">查看和管理所有AI模型及其配置</p>
        </div>
      </div>

      {/* 待审批的模型 */}
      <div className="bg-white rounded-2xl border border-orange-200 shadow-md overflow-hidden">
        <div className="px-6 py-5 border-b border-orange-100/50 bg-gradient-to-r from-orange-50/50 to-amber-50/50">
          <h4 className="font-bold text-slate-800 flex items-center">
            <Icon icon="solar:clock-circle-bold" className="mr-2 text-orange-600 text-xl" />
            待审批的模型
          </h4>
        </div>
        <div className="divide-y divide-slate-100/80">
          {loading && <EmptyRow text="加载中..." />}
          {!loading && pendingModels.length === 0 && <EmptyRow text="暂无待审批的模型" />}
          {pendingModels.map(m => (
            <div key={m.id} className="p-6 hover:bg-slate-50/40 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h5 className="text-lg font-bold text-slate-800">{m.modelName} {m.modelVersion}</h5>
                    <span className="bg-orange-500 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest">待审批</span>
                  </div>
                  <div className="flex items-center gap-40 text-sm">
                    <div><p className="text-slate-500 text-xs mb-1">算法类型</p><p className="font-medium text-slate-700">{m.algorithmType}</p></div>
                    <div><p className="text-slate-500 text-xs mb-1">默认阈值</p><p className="font-medium text-slate-700">{m.defaultThreshold}</p></div>
                    <div><p className="text-slate-500 text-xs mb-1">上传时间</p><p className="font-medium text-slate-700">{new Date(m.createdTime).toLocaleString('zh-CN')}</p></div>
                  </div>
                  {m.description && (
                    <div className="mt-2">
                      <p className="text-slate-500 text-xs mb-1">描述</p>
                      <p className="font-medium text-slate-700 text-sm">{m.description}</p>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2 ml-6">
                  <button
                    onClick={() => updateModelStatus(m.id, 'ACTIVE')}
                    className="bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-lg text-xs font-medium border border-green-200 transition-all"
                  >
                    批准启用
                  </button>
                  <button
                    onClick={() => updateModelStatus(m.id, 'INACTIVE')}
                    className="bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg text-xs font-medium border border-red-200 transition-all"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 启用中的模型 */}
      <div className="bg-white rounded-2xl border border-green-200 shadow-md overflow-hidden">
        <div className="px-6 py-5 border-b border-green-100/50 bg-gradient-to-r from-green-50/50 to-emerald-50/50">
          <h4 className="font-bold text-slate-800 flex items-center">
            <Icon icon="solar:star-bold" className="mr-2 text-green-600 text-xl" />
            启用中的模型
          </h4>
        </div>
        <div className="divide-y divide-slate-100/80">
          {loading && <EmptyRow text="加载中..." />}
          {!loading && activeModels.length === 0 && <EmptyRow text="暂无启用的模型" />}
          {activeModels.map(m => (
            <div key={m.id} className="p-6 hover:bg-slate-50/40 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h5 className="text-lg font-bold text-slate-800">{m.modelName} {m.modelVersion}</h5>
                    <span className="bg-green-500 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest">启用中</span>
                  </div>
                  <div className="flex items-center gap-40 text-sm">
                    <div><p className="text-slate-500 text-xs mb-1">算法类型</p><p className="font-medium text-slate-700">{m.algorithmType}</p></div>
                    <div><p className="text-slate-500 text-xs mb-1">默认阈值</p><p className="font-medium text-slate-700">{m.defaultThreshold}</p></div>
                    <div><p className="text-slate-500 text-xs mb-1">创建时间</p><p className="font-medium text-slate-700">{new Date(m.createdTime).toLocaleString('zh-CN')}</p></div>
                  </div>
                </div>
                <div className="flex space-x-2 ml-6">
                  <button onClick={() => setDetailModel(m)} className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-xs font-medium border border-slate-200 transition-all hover:border-green-300 hover:shadow-sm">查看详情</button>
                  <button
                    onClick={() => updateModelStatus(m.id, 'INACTIVE')}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-xs font-medium border border-amber-200 transition-all"
                  >
                    停用
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 已停用的模型 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        <div className="px-6 py-5 border-b">
          <h4 className="font-bold text-slate-800 flex items-center">
            <Icon icon="solar:history-bold" className="mr-2 text-xl" style={{ color: '#F5A623' }} />
            已停用的模型
          </h4>
        </div>
        <div className="divide-y divide-slate-100/80">
          {!loading && inactiveModels.length === 0 && <EmptyRow text="暂无停用的模型" />}
          {inactiveModels.map(m => (
            <div key={m.id} className="p-6 hover:bg-slate-50/40 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h5 className="text-lg font-bold text-slate-800">{m.modelName} {m.modelVersion}</h5>
                    <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">已停用</span>
                  </div>
                  <div className="flex items-center gap-40 text-sm">
                    <div><p className="text-slate-500 text-xs mb-1">算法类型</p><p className="font-medium text-slate-700">{m.algorithmType}</p></div>
                    <div><p className="text-slate-500 text-xs mb-1">默认阈值</p><p className="font-medium text-slate-700">{m.defaultThreshold}</p></div>
                    <div><p className="text-slate-500 text-xs mb-1">创建时间</p><p className="font-medium text-slate-700">{new Date(m.createdTime).toLocaleString('zh-CN')}</p></div>
                  </div>
                </div>
                <div className="flex space-x-2 ml-6">
                  <button onClick={() => setDetailModel(m)} className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-xs font-medium border border-slate-200 transition-all hover:border-slate-300 hover:shadow-sm">查看详情</button>
                  <button
                    onClick={() => updateModelStatus(m.id, 'ACTIVE')}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-xs font-medium border border-blue-200 transition-all"
                  >
                    重新启用
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminModels;
