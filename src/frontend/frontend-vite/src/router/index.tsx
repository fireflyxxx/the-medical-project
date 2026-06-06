import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard } from '../components/auth/AuthGuard';

// Pages
import LoginPage from '../pages/Login';
import AdminDashboard from '../pages/Admin/Dashboard';
import AdminModels from '../pages/Admin/Models';
import AdminSettings from '../pages/Admin/Settings';
import AdminSystemLogs from '../pages/Admin/SystemLogs';
import AdminAudit from '../pages/Admin/Audit';
import ResearcherDashboard from '../pages/Researcher/Dashboard';

// Layouts
import AdminLayout from '../layouts/AdminLayout';
import ResearcherLayout from '../layouts/ResearcherLayout';

// 注意：医生端路由已移至 frontend-node (Next.js)
// 登录后 doctor 角色会通过 window.location.href = '/doctor' 跳转到 Next.js 应用

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  // Admin Routes
  {
    path: '/admin',
    element: (
      <AuthGuard allowedRoles={['admin']}>
        <AdminLayout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      {
        path: 'models',
        element: <AdminModels />,
      },
      {
        path: 'settings',
        element: <AdminSettings />,
      },
      {
        path: 'logs',
        element: <AdminSystemLogs />,
      },
      {
        path: 'audit',
        element: <AdminAudit />,
      },
    ],
  },
  // Researcher Routes
  {
    path: '/tech',
    element: (
      <AuthGuard allowedRoles={['tech']}>
        <ResearcherLayout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <ResearcherDashboard />,
      },
      {
        path: 'datasets',
        element: <div>Datasets Placeholder</div>,
      },
      {
        path: 'evaluation',
        element: <div>Evaluation Placeholder</div>,
      },
      {
        path: 'versions',
        element: <div>Versions Placeholder</div>,
      },
    ],
  },
  // Doctor 路由已移除 - 由 frontend-node (Next.js) 处理
  // 所有 /doctor/* 请求由 nginx 代理到 Next.js 服务
  // Fallback
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);
