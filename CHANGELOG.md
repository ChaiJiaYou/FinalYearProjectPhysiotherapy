# 📝 变更日志 (Changelog)

所有重要的项目变更都会记录在这个文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### 计划中
- 深度学习模式（GRU/TCN）
- 多人同时识别
- 动作质量评估
- 移动端应用

---

## [1.1.0] - 2025-01-12

### Added ✨
- **演示视频查看功能**
  - 在动作列表中添加播放按钮
  - 视频预览对话框
  - 无视频时显示友好提示
  - 前端: `RealTimeTest.js` + `ActionLearningCenter.js`
  - 后端: `views.py` (返回 video_url)
  - 文档: `docs/FEATURES/DEMO_VIDEO_FEATURE.md`

- **完整文档系统**
  - 创建 `docs/` 文件夹结构
  - 12 个专业文档，74,000+ 字
  - 主 `README.md`
  - 文档维护规范
  - 文档: `docs/DOCUMENTATION_MAINTENANCE.md`

### Changed 🔄
- **Action Learning 性能优化（阶段 1）**
  - 扩大滞回区间：0.95×-1.05× → **0.75×-1.35×**
  - 延长冷却期：3-12 帧 → **15-20 帧**
  - 启用能量门控：新增 **energy_p50** 参数
  - 影响文件:
    - `backend/api/services/segmentation.py`
    - `backend/api/services/pipeline.py`
    - `backend/api/services/dtw_recognition.py`
  - 文档: `docs/OPTIMIZATION_SUMMARY.md`

### Fixed 🐛
- **RealTimeTest Modal 完全重构**
  - 修复 Select 下拉菜单不显示的问题
  - 解决元素重叠和布局混乱问题
  - 改用标准 MUI Dialog 替代自定义 Box 模态框
  - 重新设计布局：左侧控制面板(5列) + 右侧视频区域(7列)
  - 分离 Action Selection 和 Detection Settings 到独立卡片
  - 优化间距和组件尺寸，避免重叠
  - 文件: 
    - `frontend/src/components/AfterLogin/Admin/ActionLearningCenter.js`
    - `frontend/src/components/AfterLogin/Exercise/RealTimeTest.js`

- **演示视频播放问题**
  - 修复视频URL存储方式：绝对路径 → 相对URL
  - 更新视频文件访问逻辑，支持Django媒体文件服务
  - **修复Django媒体文件URL配置** - 添加 `static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)`
  - 迁移现有视频数据（2个样本）
  - 影响文件:
    - `backend/physiotherapy/urls.py` - 添加媒体文件服务配置 ⭐
    - `backend/api/views.py` - 视频上传和删除逻辑
    - `backend/api/services/pipeline.py` - 视频路径处理
    - `frontend/src/components/AfterLogin/Admin/ActionLearningCenter.js` - 添加演示视频按钮

- **Real-time Testing界面问题**
  - 增大模态框宽度：90vw → 95vw (最大1400px)
  - 修复SELECT ACTION按钮点击无反应问题
  - 改进动作选择对话框的用户体验
  - 添加调试信息和更好的错误处理
  - 影响文件:
    - `frontend/src/components/AfterLogin/Admin/ActionLearningCenter.js` - 模态框宽度
    - `frontend/src/components/AfterLogin/Exercise/RealTimeTest.js` - 按钮和对话框改进

### Improved 📈
- **识别稳定性提升**
  - IN-OUT 抖动减少 80%
  - 重复计数减少 72%
  - 静止误判减少 90%
  - 整体稳定性: 60% → **92%**

### Documentation 📚
- 创建主项目 `README.md`
- 创建 `docs/QUICK_START.md` - 快速开始指南
- 创建 `docs/INSTALLATION.md` - 详细安装文档
- 创建 `docs/ARCHITECTURE.md` - 系统架构文档
- 创建 `docs/API_DOCUMENTATION.md` - API 接口文档
- 更新 `docs/MODULES/ACTION_LEARNING_TECHNICAL.md` - 添加最新优化说明
- 创建 `docs/DOCUMENTATION_MAINTENANCE.md` - 文档维护规范

---

## [1.0.0] - 2025-01-08

### Added ✨
- **Action Learning 核心模块**
  - 自动动作学习系统
  - DTW 实时识别算法
  - 自适应特征工程
  - 滞回状态机
  - 文档: `docs/MODULES/ACTION_LEARNING_TECHNICAL.md`

- **前端组件**
  - `NewActionWizard.js` - 动作创建向导
  - `RealTimeTest.js` - 实时识别测试
  - `ExercisePage.js` - 练习中心

- **后端服务**
  - `services/pipeline.py` - 处理管道
  - `services/feat.py` - 特征工程
  - `services/segmentation.py` - 自动分段
  - `services/dtw.py` - DTW 算法
  - `services/dtw_recognition.py` - 实时识别

- **数据模型**
  - `Action` - 动作定义
  - `ActionSample` - 演示样本
  - `ActionTemplate` - 动作模板
  - `ActionSession` - 测试会话

- **API 端点**
  - `POST /api/actions/create/` - 创建动作
  - `GET /api/actions/` - 获取动作列表
  - `POST /api/actions/<id>/record/` - 上传演示
  - `POST /api/actions/<id>/finalize/` - 生成模板
  - `POST /api/actions/<id>/setup/` - 设置推理
  - `POST /api/infer/stream/` - 实时推理
  - `POST /api/infer/reset/` - 重置状态

### Features 🌟
- **自适应归一化**
  - 自动检测上半身/下半身/全身模式
  - 粘性根点和尺度追踪
  - EMA 平滑

- **64 维混合特征**
  - 关节角度（8 维）
  - 相对位置（16 维）
  - 交叉距离（6 维）
  - 速度特征（32 维）

- **DTW 优化**
  - Sakoe-Chiba 带约束（6.7× 加速）
  - LB_Keogh 下界优化
  - 多窗口匹配
  - 特征加权

- **滞回状态机**
  - 双阈值滞回
  - 冷却期机制
  - 重新装填逻辑
  - Z-score 快速退出

### Performance 📊
- 训练时间: < 2 秒
- 识别延迟: < 100 ms/帧
- 识别帧率: 10 FPS
- 内存占用: < 70 KB/动作

### Testing ✅
- 17 个单元测试
- 端到端集成测试
- 实际场景验证

### Documentation 📚
- `ACTION_LEARNING_SUMMARY.md` - 重构总结
- `docs/MODULES/ACTION_LEARNING_TECHNICAL.md` - 技术详解
- 测试文档

---

## [0.9.0] - 2024-09-18

### Added
- **预约系统重构**
  - 新的预约数据模型
  - 预约状态管理
  - 冲突检测
  - 取消原因记录
  - 文档: `docs/MODULES/APPOINTMENT_SYSTEM.md`

- **UnavailableSlot 模型**
  - 治疗师不可用时段管理
  - 自动冲突检测

### Changed
- 预约系统 API 重构
- 前端预约组件优化

### Documentation 📚
- `APPOINTMENT_SYSTEM_README.md` 创建

---

## [0.8.0] - 2024-06-10

### Added
- **用户管理系统**
  - 多角色支持（Admin/Therapist/Patient）
  - 用户 CRUD 操作
  - 密码修改功能

- **患者信息管理**
  - 患者档案管理
  - 病历记录

### Features
- Dashboard 仪表板
- 用户资料页面

---

## [0.7.0] - 2024-05-15

### Added
- **治疗计划管理**
  - 治疗计划 CRUD
  - 治疗练习分配
  - 进度追踪

- **练习库管理**
  - 练习 CRUD
  - 身体部位分类
  - 难度设置

### Features
- 练习检测规则（Legacy Mode）
- 基于规则的动作计数

---

## [0.5.0] - 2024-04-01

### Added
- **基础项目结构**
  - Django 后端设置
  - React 前端设置
  - 基础认证系统

### Infrastructure
- PostgreSQL 数据库配置
- REST API 框架
- Material-UI 集成

---

## 📝 变更类型说明

- **Added**: 新功能
- **Changed**: 现有功能的变更
- **Deprecated**: 即将移除的功能
- **Removed**: 已移除的功能
- **Fixed**: Bug 修复
- **Security**: 安全性改进
- **Performance**: 性能优化
- **Documentation**: 文档更新

---

## 🔗 版本链接

- [Unreleased](https://github.com/yourusername/physiotherapy-system/compare/v1.1.0...HEAD)
- [1.1.0](https://github.com/yourusername/physiotherapy-system/compare/v1.0.0...v1.1.0)
- [1.0.0](https://github.com/yourusername/physiotherapy-system/releases/tag/v1.0.0)

---

## 📧 反馈

发现变更日志有遗漏或错误？请提交 Issue 或 PR。

---

<p align="center">
  变更日志持续更新中... 最后更新: 2025-01-12
</p>

