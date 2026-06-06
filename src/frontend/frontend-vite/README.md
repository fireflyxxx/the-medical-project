# MediVision AI — Frontend

React 18 + TypeScript + Vite 前端工程，支持 Admin / Doctor / Researcher 三端角色。

## 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 5 |
| 路由 | React Router v6 |
| 状态 | Zustand |
| 样式 | Tailwind CSS + CSS Variables 多主题 |
| 请求 | Axios |
| 测试 | Vitest + @testing-library/react |
| 规范 | ESLint + Prettier |

## 快速开始

### 前置条件

- Node.js >= 20
- npm >= 10

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:5173](http://localhost:5173)，默认跳转到 `/login`。

后端接口地址在 `.env.local` 中配置（见下方「环境变量」），登录接口为 `POST /api/v1/account/login`。

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 (HMR) |
| `npm run build` | TypeScript 类型检查 + 生产构建，输出至 `dist/` |
| `npm run preview` | 本地预览生产构建 |
| `npm run lint` | ESLint 检查 |
| `npm run format` | Prettier 格式化 `src/` |
| `npm run test` | 单次运行单元测试 |
| `npm run test:watch` | 监听模式运行测试 |

## 目录结构

```
src/
├── components/
│   ├── auth/          # AuthGuard 路由守卫
│   ├── admin/         # 管理员专用组件
│   ├── doctor/        # 医生专用组件
│   ├── researcher/    # 科研端专用组件
│   └── common/        # 通用组件
├── layouts/           # AdminLayout / DoctorLayout / ResearcherLayout
├── pages/             # 按角色划分的页面
│   ├── Login/
│   ├── Admin/
│   ├── Doctor/
│   └── Researcher/
├── router/            # React Router 路由配置
├── store/             # Zustand 状态（Auth + Theme）
├── utils/             # cn、request 等工具函数
├── api/               # Axios 接口封装（待填充）
├── types/             # 全局 TypeScript 类型
├── hooks/             # 自定义 Hooks
└── test/              # 单元测试
```

## 路由与权限

| 路径 | 角色 | 说明 |
|------|------|------|
| `/login` | 公开 | 登录页，角色选择 |
| `/admin` | admin | 管理员工作台 |
| `/doctor` | doctor | 医生工作站 |
| `/tech` | tech | 科研端 |

未登录访问受保护路由自动重定向至 `/login`；角色越权访问自动重定向至本角色首页。

## 主题色

| 角色 | 主色 |
|------|------|
| 默认/登录 | `#8FA5B8`（莫兰迪灰蓝）|
| Admin | `#F5A623`（科技橙）|
| Researcher | `#722ED1`（科技紫）|
| Doctor | `#3b82f6`（科技蓝）|

## Docker 部署

```bash
# 构建镜像
docker build -t medivision-frontend .

# 运行容器（映射到本机 8080 端口）
docker run -p 8080:80 medivision-frontend
```

访问 [http://localhost:8080](http://localhost:8080)。

Nginx 已配置 `try_files $uri $uri/ /index.html`，SPA 路由刷新不会出现 404。

## 环境变量

在项目根目录创建 `.env.local`（不提交至 git）：

```env
VITE_API_BASE_URL=http://116.62.219.49:8080
```

当前 `.env.local` 已配置为测试服务器地址，按需修改。

在 `src/utils/request.ts` 中通过 `import.meta.env.VITE_API_BASE_URL` 读取。
