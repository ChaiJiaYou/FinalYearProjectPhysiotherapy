# 物理治疗预约系统

## 系统概述

这是一个完整的物理治疗预约管理系统，支持三种用户角色：**患者(Patient)**、**治疗师(Therapist)**、**管理员(Admin)**。系统采用Django + DRF后端和React + Material UI前端架构。

## 技术栈

### 后端
- Python 3.x
- Django 4.2
- Django Rest Framework (DRF)
- PostgreSQL
- 函数式视图 (@api_view)

### 前端
- React 18
- Material UI (MUI)
- React Router DOM
- React Toastify

## 核心功能

### 1. 预约管理
- **治疗师创建预约**：支持已有患者和新患者占位模式
- **时间冲突检测**：自动检测治疗师时间冲突
- **状态管理**：Scheduled → Completed/Cancelled
- **并发安全**：预约编号生成使用事务和行级锁

### 2. 新患者占位系统
- 治疗师可为新患者创建占位预约
- 前台可绑定占位预约到正式患者账户
- 支持contact_name和contact_phone字段

### 3. 可用时间槽管理
- 治疗师可创建和管理可用时间槽
- 支持buffer_min缓冲时间
- 状态管理：open/closed

### 4. 通知系统
- 预约创建通知
- 状态变更通知
- 可扩展的适配器架构（控制台、日志、邮件、短信等）

## 数据模型

### Appointment (预约)
```python
- appointment_code: 预约编号 (APT-YYYYMMDD-###)
- therapist_id: 治疗师ID (必填)
- patient_id: 患者ID (可为空，占位模式)
- contact_name: 联系人姓名 (占位模式)
- contact_phone: 联系电话 (占位模式)
- start_at: 开始时间
- end_at: 结束时间
- duration_min: 时长 (30/45/60分钟)
- mode: 模式 (onsite/tele/home)
- status: 状态 (Scheduled/Completed/Cancelled)
- notes: 预约备注
- session_notes: 诊疗记录
```

### AvailabilitySlot (可用时间槽)
```python
- therapist_id: 治疗师ID
- start_at: 开始时间
- end_at: 结束时间
- buffer_min: 缓冲时间(分钟)
- status: 状态 (open/closed)
```

## API端点

### 预约管理
- `POST /api/appointments/` - 创建预约
- `GET /api/appointments/list/` - 获取预约列表
- `PATCH /api/appointments/{id}/` - 更新预约状态

### 可用时间槽
- `GET /api/availability/` - 获取可用时间槽
- `POST /api/availability/create/` - 创建可用时间槽

### 操作类型
- `complete` - 完成预约
- `cancel` - 取消预约
- `bind_patient` - 绑定患者到占位预约

## 安装和运行

### 后端设置

1. **安装依赖**
```bash
cd backend
pip install -r requirements.txt
```

2. **数据库迁移**
```bash
python manage.py migrate
```

3. **加载种子数据**
```bash
python manage.py loaddata api/fixtures/appointment_seed_data.json
```

4. **运行测试**
```bash
python manage.py test api.tests.test_appointment_system
```

5. **启动服务器**
```bash
python manage.py runserver
```

### 前端设置

1. **安装依赖**
```bash
cd frontend
npm install
```

2. **启动开发服务器**
```bash
npm start
```

## 使用说明

### 治疗师预约管理
1. 登录后访问 `/therapist/schedule`
2. 选择日期查看预约
3. 点击"Create Appointment"创建新预约
4. 选择患者或创建新患者占位
5. 设置时间、时长、模式等
6. 管理预约状态（完成/取消）

### 占位预约管理
1. 在创建预约时选择"New Patient (Placeholder)"
2. 填写联系姓名和电话
3. 预约创建后显示"New Patient"标签
4. 可在预约详情中查看联系方式

### 患者查看预约
1. 登录后访问 `/patient/appointments`
2. 查看即将到来的预约
3. 查看预约历史
4. 点击预约查看详细信息

## 测试数据

系统包含以下测试数据：
- 2位治疗师 (dr_smith, dr_jones)
- 3位患者 (patient_alice, patient_bob, patient_carol)
- 示例预约和可用时间槽
- 占位预约用于测试绑定功能

## 关键特性

### 1. 并发安全
- 预约编号生成使用数据库事务
- SELECT FOR UPDATE锁定确保唯一性
- 格式：APT-YYYYMMDD-### (如：APT-20250220-001)

### 2. 时间冲突检测
- 区间重叠算法检测冲突
- 只检查Scheduled和Completed状态
- 返回409状态码和详细错误信息

### 3. 通知系统
- 可扩展的适配器架构
- 支持控制台、日志、邮件、短信等
- 预约创建和状态变更自动通知

### 4. 响应式设计
- Material UI组件
- 适配不同屏幕尺寸
- 直观的用户界面

## 文件结构

```
backend/
├── api/
│   ├── models.py              # 数据模型
│   ├── serializers.py         # 序列化器
│   ├── views.py              # 旧API视图
│   ├── appointment_views.py  # 新预约API视图
│   ├── services/
│   │   └── notification_service.py  # 通知服务
│   ├── fixtures/
│   │   └── appointment_seed_data.json  # 种子数据
│   └── tests/
│       └── test_appointment_system.py  # 测试用例

frontend/src/components/AfterLogin/Appointment/
├── Therapist/
│   ├── TherapistAppointmentPage.js  # 治疗师预约管理主页面
│   ├── TherapistAppointments.js     # 旧版治疗师预约页面
│   └── CreateAppointmentDialog.js   # 创建预约对话框
├── Patient/
│   └── PatientAppointments.js       # 患者预约查看
```

## 注意事项

1. **时区处理**：后端存储UTC时间，前端按浏览器时区显示
2. **权限控制**：各角色只能访问相应的功能
3. **数据验证**：前后端双重验证确保数据完整性
4. **错误处理**：友好的错误提示和状态码
5. **向后兼容**：保留旧API端点确保兼容性

## 扩展功能

系统设计支持以下扩展：
- 邮件/短信通知集成
- 预约提醒功能
- 预约统计和分析
- 多语言支持
- 移动端适配

## 故障排除

### 常见问题

1. **迁移失败**：检查数据库连接和权限
2. **API错误**：查看Django日志和CORS设置
3. **前端错误**：检查API端点URL和网络连接
4. **时区问题**：确保前后端时区设置一致

### 调试模式

启用Django调试模式：
```python
DEBUG = True
```

查看详细错误信息：
```bash
python manage.py runserver --verbosity=2
```

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

## 许可证

MIT License
