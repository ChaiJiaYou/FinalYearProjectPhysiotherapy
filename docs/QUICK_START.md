# 🚀 快速开始指南

这是最简化的安装和运行指南，让你在 **10 分钟内**启动系统。

---

## ⚡ 前提条件

确保你已安装：
- Python 3.8+ ([下载](https://www.python.org/downloads/))
- Node.js 14+ ([下载](https://nodejs.org/))
- Git ([下载](https://git-scm.com/))

---

## 📦 快速安装

### 1. 克隆项目（30 秒）

```bash
git clone https://github.com/yourusername/physiotherapy-system.git
cd physiotherapy-system
```

### 2. 后端设置（3 分钟）

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 运行数据库迁移
python manage.py migrate

# 创建管理员账号（按提示输入用户名、邮箱、密码）
python manage.py createsuperuser

# 启动后端服务器
python manage.py runserver
```

**✅ 后端应该在 http://localhost:8000 运行**

### 3. 前端设置（3 分钟）

**打开新的终端窗口：**

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动前端开发服务器
npm start
```

**✅ 前端应该自动打开 http://localhost:3000**

---

## 🎉 开始使用

### 登录系统

1. 打开浏览器访问 http://localhost:3000
2. 使用刚才创建的管理员账号登录

### 快速体验核心功能

#### 1. 创建新动作（Action Learning）

1. 导航到 **Exercise Center**
2. 点击右下角的 **+** 按钮
3. 按照向导：
   - 输入动作名称和描述
   - 录制 3-5 次演示动作
   - 系统自动学习
4. 完成！现在可以实时识别这个动作

#### 2. 测试实时识别

1. 进入 **Real-Time Recognition** 标签
2. 选择刚创建的动作
3. 点击 **Start Camera**
4. 点击 **Start Inference**
5. 开始执行动作，系统会自动计数

---

## 🔍 验证安装

### 检查后端

访问 http://localhost:8000/admin - 应该看到 Django 管理后台

### 检查前端

访问 http://localhost:3000 - 应该看到登录页面

### 检查 API

访问 http://localhost:8000/api/ - 应该看到 API 根端点

---

## 🛠️ 常见问题

### 问题：pip install 失败

**解决**：
```bash
# 升级 pip
python -m pip install --upgrade pip

# 重新安装
pip install -r requirements.txt
```

### 问题：npm install 很慢

**解决**：使用国内镜像源
```bash
npm install --registry=https://registry.npmmirror.com
```

### 问题：端口被占用

**解决**：
```bash
# 后端使用其他端口
python manage.py runserver 8001

# 前端使用其他端口
PORT=3001 npm start
```

### 问题：摄像头无法访问

**解决**：
- 确保浏览器有摄像头权限
- 使用 https 或 localhost
- 检查其他程序是否占用摄像头

---

## 📚 下一步

现在系统已经运行起来了！接下来你可以：

1. **[阅读完整安装文档](INSTALLATION.md)** - 了解详细配置
2. **[查看系统架构](ARCHITECTURE.md)** - 理解设计思路
3. **[浏览 API 文档](API_DOCUMENTATION.md)** - 开发集成
4. **[阅读 Action Learning 技术文档](MODULES/ACTION_LEARNING_TECHNICAL.md)** - 深入核心算法

---

## 🆘 需要帮助？

- 查看 [完整文档索引](README.md)
- 提交 [GitHub Issue](https://github.com/yourusername/physiotherapy-system/issues)
- 联系: your.email@example.com

---

<p align="center">
  享受使用智能理疗管理系统！🏥
</p>

