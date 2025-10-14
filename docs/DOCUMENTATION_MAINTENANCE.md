# 📝 文档维护规范

## 🎯 核心原则

**代码变更 = 文档必须同步更新**

每次技术更新、功能添加、优化改进时，都必须更新相应的文档，确保文档与代码保持一致。

---

## ✅ 文档更新检查清单

### 当添加新功能时

- [ ] 更新 `README.md` 的功能列表
- [ ] 在 `docs/FEATURES/` 创建新功能文档
- [ ] 更新 `docs/API_DOCUMENTATION.md` 添加新接口
- [ ] 更新 `docs/ARCHITECTURE.md` 的模块图
- [ ] 添加系统截图到 `docs/images/screenshots/`
- [ ] 更新 `CHANGELOG.md` 记录变更

### 当修改技术实现时

- [ ] 更新相关模块的技术文档（`docs/MODULES/`）
- [ ] 更新 `docs/ARCHITECTURE.md` 的架构说明
- [ ] 更新性能数据（如适用）
- [ ] 更新代码示例
- [ ] 更新 `CHANGELOG.md`

### 当优化性能时

- [ ] 更新 `docs/OPTIMIZATION_SUMMARY.md`
- [ ] 更新性能对比数据
- [ ] 更新 `README.md` 的成果展示
- [ ] 更新技术文档中的性能分析部分
- [ ] 记录优化方法和效果

### 当修改 API 时

- [ ] 更新 `docs/API_DOCUMENTATION.md`
- [ ] 更新请求/响应示例
- [ ] 更新错误代码说明
- [ ] 通知前端团队
- [ ] 标记 API 版本变更

### 当修改数据库时

- [ ] 更新 `docs/ARCHITECTURE.md` 的 ER 图
- [ ] 更新数据表说明
- [ ] 记录迁移步骤
- [ ] 更新备份恢复说明

### 当添加依赖包时

- [ ] 更新 `requirements.txt` 或 `package.json`
- [ ] 更新 `docs/INSTALLATION.md` 的依赖列表
- [ ] 说明新依赖的用途
- [ ] 更新系统要求（如需要）

---

## 📋 具体更新映射表

| 代码变更位置 | 需要更新的文档 | 更新内容 |
|------------|--------------|---------|
| `backend/api/services/` | `docs/MODULES/ACTION_LEARNING_TECHNICAL.md` | 算法实现细节 |
| `backend/api/views.py` | `docs/API_DOCUMENTATION.md` | API 接口说明 |
| `backend/api/models.py` | `docs/ARCHITECTURE.md` | 数据模型 ER 图 |
| `backend/requirements.txt` | `docs/INSTALLATION.md` | 依赖列表 |
| `frontend/package.json` | `docs/INSTALLATION.md` | 前端依赖 |
| `frontend/src/components/` | `README.md` | 功能截图 |
| 性能优化 | `docs/OPTIMIZATION_SUMMARY.md` | 优化数据 |
| 新功能 | `docs/FEATURES/[新功能].md` | 功能文档 |

---

## 🔄 文档更新工作流

### 标准流程

```
1. 代码变更
   ↓
2. 识别影响的文档（参考映射表）
   ↓
3. 更新文档内容
   ↓
4. 验证文档准确性
   ↓
5. 提交代码和文档（同一个 commit）
   ↓
6. Code Review（包含文档审查）
   ↓
7. 合并到主分支
```

### Git Commit 规范

**好的 commit 示例:**
```bash
git commit -m "feat: Add energy gate to state machine

- Added energy_p50 parameter for entry gate
- Updated DTWRecognizer class
- Updated docs/MODULES/ACTION_LEARNING_TECHNICAL.md
- Updated docs/OPTIMIZATION_SUMMARY.md
"
```

**不好的 commit 示例:**
```bash
git commit -m "Update code"  # ❌ 没有说明，没有更新文档
```

---

## 📅 定期维护计划

### 每周检查

- [ ] 检查文档中的链接是否有效
- [ ] 验证代码示例是否仍然有效
- [ ] 更新待办事项列表

### 每月检查

- [ ] 更新性能数据
- [ ] 补充系统截图
- [ ] 检查技术栈版本
- [ ] 更新依赖版本说明
- [ ] 整理 CHANGELOG

### 每次发布前

- [ ] 全面审查所有文档
- [ ] 更新版本号
- [ ] 生成 Release Notes
- [ ] 打包文档（PDF）
- [ ] 创建 Git Tag

---

## 🛠️ 文档更新工具

### 自动化检查

创建 `scripts/check_docs.py`:

```python
#!/usr/bin/env python3
"""
检查文档与代码的一致性
"""

def check_api_docs():
    """检查 API 文档是否覆盖所有端点"""
    # 从 urls.py 提取所有端点
    # 与 API_DOCUMENTATION.md 对比
    pass

def check_model_docs():
    """检查数据模型文档是否最新"""
    # 从 models.py 提取所有模型
    # 与 ARCHITECTURE.md 对比
    pass

def check_dependencies():
    """检查依赖文档是否最新"""
    # 读取 requirements.txt 和 package.json
    # 与 INSTALLATION.md 对比
    pass

if __name__ == '__main__':
    check_api_docs()
    check_model_docs()
    check_dependencies()
```

### 文档生成工具

对于 API 文档，可以考虑使用：
- Swagger/OpenAPI（自动生成 API 文档）
- Sphinx（Python 文档生成）
- JSDoc（JavaScript 文档生成）

---

## 📝 文档更新示例

### 示例 1: 添加新的 API 端点

**代码变更:**
```python
# backend/api/views.py
@api_view(['GET'])
def get_action_statistics(request, action_id):
    """获取动作的统计数据"""
    # ... 实现
```

**需要更新的文档:**

**1. `docs/API_DOCUMENTATION.md`**
```markdown
### 获取动作统计

**Endpoint:** `GET /api/actions/<action_id>/statistics/`

**权限:** Authenticated

**响应:**
```json
{
  "total_sessions": 15,
  "total_reps": 150,
  "avg_accuracy": 0.92
}
```
```

**2. Git Commit:**
```bash
git add backend/api/views.py docs/API_DOCUMENTATION.md
git commit -m "feat: Add action statistics API

- Added get_action_statistics endpoint
- Updated API documentation
"
```

### 示例 2: 性能优化

**代码变更:**
```python
# backend/api/services/dtw_recognition.py
# 扩大滞回区间从 10% 到 60%
thr_in = 0.75 * threshold  # 之前是 0.95
thr_out = 1.35 * threshold  # 之前是 1.05
```

**需要更新的文档:**

**1. `docs/OPTIMIZATION_SUMMARY.md`**
```markdown
### 优化 #1: 扩大滞回区间

**变更:**
- thr_in: 0.95× → 0.75×
- thr_out: 1.05× → 1.35×
- 滞回区间: 10% → 60%

**效果:**
- IN-OUT 抖动 ↓ 80%
```

**2. `docs/MODULES/ACTION_LEARNING_TECHNICAL.md`**
```markdown
### 滞回状态机

**最新优化 (2025-01-12):**
使用更宽的滞回区间（60%）提升稳定性...
```

**3. `README.md`**
```markdown
### 性能优化

- 整体稳定性：60% → 92%
- IN-OUT 抖动减少 80%
```

**4. Git Commit:**
```bash
git add backend/api/services/dtw_recognition.py \
        backend/api/services/pipeline.py \
        backend/api/services/segmentation.py \
        docs/OPTIMIZATION_SUMMARY.md \
        docs/MODULES/ACTION_LEARNING_TECHNICAL.md \
        README.md

git commit -m "perf: Widen hysteresis gap to 60% for stability

- Changed thr_in from 0.95× to 0.75×
- Changed thr_out from 1.05× to 1.35×
- Reduces IN-OUT jitter by 80%
- Updated all related documentation
"
```

---

## 🚨 文档警告标记

### 使用警告标记提醒

在文档中添加警告标记，提醒哪些内容可能过时：

**⚠️ 可能过时的内容:**
```markdown
> ⚠️ **注意**: 此部分描述的是 v1.0 版本的实现。
> 最新版本可能有变更，请参考代码或联系维护者。
```

**🔄 需要更新的内容:**
```markdown
> 🔄 **待更新**: 此性能数据基于 2025-01-01 的测试。
> 最新优化后的数据待补充。
```

---

## 📊 文档质量指标

### 衡量标准

1. **准确性**: 文档是否与代码一致
2. **完整性**: 是否覆盖所有重要功能
3. **时效性**: 是否及时更新
4. **可读性**: 是否易于理解
5. **可维护性**: 是否易于更新

### 质量检查清单

每月执行一次：

- [ ] 所有 API 文档与实际接口一致
- [ ] 所有代码示例可以运行
- [ ] 所有链接有效
- [ ] 所有图片可以显示
- [ ] 版本号正确
- [ ] 依赖列表最新
- [ ] 性能数据最新

---

## 🤖 自动化建议

### Pre-commit Hook

创建 `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# 检查是否有代码变更但没有文档更新
if git diff --cached --name-only | grep -q "backend/api/services/"; then
    if ! git diff --cached --name-only | grep -q "docs/MODULES/ACTION_LEARNING"; then
        echo "⚠️  Warning: Services code changed but documentation not updated"
        echo "Please update docs/MODULES/ACTION_LEARNING_TECHNICAL.md"
        # 可以选择阻止 commit
        # exit 1
    fi
fi

if git diff --cached --name-only | grep -q "backend/api/views.py"; then
    if ! git diff --cached --name-only | grep -q "docs/API_DOCUMENTATION.md"; then
        echo "⚠️  Warning: API code changed but documentation not updated"
        echo "Please update docs/API_DOCUMENTATION.md"
    fi
fi
```

### GitHub Actions

创建 `.github/workflows/docs-check.yml`:

```yaml
name: Documentation Check

on: [pull_request]

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Check if API docs updated
        run: |
          if git diff --name-only origin/main | grep -q "backend/api/views.py"; then
            if ! git diff --name-only origin/main | grep -q "docs/API_DOCUMENTATION.md"; then
              echo "::warning::API code changed but documentation not updated"
            fi
          fi
```

---

## 📋 文档更新记录模板

### CHANGELOG.md 格式

创建 `CHANGELOG.md`:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Feature description

### Changed
- Change description

### Fixed
- Bug fix description

### Documentation
- Documentation update description

## [1.0.0] - 2025-01-12

### Added
- Initial release
- Action Learning module
- Appointment system
- ...

### Documentation
- Created complete documentation system
- 12 professional documents, 74,000+ words
- ...
```

---

## 🔔 提醒系统

### 文档过期提醒

在文档中添加更新日期：

```markdown
---
**文档版本**: v1.0
**最后更新**: 2025-01-12
**对应代码版本**: v1.0
**状态**: ✅ 最新
---
```

当代码更新后，修改状态为：

```markdown
**状态**: ⚠️ 需要更新（代码已变更至 v1.1）
```

---

## 📦 具体更新场景

### 场景 1: 修改 DTW 阈值算法

**代码变更:**
- `backend/api/services/segmentation.py`
- `backend/api/services/pipeline.py`
- `backend/api/services/dtw_recognition.py`

**文档更新清单:**
- [x] `docs/MODULES/ACTION_LEARNING_TECHNICAL.md`
  - 更新阈值计算公式
  - 更新代码示例
  - 更新数值示例
- [x] `docs/OPTIMIZATION_SUMMARY.md`
  - 添加新优化记录
  - 更新效果对比数据
- [x] `README.md`
  - 更新性能数据表格
- [x] `CHANGELOG.md`
  - 记录变更

### 场景 2: 添加新的 energy_p50 参数

**代码变更:**
- `backend/api/services/pipeline.py` - 添加 energy_p50 计算
- `backend/api/services/dtw_recognition.py` - 添加能量门控

**文档更新清单:**
- [x] `docs/MODULES/ACTION_LEARNING_TECHNICAL.md`
  - 第 6 节：添加 energy_p50 说明
  - 第 11 节：更新状态机条件
  - 附录 A：添加新参数
- [x] `docs/OPTIMIZATION_SUMMARY.md`
  - 优化 #3：启用能量门控
- [x] `docs/API_DOCUMENTATION.md`
  - `/api/actions/<id>/finalize/` 响应中添加 energy_p50
  - `/api/infer/stream/` 说明能量门控机制
- [x] `README.md`
  - 核心特性：提及能量门控
  - 性能数据：更新静止误判率

### 场景 3: 添加演示视频功能

**代码变更:**
- `frontend/src/components/AfterLogin/Exercise/RealTimeTest.js`
- `backend/api/views.py` - 修改 action_detail 返回 video_url

**文档更新清单:**
- [x] `docs/FEATURES/DEMO_VIDEO_FEATURE.md` - 创建新文档
- [x] `docs/API_DOCUMENTATION.md` - 更新 action_detail 接口
- [x] `README.md` - 功能列表添加"演示视频查看"
- [x] `docs/README.md` - 添加新文档链接
- [x] `CHANGELOG.md` - 记录新功能

---

## 🎯 文档审查标准

### Pull Request 检查

每个 PR 必须通过以下检查：

1. **代码变更说明清晰**
   - [ ] PR 描述说明了变更内容
   - [ ] 列出了影响的文档

2. **文档已同步更新**
   - [ ] 所有相关文档都已更新
   - [ ] 代码示例与实际代码一致
   - [ ] 性能数据准确

3. **格式规范**
   - [ ] Markdown 格式正确
   - [ ] 代码块指定了语言
   - [ ] 链接使用相对路径

4. **内容质量**
   - [ ] 没有拼写错误
   - [ ] 技术术语准确
   - [ ] 逻辑清晰连贯

---

## 🔧 文档更新工具和技巧

### VS Code 插件推荐

- **Markdown All in One**: 编辑 Markdown
- **Markdown Preview Enhanced**: 预览效果
- **markdownlint**: 检查格式
- **Code Spell Checker**: 拼写检查

### 文档搜索技巧

**查找需要更新的文档:**
```bash
# 搜索包含特定关键词的文档
grep -r "thr_in = 0.95" docs/

# 搜索引用特定文件的文档
grep -r "pipeline.py" docs/
```

### 批量更新版本号

```bash
# 使用 sed 批量替换
sed -i 's/v1.0/v1.1/g' docs/**/*.md

# 或使用 PowerShell
Get-ChildItem docs -Filter *.md -Recurse | 
  ForEach-Object { 
    (Get-Content $_.FullName) -replace 'v1.0', 'v1.1' | 
    Set-Content $_.FullName 
  }
```

---

## 📊 文档更新跟踪

### 创建更新记录表

在每个主要文档的底部添加：

```markdown
---

## 📜 更新历史

| 日期 | 版本 | 更新内容 | 更新人 |
|------|------|---------|--------|
| 2025-01-12 | v1.1 | 添加能量门控说明 | Developer |
| 2025-01-08 | v1.0 | 初始版本 | Developer |
```

---

## ⚠️ 常见文档遗漏

### 容易忘记更新的地方

1. **性能数据**
   - ❌ 代码优化了但数据还是旧的
   - ✅ 每次优化都更新对比表

2. **API 响应格式**
   - ❌ 后端增加了字段但文档没写
   - ✅ 参考实际响应更新示例

3. **依赖版本**
   - ❌ 升级了包但文档还是旧版本
   - ✅ 同步更新 INSTALLATION.md

4. **配置参数**
   - ❌ 增加了新参数但文档没说明
   - ✅ 更新参数列表和默认值

5. **系统截图**
   - ❌ UI 改版了但截图还是旧的
   - ✅ 重新截图并替换

---

## ✅ 最佳实践

### DO（应该做）

✅ **同一个 commit 包含代码和文档变更**
```bash
git add backend/api/services/feat.py docs/MODULES/ACTION_LEARNING_TECHNICAL.md
git commit -m "feat: Add new feature engineering method

- Implemented XYZ feature
- Updated technical documentation
"
```

✅ **在 PR 描述中列出文档更新**
```markdown
## Changes
- Modified DTW threshold calculation

## Documentation Updated
- [x] docs/MODULES/ACTION_LEARNING_TECHNICAL.md
- [x] docs/OPTIMIZATION_SUMMARY.md
- [x] README.md
```

✅ **使用 TODO 注释标记待更新文档**
```python
# TODO: Update docs/API_DOCUMENTATION.md after this API stabilizes
def new_experimental_api():
    pass
```

### DON'T（不应该做）

❌ **代码和文档分开提交**
```bash
git commit -m "Update code"
# ... 几天后
git commit -m "Update docs"
```

❌ **忘记更新示例代码**
```markdown
# 文档中的示例代码已经过时
def old_function():  # ❌ 这个函数已经不存在了
    pass
```

❌ **只更新部分相关文档**
```
更新了算法，但只更新了技术文档，
忘记更新 README.md 的性能数据 ❌
```

---

## 📞 文档维护责任

### 角色分工

| 角色 | 文档维护职责 |
|------|------------|
| **后端开发** | API 文档、技术文档、架构文档 |
| **前端开发** | 用户指南、功能文档、截图 |
| **算法工程师** | Action Learning 技术文档、优化文档 |
| **项目经理** | README、CHANGELOG、发布说明 |
| **所有人** | 自己修改的代码相关的文档 |

### 文档审查

- **自审**: 提交前自己检查
- **互审**: PR 时团队成员审查
- **定期审查**: 每月全面检查

---

## 🎓 总结

### 核心要求

**文档与代码必须保持同步！**

每次代码变更时：
1. ✅ 识别影响的文档
2. ✅ 更新所有相关文档
3. ✅ 在同一个 commit 中提交
4. ✅ PR 中说明文档更新
5. ✅ Code Review 包含文档审查

### 记住

> **"好的文档是项目成功的一半"**
> 
> 文档不仅是给别人看的，也是给未来的自己看的。
> 今天省略的文档更新，明天就会成为调试的噩梦。

---

<p align="center">
  <strong>养成良好的文档习惯，从现在开始！</strong><br>
  文档维护规范 v1.0 | 2025-01-12
</p>

