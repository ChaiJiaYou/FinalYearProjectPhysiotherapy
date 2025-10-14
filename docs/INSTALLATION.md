# 📦 详细安装文档

本文档提供智能理疗管理系统的详细安装说明，包括开发环境和生产环境的部署步骤。

---

## 📋 目录

- [系统要求](#系统要求)
- [开发环境安装](#开发环境安装)
- [生产环境部署](#生产环境部署)
- [配置说明](#配置说明)
- [常见问题](#常见问题)

---

## 💻 系统要求

### 最低要求

| 组件 | 版本 | 说明 |
|------|------|------|
| Python | 3.8+ | 后端运行环境 |
| Node.js | 14+ | 前端构建工具 |
| npm | 6+ | JavaScript 包管理器 |
| 内存 | 4 GB | 最低运行内存 |
| 硬盘 | 10 GB | 包含依赖和数据 |

### 推荐配置

| 组件 | 版本 | 说明 |
|------|------|------|
| Python | 3.10+ | 更好的性能 |
| Node.js | 18+ LTS | 长期支持版本 |
| PostgreSQL | 12+ | 生产环境数据库 |
| 内存 | 8 GB+ | 流畅运行 |
| GPU | CUDA 支持 | YOLOv8 加速（可选） |

### 浏览器支持

- Chrome 90+（推荐）
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 🔧 开发环境安装

### 步骤 1: 克隆项目

```bash
git clone https://github.com/yourusername/physiotherapy-system.git
cd physiotherapy-system
```

### 步骤 2: 后端设置

#### 2.1 创建虚拟环境

**Windows:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
```

**Mac/Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

#### 2.2 安装 Python 依赖

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**依赖列表说明：**
- `django` - Web 框架
- `djangorestframework` - REST API 框架
- `psycopg2-binary` - PostgreSQL 驱动
- `ultralytics==8.3.0` - YOLOv8 模型
- `opencv-python` - 计算机视觉
- `torch` - PyTorch 深度学习框架
- `numpy` - 数值计算
- `scikit-learn` - 机器学习工具
- `scipy` - 科学计算

#### 2.3 配置数据库

**开发环境（SQLite）：**
```bash
# 无需额外配置，Django 会自动创建 db.sqlite3
python manage.py migrate
```

**生产环境（PostgreSQL）：**

1. 安装 PostgreSQL

2. 创建数据库和用户：
```sql
CREATE DATABASE physiotherapy_db;
CREATE USER physio_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE physiotherapy_db TO physio_user;
```

3. 修改 `backend/physiotherapy/settings.py`:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'physiotherapy_db',
        'USER': 'physio_user',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

4. 运行迁移：
```bash
python manage.py migrate
```

#### 2.4 创建超级用户

```bash
python manage.py createsuperuser
```

按提示输入：
- 用户名
- 邮箱地址
- 密码（两次确认）

#### 2.5 加载初始数据（可选）

```bash
# 加载预约系统种子数据
python manage.py loaddata api/fixtures/appointment_seed_data.json
```

#### 2.6 启动后端服务器

```bash
python manage.py runserver
```

**✅ 验证**: 访问 http://localhost:8000/admin 应该看到管理后台

### 步骤 3: 前端设置

**打开新的终端窗口：**

#### 3.1 安装 Node.js 依赖

```bash
cd frontend
npm install
```

**如果安装很慢，使用国内镜像：**
```bash
npm install --registry=https://registry.npmmirror.com
```

#### 3.2 配置环境变量（可选）

创建 `frontend/.env` 文件：
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_MEDIA_URL=http://localhost:8000/media
```

#### 3.3 启动前端开发服务器

```bash
npm start
```

浏览器应该自动打开 http://localhost:3000

**✅ 验证**: 应该看到登录页面

---

## 🌐 生产环境部署

### 后端部署

#### 1. 配置生产设置

修改 `backend/physiotherapy/settings.py`:

```python
# 生产环境设置
DEBUG = False
ALLOWED_HOSTS = ['your-domain.com', 'your-ip-address']

# 安全设置
SECRET_KEY = 'your-production-secret-key'  # 使用强密钥
CSRF_TRUSTED_ORIGINS = ['https://your-domain.com']

# 静态文件
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

#### 2. 收集静态文件

```bash
python manage.py collectstatic
```

#### 3. 使用 Gunicorn 运行

```bash
pip install gunicorn
gunicorn physiotherapy.wsgi:application --bind 0.0.0.0:8000
```

#### 4. 配置 Nginx（推荐）

创建 `/etc/nginx/sites-available/physiotherapy`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /static/ {
        alias /path/to/backend/staticfiles/;
    }

    location /media/ {
        alias /path/to/backend/media/;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/physiotherapy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 前端部署

#### 1. 构建生产版本

```bash
cd frontend
npm run build
```

这会在 `frontend/build/` 生成优化的静态文件。

#### 2. 部署选项

**选项 A: 使用 Nginx 托管**

```nginx
server {
    listen 80;
    server_name your-frontend-domain.com;

    root /path/to/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**选项 B: 使用 Django 托管**

1. 将 `frontend/build/` 复制到 `backend/static/`
2. 修改 Django 设置以托管静态文件

---

## 🔑 配置说明

### 环境变量

创建 `backend/.env` 文件（建议使用 python-decouple）：

```env
# Django 设置
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# 数据库
DB_ENGINE=django.db.backends.postgresql
DB_NAME=physiotherapy_db
DB_USER=physio_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432

# CORS 设置
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### CORS 配置

确保 `backend/physiotherapy/settings.py` 中有：

```python
INSTALLED_APPS = [
    # ...
    'corsheaders',
    # ...
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # 放在最前面
    # ...
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
```

安装 CORS 包：
```bash
pip install django-cors-headers
```

---

## ✅ 验证安装

### 后端检查清单

- [ ] http://localhost:8000 - API 根端点
- [ ] http://localhost:8000/admin - 管理后台可以登录
- [ ] http://localhost:8000/api/actions/ - 返回 JSON 数据

### 前端检查清单

- [ ] http://localhost:3000 - 显示登录页面
- [ ] 可以成功登录
- [ ] Dashboard 正常显示
- [ ] 摄像头可以访问

### AI 功能检查

1. 创建一个测试动作
2. 录制演示视频
3. 系统能够自动分段和生成模板
4. 实时识别能够正常计数

---

## 🐛 故障排除

### 后端问题

#### ModuleNotFoundError

```bash
# 确保虚拟环境已激活
# Windows:
venv\Scripts\activate

# 重新安装依赖
pip install -r requirements.txt
```

#### Database migration errors

```bash
# 删除迁移并重建
python manage.py migrate --fake api zero
python manage.py migrate
```

#### YOLO 模型下载失败

```bash
# 手动下载模型
# YOLOv8 会在首次运行时自动下载到 ~/.ultralytics/
# 如果网络问题，可以手动下载后放置
```

### 前端问题

#### npm install 报错

```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

#### "React版本不兼容"

```bash
# 使用 --legacy-peer-deps
npm install --legacy-peer-deps
```

### 摄像头问题

#### 浏览器拒绝访问摄像头

**解决**：
1. 使用 Chrome 或 Firefox
2. 确保使用 https 或 localhost
3. 检查浏览器设置 → 隐私和安全 → 网站设置 → 摄像头
4. 允许 localhost:3000 访问摄像头

#### 摄像头被其他程序占用

**解决**：
- 关闭其他使用摄像头的程序（Zoom、Teams 等）
- 重启浏览器

---

## 🚀 性能优化（生产环境）

### 后端优化

```python
# settings.py

# 启用缓存
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}

# 数据库连接池
DATABASES['default']['CONN_MAX_AGE'] = 600
```

### 前端优化

```bash
# 使用生产构建
npm run build

# 启用 gzip 压缩（Nginx）
gzip on;
gzip_types text/css application/javascript application/json;
```

### GPU 加速（可选）

如果有 NVIDIA GPU：

```bash
# 安装 CUDA 版本的 PyTorch
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

---

## 📊 资源占用

### 开发环境

| 组件 | CPU | 内存 | 硬盘 |
|------|-----|------|------|
| Django 后端 | ~5% | ~200 MB | ~500 MB |
| React 前端 | ~10% | ~300 MB | ~500 MB |
| YOLOv8 模型 | ~15% | ~400 MB | ~100 MB |
| **总计** | **~30%** | **~900 MB** | **~1.1 GB** |

### 生产环境（优化后）

| 组件 | CPU | 内存 | 硬盘 |
|------|-----|------|------|
| Gunicorn (4 workers) | ~10% | ~500 MB | ~1 GB |
| Nginx | ~2% | ~50 MB | ~100 MB |
| PostgreSQL | ~5% | ~200 MB | ~2 GB |
| **总计** | **~17%** | **~750 MB** | **~3.1 GB** |

---

## 🔐 安全建议

### 生产环境必做

1. **更改 SECRET_KEY**
```python
# 使用强随机密钥
import secrets
SECRET_KEY = secrets.token_urlsafe(50)
```

2. **禁用 DEBUG**
```python
DEBUG = False
```

3. **设置 ALLOWED_HOSTS**
```python
ALLOWED_HOSTS = ['your-domain.com', 'www.your-domain.com']
```

4. **HTTPS 配置**
```python
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

5. **限制文件上传大小**
```python
DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 10485760
```

---

## 🧪 测试安装

### 运行后端测试

```bash
cd backend
python manage.py test
```

### 运行前端测试

```bash
cd frontend
npm test
```

### 测试 Action Learning 模块

```bash
cd backend
python manage.py test api.tests.test_action_learning
```

预期输出：
```
Ran 17 tests in 3.5s
OK
```

---

## 📦 额外组件安装

### Redis（用于缓存和任务队列）

```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# Mac
brew install redis

# Windows
# 下载 Redis for Windows
```

启动 Redis：
```bash
redis-server
```

### Celery（异步任务处理）

```bash
pip install celery redis

# 启动 Celery worker
celery -A physiotherapy worker -l info
```

---

## 🌍 多语言支持（可选）

### 配置中英文双语

```python
# settings.py
LANGUAGE_CODE = 'zh-hans'  # 简体中文
# 或
LANGUAGE_CODE = 'en-us'    # 英文

USE_I18N = True
USE_L10N = True
```

---

## 📱 移动端支持（未来）

当前系统是响应式设计，支持移动浏览器访问。未来计划：
- React Native 移动应用
- PWA（渐进式 Web 应用）

---

## 🔄 更新和升级

### 更新依赖

```bash
# 后端
pip install --upgrade -r requirements.txt

# 前端
npm update
```

### 数据库迁移

```bash
python manage.py makemigrations
python manage.py migrate
```

### 备份数据

```bash
# SQLite
cp backend/db.sqlite3 backup/db.sqlite3.$(date +%Y%m%d)

# PostgreSQL
pg_dump physiotherapy_db > backup/db_backup_$(date +%Y%m%d).sql
```

---

## 📞 获取帮助

安装遇到问题？

1. 查看 [常见问题](#常见问题) 部分
2. 搜索 [GitHub Issues](https://github.com/yourusername/physiotherapy-system/issues)
3. 提交新的 Issue
4. 联系: your.email@example.com

---

## 📚 相关文档

- [快速开始](QUICK_START.md) - 最简化的安装步骤
- [系统架构](ARCHITECTURE.md) - 了解系统设计
- [API 文档](API_DOCUMENTATION.md) - API 接口说明
- [Action Learning 技术文档](MODULES/ACTION_LEARNING_TECHNICAL.md) - 核心算法

---

<p align="center">
  安装完成后，查看 <a href="QUICK_START.md">快速开始指南</a> 开始使用系统！
</p>

