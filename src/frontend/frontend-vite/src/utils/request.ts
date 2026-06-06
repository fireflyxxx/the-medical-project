import axios from 'axios';

// 根据HTTP状态码获取默认错误消息
const getDefaultErrorMessage = (status?: number): string => {
  switch (status) {
    case 401:
      return '会话已过期，请重新登录';
    case 403:
      return '权限不足，无法访问';
    case 404:
      return '请求的资源不存在';
    case 409:
      return '用户名或工号已存在，请修改后重试';
    case 500:
      return '服务器内部错误';
    default:
      return '网络错误，请稍后重试';
  }
};

// Create Axios instance
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 10000,
});

// Request Interceptor
request.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add role header if needed
    const role = sessionStorage.getItem('role');
    if (role) {
      config.headers['X-User-Role'] = role;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
request.interceptors.response.use(
  (response) => {
    // Assuming backend returns { code: 200, data: ..., message: ... }
    // Adjust based on actual API response structure
    const { code, data, message } = response.data;
    
    // If the API doesn't follow standard wrapper, just return response.data
    if (response.config.responseType === 'blob') {
      return response;
    }

    // Example check, adjust as needed
    if (code !== undefined && code !== 0) {
      console.error(message || 'Request failed');
      return Promise.reject(new Error(message || 'Error'));
    }
    
    return data || response.data;
  },
  (error) => {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message || error.response?.data?.error;
    
    switch (status) {
      case 401:
        console.error('Session expired, please login again');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('role');
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
        break;
      case 403:
        console.error('Permission denied');
        break;
      case 404:
        console.error('Resource not found');
        break;
      case 409:
        console.error(serverMessage || '用户名或工号已存在，请修改后重试');
        break;
      case 500:
        console.error('Internal server error');
        break;
      default:
        console.error('Network error, please try again');
    }
    
    //返回包含更详细错误信息的 Error 对象
    const errorMessage = serverMessage || getDefaultErrorMessage(status);
    return Promise.reject(new Error(errorMessage));
  }
);

export default request;
