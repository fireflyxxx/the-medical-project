# 模型管理 API 文档

## 概述

本文档描述了医学影像系统中模型管理相关的后端API接口，包括模型上传、查询、状态管理等功能。

---

## 基础信息

- **Base URL**: `/api/v1/model`
- **认证方式**: Bearer Token (通过 `Authorization` header 传递)
- **角色权限**:
  - `researcher`: 科研人员，可以上传模型和查看启用的模型
  - `admin`: 管理员，可以查看所有模型并管理模型状态

---

## 数据模型

### ModelDto

模型数据传输对象，用于API响应。

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `id` | Long | 模型ID | `1` |
| `modelName` | String | 模型名称 | `"YOLO骨折检测版"` |
| `modelVersion` | String | 模型版本 | `"v9.0"` |
| `description` | String | 模型描述（可选） | `"用于检测骨折的YOLO模型"` |
| `algorithmType` | String | 算法类型 | `"yolov8"`, `"faster_rcnn"`, `"torchscript"` |
| `labelsMapping` | String | 标签映射（可选） | `null` |
| `defaultThreshold` | BigDecimal | 默认置信度阈值 | `0.45` |
| `status` | String | 模型状态 | `"PENDING"`, `"ACTIVE"`, `"INACTIVE"` |
| `createdTime` | LocalDateTime | 创建时间 | `"2026-04-26T21:11:26.064384"` |

### 模型状态说明

| 状态 | 说明 | 谁可以设置 |
|------|------|-----------|
| `PENDING` | 待审批 | 系统自动设置（上传时） |
| `ACTIVE` | 启用中 | 管理员审批通过 |
| `INACTIVE` | 已停用 | 管理员停用或拒绝 |

---

## API 接口

### 1. 获取启用的模型列表

获取当前所有启用状态的AI模型（用于前端下拉框选择）。

**接口地址**: `GET /api/v1/model/list`

**权限要求**: 需要登录（任何角色）

**请求头**:
```http
Authorization: Bearer {token}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "modelName": "Faster R-CNN",
      "modelVersion": "v1.0.0",
      "description": "系统预设的高精度医学图像检测模型",
      "algorithmType": "faster_rcnn",
      "labelsMapping": null,
      "defaultThreshold": 0.3000,
      "status": "ACTIVE",
      "createdTime": "2026-04-24T09:25:24"
    },
    {
      "id": 2,
      "modelName": "YOLOv8",
      "modelVersion": "v2.0.0",
      "description": "系统预设的极速医学图像检测模型",
      "algorithmType": "yolov8",
      "labelsMapping": null,
      "defaultThreshold": 0.0100,
      "status": "ACTIVE",
      "createdTime": "2026-04-24T09:25:24"
    }
  ]
}
```

**说明**:
- 只返回 `status = "ACTIVE"` 的模型
- 按创建时间降序排列

---

### 2. 获取所有模型列表

获取系统中所有的AI模型（包括待审批、启用、停用的模型，用于后台管理）。

**接口地址**: `GET /api/v1/model/all`

**权限要求**: 需要登录（任何角色）

**请求头**:
```http
Authorization: Bearer {token}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "modelName": "Faster R-CNN",
      "modelVersion": "v1.0.0",
      "description": "系统预设的高精度医学图像检测模型",
      "algorithmType": "faster_rcnn",
      "labelsMapping": null,
      "defaultThreshold": 0.3000,
      "status": "ACTIVE",
      "createdTime": "2026-04-24T09:25:24"
    },
    {
      "id": 3,
      "modelName": "test01",
      "modelVersion": "v999",
      "description": "测试",
      "algorithmType": "torchscript",
      "labelsMapping": null,
      "defaultThreshold": 0.1000,
      "status": "PENDING",
      "createdTime": "2026-04-26T17:25:57.297472"
    },
    {
      "id": 4,
      "modelName": "test02",
      "modelVersion": "v999",
      "description": "测试",
      "algorithmType": "torchscript",
      "labelsMapping": null,
      "defaultThreshold": 0.1000,
      "status": "INACTIVE",
      "createdTime": "2026-04-26T17:29:23.617655"
    }
  ]
}
```

**说明**:
- 返回所有状态的模型
- 管理员可以看到所有模型，用于审批和管理

---

### 3. 更新模型状态

修改AI模型的状态（启用/停用/审批）。

**接口地址**: `POST /api/v1/model/{modelId}/status`

**权限要求**: 仅管理员 (`admin`)

**请求头**:
```http
Authorization: Bearer {token}
X-User-Role: admin
```

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `modelId` | Long | 是 | 模型ID |

**查询参数**:
| 参数名 | 类型 | 必填 | 说明 | 可选值 |
|--------|------|------|------|--------|
| `status` | String | 是 | 目标状态 | `"ACTIVE"`, `"INACTIVE"` |

**请求示例**:
```http
POST /api/v1/model/3/status?status=ACTIVE
Authorization: Bearer {token}
X-User-Role: admin
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 3,
    "modelName": "test01",
    "modelVersion": "v999",
    "description": "测试",
    "algorithmType": "torchscript",
    "labelsMapping": null,
    "defaultThreshold": 0.1000,
    "status": "ACTIVE",
    "createdTime": "2026-04-26T17:25:57.297472"
  }
}
```

**错误响应**:
```json
{
  "code": 1,
  "message": "非法的状态值，只允许更改为 ACTIVE 或 INACTIVE: PENDING",
  "data": null
}
```

**说明**:
- 只有管理员可以调用此接口
- 不能手动将模型状态改为 `PENDING`
- 状态只能在 `ACTIVE` 和 `INACTIVE` 之间切换

**常见操作**:
- **审批通过**: `status=ACTIVE` (将 PENDING 改为 ACTIVE)
- **拒绝审批**: `status=INACTIVE` (将 PENDING 改为 INACTIVE)
- **停用模型**: `status=INACTIVE` (将 ACTIVE 改为 INACTIVE)
- **重新启用**: `status=ACTIVE` (将 INACTIVE 改为 ACTIVE)

---

### 4. 上传自定义模型

科研人员上传自定义训练的AI模型文件及配置信息。

**接口地址**: `POST /api/v1/model/upload`

**权限要求**: 仅科研人员 (`researcher`)

**请求头**:
```http
Authorization: Bearer {token}
X-User-Role: researcher
Content-Type: multipart/form-data
```

**表单参数**:
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `file` | File | 是 | 模型文件 | `.pt`, `.pth` 文件 |
| `model_name` | String | 是 | 模型名称 | `"YOLO骨折检测版"` |
| `model_version` | String | 是 | 模型版本 | `"v9.0"` |
| `algorithm_type` | String | 是 | 算法类型 | `"yolov8"`, `"faster_rcnn"`, `"torchscript"` |
| `description` | String | 否 | 模型描述 | `"用于检测骨折"` |
| `labels_mapping` | String | 否 | 标签映射 | JSON字符串 |
| `default_threshold` | BigDecimal | 否 | 默认阈值 | `0.45` |

**请求示例** (使用 fetch):
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('model_name', 'YOLO骨折检测版');
formData.append('model_version', 'v9.0');
formData.append('algorithm_type', 'yolov8');
formData.append('description', '用于检测骨折');
formData.append('default_threshold', '0.45');

const response = await fetch('/api/v1/model/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 6,
    "modelName": "YOLO骨折检测版",
    "modelVersion": "v9.0",
    "description": null,
    "algorithmType": "yolov8",
    "labelsMapping": null,
    "defaultThreshold": 0.4500,
    "status": "PENDING",
    "createdTime": "2026-04-26T21:11:26.064384"
  }
}
```

**错误响应**:
```json
{
  "code": 1,
  "message": "上传的模型文件不能为空",
  "data": null
}
```

```json
{
  "code": 1,
  "message": "不支持的算法类型: unknown_algorithm",
  "data": null
}
```

**说明**:
- 只有科研人员可以上传模型
- 上传后模型状态自动设置为 `PENDING`（待审批）
- 支持的算法类型: `yolov8`, `faster_rcnn`, `torchscript`
- 文件会保存到服务器配置的目录（默认: `/data/medical/models/`）
- 文件名会被重命名为 UUID 格式以避免冲突
- 上传者ID会自动从token中提取

---

## 数据库表结构

### custom_ai_model 表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 模型ID |
| `model_name` | VARCHAR(128) | NOT NULL | 模型名称 |
| `model_version` | VARCHAR(64) | NOT NULL | 模型版本 |
| `description` | TEXT | NULL | 模型描述 |
| `algorithm_type` | VARCHAR(64) | NOT NULL | 算法类型 |
| `file_path` | VARCHAR(255) | NOT NULL | 文件存储路径 |
| `uploader_id` | BIGINT | NOT NULL | 上传者用户ID |
| `labels_mapping` | TEXT | NULL | 标签映射（JSON格式） |
| `default_threshold` | DECIMAL(5,4) | NULL | 默认置信度阈值 |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'PENDING' | 模型状态 |
| `created_time` | DATETIME | NOT NULL | 创建时间 |
| `updated_time` | DATETIME | NOT NULL | 更新时间 |

---

## 业务流程

### 模型上传与审批流程

```
1. 科研人员上传模型
   ↓
   POST /api/v1/model/upload
   ↓
   模型状态: PENDING (待审批)
   ↓
2. 管理员查看待审批模型
   ↓
   GET /api/v1/model/all
   ↓
3. 管理员审批
   ├─ 批准: POST /api/v1/model/{id}/status?status=ACTIVE
   │         模型状态: ACTIVE (启用)
   │         ↓
   │         科研人员可在推理时选择该模型
   │
   └─ 拒绝: POST /api/v1/model/{id}/status?status=INACTIVE
             模型状态: INACTIVE (停用)
```

### 模型状态转换图

```
        上传
         ↓
    ┌─────────┐
    │ PENDING │ (待审批)
    └─────────┘
         ↓
    ┌────┴────┐
    ↓         ↓
批准         拒绝
    ↓         ↓
┌────────┐ ┌──────────┐
│ ACTIVE │ │ INACTIVE │
└────────┘ └──────────┘
    ↓         ↑
    └─停用────┘
         ↓
    ┌─重新启用
    ↓
┌────────┐
│ ACTIVE │
└────────┘
```

---

## 错误码说明

| code | message | 说明 |
|------|---------|------|
| 0 | success | 请求成功 |
| 1 | Invalid or expired token | Token无效或过期 |
| 1 | 上传的模型文件不能为空 | 未选择文件 |
| 1 | 不支持的算法类型: {type} | 算法类型不在支持列表中 |
| 1 | 模型不存在: {id} | 指定的模型ID不存在 |
| 1 | 非法的状态值，只允许更改为 ACTIVE 或 INACTIVE | 尝试设置非法状态 |
| 1 | 模型不能手动退回待审批状态 | 尝试将状态改为PENDING |
| 1 | 保存模型文件失败 | 文件保存到服务器失败 |

---

## 配置说明

### application.properties / application.yml

```properties
# 模型文件上传目录
medical.ai.models.upload-dir=/data/medical/models/
```

**说明**:
- 如果目录不存在，系统会自动创建
- 确保应用有该目录的读写权限
- 建议使用绝对路径

---

## 前端集成示例

### 1. 上传模型

```javascript
async function uploadModel(file, modelName, modelVersion, algorithmType, description, defaultThreshold) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('model_name', modelName);
  formData.append('model_version', modelVersion);
  formData.append('algorithm_type', algorithmType);
  if (description) formData.append('description', description);
  if (defaultThreshold) formData.append('default_threshold', defaultThreshold);

  const token = sessionStorage.getItem('token');
  const response = await fetch('/api/v1/model/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const result = await response.json();
  if (result.code === 0) {
    console.log('上传成功:', result.data);
  } else {
    console.error('上传失败:', result.message);
  }
}
```

### 2. 获取模型列表

```javascript
import request from './utils/request';

// 获取启用的模型（科研端）
async function getActiveModels() {
  const models = await request.get('/api/v1/model/list');
  return models; // request拦截器已经提取了data字段
}

// 获取所有模型（管理端）
async function getAllModels() {
  const models = await request.get('/api/v1/model/all');
  return models;
}
```

### 3. 更新模型状态

```javascript
import request from './utils/request';

// 批准模型
async function approveModel(modelId) {
  await request.post(`/api/v1/model/${modelId}/status?status=ACTIVE`);
}

// 拒绝模型
async function rejectModel(modelId) {
  await request.post(`/api/v1/model/${modelId}/status?status=INACTIVE`);
}

// 停用模型
async function deactivateModel(modelId) {
  await request.post(`/api/v1/model/${modelId}/status?status=INACTIVE`);
}

// 重新启用模型
async function reactivateModel(modelId) {
  await request.post(`/api/v1/model/${modelId}/status?status=ACTIVE`);
}
```

---

## 注意事项

1. **权限控制**:
   - 模型上传只能由科研人员执行
   - 模型状态管理只能由管理员执行
   - 所有接口都需要有效的认证token

2. **文件大小限制**:
   - 建议在前端限制文件大小（如最大500MB）
   - 后端也应配置相应的文件上传大小限制

3. **状态转换规则**:
   - 新上传的模型自动为 `PENDING` 状态
   - 只能在 `ACTIVE` 和 `INACTIVE` 之间切换
   - 不能手动设置为 `PENDING` 状态

4. **文件存储**:
   - 文件名会被重命名为UUID格式
   - 原始文件扩展名会被保留
   - 确保存储目录有足够的磁盘空间

5. **数据一致性**:
   - 删除模型记录时应同时删除对应的文件
   - 建议定期清理未使用的模型文件

---

## 更新日志

- **2026-04-26**: 初始版本，包含模型上传、查询、状态管理功能
