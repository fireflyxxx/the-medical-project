import request from '../utils/request';

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

/**
 * 获取当前用户未读消息数量
 * GET /notifications/unread-count
 *
 * 后端接口说明：
 * - 请求方式：GET
 * - 请求路径：/notifications/unread-count
 * - 请求头：Authorization: Bearer <token>
 * - 响应格式：{ code: 0, data: { count: number }, message: 'success' }
 * - 示例响应：{ code: 0, data: { count: 3 }, message: 'success' }
 */
export const getUnreadNotificationCount = async (): Promise<UnreadCountResponse> => {
  return request.get('/notifications/unread-count') as Promise<UnreadCountResponse>;
};

/**
 * 获取当前用户所有消息列表
 * GET /notifications
 *
 * 后端接口说明：
 * - 请求方式：GET
 * - 请求路径：/notifications
 * - 请求头：Authorization: Bearer <token>
 * - 响应格式：{ code: 0, data: Notification[], message: 'success' }
 */
export const getNotifications = async (): Promise<Notification[]> => {
  return request.get('/notifications') as Promise<Notification[]>;
};

/**
 * 标记指定消息为已读
 * POST /notifications/:id/read
 *
 * 后端接口说明：
 * - 请求方式：POST
 * - 请求路径：/notifications/:id/read
 * - 请求头：Authorization: Bearer <token>
 * - 路径参数：id - 消息ID
 * - 响应格式：{ code: 0, data: null, message: 'success' }
 */
export const markNotificationAsRead = async (id: string): Promise<void> => {
  return request.post(`/notifications/${id}/read`) as Promise<void>;
};
