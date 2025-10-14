# 📚 项目文档索引

欢迎查看智能理疗管理系统的完整文档。本索引将帮助你快速找到所需的信息。

---

## 📖 文档结构

```
docs/
├── README.md                          # 本文件 - 文档索引
├── QUICK_START.md                     # 快速开始指南
├── INSTALLATION.md                    # 详细安装说明
├── ARCHITECTURE.md                    # 系统架构文档
├── API_DOCUMENTATION.md               # API 接口文档
├── OPTIMIZATION_SUMMARY.md            # 性能优化总结
├── DOCUMENTATION_MAINTENANCE.md       # 文档维护规范 ⭐ NEW
├── DOCUMENTATION_COMPLETE.md          # 文档完成报告
├── MODULES/                           # 功能模块文档
│   ├── ACTION_LEARNING_TECHNICAL.md   # Action Learning 技术详解
│   └── APPOINTMENT_SYSTEM.md          # 预约系统文档
├── FEATURES/                          # 功能特性文档
│   ├── DEMO_VIDEO_FEATURE.md          # 演示视频功能
│   └── DELETE_ACTION_FEATURE.md       # 删除动作功能
└── images/                            # 文档图片资源
    ├── screenshots/                   # 系统截图
    └── diagrams/                      # 架构图和流程图
```

---

## 🚀 推荐阅读路线

### 对于新用户（想快速了解系统）
1. [主 README](../README.md) - 项目概览
2. [快速开始](QUICK_START.md) - 5 分钟上手
3. 查看系统截图和演示

### 对于开发者（想部署或修改系统）
1. [主 README](../README.md) - 了解整体架构
2. [安装文档](INSTALLATION.md) - 详细安装步骤
3. [系统架构](ARCHITECTURE.md) - 理解设计思路
4. [API 文档](API_DOCUMENTATION.md) - 接口说明
5. [模块技术文档](#功能模块文档) - 深入理解核心功能

### 对于评审老师（想了解创新点和成果）
1. [主 README](../README.md) - 项目背景和目标
2. [Action Learning 技术文档](MODULES/ACTION_LEARNING_TECHNICAL.md) - 核心创新
3. [优化总结](OPTIMIZATION_SUMMARY.md) - 性能改进
4. [系统架构](ARCHITECTURE.md) - 技术实现

### 对于研究人员（想了解算法细节）
1. [Action Learning 技术文档](MODULES/ACTION_LEARNING_TECHNICAL.md) - 完整算法说明
2. [优化总结](OPTIMIZATION_SUMMARY.md) - 优化方法
3. 查看源代码：`backend/api/services/`

---

## 📋 文档详细说明

### 入门文档

#### [快速开始 (QUICK_START.md)](QUICK_START.md)
- **适合**: 想快速运行系统的用户
- **内容**: 最简化的安装和运行步骤
- **时间**: 5-10 分钟

#### [安装文档 (INSTALLATION.md)](INSTALLATION.md)
- **适合**: 需要详细安装说明的用户
- **内容**: 
  - 环境要求
  - 详细安装步骤
  - 常见问题解决
  - 生产环境部署
- **时间**: 30-60 分钟

---

### 技术文档

#### [系统架构 (ARCHITECTURE.md)](ARCHITECTURE.md)
- **适合**: 想了解系统设计的开发者
- **内容**:
  - 整体架构设计
  - 前后端分离架构
  - 数据库设计
  - 模块交互关系
  - 技术选型理由

#### [API 文档 (API_DOCUMENTATION.md)](API_DOCUMENTATION.md)
- **适合**: 前端开发者或 API 集成者
- **内容**:
  - RESTful API 端点列表
  - 请求/响应格式
  - 认证和授权
  - 错误处理
  - 使用示例

---

### 功能模块文档

#### [Action Learning 技术文档 (MODULES/ACTION_LEARNING_TECHNICAL.md)](MODULES/ACTION_LEARNING_TECHNICAL.md)
- **适合**: 想深入了解核心算法的研究人员
- **内容**:
  - 完整的算法流程（27,000+ 字）
  - 数学公式和实现细节
  - 特征工程
  - DTW 算法详解
  - 滞回状态机
  - 性能分析
- **重要性**: ⭐⭐⭐⭐⭐（项目核心创新）

#### [预约系统文档 (MODULES/APPOINTMENT_SYSTEM.md)](MODULES/APPOINTMENT_SYSTEM.md)
- **适合**: 想了解预约功能的用户
- **内容**:
  - 预约系统设计
  - 状态管理
  - 冲突检测
  - API 接口

---

### 功能特性文档

#### [演示视频功能 (FEATURES/DEMO_VIDEO_FEATURE.md)](FEATURES/DEMO_VIDEO_FEATURE.md)
- **内容**:
  - 功能说明
  - 实现细节
  - 用户界面
  - API 接口

#### [删除动作功能 (FEATURES/DELETE_ACTION_FEATURE.md)](FEATURES/DELETE_ACTION_FEATURE.md)
- **内容**:
  - 功能实现
  - 安全检查
  - 级联删除逻辑

---

### 优化和改进

#### [优化总结 (OPTIMIZATION_SUMMARY.md)](OPTIMIZATION_SUMMARY.md)
- **适合**: 想了解性能优化过程的用户
- **内容**:
  - 阶段 1 优化（已完成）
  - 扩大滞回区间（60% gap）
  - 延长冷却期（15-20 帧）
  - 启用能量门控
  - 效果对比数据

---

### 文档管理

#### [文档维护规范 (DOCUMENTATION_MAINTENANCE.md)](DOCUMENTATION_MAINTENANCE.md) ⭐ 重要
- **适合**: 所有开发者（必读）
- **内容**:
  - 文档更新检查清单
  - 代码与文档同步规则
  - 文档更新工作流
  - 具体更新示例
  - 最佳实践

#### [文档完成报告 (DOCUMENTATION_COMPLETE.md)](DOCUMENTATION_COMPLETE.md)
- **适合**: 项目管理者
- **内容**:
  - 文档系统说明
  - 文档统计
  - 学术评审准备
  - 待完善事项

---

### 项目管理

#### [变更日志 (../CHANGELOG.md)](../CHANGELOG.md)
- **适合**: 所有人
- **内容**:
  - 所有版本的变更记录
  - 功能添加历史
  - 性能优化记录
  - 文档更新追踪

---

## 🎯 按主题查找

### Action Learning（AI 动作识别）
- [技术文档](MODULES/ACTION_LEARNING_TECHNICAL.md) - 完整算法
- [优化总结](OPTIMIZATION_SUMMARY.md) - 性能改进
- [演示视频功能](FEATURES/DEMO_VIDEO_FEATURE.md) - 查看演示
- [删除动作功能](FEATURES/DELETE_ACTION_FEATURE.md) - 管理动作

### 系统部署
- [快速开始](QUICK_START.md) - 快速部署
- [安装文档](INSTALLATION.md) - 详细步骤
- [系统架构](ARCHITECTURE.md) - 理解结构

### API 开发
- [API 文档](API_DOCUMENTATION.md) - 接口说明
- [系统架构](ARCHITECTURE.md) - 数据模型

### 功能使用
- [预约系统](MODULES/APPOINTMENT_SYSTEM.md) - 预约管理
- [主 README](../README.md) - 所有功能概览

---

## 📝 文档贡献

如果你发现文档中有错误或需要改进的地方：

1. 在 GitHub 上提交 Issue
2. 提交 Pull Request 修正
3. 联系项目维护者

---

## 📊 文档统计

| 文档 | 字数 | 主题 | 难度 |
|------|------|------|------|
| Action Learning Technical | 27,000+ | 算法详解 | ⭐⭐⭐⭐⭐ |
| Installation | 2,000+ | 部署指南 | ⭐⭐ |
| Architecture | 3,000+ | 系统设计 | ⭐⭐⭐⭐ |
| API Documentation | 5,000+ | 接口说明 | ⭐⭐⭐ |
| Quick Start | 500+ | 快速上手 | ⭐ |

---

## 🔗 外部资源

### 相关技术文档
- [Django 官方文档](https://docs.djangoproject.com/)
- [React 官方文档](https://react.dev/)
- [YOLOv8 文档](https://docs.ultralytics.com/)
- [Material-UI 文档](https://mui.com/)

### 学术参考
- Dynamic Time Warping (DTW) Algorithm
- Pose Estimation with Deep Learning
- Hysteresis Thresholding in Control Systems

---

## ❓ 常见问题

### Q: 应该先看哪个文档？
**A**: 如果是第一次接触，建议从[主 README](../README.md)开始，然后根据你的需求选择相应的文档。

### Q: 技术文档太长了，有简化版吗？
**A**: [主 README](../README.md)中的"Action Learning 创新点"部分是简化版。完整版在[技术文档](MODULES/ACTION_LEARNING_TECHNICAL.md)中。

### Q: 如何快速运行系统？
**A**: 查看[快速开始](QUICK_START.md)，5-10分钟即可运行起来。

### Q: 文档中的代码示例可以直接使用吗？
**A**: 是的，所有代码示例都经过测试，可以直接使用。

---

## 📧 获取帮助

如果文档没有解答你的问题：

- 📧 Email: [your.email@example.com]
- 💬 GitHub Issues: 提交问题
- 📞 联系维护者

---

<p align="center">
  文档持续更新中... 最后更新: 2025-01-12
</p>

