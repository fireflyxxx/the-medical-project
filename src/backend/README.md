# 医疗影像数据管理平台 (后端) 架构与开发演进文档

## 1. 项目背景与定位
本项目为《医疗影像管理系统》，定位为教学实验原型（非商业化产品），核心场景为“医疗影像数据管理 + AI 图像识别”。项目主要服务于管理员、医生及科研人员，支持肺炎检测的骨架流程。

## 2. 技术栈与架构
*   **语言与框架**：Java 21, Spring Boot 3.4.x, Spring WebMVC, Spring Data JPA
*   **安全与鉴权**：Spring Security (轻量级引入), JWT (jjwt), Bcrypt 密码哈希
*   **数据库与缓存**：MySQL 8.0, Redis (用于异步队列与数据缓存)
*   **医疗影像处理**：dcm4che3 (DICOM 图像智能解析与格式转换)
*   **容器化与部署**：Docker, Docker Compose
*   **工具支持**：Lombok, Maven

### 2.1 核心永久数据模型 (数据库表说明)
系统中主要的持久化业务数据由以下实体（对应核心数据库表）构成：
1. **APP_USER (用户表)**：系统长期的账户体系库，包含哈希加密密码与角色（医生/管理员等）权限信息。
2. **PATIENT_CASE (病例表)**：患者的基础档案信息（姓名、性别、年龄、创建关联等）。
3. **STUDY (检查/检验记录表)**：依附于病例，一个病例下可包含多次“检查记录”。
4. **IMAGE_ASSET (影像资产表)**：挂载于单次检查记录下，存储原始扫描影像文件。
5. **INFERENCE_TASK & INFERENCE_RESULT (AI任务与结果表)**：负责记录对应检查发起至AI端的预测任务状态，以及持久化AI返回的长期分析结果（疾病分类、置信度、原始病灶标识 Bounding Box 等）。同时支持**医生人工修正靶区（Human-in-the-loop）**的数据双写存档（保留 AI 原始预测及医生修改后的 Bounding Box）。
6. **DOCTOR_COMMENT (医生诊疗意见表)**：用于存档医生针对相关检查记录出具的文本诊断结论与修改批注。
7. **AUDIT_LOG / SATISFACTION (审计日志与反馈表)**：系统操作溯源及用户满意度评价。

## 3. 核心功能演进与 AI 对接记录
我们在项目的迭代过程中，基于原型系统完成了全链路的 AI 对接和架构重构升级：

### 3.1 真实 AI 模型接入与业务解耦 (AI Integration)
*   **多模型动态路由分发**：系统摒弃了单一模型硬编码，基于 `application.properties` 实现了多环境无缝的动态模型路由（如 `pneumonia`, `fracture`, `tumor`），后台服务可精准匹配并代理转发内网中针对专病的异构 AI 服务节点。
*   **AI 推理结果 Redis 缓存**：针对相同影像靶区、相同模型与置信度阈值的重复预测请求，我们引入了 Redis `StringRedisTemplate` 实现了有效长达 7 天的防重算缓存（Cache-Aside Pattern），极大地节省了 GPU 计算波峰资源开销。
*   **消息队列削峰填谷 (Redis MQ)**：针对耗时极长的医学图像推理任务，系统全面升级为**基于 Redis 的异步消息队列架构**。
    *   **单张推理防抖拦截**：针对前端同步发起的单次推理 `/infer`，在 Service 层实现了状态排他性校验，避免 Python 容器由于浏览器多指点击陷入雪崩。
    *   **批量推理队列编排**：利用 Redis 数据结构实现了排队，配合 Spring Boot `@Scheduled` 做到了“先落库、再入队”。即便一次上传百张，依然单线程可控出队。
*   **前端渲染解耦**：AI 节点仅吐出核心检测框坐标（Bounding Box / doc_bbox JSON）与分类，彻底抛弃后台绘图落盘的重包袱。前端 Canvas 负责叠涂层二次消费。

### 3.2 影像数据流与自动格式转换 (DICOM Processing)
*   **DCM 智能解析转换**：鉴于部分现代高位深与多帧 DICOM (`.dcm`) 无法直接供标准 AI 网络和 Web `<canvas>` 畅通无阻，框架接入了 `dcm4che3`。支持上传链路上进行快速像素提取及 W/L 计算，全透明地在落地为持久化 JPEG 资产。

### 3.3 医生靶区修正与双轨入库 (Human-in-the-Loop)
*   **医生复核与标记流转**：增设了专门针对“漏诊、误诊区域框擦写”的 `/doc_bbox/update` 端点接口设计。若医生认为 AI 跑出的边界存疑或靶标不对，能在端上覆盖，通过该模型系统安全更新其内部数据库的 `modified_bbox` 和 `modified_label` 等一系列字段，原始 AI 输出将继续锁存作对比，做到不丢数且不断追踪人的意志。

### 3.4 科研核心数据 API 升级 (Researcher Data Retrieval)
*   **响应结构化拓展**：基于 `InferenceResultDto` 的重构升级。调取记录 (`GET /api/v1/infer_result/get`) 除囊括原本的 AI 基线外，由于联表一并关联呈现 `modifiedBbox` / `doc_bbox` 等双轨数据比对以及原图流 `originalImgPath`；研究方再也无需发起 N+1 低效请求组合看前后结果了。

### 3.5 图床映射与静态数据持久保护 (Storage & Routing)
*   **Spring `WebMvcConfig`**：实现了全自动本地目录（`uploads/`）向外网 URL 资源的映射曝光。客户端从此可以通过静态资源路径直接消费已上传图片。
*   **跨环境路径对齐**：通过抽象统一存放目录，系统成功适应了开发期（根目录下建立子目录）和部署期（宿主机建立安全目录并通过 Docker `-v` 挂载）两种路径模型。

### 3.6 脚本化跨环境测试 (.http Scripts)
由于系统涉及前后多端和不同权限认证模式，为了帮助后端和维护人员快速验证全链路：
*   **本地自动化: `test/api-test.http`**：为开发者提供了全套快速的自包含回归验证。
*   **容器远程自动化: `test/remote-server-test.http`**：针对公网部署环境做了调整（提取公网环境地址、提取 Token 等自动挂载环境变量），可实现从 JWT 登录、建档、上传图片、发起预测，直到调取科研数据流转一次性的 E2E 测试。

## 4. 自动化测试与日常联调
推荐您安装 VS Code 的 **REST Client** 插件。项目测试目录 (`src/test/`) 内包含 `.http` 文件，直接打开文件并点击 `Send Request` 即可一键拉起跨功能请求。所有的 JWT、临时图片 ID 与任务 ID 返回都会以自动化变量形式透传到下文节点中。

---

## 5. 项目运行与 Docker 部署指南

### 5.1 Docker 容器化一键部署 (生产与演示推荐)
本架构已被改造为 Docker 级别部署结构。当环境拥有 Docker Compose 时：

**1. 准备宿主机的持久化目录（防止重启数据丢失）：**
```bash
sudo mkdir -p /data/medical/uploads
sudo chmod 777 /data/medical/uploads
```

**2. 在项目根工程目录下运行编排启动：**
```bash
docker-compose up -d --build
```
此时：
* 后端将绑定对外暴露端口（例如 `8080` 或 `80`）。
* 内网将会拉起无外网入口的 MySQL 与 Python AI 的隔离运算节点。
* 任何由后端产生的上传图片会经由 Docker `volumes` （挂载点映射）写出到宿主机的 `/data/medical/uploads`。

### 5.2 传统本地开发模式启动
1. **环境准备**：JDK 21, Maven, MySQL 8.
2. **执行 SQL**：利用诸如 Navicat/命令行 执行 `src/main/resources/medical_imaging_schema.sql` 完成 `medical_imaging_system` 库创建与表结构初始化。
3. **启动应用**：通过 IDE 的主类 `MedicalImagingSystemApplication` 运行，或在后端根目录终端敲击 `mvn spring-boot:run` 启动（运行于本地 8080 端口）。

## 6. 遗留可优化点与下一步发展 (Todo)
1. **完善审计与统计大屏**：丰富基于 `AUDIT_LOG` 表的行为抓取展示。
2. **端到端模型再训练 (Active Learning)**：既然系统中现已通过前端交互沉淀了大量的医生人工修正验证集 (Ground Truth)，后续可通过 Airflow 调度提取这些优质标签，搭建循环反哺 Python 层进行模型的定向微调机制。
3. **前端 WebSocket 实时推送**：当前批量推理任务的进度是由前端定时轮询获取的。可以尝试升级接入 WebSocket/SSE (Server-Sent Events) ，真正消除高频长连接耗损，构建强实时弹窗体系。
