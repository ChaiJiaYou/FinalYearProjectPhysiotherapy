# 演示视频查看功能 - 实现总结

## ✅ 功能概述

为 Action Learning 系统的每个动作添加了查看演示视频的功能。用户可以在选择动作时点击播放按钮查看演示视频，如果没有视频则显示友好的提示信息。

---

## 🎯 实现的功能

### 1. **查看演示视频按钮**
- 在动作选择对话框中，每个动作右侧添加了播放图标按钮
- 点击按钮可以打开演示视频预览对话框

### 2. **视频预览对话框**
包含三种状态：
- **加载中**：显示"Loading demo video..."提示
- **有视频**：播放实际的演示视频（自动播放、循环、可控制）
- **无视频**：显示"No Demo Video Available"提示和说明

### 3. **视频来源**
- 从后端 API 获取 Action 的 Samples
- 查找第一个包含视频 URL 的 sample
- 如果没有视频，显示友好的提示信息

---

## 📝 修改的文件

### 前端 (Frontend)

#### `frontend/src/components/AfterLogin/Exercise/RealTimeTest.js`
> **位置 1**: 实时测试页面的动作选择对话框

#### `frontend/src/components/AfterLogin/Admin/ActionLearningCenter.js` ⭐ NEW
> **位置 2**: 动作管理中心的主页面卡片

##### 1. 新增导入
```javascript
import {
  // ... 其他导入
  PlayCircleOutline as PlayCircleOutlineIcon,
  VideocamOff as VideocamOffIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
```

##### 2. 新增状态
```javascript
// Demo video states
const [showDemoVideo, setShowDemoVideo] = useState(false);
const [demoVideoUrl, setDemoVideoUrl] = useState(null);
const [demoVideoLoading, setDemoVideoLoading] = useState(false);
```

##### 3. 新增函数
```javascript
// View demo video function
const viewDemoVideo = async (actionId) => {
  setDemoVideoLoading(true);
  setShowDemoVideo(true);
  
  try {
    // Fetch action samples to get demo video
    const response = await fetch(`http://127.0.0.1:8000/api/actions/${actionId}/`);
    
    if (response.ok) {
      const actionData = await response.json();
      
      // Check if action has samples with video
      if (actionData.samples && actionData.samples.length > 0) {
        const sampleWithVideo = actionData.samples.find(sample => sample.video_url);
        
        if (sampleWithVideo) {
          // Construct full URL for video
          const videoUrl = sampleWithVideo.video_url.startsWith('http')
            ? sampleWithVideo.video_url
            : `http://127.0.0.1:8000${sampleWithVideo.video_url}`;
          setDemoVideoUrl(videoUrl);
        } else {
          setDemoVideoUrl(null);
          toast.info('No demo video available for this action');
        }
      } else {
        setDemoVideoUrl(null);
        toast.info('No demo video available for this action');
      }
    } else {
      throw new Error('Failed to fetch action details');
    }
  } catch (error) {
    console.error('Error fetching demo video:', error);
    toast.error('Failed to load demo video');
    setDemoVideoUrl(null);
  } finally {
    setDemoVideoLoading(false);
  }
};
```

##### 4. 修改动作卡片按钮
```javascript
<CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
  <Tooltip title="View demo video">
    <IconButton 
      size="small" 
      color="secondary"
      onClick={() => viewDemoVideo(action.id)}
    >
      <PlayCircleOutlineIcon />
    </IconButton>
  </Tooltip>
  <Tooltip title="Test this action">
    <IconButton 
      size="small" 
      color="primary"
      onClick={() => setShowRealTimeTest(true)}
    >
      <PlayIcon />
    </IconButton>
  </Tooltip>
  <Tooltip title="Delete action and all associated data">
    <IconButton 
      size="small" 
      color="error"
      onClick={() => handleDeleteClick(action)}
    >
      <DeleteIcon />
    </IconButton>
  </Tooltip>
</CardActions>
```

##### 5. 新增演示视频对话框
```javascript
{/* Demo Video Dialog */}
<Dialog 
  open={showDemoVideo} 
  onClose={() => {
    setShowDemoVideo(false);
    setDemoVideoUrl(null);
  }} 
  maxWidth="md" 
  fullWidth
>
  <DialogTitle>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="h6">Demo Video</Typography>
      <IconButton 
        onClick={() => {
          setShowDemoVideo(false);
          setDemoVideoUrl(null);
        }}
      >
        <CloseIcon />
      </IconButton>
    </Box>
  </DialogTitle>
  <DialogContent>
    {/* 视频播放器或"无视频"提示 */}
  </DialogContent>
</Dialog>
```

---

### RealTimeTest.js 实现

##### 1. 新增导入
```javascript
import {
  // ... 其他导入
  PlayCircleOutline  // 新增：播放图标
} from '@mui/icons-material';
```

##### 2. 新增状态
```javascript
// Demo video states
const [showDemoVideo, setShowDemoVideo] = useState(false);
const [demoVideoUrl, setDemoVideoUrl] = useState(null);
const [demoVideoLoading, setDemoVideoLoading] = useState(false);
```

##### 3. 新增函数：`viewDemoVideo`
```javascript
const viewDemoVideo = async (actionId) => {
  setDemoVideoLoading(true);
  setShowDemoVideo(true);
  
  try {
    // 获取 action 详细信息
    const response = await fetch(`http://127.0.0.1:8000/api/actions/${actionId}/`);
    
    if (response.ok) {
      const actionData = await response.json();
      
      // 查找有视频的 sample
      if (actionData.samples && actionData.samples.length > 0) {
        const sampleWithVideo = actionData.samples.find(sample => sample.video_url);
        
        if (sampleWithVideo) {
          // 构建完整的视频 URL
          const videoUrl = sampleWithVideo.video_url.startsWith('http')
            ? sampleWithVideo.video_url
            : `http://127.0.0.1:8000${sampleWithVideo.video_url}`;
          setDemoVideoUrl(videoUrl);
        } else {
          setDemoVideoUrl(null);
          toast.info('No demo video available for this action');
        }
      } else {
        setDemoVideoUrl(null);
        toast.info('No demo video available for this action');
      }
    }
  } catch (error) {
    console.error('Error fetching demo video:', error);
    toast.error('Failed to load demo video');
    setDemoVideoUrl(null);
  } finally {
    setDemoVideoLoading(false);
  }
};
```

##### 4. 修改动作列表：添加播放按钮
```javascript
<ListItem 
  key={action.id} 
  disablePadding
  secondaryAction={
    <IconButton 
      edge="end" 
      aria-label="view demo"
      onClick={(e) => {
        e.stopPropagation();
        viewDemoVideo(action.id);
      }}
      color="primary"
    >
      <PlayCircleOutline />
    </IconButton>
  }
>
  <ListItemButton onClick={() => selectAction(action)}>
    {/* 动作信息 */}
  </ListItemButton>
</ListItem>
```

##### 5. 新增对话框：Demo Video Dialog
```javascript
<Dialog 
  open={showDemoVideo} 
  onClose={() => {
    setShowDemoVideo(false);
    setDemoVideoUrl(null);
  }} 
  maxWidth="md" 
  fullWidth
>
  <DialogTitle>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="h6">Demo Video</Typography>
      <IconButton onClick={() => {
        setShowDemoVideo(false);
        setDemoVideoUrl(null);
      }}>
        <Close />
      </IconButton>
    </Box>
  </DialogTitle>
  <DialogContent>
    {demoVideoLoading ? (
      // 加载状态
      <Box>Loading demo video...</Box>
    ) : demoVideoUrl ? (
      // 有视频：显示视频播放器
      <Box sx={{ 
        position: 'relative', 
        paddingTop: '56.25%', // 16:9 比例
        backgroundColor: '#000',
        borderRadius: 1,
        overflow: 'hidden'
      }}>
        <video
          controls
          autoPlay
          loop
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        >
          <source src={demoVideoUrl} type="video/mp4" />
          <source src={demoVideoUrl} type="video/webm" />
          Your browser does not support the video tag.
        </video>
      </Box>
    ) : (
      // 无视频：显示友好提示
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 300,
        backgroundColor: 'grey.100',
        borderRadius: 1,
        p: 3
      }}>
        <VideocamOff sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Demo Video Available
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          This action doesn't have a demonstration video yet. 
          <br />
          Demo videos are recorded during action creation.
        </Typography>
      </Box>
    )}
  </DialogContent>
</Dialog>
```

---

### 后端 (Backend)

#### `backend/api/views.py`

##### 修复视频URL存储问题
```python
# 修复前：存储绝对路径
sample = ActionSample.objects.create(
    action=action,
    video_url=video_path,  # 绝对路径，如 C:\Users\...\media\...
    fps=fps
)

# 修复后：存储相对URL
relative_url = f"/media/action_videos/{video_filename}"
sample = ActionSample.objects.create(
    action=action,
    video_url=relative_url,  # 相对URL，如 /media/action_videos/...
    fps=fps
)
```

##### 修复视频文件删除逻辑
```python
# 支持新旧两种URL格式
for sample in samples:
    if sample.video_url:
        if sample.video_url.startswith('/media/'):
            # 相对URL - 构造完整路径
            video_path = os.path.join(settings.BASE_DIR, sample.video_url.lstrip('/'))
        else:
            # 绝对路径（兼容旧数据）
            video_path = sample.video_url
        # 删除文件...
```

#### `backend/api/services/pipeline.py`

##### 修复视频路径处理
```python
# 在 _process_sample_to_templates 函数中
elif sample.video_url:
    # 处理相对URL和绝对路径
    if sample.video_url.startswith('/media/'):
        # 相对URL - 构造完整路径
        from django.conf import settings
        import os
        video_path = os.path.join(settings.BASE_DIR, sample.video_url.lstrip('/'))
    else:
        # 绝对路径（兼容旧数据）
        video_path = sample.video_url
    keypoints_sequence = _extract_keypoints_from_video(video_path)
```

##### 修改 `action_detail` 函数
在返回的 sample 数据中添加 `video_url` 字段：

```python
sample_data = []
for sample in samples:
    sample_data.append({
        'id': sample.id,
        'has_video': bool(sample.video_url),
        'video_url': sample.video_url if sample.video_url else None,  # ← 新增
        'has_keypoints': bool(sample.keypoints_json),
        'fps': sample.fps,
        'created_at': sample.created_at.isoformat()
    })
```

**修改前：**
```python
'has_video': bool(sample.video_url),
```

**修改后：**
```python
'has_video': bool(sample.video_url),
'video_url': sample.video_url if sample.video_url else None,  # 返回实际 URL
```

---

## 🎨 用户界面

### 动作选择界面
```
┌─────────────────────────────────────────┐
│  Select Action                          │
├─────────────────────────────────────────┤
│  ┌────────────────────────────────────┐ │
│  │ Arm Raise                       ▶ │ │
│  │ Upper body arm raising exercise   │ │
│  │ Templates: 4 | Samples: 1         │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ Squat                           ▶ │ │
│  │ Lower body squatting exercise     │ │
│  │ Templates: 3 | Samples: 1         │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```
**▶ 图标** = 播放演示视频按钮

### 演示视频对话框 - 有视频
```
┌─────────────────────────────────────────┐
│  Demo Video                          ✕ │
├─────────────────────────────────────────┤
│  ┌──────────────────────────────────┐  │
│  │                                   │  │
│  │   [视频播放器]                    │  │
│  │   ▶ ⏸ ⏹ 🔊 ⚙                    │  │
│  │                                   │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 演示视频对话框 - 无视频
```
┌─────────────────────────────────────────┐
│  Demo Video                          ✕ │
├─────────────────────────────────────────┤
│  ┌──────────────────────────────────┐  │
│  │                                   │  │
│  │       📹 (灰色图标)               │  │
│  │                                   │  │
│  │   No Demo Video Available        │  │
│  │                                   │  │
│  │   This action doesn't have a     │  │
│  │   demonstration video yet.       │  │
│  │   Demo videos are recorded       │  │
│  │   during action creation.        │  │
│  │                                   │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 🔄 工作流程

### 1. 用户点击播放按钮
```
用户 → 点击 ▶ 按钮 → 触发 viewDemoVideo(actionId)
```

### 2. 获取视频信息
```
Frontend → GET /api/actions/{actionId}/ → Backend
         ← 返回 action 详情（包含 samples）
```

### 3. 查找视频 URL
```javascript
const sampleWithVideo = actionData.samples.find(sample => sample.video_url);
if (sampleWithVideo) {
  setDemoVideoUrl(sampleWithVideo.video_url);
} else {
  setDemoVideoUrl(null);
}
```

### 4. 显示结果
- **有视频**：显示 HTML5 视频播放器
- **无视频**：显示"No Demo Video Available"提示

---

## 🎥 视频播放器功能

### 支持的格式
- MP4 (video/mp4)
- WebM (video/webm)

### 播放器特性
- ✅ **自动播放**（autoPlay）
- ✅ **循环播放**（loop）
- ✅ **可控制**（controls）
  - 播放/暂停
  - 音量调节
  - 进度条
  - 全屏
- ✅ **响应式**（16:9 比例，自适应容器）
- ✅ **居中显示**（objectFit: 'contain'）

---

## 📊 API 响应示例

### GET /api/actions/5/

#### 响应（有视频）
```json
{
  "id": 5,
  "name": "Arm Raise",
  "description": "Upper body arm raising exercise",
  "samples": [
    {
      "id": 12,
      "has_video": true,
      "video_url": "/media/action_videos/arm_raise_demo_20250110.mp4",
      "has_keypoints": true,
      "fps": 30,
      "created_at": "2025-01-10T10:30:00Z"
    }
  ],
  "templates": [...],
  "template_count": 4,
  "sample_count": 1
}
```

#### 响应（无视频）
```json
{
  "id": 6,
  "name": "Leg Lift",
  "description": "Lower body leg lifting exercise",
  "samples": [
    {
      "id": 13,
      "has_video": false,
      "video_url": null,
      "has_keypoints": true,
      "fps": 30,
      "created_at": "2025-01-10T11:00:00Z"
    }
  ],
  "templates": [...],
  "template_count": 3,
  "sample_count": 1
}
```

---

## 🛡️ 错误处理

### 1. 网络错误
```javascript
try {
  const response = await fetch(...);
  // ...
} catch (error) {
  console.error('Error fetching demo video:', error);
  toast.error('Failed to load demo video');
  setDemoVideoUrl(null);
}
```

### 2. 无样本数据
```javascript
if (actionData.samples && actionData.samples.length > 0) {
  // 处理样本
} else {
  setDemoVideoUrl(null);
  toast.info('No demo video available for this action');
}
```

### 3. 样本无视频
```javascript
const sampleWithVideo = actionData.samples.find(sample => sample.video_url);

if (sampleWithVideo) {
  setDemoVideoUrl(sampleWithVideo.video_url);
} else {
  setDemoVideoUrl(null);
  toast.info('No demo video available for this action');
}
```

---

## 🎯 用户体验优化

### 1. **加载状态**
显示"Loading demo video..."避免用户等待时的困惑

### 2. **友好提示**
- 无视频时显示清晰的图标和文字说明
- 说明视频是在创建动作时录制的

### 3. **响应式设计**
- 视频容器自动适应窗口大小
- 16:9 宽高比保持视频比例

### 4. **易于关闭**
- 对话框右上角的关闭按钮
- 点击对话框外部也可关闭

### 5. **事件阻止**
```javascript
onClick={(e) => {
  e.stopPropagation();  // 防止触发父元素的 click 事件
  viewDemoVideo(action.id);
}}
```

---

## 🔧 技术细节

### URL 处理
```javascript
const videoUrl = sampleWithVideo.video_url.startsWith('http')
  ? sampleWithVideo.video_url
  : `http://127.0.0.1:8000${sampleWithVideo.video_url}`;
```

- 如果是完整 URL（http/https），直接使用
- 如果是相对路径，拼接服务器地址

### 视频容器布局
```css
{
  position: 'relative',
  paddingTop: '56.25%',  /* 16:9 = 9/16 = 0.5625 */
  backgroundColor: '#000'
}
```

使用 padding-top 技巧保持 16:9 宽高比

---

## ✅ 测试场景

### 场景 1：有演示视频的动作
1. 打开动作选择对话框
2. 点击动作右侧的播放按钮 ▶
3. **期望**：打开视频对话框，自动播放演示视频

### 场景 2：无演示视频的动作
1. 打开动作选择对话框
2. 点击动作右侧的播放按钮 ▶
3. **期望**：打开对话框，显示"No Demo Video Available"

### 场景 3：网络错误
1. 断开网络连接
2. 点击播放按钮 ▶
3. **期望**：显示错误提示"Failed to load demo video"

---

## 📋 总结

✅ **实现完成**
- 前端添加播放按钮和视频预览对话框
- 后端 API 返回视频 URL
- 完整的错误处理和友好提示

✅ **用户体验**
- 直观的播放图标按钮
- 清晰的加载和无视频状态
- 响应式视频播放器

✅ **代码质量**
- 无 linter 错误
- 完善的错误处理
- 清晰的状态管理

---

**文档版本：** v1.0  
**最后更新：** 2025-01-11  
**状态：** ✅ 完成

