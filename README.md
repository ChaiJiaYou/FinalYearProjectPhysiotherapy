# 🏥 智能理疗管理系统 (Physiotherapy Management System)

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.8+-blue.svg" alt="Python">
  <img src="https://img.shields.io/badge/Django-4.x-green.svg" alt="Django">
  <img src="https://img.shields.io/badge/React-19.0-blue.svg" alt="React">
  <img src="https://img.shields.io/badge/TensorFlow-4.x-orange.svg" alt="TensorFlow">
  <img src="https://img.shields.io/badge/YOLOv8-8.3.0-red.svg" alt="YOLOv8">
  <img src="https://img.shields.io/badge/Material--UI-5.x-blue.svg" alt="MUI">
  <img src="https://img.shields.io/badge/Status-Completed-success.svg" alt="Status">
</p>

## 📋 项目概述

这是一个基于 AI 的智能理疗管理系统，专为理疗诊所设计，旨在优化患者管理、治疗计划和运动康复训练。系统的核心创新是 **AI 驱动的动作学习与识别模块**，采用 DTW (Dynamic Time Warping) 算法和深度学习姿态检测技术，能够自动学习和识别康复动作，实时计数并提供反馈。

### 🎯 解决的问题

传统理疗系统面临的挑战：
- ❌ 手动配置运动检测规则复杂且耗时
- ❌ 无法适应个性化的康复动作
- ❌ 缺乏实时反馈和准确的动作计数
- ❌ 治疗师难以远程监督患者训练

### ✨ 我们的解决方案

通过 AI 技术实现：
- ✅ **录制即学习**：3-5 次动作演示即可自动学习
- ✅ **实时识别计数**：准确率达 92%，延迟 < 100ms
- ✅ **自适应算法**：支持不同速度和幅度的动作执行
- ✅ **完整管理系统**：整合预约、治疗、患者管理等功能

---

## 🌟 核心特性

### 🤖 AI 动作学习与识别（核心创新）
- **自动学习**：从演示视频自动提取动作模式，无需手动配置
- **实时识别**：基于 DTW 算法的实时动作识别和计数
- **高准确率**：优化后稳定性达 92%，误触发减少 80%
- **自适应归一化**：自动适应不同身高、体型和摄像头角度
- **多窗口 DTW**：支持不同速度的动作执行

### 📅 智能预约系统
- 灵活的预约创建、修改和取消
- 治疗师日程管理和不可用时段设置
- 预约状态追踪（待定/确认/完成/取消）
- 自动冲突检测和提醒

### 👥 患者信息管理
- 完整的患者档案管理
- 病历记录和查看
- 治疗历史追踪

### 💊 治疗计划管理
- 个性化治疗计划创建
- 治疗模板和练习库
- 治疗进度跟踪和评估
- 练习分配和调整

### 🏋️ 运动练习管理
- 练习项目库（按身体部位分类）
- 练习难度设置和说明
- 演示视频管理
- 两种模式：AI 识别 + 传统规则引擎

### 👤 用户账号管理
- 多角色权限控制（管理员/治疗师/患者）
- 用户资料管理
- 密码修改和账号设置

### 🔔 实时通知系统
- 预约提醒
- 系统消息推送
- 实时状态更新

---

## 🏗️ 技术栈

### 后端
- **框架**: Django 4.x + Django REST Framework
- **数据库**: PostgreSQL / SQLite
- **AI/ML**: 
  - YOLOv8-pose (姿态检测)
  - DTW Algorithm (动作识别)
  - NumPy, SciPy (数值计算)
- **计算机视觉**: OpenCV, Ultralytics

### 前端
- **框架**: React 19.0
- **UI 库**: Material-UI (MUI) 5.x
- **状态管理**: React Hooks
- **图表**: Recharts 3.x
- **AI 集成**: TensorFlow.js (前端姿态检测)
- **日历**: FullCalendar, React Big Calendar

### DevOps
- **版本控制**: Git
- **包管理**: pip (Python), npm (JavaScript)

---

## 📊 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │  Appointment │  │   Exercise   │      │
│  │              │  │   Calendar   │  │  Recognition │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Patient    │  │   Treatment  │  │     Admin    │      │
│  │     Info     │  │  Management  │  │   Controls   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↕ REST API
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Django)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     API      │  │   Business   │  │   Database   │      │
│  │   Endpoints  │  │    Logic     │  │    Models    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            AI Services (Action Learning)            │   │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────┐   │   │
│  │  │  YOLOv8  │→ │ Feature  │→ │ DTW Recognition│   │   │
│  │  │   Pose   │  │Engineer  │  │   + Counting   │   │   │
│  │  └──────────┘  └──────────┘  └────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎓 功能模块

### 1. 用户管理模块
- 用户认证和授权
- 多角色权限控制
- 用户资料管理

### 2. 预约系统模块
- 预约 CRUD 操作
- 日程冲突检测
- 状态管理

**[详细文档 →](docs/MODULES/APPOINTMENT_SYSTEM.md)**

### 3. 患者信息管理
- 患者档案管理
- 病历记录
- 治疗历史

### 4. 治疗计划管理
- 治疗计划创建
- 模板管理
- 进度追踪

### 5. 运动练习管理
- 练习库管理
- 难度设置
- 演示视频

### 6. **⭐ AI 动作学习与识别（核心创新）**
- 自动学习康复动作
- 实时识别和计数
- DTW + 滞回状态机
- 自适应特征工程

**[技术文档 →](docs/MODULES/ACTION_LEARNING_TECHNICAL.md)**

### 7. 姿态检测（传统模式）
- 基于规则的检测
- 角度和位置规则
- 动作计数

### 8. 通知系统
- 实时通知
- 预约提醒

### 9. 仪表板
- 数据概览
- 快速操作

---

## 🚀 Action Learning 创新点

我们的核心创新是 **AI 驱动的动作学习系统**，它革新了传统的康复训练方式：

### 传统方法 vs 我们的方法

| 特性 | 传统规则引擎 | AI Action Learning |
|------|------------|-------------------|
| **配置方式** | 手动设置规则 | 录制 3-5 次演示 |
| **学习时间** | 数小时 | < 2 秒 |
| **准确性** | 依赖专家知识 | 自动学习模式 |
| **适应性** | 固定规则 | 自适应特征 |
| **扩展性** | 需要编程 | 无需编程 |

### 技术亮点

1. **自适应归一化算法**
   - 自动检测上半身/下半身/全身模式
   - 粘性根点和尺度追踪
   - EMA 平滑防抖动

2. **64 维混合特征**
   - 关节角度 (8 维)
   - 相对位置 (16 维)
   - 交叉距离 (6 维)
   - 速度特征 (32 维)

3. **DTW + 滞回状态机**
   - Sakoe-Chiba 带约束（6.7× 加速）
   - 双阈值滞回（60% gap）
   - 能量门控
   - Z-score 快速退出

4. **性能优化**
   - 滞回区间优化：IN-OUT 抖动 ↓ 80%
   - 冷却期延长：重复计数 ↓ 70%
   - 能量门控：静止误判 ↓ 90%
   - **整体稳定性：60% → 92%**

**[完整技术文档 →](docs/MODULES/ACTION_LEARNING_TECHNICAL.md)**

---

## 🎬 快速开始

### 环境要求

- Python 3.8+
- Node.js 14+
- PostgreSQL 12+ (可选，开发环境可用 SQLite)

### 安装步骤

#### 1. 克隆项目
```bash
git clone https://github.com/yourusername/physiotherapy-system.git
cd physiotherapy-system
```

#### 2. 后端设置
```bash
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 运行迁移
python manage.py migrate

# 创建超级用户
python manage.py createsuperuser

# 启动服务器
python manage.py runserver
```

#### 3. 前端设置
```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm start
```

#### 4. 访问系统
- 前端: http://localhost:3000
- 后端 API: http://localhost:8000
- 管理后台: http://localhost:8000/admin

**[详细安装指南 →](docs/INSTALLATION.md)**

---

## 📸 系统截图

### Dashboard 仪表板
<!-- ![Dashboard](docs/images/screenshots/dashboard.png) -->

### Action Learning 动作学习
<!-- ![Action Learning](docs/images/screenshots/action-learning.png) -->

### Real-time Recognition 实时识别
<!-- ![Real-time Recognition](docs/images/screenshots/realtime-recognition.png) -->

### Appointment Calendar 预约日历
<!-- ![Appointment Calendar](docs/images/screenshots/appointment-calendar.png) -->

---

## 📈 项目成果

### 性能指标

| 指标 | 优化前 | 优化后 | 改善 |
|------|-------|-------|------|
| IN-OUT 抖动率 | ~30% | ~6% | ↓ 80% |
| 重复计数率 | ~25% | ~7% | ↓ 72% |
| 静止误判率 | ~15% | ~1.5% | ↓ 90% |
| **整体稳定性** | 60% | **92%** | ↑ 53% |

### 算法性能

- **训练时间**: < 2 秒（从视频到模板）
- **识别延迟**: < 100ms/帧
- **识别帧率**: 10 FPS
- **内存占用**: < 70 KB/动作

### 测试覆盖

- 17 个单元测试（特征工程、分段、DTW）
- 端到端集成测试
- 实际用户场景测试

**[测试报告 →](docs/TESTING_AND_RESULTS.md)**

---

## 📚 文档导航

### 快速导航
- [快速开始指南](docs/QUICK_START.md) - 5 分钟上手
- [安装文档](docs/INSTALLATION.md) - 详细安装步骤
- [系统架构](docs/ARCHITECTURE.md) - 架构设计说明
- [API 文档](docs/API_DOCUMENTATION.md) - RESTful API 接口

### 模块文档
- [Action Learning 技术文档](docs/MODULES/ACTION_LEARNING_TECHNICAL.md) - 核心算法详解
- [预约系统](docs/MODULES/APPOINTMENT_SYSTEM.md) - 预约系统设计

### 功能特性
- [演示视频功能](docs/FEATURES/DEMO_VIDEO_FEATURE.md)
- [删除动作功能](docs/FEATURES/DELETE_ACTION_FEATURE.md)

### 优化和改进
- [阶段 1 优化总结](docs/OPTIMIZATION_SUMMARY.md) - 性能优化细节

### 项目管理
- [变更日志 (CHANGELOG)](CHANGELOG.md) - 所有版本变更记录
- [文档维护规范](docs/DOCUMENTATION_MAINTENANCE.md) - 文档更新规则 ⭐

**[完整文档索引 →](docs/README.md)**

---

## 🛠️ 开发指南

> ⭐ **重要提醒**: 每次更新代码时，请同步更新相关文档！
> 
> 详见 **[文档维护规范](docs/DOCUMENTATION_MAINTENANCE.md)**

### 项目结构
```
physiotherapy-system/
├── backend/              # Django 后端
│   ├── api/              # 主应用
│   │   ├── models.py     # 数据模型
│   │   ├── views.py      # 视图和 API
│   │   ├── services/     # 业务逻辑
│   │   └── tests/        # 测试
│   └── physiotherapy/    # 项目设置
├── frontend/             # React 前端
│   └── src/
│       └── components/   # React 组件
├── docs/                 # 项目文档
└── README.md             # 本文件
```

### 运行测试
```bash
# 后端测试
cd backend
python manage.py test

# 前端测试
cd frontend
npm test
```

---

## 🔮 未来规划

### 短期目标（3-6 个月）
- [ ] 移动端应用开发
- [ ] 深度学习模型集成（GRU/TCN）
- [ ] 多人同时识别
- [ ] 动作质量评估

### 长期目标（6-12 个月）
- [ ] 多语言支持
- [ ] 云端部署和 SaaS 化
- [ ] 远程视频问诊
- [ ] 数据分析和报告生成

---

## 👨‍💻 作者

**[Your Name]**
- 学校: [Your University]
- 专业: [Your Major]
- 项目类型: Final Year Project
- 年份: 2024/2025

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- YOLOv8 姿态检测模型
- Django 和 React 社区
- TensorFlow.js 团队
- Material-UI 设计系统
- 指导老师和同学的支持

---

## 📞 联系方式

如有问题或建议，欢迎联系：
- Email: [your.email@example.com]
- GitHub: [@yourusername](https://github.com/yourusername)

---

<p align="center">
  Made with ❤️ for better physiotherapy care
</p>

