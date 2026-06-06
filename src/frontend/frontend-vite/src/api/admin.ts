import request from '../utils/request';

/**
 * 日志相关类型定义
 */
export interface AuditLog {
  operator: string;           // 操作人
  operation_type: string;     // 操作类型
  operation_time: string;     // 操作时间
  target_id: string;          // 操作对象id
  target_type: string;        // 操作对象的类型
  operation_status: number;   // 操作状态，成功与否
  error_msg?: string;         // 错误信息，操作失败时填写
}

export interface LogGetRequest {
  operation_type?: string;    // 操作类型（可选）
  page_no: number;            // 页码
  page_size: number;          // 每页条数
}

export interface LogGetResponse {
  auditlog: AuditLog[];       // 注意：后端返回的字段名是 auditlog
  total: number;              // 总记录数
  page_no: number;            // 当前页码
  page_size: number;          // 每页条数
}

/**
 * 获取日志数据
 * POST /api/v1/log/get
 */
export const getLogs = async (params: LogGetRequest): Promise<LogGetResponse> => {
  return request.post('/api/v1/log/get', params) as Promise<LogGetResponse>;
};
