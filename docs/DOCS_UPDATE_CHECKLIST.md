# ✅ 文档更新检查清单

**在提交代码前，请检查以下项目！**

---

## 🔍 快速检查

### 我修改了什么类型的代码？

- [ ] **后端 API** (`views.py`, `urls.py`)
  - → 更新 `docs/API_DOCUMENTATION.md`

- [ ] **AI 算法** (`services/` 文件夹)
  - → 更新 `docs/MODULES/ACTION_LEARNING_TECHNICAL.md`

- [ ] **数据模型** (`models.py`)
  - → 更新 `docs/ARCHITECTURE.md` 的数据库部分

- [ ] **前端组件** (`components/`)
  - → 更新功能截图
  - → 更新 `README.md` 功能列表

- [ ] **性能优化** (任何优化)
  - → 更新 `docs/OPTIMIZATION_SUMMARY.md`
  - → 更新 `README.md` 的性能数据

- [ ] **新功能** (任何新功能)
  - → 在 `docs/FEATURES/` 创建新文档
  - → 更新 `README.md` 功能列表
  - → 更新 `CHANGELOG.md`

- [ ] **依赖包** (`requirements.txt`, `package.json`)
  - → 更新 `docs/INSTALLATION.md`

---

## 📋 详细检查清单

### 代码变更

- [ ] 代码功能正常
- [ ] 添加了必要的注释
- [ ] 通过了测试
- [ ] 没有 lint 错误

### 文档更新

- [ ] 识别了所有需要更新的文档（参考上面的映射）
- [ ] 更新了所有相关文档
- [ ] 文档中的代码示例与实际代码一致
- [ ] 更新了性能数据（如适用）
- [ ] 更新了 API 响应示例（如适用）
- [ ] 添加或更新了截图（如适用）

### CHANGELOG

- [ ] 在 `CHANGELOG.md` 的 `[Unreleased]` 部分添加了变更记录
- [ ] 使用了正确的变更类型（Added/Changed/Fixed/etc.）
- [ ] 说明了变更的影响

### Git Commit

- [ ] Commit 消息清晰说明了变更
- [ ] Commit 包含了代码和文档变更
- [ ] Commit 消息中列出了更新的文档

**示例格式:**
```
feat: Add new feature

- Implemented XYZ
- Updated docs/API_DOCUMENTATION.md
- Updated README.md
```

### Pull Request（如适用）

- [ ] PR 描述说明了变更内容
- [ ] PR 描述列出了更新的文档
- [ ] 链接到相关 Issue
- [ ] 请求了文档审查

---

## 🚀 快速参考

### 常见场景速查

#### 场景 1: 添加新 API 端点
```
✅ 更新: docs/API_DOCUMENTATION.md
✅ 更新: CHANGELOG.md
```

#### 场景 2: 修改算法
```
✅ 更新: docs/MODULES/ACTION_LEARNING_TECHNICAL.md
✅ 更新: docs/OPTIMIZATION_SUMMARY.md (如果是优化)
✅ 更新: README.md (性能数据)
✅ 更新: CHANGELOG.md
```

#### 场景 3: 修改数据模型
```
✅ 更新: docs/ARCHITECTURE.md
✅ 更新: docs/API_DOCUMENTATION.md (如果影响 API)
✅ 更新: CHANGELOG.md
```

#### 场景 4: 添加新功能
```
✅ 创建: docs/FEATURES/[新功能].md
✅ 更新: README.md (功能列表)
✅ 更新: docs/README.md (添加链接)
✅ 更新: CHANGELOG.md
✅ 添加: 系统截图
```

#### 场景 5: 升级依赖
```
✅ 更新: requirements.txt 或 package.json
✅ 更新: docs/INSTALLATION.md
✅ 更新: CHANGELOG.md
```

---

## ⚠️ 常见遗漏

### 容易忘记的地方

❌ **只更新了技术文档，忘记更新 README**
- 修改了算法，更新了 ACTION_LEARNING_TECHNICAL.md
- 但忘记更新 README.md 的性能数据 ❌

❌ **添加了 API 但没有写文档**
- 实现了新接口
- 但 API_DOCUMENTATION.md 没有说明 ❌

❌ **优化了代码但没有记录**
- 性能提升了
- 但 OPTIMIZATION_SUMMARY.md 和 README 都没更新 ❌

❌ **修改了参数默认值但没有更新文档**
- 改了 cooldown 从 5 到 16
- 但技术文档还写着旧值 ❌

---

## 📞 需要帮助？

不确定应该更新哪些文档？

1. 查看 [文档维护规范](DOCUMENTATION_MAINTENANCE.md) 的完整映射表
2. 查看之前类似变更的 commit 历史
3. 询问团队成员
4. 提交 Draft PR 请求审查

---

## 🎯 最后提醒

### 三个必须记住的规则

1. **代码变更 = 文档必须同步**
2. **同一个 commit 包含代码和文档**
3. **不确定就问，不要跳过文档**

---

<p align="center">
  <strong>文档和代码同样重要！</strong><br>
  今天的文档更新，明天的时间节省。
</p>

