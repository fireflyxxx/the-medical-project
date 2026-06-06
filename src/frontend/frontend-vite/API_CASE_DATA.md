# 病例数据接口文档

后端服务地址：`http://116.62.219.49:8080`

## 主要接口

### 获取病例列表

**接口地址：** `GET /api/v1/cases/get`

**请求头：**
- `Authorization`: String (必填)

**查询参数：**
- `case_id`: String (可选) - 病例ID
- `start_date`: LocalDate (可选) - 开始日期
- `end_date`: LocalDate (可选) - 结束日期

**返回数据：** `List<CaseDto>`

---

## 数据结构说明

### 1. CaseDto - 病例基本信息

| 字段名 | 类型 | 说明 |
|--------|------|------|
| caseId | String | 病例ID |
| name | String | 患者姓名 |
| gender | Integer | 性别 |
| age | Integer | 年龄 |
| idNumber | String | 身份证号 |
| contact | String | 联系方式 |
| medicalHistory | String | 病史 |
| createdTime | LocalDateTime | 创建时间 |
| updatedTime | LocalDateTime | 更新时间 |
| caseDesc | String | 病例描述 |
| studys | List\<StudyDto\> | 检查列表 |

**示例：**
```json
{
  "caseId": "case_001",
  "name": "张三",
  "gender": 1,
  "age": 45,
  "idNumber": "110101197901011234",
  "contact": "13800138000",
  "medicalHistory": "高血压病史5年",
  "createdTime": "2026-04-20T10:30:00",
  "updatedTime": "2026-04-20T10:30:00",
  "caseDesc": "胸部CT检查",
  "studys": [...]
}
```

---

### 2. StudyDto - 检查信息

| 字段名 | 类型 | 说明 |
|--------|------|------|
| studyId | String | 检查ID |
| studyTime | LocalDate | 检查时间 |
| studyType | String | 检查类型 |
| studyDesc | String | 检查描述 |
| imageIds | List\<String\> | 图像ID列表 |

**示例：**
```json
{
  "studyId": "study_001",
  "studyTime": "2026-04-20",
  "studyType": "CT",
  "studyDesc": "胸部CT平扫",
  "imageIds": ["img_001", "img_002", "img_003"]
}
```

---

### 3. ImageDto - 图像信息

| 字段名 | 类型 | 说明 |
|--------|------|------|
| imageId | String | 图像ID |
| caseId | String | 病例ID |
| studyId | String | 检查ID |
| fileName | String | 文件名 |
| fileFormat | String | 文件格式 |
| fileSize | Long | 文件大小（字节） |
| imagePath | String | 图像路径 |
| uploadedTime | LocalDateTime | 上传时间 |

**示例：**
```json
{
  "imageId": "img_001",
  "caseId": "case_001",
  "studyId": "study_001",
  "fileName": "chest_ct_001.jpg",
  "fileFormat": "jpg",
  "fileSize": 2048576,
  "imagePath": "/uploads/images/chest_ct_001.jpg",
  "uploadedTime": "2026-04-20T10:35:00"
}
```

---

### 4. InferenceResultDto - AI推理结果

| 字段名 | 类型 | 说明 |
|--------|------|------|
| resultId | String | 结果ID |
| imageId | String | 图像ID |
| caseId | String | 病例ID |
| originalImgPath | String | 原始图像路径 |
| bbox | Object | 标注框（可以是单个Map或List\<Map\>） |
| confidenceScore | Double | 置信度分数 |
| label | String | 标签 |
| createdTime | LocalDateTime | AI推理完成时间 |
| **isModified** | Boolean | **是否被医生修改** |
| **modifiedBbox** | Object | **修改后的标注框** |
| **modifiedLabel** | String | **修改后的标签** |
| **modifiedBy** | String | **修改人** |
| **modifiedTime** | LocalDateTime | **修改时间** |
| annotatedImgPath | String | 标注图像路径 |
| comment | CommentDto | 评论信息 |

**bbox 数据格式：**
```json
// 单个标注框
{
  "x": 100,
  "y": 150,
  "width": 200,
  "height": 180
}

// 或多个标注框
[
  {"x": 100, "y": 150, "width": 200, "height": 180},
  {"x": 350, "y": 200, "width": 150, "height": 120}
]
```

**完整示例：**
```json
{
  "resultId": "result_001",
  "imageId": "img_001",
  "caseId": "case_001",
  "originalImgPath": "/uploads/images/chest_ct_001.jpg",
  "bbox": [
    {"x": 100, "y": 150, "width": 200, "height": 180}
  ],
  "confidenceScore": 0.95,
  "label": "肺结节",
  "createdTime": "2026-04-20T10:40:00",
  "isModified": true,
  "modifiedBbox": [
    {"x": 105, "y": 155, "width": 195, "height": 175}
  ],
  "modifiedLabel": "肺结节（良性可能）",
  "modifiedBy": "doctor_001",
  "modifiedTime": "2026-04-20T11:00:00",
  "annotatedImgPath": "/uploads/annotated/chest_ct_001_annotated.jpg",
  "comment": {...}
}
```

---

### 5. CommentDto - 评论信息

| 字段名 | 类型 | 说明 |
|--------|------|------|
| commentId | String | 评论ID |
| satisfaction | String | 满意度 |
| sentence | String | 评论内容 |

**示例：**
```json
{
  "commentId": "comment_001",
  "satisfaction": "满意",
  "sentence": "AI识别准确，标注位置精确"
}
```

---

## 数据层级关系

```
Case (病例)
  ├─ caseId
  ├─ name, gender, age, idNumber, contact
  ├─ medicalHistory, caseDesc
  ├─ createdTime, updatedTime
  └─ studys: List<Study>
       │
       └─ Study (检查)
            ├─ studyId
            ├─ studyTime, studyType, studyDesc
            └─ imageIds: List<String>
                 │
                 └─ Image (图像)
                      ├─ imageId
                      ├─ fileName, fileFormat, fileSize
                      ├─ imagePath
                      └─ uploadedTime
                           │
                           └─ InferenceResult (AI推理结果)
                                ├─ resultId
                                ├─ originalImgPath
                                ├─ bbox, confidenceScore, label
                                ├─ createdTime
                                ├─ isModified, modifiedBbox, modifiedLabel
                                ├─ modifiedBy, modifiedTime
                                ├─ annotatedImgPath
                                └─ comment: CommentDto
                                     ├─ commentId
                                     ├─ satisfaction
                                     └─ sentence
```

---

## 前端使用注意事项

1. **图像显示规则**：只使用 `originalImgPath`，bbox 标注框由前端 Canvas 渲染
2. **bbox 数据类型**：可能是单个对象或数组，需要做类型判断
3. **医生修改标识**：通过 `isModified` 字段判断是否显示修改后的数据
4. **时间格式**：LocalDateTime 格式为 ISO 8601（如：`2026-04-20T10:30:00`）
5. **授权认证**：所有接口都需要在请求头中携带 `Authorization` token

---

## 其他接口

### 创建病例
`POST /api/v1/cases/create`

### 更新病例
`POST /api/v1/cases/{case_id}/update`

### 删除病例
`POST /api/v1/cases/{case_id}/delete`

### 创建检查
`POST /api/v1/cases/{case_id}/study/create`

### 更新检查
`POST /api/v1/cases/{case_id}/study/{study_id}/update`

### 删除检查
`POST /api/v1/cases/{case_id}/study/{study_id}/delete`

### 上传图像
`POST /api/v1/cases/{case_id}/study/{study_id}/upload_image`

---

**文档生成时间：** 2026-04-20
