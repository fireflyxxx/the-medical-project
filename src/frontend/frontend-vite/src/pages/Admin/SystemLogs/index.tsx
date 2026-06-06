import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { getLogs, AuditLog } from '../../../api/admin';

const statusColorMap: Record<number, string> = {
  1: 'text-blue-400',    // 成功
  0: 'text-red-400',     // 失败
};

const statusTextMap: Record<number, string> = {
  1: 'SUCCESS',
  0: 'ERROR',
};

export default function SystemLogs() {
  const [operationType, setOperationType] = useState<string>('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [pageNo, setPageNo] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);

  // 获取日志数据
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page_no: pageNo,
        page_size: pageSize,
        ...(operationType && { operation_type: operationType }),
      };
      const res = await getLogs(params);
      console.log('后端返回的日志数据:', res);

      const logsData = res.auditlog || [];
      const totalCount = res.total || 0;

      console.log('解析后的日志数据:', logsData, '总数:', totalCount);
      setLogs(logsData);
      setTotal(totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取日志失败');
      console.error('获取日志失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和筛选条件变化时重新获取数据
  useEffect(() => {
    fetchLogs();
  }, [pageNo, operationType]);

  // 格式化日志消息
  const formatLogMessage = (log: AuditLog) => {
    const status = statusTextMap[log.operation_status] || 'UNKNOWN';
    let message = `[${log.operator}] ${log.operation_type}`;

    if (log.target_type && log.target_id) {
      message += ` - ${log.target_type}: ${log.target_id}`;
    }

    if (log.operation_status === 0 && log.error_msg) {
      message += ` - 错误: ${log.error_msg}`;
    }

    return { status, message };
  };

  return (
    <div className="space-y-8">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-3">
          <select
            className="text-sm border rounded-lg px-4 py-2 bg-white outline-none"
            value={operationType}
            onChange={(e) => {
              setOperationType(e.target.value);
              setPageNo(1); // 重置页码
            }}
          >
            <option value="">所有操作类型</option>
            <option value="login">登录</option>
            <option value="logout">登出</option>
            <option value="create">创建</option>
            <option value="update">更新</option>
            <option value="delete">删除</option>
            <option value="upload">上传</option>
            <option value="download">下载</option>
          </select>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="text-sm border rounded-lg px-4 py-2 bg-white hover:bg-gray-50 outline-none disabled:opacity-50"
          >
            {loading ? '加载中...' : '刷新'}
          </button>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">
            共 {total} 条记录
          </span>
          <button className="bg-[#F5A623] hover:bg-[#d89420] text-white px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center">
            <Icon icon="solar:download-bold" className="mr-2 text-base" />
            导出日志
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Log terminal */}
      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
        <div className="bg-slate-900 p-4 font-mono text-xs text-green-400 h-[600px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-slate-400">加载中...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-slate-400">暂无日志数据</span>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, i) => {
                const { status, message } = formatLogMessage(log);
                return (
                  <p key={i}>
                    <span className="text-slate-500">[{log.operation_time}]</span>{' '}
                    <span className={statusColorMap[log.operation_status] || 'text-gray-400'}>
                      [{status}]
                    </span>{' '}
                    {message}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setPageNo(Math.max(1, pageNo - 1))}
            disabled={pageNo === 1 || loading}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span className="text-sm text-gray-600">
            第 {pageNo} 页 / 共 {Math.ceil(total / pageSize)} 页
          </span>
          <button
            onClick={() => setPageNo(Math.min(Math.ceil(total / pageSize), pageNo + 1))}
            disabled={pageNo >= Math.ceil(total / pageSize) || loading}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
