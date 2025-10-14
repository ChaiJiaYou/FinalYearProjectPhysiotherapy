# 🏗️ 系统架构文档

本文档详细说明智能理疗管理系统的架构设计、技术选型和模块交互关系。

---

## 📋 目录

- [整体架构](#整体架构)
- [技术选型](#技术选型)
- [数据库设计](#数据库设计)
- [模块设计](#模块设计)
- [数据流](#数据流)
- [安全架构](#安全架构)

---

## 🎯 整体架构

### 三层架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│                     (React Frontend)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │Appointment│ │Exercise  │  │Treatment │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│                  (Django REST Framework)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Views   │  │Serializers│ │Permissions│ │Validators│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               Business Services                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │ Action      │  │ Appointment │  │Notification │ │   │
│  │  │ Learning    │  │  Service    │  │  Service    │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ ORM
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
│                  (PostgreSQL / SQLite)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Users   │  │Appointment│ │Treatment │  │  Action  │   │
│  │          │  │          │  │          │  │ Learning │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 前后端分离架构

**优势:**
- ✅ 前后端独立开发和部署
- ✅ API 可被多个客户端复用
- ✅ 更好的可扩展性
- ✅ 明确的职责分离

**通信方式:**
- RESTful API (JSON)
- HTTP/HTTPS 协议
- Token-based 认证

---

## 🛠️ 技术选型

### 后端框架：Django + DRF

**选择理由:**
1. **快速开发**: Django 的"batteries included"哲学
2. **成熟稳定**: 大型社区和丰富的第三方库
3. **ORM 强大**: 简化数据库操作
4. **RESTful 支持**: DRF 提供完善的 API 框架
5. **安全性**: 内置 CSRF、XSS、SQL注入防护

### 前端框架：React

**选择理由:**
1. **组件化**: 代码复用和维护性好
2. **生态丰富**: 大量成熟的库和工具
3. **虚拟 DOM**: 高性能渲染
4. **Hooks**: 简洁的状态管理
5. **社区活跃**: 丰富的学习资源

### UI 框架：Material-UI

**选择理由:**
1. **现代美观**: Google Material Design
2. **组件丰富**: 开箱即用的 UI 组件
3. **响应式**: 自动适配各种屏幕
4. **可定制**: 灵活的主题系统
5. **可访问性**: 符合 WCAG 标准

### AI/ML 技术栈

#### YOLOv8-pose
**选择理由:**
- ✅ 最先进的姿态检测模型
- ✅ 实时性能（30+ FPS）
- ✅ 高准确率（COCO-17 keypoints）
- ✅ 易于集成（Ultralytics）

#### DTW Algorithm
**选择理由:**
- ✅ 不需要大量训练数据
- ✅ 可解释性强（距离度量）
- ✅ 适合时间序列对齐
- ✅ 计算效率高（带约束）

#### NumPy + SciPy
**选择理由:**
- ✅ 高性能数值计算
- ✅ 成熟的科学计算库
- ✅ 与 TensorFlow/PyTorch 兼容

---

## 🗄️ 数据库设计

### ER 图概览

```
┌──────────────┐
│  CustomUser  │ 1──────── * ┌──────────────┐
│ (用户基表)   │              │  Appointment │
└──────────────┘              │   (预约)     │
       │                      └──────────────┘
       │ 1                            │
       │                              │ *
       │ *                            │ 1
┌──────────────┐              ┌──────────────┐
│   Patient    │ 1──────── * │  Treatment   │
│   (患者)     │              │  (治疗计划)  │
└──────────────┘              └──────────────┘
       │ 1                            │ 1
       │                              │
       │ *                            │ *
┌──────────────┐              ┌──────────────┐
│MedicalHistory│              │TreatmentExer │
│  (病历)      │              │cise (练习)   │
└──────────────┘              └──────────────┘
                                     │ *
                                     │
                                     │ 1
                              ┌──────────────┐
                              │   Exercise   │
                              │   (练习库)   │
                              └──────────────┘

        Action Learning 相关表：
┌──────────────┐ 1 ────── * ┌──────────────┐
│    Action    │              │ActionSample  │
│  (动作定义)  │              │ (演示样本)   │
└──────────────┘              └──────────────┘
       │ 1
       │ 
       │ *
┌──────────────┐ 1 ────── * ┌──────────────┐
│ActionTemplate│              │ActionSession │
│  (动作模板)  │              │ (测试会话)   │
└──────────────┘              └──────────────┘
```

### 核心数据表

#### 用户相关

**CustomUser**
```sql
- id: Primary Key
- username: 用户名（唯一）
- email: 邮箱
- role: 角色（admin/therapist/patient）
- is_active: 是否激活
- created_at: 创建时间
```

#### 患者相关

**Patient**
```sql
- id: Primary Key
- user_id: Foreign Key → CustomUser
- date_of_birth: 出生日期
- phone: 电话
- address: 地址
- emergency_contact: 紧急联系人
```

**MedicalHistory**
```sql
- id: Primary Key
- patient_id: Foreign Key → Patient
- notes: 病历记录
- created_at: 创建时间
- updated_at: 更新时间
```

#### 预约相关

**Appointment**
```sql
- id: Primary Key
- patient_id: Foreign Key → Patient
- therapist_id: Foreign Key → CustomUser
- scheduled_at: 预约时间
- duration: 持续时间（分钟）
- status: 状态（pending/confirmed/completed/cancelled）
- patient_message: 患者留言
- cancel_reason: 取消原因
- cancelled_at: 取消时间
- created_at: 创建时间
```

**UnavailableSlot**
```sql
- id: Primary Key
- therapist_id: Foreign Key → CustomUser
- start_time: 开始时间
- end_time: 结束时间
- created_at: 创建时间
```

#### 治疗相关

**Treatment**
```sql
- id: Primary Key
- patient_id: Foreign Key → Patient
- therapist_id: Foreign Key → CustomUser
- start_date: 开始日期
- end_date: 结束日期
- goal_notes: 治疗目标
- status: 状态（active/completed/cancelled）
```

**TreatmentExercise**
```sql
- id: Primary Key
- treatment_id: Foreign Key → Treatment
- exercise_id: Foreign Key → Exercise
- notes: 备注
- order: 顺序
```

**Exercise**
```sql
- id: Primary Key
- exercise_name: 练习名称
- instructions: 说明
- body_part: 身体部位
- difficulty: 难度（beginner/intermediate/advanced）
- category: 分类
- detection_rules: 检测规则（JSON）
```

#### Action Learning 相关

**Action** (动作定义)
```sql
- id: Primary Key
- name: 动作名称
- description: 描述
- mode: 模式（'dtw' / 'clf'）
- params_json: 参数（JSON）
  ├─ thresholds: {thr_in, thr_out}
  ├─ windows: [20, 40, 56]
  ├─ feature_weights: [...]
  ├─ energy_p30, energy_p50, energy_p70
  └─ median_len, band_ratio, ...
- model_path: 模型路径（预留）
- created_by: Foreign Key → CustomUser
- created_at: 创建时间
```

**ActionSample** (演示样本)
```sql
- id: Primary Key
- action_id: Foreign Key → Action
- video_url: 视频文件路径
- keypoints_json: 关键点数据（JSON）
  └─ {frame_idx: {keypoint_name: {xy: [x,y], conf: float}}}
- fps: 帧率
- weak_labels_json: 自动分段标签
- refined_labels_json: 精炼标签
- created_at: 创建时间
```

**ActionTemplate** (动作模板)
```sql
- id: Primary Key
- action_id: Foreign Key → Action
- seq_json: 序列数据（JSON）
  ├─ T: 时间长度
  ├─ F: 特征维度
  └─ data: [[f1,f2,...], ...]
- length: 长度
- feature_dim: 特征维度
- created_at: 创建时间
```

**ActionSession** (测试会话)
```sql
- id: Primary Key
- action_id: Foreign Key → Action
- reps: 识别的重复次数
- started_at: 开始时间
- metrics_json: 性能指标（JSON）
```

---

## 🔄 模块设计

### 1. 用户管理模块

**职责:**
- 用户认证和授权
- 角色权限控制
- 用户资料管理

**组件:**
- `CustomUser` Model
- `UserViewSet` API
- `UserAccountManagement` 前端组件

**权限设计:**
```python
Roles:
- Admin: 全部权限
- Therapist: 
  ✅ 查看/编辑患者信息
  ✅ 管理预约
  ✅ 创建治疗计划
  ❌ 用户管理
- Patient:
  ✅ 查看自己的信息
  ✅ 预约管理
  ✅ 查看治疗计划
  ❌ 其他患者信息
```

### 2. 预约系统模块

**职责:**
- 预约 CRUD
- 日程管理
- 冲突检测

**架构:**
```
Frontend (React Big Calendar)
    ↓ REST API
Django Views (appointment_views.py)
    ↓ Business Logic
Appointment Service
    ↓ ORM
Database (Appointment, UnavailableSlot)
```

**状态机:**
```
pending → confirmed → completed
   ↓          ↓
cancelled  cancelled
```

**[详细文档 →](MODULES/APPOINTMENT_SYSTEM.md)**

### 3. 患者信息管理模块

**职责:**
- 患者档案 CRUD
- 病历管理
- 治疗历史查询

**数据模型:**
- Patient (1) ←→ (1) CustomUser
- Patient (1) ←→ (*) MedicalHistory
- Patient (1) ←→ (*) Treatment

### 4. 治疗计划管理模块

**职责:**
- 治疗计划创建和管理
- 练习分配
- 进度追踪

**组件交互:**
```
Therapist → Create Treatment Plan
         ↓
    Assign Exercises (from Exercise Library)
         ↓
    Patient View Treatment
         ↓
    Patient Perform Exercises (with AI Recognition)
         ↓
    Therapist Review Progress
```

### 5. 运动练习管理模块

**职责:**
- 练习库管理
- 练习配置
- 检测规则设置

**两种模式:**
1. **Legacy Mode**: 基于规则的检测
   - 配置 detection_rules (JSON)
   - 角度/距离/位置规则
   
2. **AI Mode**: Action Learning
   - 录制演示视频
   - 自动学习模式

### 6. **⭐ Action Learning 模块（核心）**

详见 [Action Learning 技术架构](#action-learning-技术架构) 部分

### 7. 通知系统模块

**职责:**
- 实时通知
- 预约提醒

**架构:**
```
Event Trigger (预约创建/修改)
    ↓
Notification Service
    ↓
Frontend Polling/WebSocket (未来)
    ↓
Display Notification
```

---

## 🤖 Action Learning 技术架构

### 系统流程

```
┌─────────────────────────────────────────────────────────────┐
│                   TRAINING PIPELINE                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
    Video Input (3-5 repetitions)
                            ↓
    YOLOv8 Pose Detection (17 keypoints × N frames)
                            ↓
    Adaptive Normalization (mode detection, root/scale)
                            ↓
    Feature Engineering (32 → 64 dimensions)
                            ↓
    Auto Segmentation (velocity + energy based)
                            ↓
    Template Building (time normalization)
                            ↓
    Threshold Estimation (DTW statistics)
                            ↓
    Save to Database (Action, Templates, Thresholds)

┌─────────────────────────────────────────────────────────────┐
│                  INFERENCE PIPELINE                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
    Live Camera Frame
                            ↓
    YOLOv8 Pose Detection
                            ↓
    Adaptive Normalization (sticky root/scale)
                            ↓
    Feature Extraction + Velocity
                            ↓
    Multi-Window DTW Distance Calculation
                            ↓
    Motion Energy Estimation
                            ↓
    Hysteresis State Machine (OUT/IN transitions)
                            ↓
    Repetition Count Output
```

### 服务层架构

```
backend/api/services/
├── pipeline.py           # 主管道：协调所有步骤
│   ├── finalize_action_from_video()
│   ├── setup_action_for_inference()
│   └── process_realtime_frame()
│
├── feat.py              # 特征工程
│   ├── normalize_keypoints()     # 自适应归一化
│   ├── frame_features()          # 提取 32 维特征
│   ├── add_velocity_features()   # 添加速度特征
│   └── z_score_normalize()       # Z-score 归一化
│
├── segmentation.py      # 自动分段
│   ├── auto_segment()            # 自动分割片段
│   ├── build_templates()         # 构建模板
│   └── estimate_thresholds()     # 估计阈值
│
├── dtw.py              # DTW 核心算法
│   ├── dtw_distance()            # DTW 距离计算
│   └── lb_keogh_lower_bound()    # 下界优化
│
└── dtw_recognition.py  # 实时识别
    ├── DTWRecognizer             # 识别器类
    ├── initialize_recognizer()   # 初始化
    └── dtw_infer_update()        # 实时更新
```

### 算法组件

#### 1. 自适应归一化引擎
```python
Input: Raw Keypoints (17 × [x, y, conf])
Output: Normalized Keypoints (scale-invariant)

Components:
- Mode Detector (full/upper/lower body)
- Root Selector (hip/shoulder center)
- Scale Calculator (shoulder/hip width)
- EMA Smoother (temporal stability)
```

#### 2. 特征提取引擎
```python
Input: Normalized Keypoints
Output: 64-D Feature Vector

Features:
- Joint Angles (8D): shoulder/elbow/hip/knee
- Torso Angles (2D): tilt/lean
- Relative Heights (8D): wrist/elbow/knee to shoulder/hip
- Lateral Displacements (8D): x-axis offsets
- Cross-body Distances (6D): wrist/elbow/shoulder/hip/knee/ankle
- Velocity Features (32D): first-order temporal derivatives
```

#### 3. DTW 匹配引擎
```python
Input: Query Sequence [T_q, 64], Templates [M × [T_t, 64]]
Output: Min DTW Distance

Optimizations:
- Sakoe-Chiba Band Constraint (15% bandwidth)
- LB_Keogh Lower Bound Pruning
- Feature Weighting (discriminability/stability)
- Multi-Window Matching (3 window sizes)
```

#### 4. 滞回状态机
```python
States: OUT ↔ IN

Transitions:
OUT → IN:
  ✅ cooldown == 0
  ✅ rearmed_ready
  ✅ distance_smooth ≤ thr_in (0.75 × median)
  ✅ motion_energy ≥ energy_p50 (NEW)
  
IN → OUT:
  ✅ distance_raw ≥ thr_out (1.35 × median)
  OR z_score > 1.9
  OR motion_energy < energy_p30

Parameters (OPTIMIZED):
- thr_in = 0.75 × median (wider gap)
- thr_out = 1.35 × median
- cooldown = 15-20 frames (extended)
- energy_p50 gate (NEW)
```

---

## 📡 数据流

### 用户登录流程

```
Frontend Login Form
    ↓ POST /api/login/ {username, password}
Django Authentication Backend
    ↓ Validate Credentials
    ↓ Generate Token
Database (查询 CustomUser)
    ↓ Return User Data + Token
Frontend
    ↓ Store Token in localStorage
    ↓ Redirect to Dashboard
```

### 预约创建流程

```
Frontend Calendar
    ↓ POST /api/appointments/ {patient, therapist, time, ...}
Appointment View
    ↓ Validate Data (Serializer)
    ↓ Check Conflicts (Business Logic)
Database
    ↓ Save Appointment
    ↓ Trigger Notification
Frontend
    ↓ Refresh Calendar
    ↓ Show Success Message
```

### Action Learning 训练流程

```
Frontend Wizard
    ↓ Step 1: Create Action
    ↓ POST /api/actions/create/ {name, description}
Backend
    ↓ Save Action
    ↓ Return action_id
    
Frontend
    ↓ Step 2: Record Demo Video
    ↓ POST /api/actions/{id}/record/ {video/keypoints}
Backend
    ↓ Save ActionSample
    
Frontend
    ↓ Step 3: Finalize
    ↓ POST /api/actions/{id}/finalize/
Backend (pipeline.py)
    ↓ Extract Keypoints
    ↓ Normalize → Features → Segment → Templates
    ↓ Estimate Thresholds
    ↓ Save ActionTemplates
    ↓ Return Results
Frontend
    ↓ Show Success
    ↓ Ready for Inference
```

### Action Learning 识别流程

```
Frontend Real-time Test
    ↓ POST /api/actions/{id}/setup/
Backend
    ↓ Initialize DTW Recognizer
    ↓ Load Templates
    ↓ Return Setup Status
    
Frontend (每帧，10 FPS)
    ↓ Capture Frame
    ↓ POST /api/infer/stream/ {frame}
Backend
    ↓ YOLOv8 Pose Detection
    ↓ Feature Extraction
    ↓ DTW Distance Calculation
    ↓ State Machine Update
    ↓ Return {state, reps, distance}
Frontend
    ↓ Update UI
    ↓ Display Count
    ↓ Draw Chart
```

---

## 🔒 安全架构

### 认证机制

**Token-based Authentication:**
```
1. User Login → Server validates → Generate Token
2. Client stores Token (localStorage)
3. Every API request includes Token in Header
4. Server validates Token → Allow/Deny
```

### 权限控制

**基于角色的访问控制 (RBAC):**

```python
# Django REST Framework Permissions

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'admin'

class IsTherapistOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ['admin', 'therapist']

class IsPatientOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.patient.user == request.user
```

### 数据安全

1. **密码加密**: Django 的 PBKDF2 算法
2. **HTTPS**: 生产环境强制使用 SSL
3. **CSRF 保护**: Django 内置 CSRF token
4. **SQL 注入防护**: ORM 自动转义
5. **XSS 防护**: React 自动转义

### 文件上传安全

```python
# 限制文件类型
ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.avi']

# 限制文件大小
MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100 MB

# 文件存储路径
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/'
```

---

## 📊 性能优化策略

### 后端优化

1. **数据库查询优化**
```python
# 使用 select_related 减少查询次数
appointments = Appointment.objects.select_related('patient', 'therapist').all()

# 使用 prefetch_related 优化反向查询
actions = Action.objects.prefetch_related('samples', 'templates').all()
```

2. **缓存策略**
```python
# Redis 缓存识别器状态
from django.core.cache import cache

cache.set('recognizer_state', recognizer_data, timeout=3600)
```

3. **异步任务**
```python
# 使用 Celery 处理耗时任务
@celery_app.task
def process_video_async(action_id):
    finalize_action_from_video(action_id)
```

### 前端优化

1. **代码分割**
```javascript
// 懒加载组件
const RealTimeTest = React.lazy(() => import('./RealTimeTest'));
```

2. **状态管理优化**
```javascript
// 使用 useCallback 避免重渲染
const handleClick = useCallback(() => {
  // ...
}, [dependencies]);
```

3. **虚拟化长列表**
```javascript
// 使用 react-window 渲染大量数据
import { FixedSizeList } from 'react-window';
```

### AI 算法优化

1. **DTW 带约束**: 6.7× 加速
2. **LB_Keogh 下界**: 提前剪枝
3. **多窗口并行**: 自适应速度
4. **特征权重**: 聚焦重要特征
5. **滞回优化**: 减少 80% 抖动

---

## 🔌 API 设计原则

### RESTful 设计

```
Resources:
- /api/users/             # 用户
- /api/patients/          # 患者
- /api/appointments/      # 预约
- /api/treatments/        # 治疗计划
- /api/exercises/         # 练习
- /api/actions/           # 动作（Action Learning）

HTTP Methods:
- GET: 查询
- POST: 创建
- PUT/PATCH: 更新
- DELETE: 删除
```

### 响应格式

**成功响应:**
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}
```

**错误响应:**
```json
{
  "success": false,
  "error": "Error message",
  "details": {...}
}
```

### 分页

```json
{
  "count": 100,
  "next": "http://api/resource/?page=2",
  "previous": null,
  "results": [...]
}
```

---

## 🧩 可扩展性设计

### 水平扩展

```
Load Balancer (Nginx)
    ↓
[Django Instance 1] [Django Instance 2] [Django Instance 3]
    ↓                    ↓                    ↓
            Shared PostgreSQL Database
                    ↓
              Shared Redis Cache
                    ↓
          Shared Media Storage (S3/NFS)
```

### 模块化设计

每个功能模块都是独立的 Django App，可以：
- 独立测试
- 独立部署
- 按需加载

### 预留接口

**Action Learning 模式扩展:**
```python
class Action:
    mode = CharField(choices=[
        ('dtw', 'DTW Recognition'),      # 当前实现
        ('clf', 'Deep Learning Classifier'),  # 预留
        ('hybrid', 'Hybrid Approach')    # 预留
    ])
    model_path = CharField()  # 存储 GRU/TCN 模型路径
```

---

## 📈 监控和日志

### 日志架构

```python
# settings.py
LOGGING = {
    'version': 1,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'logs/django.log',
        },
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
        },
        'api.services': {
            'handlers': ['file'],
            'level': 'DEBUG',
        },
    },
}
```

### 性能监控

关键指标：
- API 响应时间
- DTW 计算时间
- 识别准确率
- 系统资源占用

---

## 🔮 未来架构演进

### 短期（3-6 个月）

1. **深度学习集成**
   - 训练 GRU/TCN 分类器
   - 替代 DTW 识别
   
2. **微服务化**
   - AI 服务独立部署
   - 使用 gRPC 通信

3. **实时通信**
   - WebSocket 推送
   - 实时协作

### 长期（6-12 个月）

1. **云原生架构**
   - Kubernetes 部署
   - Docker 容器化
   
2. **多租户 SaaS**
   - 多诊所支持
   - 数据隔离

3. **边缘计算**
   - 移动端 AI 推理
   - 减少网络延迟

---

## 📚 相关文档

- [API 文档](API_DOCUMENTATION.md) - API 接口详细说明
- [Action Learning 技术文档](MODULES/ACTION_LEARNING_TECHNICAL.md) - 算法详解
- [优化总结](OPTIMIZATION_SUMMARY.md) - 性能改进

---

<p align="center">
  系统架构持续演进中... 最后更新: 2025-01-12
</p>

