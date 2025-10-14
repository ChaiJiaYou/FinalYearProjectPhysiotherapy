# 📡 API 接口文档

本文档详细说明智能理疗管理系统的所有 RESTful API 接口。

---

## 📋 目录

- [基础信息](#基础信息)
- [认证接口](#认证接口)
- [用户管理](#用户管理)
- [患者管理](#患者管理)
- [预约系统](#预约系统)
- [治疗管理](#治疗管理)
- [练习管理](#练习管理)
- [⭐ Action Learning](#action-learning-接口)
- [通知系统](#通知系统)

---

## 🔧 基础信息

### Base URL

```
开发环境: http://localhost:8000/api/
生产环境: https://your-domain.com/api/
```

### 认证方式

所有需要认证的接口都需要在请求头中包含 Token：

```http
Authorization: Token your_token_here
```

### 响应格式

**成功响应 (200 OK):**
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}
```

**错误响应 (4xx/5xx):**
```json
{
  "success": false,
  "error": "Error message",
  "details": {...}
}
```

---

## 🔐 认证接口

### 登录

**Endpoint:** `POST /api/login/`

**请求:**
```json
{
  "username": "therapist01",
  "password": "password123"
}
```

**响应:**
```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "user_id": 5,
  "username": "therapist01",
  "email": "therapist@example.com",
  "role": "therapist"
}
```

---

## 👥 用户管理

### 获取用户列表

**Endpoint:** `GET /api/list-users/`

**权限:** Admin

**响应:**
```json
{
  "users": [
    {
      "user_id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z"
    },
    ...
  ]
}
```

### 创建用户

**Endpoint:** `POST /api/create-user/`

**权限:** Admin

**请求:**
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "secure_password",
  "role": "therapist",
  "first_name": "John",
  "last_name": "Doe"
}
```

### 更新用户状态

**Endpoint:** `PUT /api/update-user-status/<user_id>/`

**权限:** Admin

**请求:**
```json
{
  "is_active": false
}
```

### 修改密码

**Endpoint:** `POST /api/change-password/`

**权限:** Authenticated

**请求:**
```json
{
  "old_password": "current_password",
  "new_password": "new_secure_password"
}
```

---

## 🏥 患者管理

### 获取患者列表

**Endpoint:** `GET /api/list-patients/`

**权限:** Therapist, Admin

**响应:**
```json
{
  "patients": [
    {
      "patient_id": 10,
      "user_id": 15,
      "full_name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1234567890",
      "date_of_birth": "1990-05-15",
      "address": "123 Main St"
    },
    ...
  ]
}
```

### 获取患者详情

**Endpoint:** `GET /api/get-patient-detail/<patient_id>/`

**权限:** Therapist, Admin, Patient (own)

**响应:**
```json
{
  "patient_id": 10,
  "user_id": 15,
  "full_name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "date_of_birth": "1990-05-15",
  "medical_history": [
    {
      "id": 1,
      "notes": "Lower back pain",
      "created_at": "2025-01-05T10:00:00Z"
    }
  ],
  "treatments": [...],
  "appointments": [...]
}
```

### 添加病历

**Endpoint:** `POST /api/add-medical-history/<patient_id>/`

**权限:** Therapist, Admin

**请求:**
```json
{
  "notes": "Patient reports improvement in mobility",
  "assessment": "Range of motion increased by 20%"
}
```

---

## 📅 预约系统

### 创建预约

**Endpoint:** `POST /api/appointments/`

**权限:** Patient, Therapist, Admin

**请求:**
```json
{
  "patient_id": 10,
  "therapist_id": 3,
  "scheduled_at": "2025-01-15T14:00:00Z",
  "duration": 60,
  "patient_message": "Neck pain treatment",
  "status": "pending"
}
```

**响应:**
```json
{
  "success": true,
  "appointment": {
    "id": 25,
    "patient_id": 10,
    "therapist_id": 3,
    "scheduled_at": "2025-01-15T14:00:00Z",
    "duration": 60,
    "status": "pending",
    "created_at": "2025-01-12T09:30:00Z"
  }
}
```

### 获取预约列表

**Endpoint:** `GET /api/appointments/list/`

**权限:** Authenticated

**查询参数:**
- `therapist_id` - 治疗师 ID
- `patient_id` - 患者 ID
- `date` - 日期（YYYY-MM-DD）
- `status` - 状态筛选

**示例:**
```http
GET /api/appointments/list/?therapist_id=3&date=2025-01-15
```

**响应:**
```json
{
  "appointments": [
    {
      "id": 25,
      "patient_name": "Jane Smith",
      "therapist_name": "Dr. Wilson",
      "scheduled_at": "2025-01-15T14:00:00Z",
      "duration": 60,
      "status": "confirmed"
    },
    ...
  ]
}
```

### 更新预约状态

**Endpoint:** `PUT /api/appointments/<appointment_id>/`

**权限:** Related Therapist, Patient, Admin

**请求:**
```json
{
  "status": "confirmed"
}
```

### 取消预约

**Endpoint:** `POST /api/appointments/<appointment_id>/cancel/`

**请求:**
```json
{
  "cancel_reason": "Patient requested rescheduling"
}
```

### 获取可用时段

**Endpoint:** `GET /api/availability/`

**查询参数:**
- `therapist_id` - 必需
- `date` - 必需（YYYY-MM-DD）

**响应:**
```json
{
  "available_slots": [
    {
      "start_time": "2025-01-15T09:00:00Z",
      "end_time": "2025-01-15T10:00:00Z",
      "available": true
    },
    ...
  ]
}
```

---

## 💊 治疗管理

### 获取治疗计划列表

**Endpoint:** `GET /api/treatments/`

**权限:** Therapist, Admin

**响应:**
```json
{
  "treatments": [
    {
      "id": 5,
      "patient_name": "Jane Smith",
      "therapist_name": "Dr. Wilson",
      "start_date": "2025-01-10",
      "end_date": "2025-02-10",
      "status": "active",
      "exercise_count": 5
    },
    ...
  ]
}
```

### 创建治疗计划

**Endpoint:** `POST /api/create-treatment/`

**权限:** Therapist, Admin

**请求:**
```json
{
  "patient_id": 10,
  "therapist_id": 3,
  "start_date": "2025-01-15",
  "end_date": "2025-02-15",
  "goal_notes": "Improve shoulder mobility",
  "exercises": [
    {"exercise_id": 1, "notes": "3 sets of 10 reps"},
    {"exercise_id": 2, "notes": "Hold for 30 seconds"}
  ]
}
```

### 获取治疗详情

**Endpoint:** `GET /api/treatments/<treatment_id>/`

**响应:**
```json
{
  "id": 5,
  "patient": {...},
  "therapist": {...},
  "start_date": "2025-01-10",
  "end_date": "2025-02-10",
  "goal_notes": "Improve shoulder mobility",
  "status": "active",
  "exercises": [
    {
      "exercise_id": 1,
      "exercise_name": "Shoulder Raise",
      "notes": "3 sets of 10 reps",
      "order": 1
    },
    ...
  ]
}
```

---

## 🏋️ 练习管理

### 获取练习列表

**Endpoint:** `GET /api/exercises/`

**响应:**
```json
{
  "exercises": [
    {
      "exercise_id": 1,
      "exercise_name": "Shoulder Raise",
      "instructions": "Raise arms to shoulder level",
      "body_part": "shoulder",
      "difficulty": "beginner",
      "category": "flexibility",
      "detection_rules": {
        "type": "angle",
        "points": [7, 5, 9],
        "range": [60, 160]
      }
    },
    ...
  ]
}
```

### 创建练习

**Endpoint:** `POST /api/create-exercise/`

**权限:** Admin

**请求:**
```json
{
  "exercise_name": "Arm Curl",
  "instructions": "Bend elbow to 90 degrees",
  "body_part": "elbow",
  "difficulty": "beginner",
  "category": "strength",
  "detection_rules": {
    "type": "angle",
    "points": [5, 7, 9],
    "range": [45, 100],
    "confirmFrames": 5
  }
}
```

### 姿态检测（Legacy）

**Endpoint:** `POST /api/detect-pose/`

**请求:** `multipart/form-data`
```
frame: <image_file>
```

**响应:**
```json
{
  "keypoints": [
    [x0, y0],
    [x1, y1],
    ...
  ],
  "confidence": 0.95,
  "person_detected": true
}
```

---

## ⭐ Action Learning 接口

### 创建新动作

**Endpoint:** `POST /api/actions/create/`

**权限:** Therapist, Admin

**请求:**
```json
{
  "name": "Arm Raise",
  "description": "Raise arms above head",
  "mode": "dtw"
}
```

**响应:**
```json
{
  "success": true,
  "action": {
    "id": 42,
    "name": "Arm Raise",
    "description": "Raise arms above head",
    "mode": "dtw",
    "created_at": "2025-01-12T10:00:00Z"
  }
}
```

### 获取动作列表

**Endpoint:** `GET /api/actions/`

**响应:**
```json
{
  "actions": [
    {
      "id": 42,
      "name": "Arm Raise",
      "description": "Raise arms above head",
      "mode": "dtw",
      "template_count": 4,
      "sample_count": 1,
      "created_by": "therapist01",
      "created_at": "2025-01-12T10:00:00Z"
    },
    ...
  ]
}
```

### 获取动作详情

**Endpoint:** `GET /api/actions/<action_id>/`

**响应:**
```json
{
  "id": 42,
  "name": "Arm Raise",
  "description": "Raise arms above head",
  "mode": "dtw",
  "params_json": {
    "thresholds": {
      "thr_in": 0.75,
      "thr_out": 1.35,
      "median": 1.0
    },
    "median_len": 40,
    "windows": [20, 40, 56],
    "energy_p30": 0.2,
    "energy_p50": 0.5,
    "energy_p70": 1.0,
    "feature_weights": [...]
  },
  "samples": [
    {
      "id": 15,
      "has_video": true,
      "video_url": "/media/action_videos/action_42_1234567890.mp4",
      "fps": 30,
      "created_at": "2025-01-12T10:05:00Z"
    }
  ],
  "templates": [
    {
      "id": 50,
      "length": 40,
      "feature_dim": 64,
      "created_at": "2025-01-12T10:06:00Z"
    },
    ...
  ],
  "template_count": 4,
  "sample_count": 1
}
```

### 上传演示数据

**Endpoint:** `POST /api/actions/<action_id>/record/`

**请求:** `multipart/form-data`

**选项 1: 上传视频**
```
video: <video_file.mp4>
```

**选项 2: 上传关键点数据**
```json
{
  "keypoints": {
    "0": {
      "keypoints": [[x, y, conf], ...]
    },
    "1": {...},
    ...
  },
  "fps": 30
}
```

**响应:**
```json
{
  "success": true,
  "sample_id": 15,
  "frame_count": 90,
  "fps": 30
}
```

### 完成训练（生成模板）

**Endpoint:** `POST /api/actions/<action_id>/finalize/`

**请求:** 无需 body

**响应:**
```json
{
  "success": true,
  "action_id": 42,
  "templates_count": 4,
  "thresholds": {
    "thr_in": 0.75,
    "thr_out": 1.35,
    "median": 1.0,
    "iqr": 0.3
  },
  "frames_processed": 90,
  "median_len": 40,
  "windows": [20, 40, 56],
  "energy_stats": {
    "p30": 0.2,
    "p50": 0.5,
    "p70": 1.0
  },
  "feature_weights": [0.015, 0.020, ...]
}
```

### 设置推理环境

**Endpoint:** `POST /api/actions/<action_id>/setup/`

**请求:** 无需 body

**响应:**
```json
{
  "success": true,
  "action_id": 42,
  "templates_count": 4,
  "thresholds": {
    "thr_in": 0.75,
    "thr_out": 1.35
  },
  "window_size": 56,
  "windows": [20, 40, 56]
}
```

### 实时推理

**Endpoint:** `POST /api/infer/stream/`

**请求:** `multipart/form-data`
```
frame: <image_file>
```

**或 JSON:**
```json
{
  "features": [0.1, 0.2, ..., 0.64],  // 64-D feature vector
  "update_thresholds": {  // 可选
    "thr_in": 0.8,
    "thr_out": 1.2
  }
}
```

**响应:**
```json
{
  "state": "IN",
  "reps": 3,
  "distance": 0.65,
  "thresholds": {
    "thr_in": 0.75,
    "thr_out": 1.35
  },
  "debug": {
    "buffer_size": 48,
    "min_distance_raw": 0.67,
    "min_distance_smoothed": 0.65,
    "motion_energy": 1.2,
    "z": -0.3,
    "frames_in_state": 8,
    "cooldown_frames": 0,
    "rearmed_ready": 0.0
  }
}
```

**状态说明:**
- `OUT` - 不在动作中
- `IN` - 正在执行动作

### 重置推理状态

**Endpoint:** `POST /api/infer/reset/`

**请求:** 无需 body

**响应:**
```json
{
  "status": "reset_success"
}
```

### 获取推理状态

**Endpoint:** `GET /api/infer/status/`

**响应:**
```json
{
  "initialized": true,
  "state": "OUT",
  "reps": 5,
  "templates_count": 4,
  "window_size": 56,
  "thresholds": {
    "thr_in": 0.75,
    "thr_out": 1.35
  }
}
```

### 删除动作

**Endpoint:** `DELETE /api/actions/<action_id>/delete/`

**权限:** Creator, Admin

**响应:**
```json
{
  "success": true,
  "message": "Action deleted successfully",
  "deleted": {
    "action": 1,
    "samples": 2,
    "templates": 4,
    "sessions": 3
  }
}
```

---

## 🔔 通知系统

### 获取通知列表

**Endpoint:** `GET /api/notifications/`

**权限:** Authenticated

**响应:**
```json
{
  "count": 5,
  "results": [
    {
      "id": 10,
      "title": "Appointment Reminder",
      "message": "You have an appointment tomorrow at 2 PM",
      "is_read": false,
      "created_at": "2025-01-12T09:00:00Z"
    },
    ...
  ]
}
```

### 标记通知为已读

**Endpoint:** `POST /api/notifications/<notification_id>/mark-read/`

**响应:**
```json
{
  "success": true,
  "notification_id": 10,
  "is_read": true
}
```

---

## 🔍 高级功能

### 批量操作

#### 批量创建预约

**Endpoint:** `POST /api/appointments/batch/`

**请求:**
```json
{
  "appointments": [
    {
      "patient_id": 10,
      "therapist_id": 3,
      "scheduled_at": "2025-01-15T14:00:00Z",
      "duration": 60
    },
    ...
  ]
}
```

### 数据导出

#### 导出患者数据

**Endpoint:** `GET /api/patients/export/`

**查询参数:**
- `format` - csv/json/xlsx

**响应:** 文件下载

---

## 📊 性能指标接口

### Action Learning 性能统计

**Endpoint:** `GET /api/actions/<action_id>/metrics/`

**响应:**
```json
{
  "action_id": 42,
  "total_sessions": 15,
  "total_reps": 150,
  "avg_accuracy": 0.92,
  "avg_response_time_ms": 85,
  "last_session": {
    "reps": 10,
    "duration_seconds": 120,
    "avg_distance": 0.68
  }
}
```

---

## 🚨 错误代码

| 状态码 | 说明 | 示例 |
|--------|------|------|
| 200 | 成功 | 请求成功完成 |
| 201 | 已创建 | 资源创建成功 |
| 400 | 请求错误 | 参数验证失败 |
| 401 | 未认证 | Token 缺失或无效 |
| 403 | 禁止访问 | 权限不足 |
| 404 | 未找到 | 资源不存在 |
| 500 | 服务器错误 | 内部错误 |

### 常见错误示例

#### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

#### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Action not found"
}
```

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid request data",
  "details": {
    "name": ["This field is required."],
    "scheduled_at": ["Invalid datetime format."]
  }
}
```

---

## 📝 请求示例

### cURL 示例

#### 登录
```bash
curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "therapist01", "password": "password123"}'
```

#### 获取动作列表（带认证）
```bash
curl -X GET http://localhost:8000/api/actions/ \
  -H "Authorization: Token your_token_here"
```

#### 创建预约
```bash
curl -X POST http://localhost:8000/api/appointments/ \
  -H "Authorization: Token your_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 10,
    "therapist_id": 3,
    "scheduled_at": "2025-01-15T14:00:00Z",
    "duration": 60
  }'
```

### JavaScript (Fetch) 示例

#### 登录
```javascript
const response = await fetch('http://localhost:8000/api/login/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'therapist01',
    password: 'password123'
  })
});

const data = await response.json();
localStorage.setItem('token', data.token);
```

#### 获取动作列表
```javascript
const response = await fetch('http://localhost:8000/api/actions/', {
  headers: {
    'Authorization': `Token ${localStorage.getItem('token')}`
  }
});

const data = await response.json();
console.log(data.actions);
```

#### 上传演示视频
```javascript
const formData = new FormData();
formData.append('video', videoFile);

const response = await fetch(`http://localhost:8000/api/actions/${actionId}/record/`, {
  method: 'POST',
  headers: {
    'Authorization': `Token ${localStorage.getItem('token')}`
  },
  body: formData
});
```

---

## 🔄 实时识别工作流程

### 完整流程示例

```javascript
// 1. 设置动作
const setupResponse = await fetch(`/api/actions/${actionId}/setup/`, {
  method: 'POST',
  headers: { 'Authorization': `Token ${token}` }
});

// 2. 开始实时推理循环
const inferenceLoop = setInterval(async () => {
  // 捕获摄像头帧
  const frameBlob = await captureFrame();
  
  // 发送推理请求
  const formData = new FormData();
  formData.append('frame', frameBlob);
  
  const response = await fetch('/api/infer/stream/', {
    method: 'POST',
    headers: { 'Authorization': `Token ${token}` },
    body: formData
  });
  
  const result = await response.json();
  
  // 更新 UI
  updateCount(result.reps);
  updateState(result.state);
  updateChart(result.distance);
}, 100); // 10 FPS

// 3. 停止时重置
const stopInference = async () => {
  clearInterval(inferenceLoop);
  
  await fetch('/api/infer/reset/', {
    method: 'POST',
    headers: { 'Authorization': `Token ${token}` }
  });
};
```

---

## 📚 相关文档

- [系统架构](ARCHITECTURE.md) - 了解整体设计
- [Action Learning 技术文档](MODULES/ACTION_LEARNING_TECHNICAL.md) - 算法详解
- [快速开始](QUICK_START.md) - 快速上手

---

## 🆘 API 支持

遇到 API 问题？

1. 检查请求格式是否正确
2. 确认 Token 是否有效
3. 查看后端日志: `backend/logs/django.log`
4. 提交 GitHub Issue

---

<p align="center">
  API 文档持续更新中... 最后更新: 2025-01-12
</p>

