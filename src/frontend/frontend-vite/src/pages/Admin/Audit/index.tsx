import { useState, useEffect, useCallback, useRef } from 'react';
import { Icon } from '@iconify/react';
import request from '../../../utils/request';

interface AuditLog {
  operator: string;
  operation_type: string;
  operation_time: string;
  target_id: string;
  target_type: string;
  operation_status: number;
  error_msg: string | null;
}

const toBackendTime = (dateStr: string, suffix: string) => {
  return dateStr.replace(/-/g, '') + suffix;
};

const getTodayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [opType, setOpType] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [date, setDate] = useState('');
  const [operator, setOperator] = useState('');
  const [targetType, setTargetType] = useState('');
  const [pageNo, setPageNo] = useState(1);
  const [pageSize] = useState(20);

  const [allTotal, setAllTotal] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);
  const [failedTotal, setFailedTotal] = useState(0);

  const fetchingRef = useRef(false);

  const fetchStats = useCallback(async () => {
    try {
      const [allRes, todayRes, failedRes] = await Promise.all([
        request.post('/api/v1/log/get', { page_no: 1, page_size: 1 }) as any,
        request.post('/api/v1/log/get', {
          page_no: 1,
          page_size: 1,
          start_time: toBackendTime(getTodayStr(), '0000'),
          end_time: toBackendTime(getTodayStr(), '2359'),
        }) as any,
        request.post('/api/v1/log/get', {
          page_no: 1,
          page_size: 1,
          operation_status: 0,
        }) as any,
      ]);
      setAllTotal(allRes.total || 0);
      setTodayTotal(todayRes.total || 0);
      setFailedTotal(failedRes.total || 0);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const doFetch = useCallback(async (page: number, op: string, status: number | undefined, dateVal: string, operatorVal: string, targetTypeVal: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const params: any = {
        page_no: page,
        page_size: pageSize,
      };
      if (op) params.operation_type = op;
      if (status !== undefined) params.operation_status = status;
      if (dateVal) {
        params.start_time = toBackendTime(dateVal, '0000');
        params.end_time = toBackendTime(dateVal, '2359');
      }
      if (operatorVal) params.operator = operatorVal;
      if (targetTypeVal) params.target_type = targetTypeVal;
      const res = await request.post('/api/v1/log/get', params) as any;
      setLogs(res.auditlog || []);
      setTotal(res.total || 0);
    } catch (error) {
      console.error('获取审计日志失败:', error);
      setLogs([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [pageSize]);

  useEffect(() => {
    doFetch(pageNo, opType, statusFilter, date, operator, targetType);
  }, [pageNo, opType, statusFilter, date, operator, targetType, doFetch]);

  const handleOpTypeChange = (val: string) => {
    setOpType(val);
    setPageNo(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val === '' ? undefined : Number(val));
    setPageNo(1);
  };

  const handleDateChange = (val: string) => {
    setDate(val);
    setPageNo(1);
  };

  const getOperationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'login': '登录',
      'create_user': '创建用户',
      'ban_user': '禁用用户',
      'unban_user': '启用用户',
      'delete_user': '删除用户',
      'change_password': '修改密码',
      'create_case': '创建病例',
      'update_case': '更新病例',
      'delete_case': '删除病例',
      'create_study': '创建检查',
      'update_study': '更新检查',
      'delete_study': '删除检查',
      'upload_image': '上传影像',
      'delete_image': '删除影像',
      'infer_image': '推理预测',
      'create_comment': '创建评论',
      'delete_comment': '删除评论',
      'update_doc_bbox': '修正标注',
      'clear_all_case': '清空病例',
    };
    return labels[type] || type;
  };

  const getOperationTypeColor = (type: string) => {
    if (!type) return 'bg-slate-100 text-slate-700';
    if (type.includes('delete')) return 'bg-red-100 text-red-700';
    if (type.includes('create')) return 'bg-green-100 text-green-700';
    if (type.includes('ban')) return 'bg-orange-100 text-orange-700';
    if (type.includes('login')) return 'bg-blue-100 text-blue-700';
    return 'bg-slate-100 text-slate-700';
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr || timeStr.length !== 12) return '-';
    const year = timeStr.slice(0, 4);
    const month = timeStr.slice(4, 6);
    const day = timeStr.slice(6, 8);
    const hour = timeStr.slice(8, 10);
    const minute = timeStr.slice(10, 12);
    return `${year}-${month}-${day} ${hour}:${minute}`;
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-orange-100 shadow-sm">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">总操作记录</p>
          <div className="flex items-end space-x-2">
            <span className="text-3xl font-bold font-mono text-slate-800">{allTotal}</span>
            <span className="text-slate-400 text-xs pb-1">次</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">今日操作</p>
          <div className="flex items-end space-x-2">
            <span className="text-3xl font-bold font-mono text-blue-600">{todayTotal}</span>
            <span className="text-slate-400 text-xs pb-1">次</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">失败操作</p>
          <div className="flex items-end space-x-2">
            <span className="text-3xl font-bold font-mono text-red-600">{failedTotal}</span>
            <span className="text-red-600 text-xs font-bold pb-1">需关注</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">成功率</p>
          <div className="flex items-end space-x-2">
            <span className="text-3xl font-bold font-mono text-green-600">
              {allTotal > 0 ? Math.round(((allTotal - failedTotal) / allTotal) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex space-x-3">
          <input
            type="text"
            placeholder="操作人员"
            className="text-base border rounded-lg px-4 py-2 bg-white outline-none w-40"
            value={operator}
            onChange={(e) => { setOperator(e.target.value); setPageNo(1); }}
          />
          <input
            type="text"
            placeholder="目标类型"
            className="text-base border rounded-lg px-4 py-2 bg-white outline-none w-40"
            value={targetType}
            onChange={(e) => { setTargetType(e.target.value); setPageNo(1); }}
          />
          <select
            className="text-base border rounded-lg px-4 py-2 bg-white outline-none"
            value={opType}
            onChange={(e) => handleOpTypeChange(e.target.value)}
          >
            <option value="">所有操作类型</option>
            <option value="login">登录</option>
            <option value="create_user">创建用户</option>
            <option value="ban_user">禁用用户</option>
            <option value="unban_user">启用用户</option>
            <option value="delete_user">删除用户</option>
            <option value="change_password">修改密码</option>
            <option value="create_case">创建病例</option>
            <option value="update_case">更新病例</option>
            <option value="delete_case">删除病例</option>
            <option value="create_study">创建检查</option>
            <option value="update_study">更新检查</option>
            <option value="delete_study">删除检查</option>
            <option value="upload_image">上传影像</option>
            <option value="delete_image">删除影像</option>
            <option value="infer_image">推理预测</option>
            <option value="create_comment">创建评论</option>
            <option value="delete_comment">删除评论</option>
            <option value="update_doc_bbox">修正标注</option>
            <option value="clear_all_case">清空病例</option>
          </select>
          <select
            className="text-base border rounded-lg px-4 py-2 bg-white outline-none"
            value={statusFilter === undefined ? '' : statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">所有状态</option>
            <option value="1">成功</option>
            <option value="0">失败</option>
          </select>
          <input
            type="date"
            className="text-base border rounded-lg px-4 py-2 bg-white outline-none"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
        <table className="w-full text-base">
          <thead className="bg-slate-50 text-slate-500 text-left font-medium border-b">
            <tr>
              <th className="px-6 py-4 text-base">时间</th>
              <th className="px-6 py-4 text-base">操作人员</th>
              <th className="px-6 py-4 text-base">操作类型</th>
              <th className="px-6 py-4 text-base">目标类型</th>
              <th className="px-6 py-4 text-base">目标ID</th>
              <th className="px-6 py-4 text-base">状态</th>
              <th className="px-6 py-4 text-base">错误信息</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">加载中…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">暂无审计日志</td></tr>
            ) : logs.map((log, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-sm font-mono">
                  {formatTime(log.operation_time)}
                </td>
                <td className="px-6 py-4 text-base">
                  <p className="font-medium text-slate-700">{log.operator || '未知'}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`${getOperationTypeColor(log.operation_type)} px-2 py-0.5 rounded text-sm font-bold`}>
                    {getOperationTypeLabel(log.operation_type)}
                  </span>
                </td>
                <td className="px-6 py-4 text-base text-slate-600">{log.target_type || '-'}</td>
                <td className="px-6 py-4 font-mono text-sm">{log.target_id || '-'}</td>
                <td className="px-6 py-4">
                  {log.operation_status === 1 ? (
                    <span className="text-green-600 text-sm flex items-center">
                      <Icon icon="solar:check-circle-bold" className="mr-1" />
                      成功
                    </span>
                  ) : (
                    <span className="text-red-600 text-sm flex items-center">
                      <Icon icon="solar:close-circle-bold" className="mr-1" />
                      失败
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-red-600">{log.error_msg || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => setPageNo(Math.max(1, pageNo - 1))}
            disabled={pageNo === 1}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-slate-600">
            第 {pageNo} 页 / 共 {Math.ceil(total / pageSize)} 页
          </span>
          <button
            onClick={() => setPageNo(Math.min(Math.ceil(total / pageSize), pageNo + 1))}
            disabled={pageNo >= Math.ceil(total / pageSize)}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
