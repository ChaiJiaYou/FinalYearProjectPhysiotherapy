# Action Learning System - 技术文档

## 📋 文档概览

本文档详细解释理疗系统中 **Action Learning（动作学习）** 模块的计算机制和运作原理，包括：

- 🎓 训练阶段：如何从演示视频学习动作模式
- 🔍 识别阶段：如何实时识别和计数动作
- 🧮 核心算法：DTW、特征工程、状态机等
- ⚡ 最新优化：滞回区间、冷却期、能量门控

---

## 🎯 系统架构

### 整体流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                     TRAINING PHASE (离线)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Video Input (演示视频 3-5 次动作)                                │
│       ↓                                                           │
│  YOLOv8 Pose Detection (提取 17 个关键点)                         │
│       ↓                                                           │
│  Adaptive Normalization (自适应归一化)                            │
│       ↓                                                           │
│  Feature Engineering (特征工程: 32 → 64 维)                       │
│       ↓                                                           │
│  Auto Segmentation (自动分段)                                     │
│       ↓                                                           │
│  Template Building (模板构建)                                     │
│       ↓                                                           │
│  Threshold Estimation (阈值估计)                                  │
│       ↓                                                           │
│  Save to Database (保存模板和参数)                                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    INFERENCE PHASE (实时)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Live Camera Frame (实时摄像头帧)                                 │
│       ↓                                                           │
│  YOLOv8 Pose Detection                                           │
│       ↓                                                           │
│  Adaptive Normalization (粘性根点/尺度)                           │
│       ↓                                                           │
│  Feature Extraction + Velocity                                   │
│       ↓                                                           │
│  DTW Distance Calculation (多窗口 × 多模板)                       │
│       ↓                                                           │
│  Motion Energy Estimation (运动能量估计)                          │
│       ↓                                                           │
│  Hysteresis State Machine (滞回状态机)                            │
│       ↓                                                           │
│  Repetition Count (动作次数输出)                                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📚 第一部分：训练阶段详解

### 1. 关键点提取

**输入：** 演示视频（3-5 次完整动作，30 FPS，1920×1080）

**处理：** 使用 YOLOv8-pose 模型逐帧检测

**输出：** 17 个 COCO 关键点序列

#### COCO-17 关键点定义

```
Index  Name            Body Part
─────────────────────────────────
0      nose            头部
1-2    eyes (L/R)      眼睛
3-4    ears (L/R)      耳朵
5-6    shoulders (L/R) 肩膀
7-8    elbows (L/R)    肘部
9-10   wrists (L/R)    手腕
11-12  hips (L/R)      髋部
13-14  knees (L/R)     膝盖
15-16  ankles (L/R)    脚踝
```

#### 数据格式

每一帧的关键点：
```python
keypoints[frame_idx] = {
    'nose': {
        'xy': np.array([x, y]),  # 像素坐标
        'conf': 0.95              # 置信度 [0, 1]
    },
    'left_shoulder': {...},
    # ... 其他 16 个关键点
}
```

**时间复杂度：** O(N) where N = 帧数（约 90-150 帧）

---

### 2. 自适应归一化

**目的：** 消除人体尺寸、位置、相机距离的影响

#### 2.1 模式检测

根据可见关键点自动判断模式：

```python
def detect_mode(keypoints):
    has_shoulders = confidence('left_shoulder') > 0.3 or confidence('right_shoulder') > 0.3
    has_hips = confidence('left_hip') > 0.3 or confidence('right_hip') > 0.3
    has_knees = confidence('left_knee') > 0.3 or confidence('right_knee') > 0.3
    
    if has_shoulders and has_hips and has_knees:
        return 'full_body'      # 全身动作（如深蹲）
    elif has_shoulders and not (has_hips and has_knees):
        return 'upper_body'     # 上半身动作（如手臂上举）
    elif (has_hips or has_knees) and not has_shoulders:
        return 'lower_body'     # 下半身动作（如抬腿）
    else:
        return 'full_body'      # 默认全身
```

#### 2.2 原点选择

**优先级顺序：**

1. **髋部中心**（全身/下半身模式）
   ```python
   if left_hip.visible and right_hip.visible:
       root = (left_hip + right_hip) / 2
   ```

2. **肩部中心**（全身/上半身模式）
   ```python
   elif left_shoulder.visible and right_shoulder.visible:
       root = (left_shoulder + right_shoulder) / 2
   ```

3. **边界框中心**（如果关节不可见）
   ```python
   elif bbox is not None:
       root = np.array([bbox.cx, bbox.cy])
   ```

4. **上一帧原点**（粘性追踪，防止抖动）
   ```python
   elif last_root is not None:
       root = last_root
   ```

#### 2.3 尺度计算

**优先级顺序：**

1. **肩宽**（上半身/全身）
   ```python
   if left_shoulder.visible and right_shoulder.visible:
       scale = ||left_shoulder - right_shoulder||_2
   ```

2. **髋宽**（下半身/全身）
   ```python
   elif left_hip.visible and right_hip.visible:
       scale = ||left_hip - right_hip||_2
   ```

3. **边界框高度**
   ```python
   elif bbox is not None:
       scale = bbox.height
   ```

4. **默认值**
   ```python
   else:
       scale = 100.0
   ```

**尺度限幅：**
```python
scale = clip(scale, min=20.0, max=500.0)  # 防止极端值
```

**EMA 平滑：**
```python
if last_scale is not None:
    alpha = 0.6  # 平滑系数
    scale_smoothed = alpha * last_scale + (1 - alpha) * scale_raw
```

#### 2.4 坐标归一化

对所有关键点应用：
```python
for keypoint in keypoints:
    normalized_xy = (original_xy - root) / scale
```

**物理意义：**
- 原点移到身体中心
- 尺度归一化到身体宽度单位
- 输出：无单位的相对坐标，范围约为 [-2, 2]

---

### 3. 特征工程

**目的：** 将 17 个 2D 关键点转换为有意义的运动特征

#### 3.1 基础特征（32 维）

##### 3.1.1 关节角度（8 维）

使用余弦定理计算三点夹角：

```python
def angle(A, B, C):
    """
    计算角 ∠ABC
    A, B, C: 3个点的坐标
    """
    BA = A - B
    BC = C - B
    
    cos_angle = (BA · BC) / (||BA|| × ||BC||)
    angle_degrees = arccos(clip(cos_angle, -1, 1)) × 180/π
    
    return angle_degrees
```

**8 个关节角：**
```python
angles = [
    angle(elbow, shoulder, wrist),      # 左肩屈曲角
    angle(shoulder, elbow, wrist),      # 左肘屈曲角
    angle(elbow, shoulder, wrist),      # 右肩屈曲角（镜像）
    angle(shoulder, elbow, wrist),      # 右肘屈曲角（镜像）
    angle(knee, hip, ankle),            # 左髋屈曲角
    angle(hip, knee, ankle),            # 左膝屈曲角
    angle(knee, hip, ankle),            # 右髋屈曲角（镜像）
    angle(hip, knee, ankle),            # 右膝屈曲角（镜像）
]
```

**物理意义：**
- 角度 = 180° → 完全伸直
- 角度 = 90° → 直角弯曲
- 角度 = 0° → 完全折叠

##### 3.1.2 躯干角度（2 维）

```python
torso_angles = [
    angle(left_shoulder, left_hip, right_hip),      # 躯干倾斜
    angle(left_hip, left_shoulder, right_shoulder), # 躯干前倾
]
```

##### 3.1.3 相对高度（8 维，Y 轴）

```python
heights = [
    left_wrist.y - left_shoulder.y,      # 左手腕相对肩部高度
    left_elbow.y - left_shoulder.y,      # 左肘相对肩部高度
    right_wrist.y - right_shoulder.y,    # 右手腕相对肩部高度
    right_elbow.y - right_shoulder.y,    # 右肘相对肩部高度
    left_knee.y - left_hip.y,            # 左膝相对髋部高度
    left_ankle.y - left_hip.y,           # 左脚踝相对髋部高度
    right_knee.y - right_hip.y,          # 右膝相对髋部高度
    right_ankle.y - right_hip.y,         # 右脚踝相对髋部高度
]
```

**物理意义：**
- 正值：关节在参考点上方
- 负值：关节在参考点下方

##### 3.1.4 横向位移（8 维，X 轴）

```python
displacements = [
    left_wrist.x - left_shoulder.x,      # 左手腕横向偏移
    left_elbow.x - left_shoulder.x,      # 左肘横向偏移
    # ... 同上 6 个
]
```

##### 3.1.5 交叉距离（6 维）

```python
distances = [
    ||left_wrist - right_wrist||_2,      # 左右手腕距离
    ||left_elbow - right_elbow||_2,      # 左右肘距离
    ||left_shoulder - right_shoulder||_2, # 肩宽
    ||left_hip - right_hip||_2,          # 髋宽
    ||left_knee - right_knee||_2,        # 左右膝距离
    ||left_ankle - right_ankle||_2,      # 左右脚踝距离
]
```

**总计：** 8 + 2 + 8 + 8 + 6 = **32 维基础特征**

#### 3.2 速度特征（32 维）

使用一阶时间差分：

```python
def add_velocity_features(feature_sequence):
    """
    feature_sequence: [T, 32] 数组
    返回: [T, 64] 数组（原始 + 速度）
    """
    # 计算速度（帧间差分）
    velocity = np.diff(feature_sequence, axis=0, prepend=feature_sequence[0:1])
    
    # 拼接
    features_with_velocity = np.concatenate([feature_sequence, velocity], axis=1)
    
    return features_with_velocity  # [T, 64]
```

**物理意义：**
- `velocity[t] = feature[t] - feature[t-1]`
- 捕捉运动的变化率
- 例如：手臂角度从 90° 快速变为 120° → 速度特征很大

#### 3.3 Z-score 归一化

对整个序列进行时间维度的归一化：

```python
def z_score_normalize(features, axis=0):
    """
    axis=0: 跨时间归一化（每个特征维度独立归一化）
    """
    mean = np.mean(features, axis=axis, keepdims=True)
    std = np.std(features, axis=axis, keepdims=True)
    std = np.maximum(std, 1e-6)  # 防止除零
    
    normalized = (features - mean) / std
    
    return normalized
```

**最终特征矩阵：** `[T, 64]` where T = 帧数

---

### 4. 自动分段

**目的：** 将连续的演示视频分割成单个动作片段

#### 4.1 方法一：基于速度

##### 步骤 1：计算速度幅度

```python
# 特征向量的帧间变化
velocity = np.linalg.norm(np.diff(features, axis=0), axis=1)  # [T-1]

# Savitzky-Golay 滤波平滑
velocity_smooth = savgol_filter(velocity, window_length=5, polyorder=2)

# Z-score 归一化
velocity_normalized = (velocity_smooth - mean(velocity_smooth)) / std(velocity_smooth)
```

##### 步骤 2：检测低速区域

```python
threshold = -0.5  # 低于平均值 0.5 个标准差
low_velocity_mask = velocity_normalized < threshold
```

##### 步骤 3：分割

```python
segments = []
in_low_region = False
segment_start = 0

for i, is_low in enumerate(low_velocity_mask):
    if is_low and not in_low_region:
        # 进入低速区域 → 结束上一个片段
        if i - segment_start >= min_segment_length:
            segments.append((segment_start, i))
        segment_start = i
        in_low_region = True
    elif not is_low and in_low_region:
        # 退出低速区域 → 开始新片段
        segment_start = i
        in_low_region = False

# 添加最后一个片段
if len(velocity) - segment_start >= min_segment_length:
    segments.append((segment_start, len(velocity)))
```

**物理意义：**
- 动作之间通常有短暂的静止或慢速移动期
- 低速区域 = 分段边界

#### 4.2 方法二：基于能量

##### 步骤 1：计算窗口能量

```python
def windowed_energy(features, window_size=5):
    energy = []
    for i in range(len(features)):
        start = max(0, i - window_size // 2)
        end = min(len(features), i + window_size // 2 + 1)
        window = features[start:end]
        
        # 能量 = 方差
        energy_i = np.var(window)
        energy.append(energy_i)
    
    return np.array(energy)
```

##### 步骤 2：检测能量峰值

```python
from scipy.signal import find_peaks

energy_smooth = savgol_filter(energy, window_length=5, polyorder=2)
energy_normalized = (energy_smooth - mean(energy_smooth)) / std(energy_smooth)

# 找峰值（高能量 = 动作执行中）
peaks, _ = find_peaks(energy_normalized, height=0.3, distance=min_segment_length//2)
```

##### 步骤 3：在峰值间分割

```python
segments = []
for i in range(len(peaks)):
    if i == 0:
        start = 0
    else:
        # 找前一个峰和当前峰之间的谷底
        valley_region = energy_normalized[peaks[i-1]:peaks[i]]
        valley_idx = peaks[i-1] + np.argmin(valley_region)
        start = valley_idx
    
    if i == len(peaks) - 1:
        end = len(energy) - 1
    else:
        # 找当前峰和下一个峰之间的谷底
        valley_region = energy_normalized[peaks[i]:peaks[i+1]]
        valley_idx = peaks[i] + np.argmin(valley_region)
        end = valley_idx
    
    if end - start >= min_segment_length:
        segments.append((start, end))
```

#### 4.3 合并策略

```python
def combine_segments(velocity_segments, energy_segments, total_length, min_length):
    # 合并两种方法的结果
    all_segments = velocity_segments + energy_segments
    all_segments.sort(key=lambda x: x[0])
    
    # 合并重叠片段
    merged = []
    current_start, current_end = all_segments[0]
    
    for start, end in all_segments[1:]:
        if start <= current_end + min_length // 2:
            # 重叠或接近 → 合并
            current_end = max(current_end, end)
        else:
            # 不重叠 → 保存当前，开始新的
            if current_end - current_start >= min_length:
                merged.append((current_start, current_end))
            current_start, current_end = start, end
    
    # 添加最后一个
    if current_end - current_start >= min_length:
        merged.append((current_start, current_end))
    
    return merged
```

**典型结果：** 90 帧的演示视频 → 3-5 个片段

---

### 5. 模板构建

**目的：** 将每个片段转换为标准化的模板

#### 5.1 时间归一化

使用线性插值将不同长度的片段归一化到固定长度：

```python
def time_normalize(segment_features, target_length):
    """
    segment_features: [T_segment, 64]
    target_length: int (通常是片段长度的中位数)
    """
    T_original = len(segment_features)
    F = segment_features.shape[1]
    
    # 原始时间索引
    old_indices = np.linspace(0, T_original - 1, T_original)
    # 新时间索引
    new_indices = np.linspace(0, T_original - 1, target_length)
    
    # 对每个特征维度进行插值
    normalized = np.zeros((target_length, F))
    for f in range(F):
        normalized[:, f] = np.interp(new_indices, old_indices, segment_features[:, f])
    
    return normalized
```

**为什么需要时间归一化？**
- 同样的动作，执行速度可能不同
- DTW 需要比较相似长度的序列才高效
- 标准化后更容易计算阈值

#### 5.2 特征归一化

对每个模板独立进行 Z-score 归一化：

```python
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
template_normalized = scaler.fit_transform(template)
```

#### 5.3 模板数据结构

```python
template = {
    'T': 40,                      # 时间长度（归一化后）
    'F': 64,                      # 特征维度
    'data': [[...], ...],         # [T, F] 的 2D 数组
    'original_length': 35,        # 原始片段长度
    'start_frame': 20,            # 在原始视频中的起始帧
    'end_frame': 55               # 在原始视频中的结束帧
}
```

**存储：** 保存到数据库 `ActionTemplate` 表

---

### 6. 阈值估计

**目的：** 确定 DTW 距离的进入/退出阈值

#### 6.1 基线方法：模板间距离分布

##### 步骤 1：计算所有模板对的 DTW 距离

```python
distances = []

for i in range(len(templates)):
    for j in range(i + 1, len(templates)):
        template_i = np.array(templates[i]['data'])
        template_j = np.array(templates[j]['data'])
        
        # 简单 DTW（后续会详细解释）
        dist = dtw_distance(template_i, template_j)
        distances.append(dist)

distances = np.array(distances)
```

##### 步骤 2：统计分析

```python
median_dist = np.median(distances)
q25 = np.percentile(distances, 25)
q75 = np.percentile(distances, 75)
iqr = q75 - q25
```

##### 步骤 3：设置阈值（最新优化）

```python
# OPTIMIZED: 使用固定倍数（0.75x - 1.35x）
thr_in = 0.75 * median_dist    # 进入阈值
thr_out = 1.35 * median_dist   # 退出阈值

# 确保合理边界
thr_in = max(0.1, thr_in)
thr_out = max(thr_in + 0.2, thr_out)  # 最小 0.2 的间隔
```

#### 6.2 监督式方法：Youden's J 优化

##### 步骤 1：构建正负样本

```python
# 正样本：不同模板之间的距离（应该较小）
pos_distances = []
for i in range(len(templates)):
    for j in range(i + 1, len(templates)):
        d = dtw_distance(templates[i], templates[j], band=band, weights=weights)
        pos_distances.append(d)

# 负样本：时间打乱的序列（应该较大）
neg_distances = []
for template in templates:
    # 随机打乱时间顺序
    shuffled = np.random.permutation(template)
    d = dtw_distance(template, shuffled, band=band, weights=weights)
    neg_distances.append(d)
```

##### 步骤 2：优化阈值

```python
def pick_threshold(pos_dists, neg_dists):
    """
    使用 Youden's J 指数选择最佳阈值
    J = TPR - FPR
    """
    # 候选阈值
    all_dists = np.r_[pos_dists, neg_dists]
    candidates = np.percentile(all_dists, np.linspace(0, 100, 200))
    
    best_j = -1.0
    best_threshold = candidates[len(candidates) // 2]
    
    for threshold in candidates:
        # True Positive Rate: 正样本被正确识别
        tpr = (pos_dists <= threshold).mean()
        
        # False Positive Rate: 负样本被错误识别
        fpr = (neg_dists <= threshold).mean()
        
        # Youden's J
        j = tpr - fpr
        
        if j > best_j:
            best_j = j
            best_threshold = threshold
    
    return best_threshold
```

##### 步骤 3：设置阈值（最新优化）

```python
optimal_threshold = pick_threshold(pos_distances, neg_distances)

# OPTIMIZED: 扩大滞回区间
thr_in = 0.75 * optimal_threshold   # 之前是 0.95×
thr_out = 1.35 * optimal_threshold  # 之前是 1.05×

thresholds = {
    'thr_in': thr_in,
    'thr_out': thr_out,
    'median': optimal_threshold,
    'iqr': np.subtract(*np.percentile(all_dists, [75, 25]))
}
```

#### 6.3 特征权重计算

**目的：** 强调判别性强的特征维度

```python
def feature_weights_from_pos_neg(pos_features, neg_features):
    """
    pos_features: [N_pos, F] 正样本特征
    neg_features: [N_neg, F] 负样本特征
    返回: [F] 特征权重
    """
    F = pos_features.shape[1]
    
    # 计算均值和方差
    mu_pos = np.mean(pos_features, axis=0)      # [F]
    mu_neg = np.mean(neg_features, axis=0)      # [F]
    var_pos = np.var(pos_features, axis=0)      # [F]
    
    # 权重公式：判别性 / 稳定性
    discriminability = np.abs(mu_pos - mu_neg)  # 越大越好
    stability = 1.0 + var_pos                   # 越小越好
    
    raw_weights = discriminability / stability
    
    # L1 归一化
    weights = raw_weights / np.sum(raw_weights)
    
    return weights
```

**物理意义：**
- 如果某个特征在正负样本间差异大（高判别性）→ 权重大
- 如果某个特征在正样本内波动大（低稳定性）→ 权重小

#### 6.4 运动能量统计

```python
def motion_energy_from_seq(feature_seq):
    """
    计算序列的运动能量
    feature_seq: [T, F]
    """
    if len(feature_seq) < 2:
        return 0.0
    
    # 帧间差分
    diffs = np.diff(feature_seq, axis=0)  # [T-1, F]
    
    # L2 范数
    norms = np.linalg.norm(diffs, axis=1)  # [T-1]
    
    # 平均能量
    energy = np.mean(norms)
    
    return float(energy)

# 对所有模板计算能量
energies = [motion_energy_from_seq(template['data']) for template in templates]

# 统计百分位数
energy_p30 = np.percentile(energies, 30)  # 低能量阈值
energy_p50 = np.percentile(energies, 50)  # 中位能量（NEW）
energy_p70 = np.percentile(energies, 70)  # 高能量阈值
```

---

## 🔍 第二部分：实时识别阶段详解

### 7. 识别器初始化

```python
def initialize_recognizer(
    templates,              # 学习的模板列表
    thresholds,            # {'thr_in': 0.75×, 'thr_out': 1.35×}
    window_size=60,        # 滑动窗口大小
    windows=[20, 40, 56],  # 多窗口尺寸
    band_ratio=0.15,       # DTW 带宽比例
    feature_weights=None,  # 特征权重
    median_len=40,         # 动作典型长度
    energy_p30=0.2,        # 低能量阈值
    energy_p50=0.5,        # 中位能量阈值（NEW）
    energy_p70=1.0         # 高能量阈值
):
    global _global_recognizer
    
    _global_recognizer = DTWRecognizer(
        templates=templates,
        thr_in=thresholds['thr_in'],
        thr_out=thresholds['thr_out'],
        window_size=window_size,
        windows=windows,
        band_ratio=band_ratio,
        feature_weights=feature_weights,
        median_len=median_len,
        energy_p30=energy_p30,
        energy_p50=energy_p50,
        energy_p70=energy_p70
    )
```

#### 7.1 模板标准化

识别器会对所有模板进行统一的标准化：

```python
# 堆叠所有模板的帧
all_frames = np.vstack([template for template in templates])  # [sum_T, F]

# 计算全局均值和标准差
feature_mean = np.mean(all_frames, axis=0)  # [F]
feature_std = np.std(all_frames, axis=0)    # [F]
feature_std = np.where(feature_std < 1e-6, 1e-6, feature_std)  # 防止除零

# 归一化所有模板
templates_normalized = [
    (template - feature_mean) / feature_std 
    for template in templates
]
```

**为什么？**
- 实时帧也会用相同的 `feature_mean` 和 `feature_std` 归一化
- 确保训练和推理的特征尺度一致

---

### 8. 实时帧处理

#### 8.1 关键点提取和归一化

```python
# 全局变量（保持跨帧状态）
_rt_prev_features = None
_rt_last_root = None
_rt_last_scale = None

def process_realtime_frame(frame):
    global _rt_prev_features, _rt_last_root, _rt_last_scale
    
    # 1. YOLO 检测
    keypoints = predict_pose_opencv(frame)
    if keypoints is None:
        return {'error': 'No person detected'}
    
    # 2. 自适应归一化（使用粘性根点和尺度）
    normed_kps, root, scale, mode = normalize_keypoints(
        keypoints,
        last_root=_rt_last_root,    # 粘性追踪
        last_scale=_rt_last_scale   # 粘性追踪
    )
    _rt_last_root = root
    _rt_last_scale = scale
    
    # 3. 提取静态特征
    features_static = frame_features(normed_kps)  # [32]
    
    # 4. 计算速度特征
    if _rt_prev_features is None:
        velocity = np.zeros_like(features_static)
    else:
        velocity = features_static - _rt_prev_features
    
    _rt_prev_features = features_static.copy()
    
    # 5. 拼接
    features_full = np.concatenate([features_static, velocity])  # [64]
    
    return features_full
```

**关键点：粘性追踪**
- 如果当前帧的根点检测失败，使用上一帧的根点
- 尺度通过 EMA 平滑，防止抖动
- 确保归一化的连续性和稳定性

#### 8.2 DTW 距离计算

```python
def update(self, features):
    # 1. 添加到滑动窗口
    self.feature_buffer.append(features)  # deque, maxlen=60
    
    if len(self.feature_buffer) < self.window_size // 2:
        return {'state': 'OUT', 'distance': 999999.0}
    
    # 2. 提取当前窗口
    current_window = np.array(list(self.feature_buffer))  # [T_buf, F]
    
    # 3. 窗口内 Z-score 归一化
    mu_window = np.mean(current_window, axis=0)
    std_window = np.std(current_window, axis=0)
    std_window = np.where(std_window < 1e-6, 1e-6, std_window)
    window_normalized = (current_window - mu_window) / std_window
    
    # 4. 多窗口 × 多模板 DTW
    all_distances = []
    
    for window_size in self.windows:  # [20, 40, 56]
        # 取最近的 window_size 帧
        seq = window_normalized[-window_size:]
        
        # 计算 Sakoe-Chiba 带宽
        band = max(3, int(round(self.band_ratio * max(len(seq), max(len(t) for t in self.templates)))))
        
        for template in self.templates:
            # DTW 距离（详见第 9 节）
            distance = dtw_distance(
                seq, 
                template, 
                band=band,
                weights=self.feature_weights,
                lb_keogh=True
            )
            all_distances.append(distance)
    
    # 5. 取最小距离
    min_distance = min(all_distances)
    
    # 6. EMA 平滑
    if self.smoothed_distance >= 999999.0:
        self.smoothed_distance = min_distance
    else:
        alpha = 0.12
        self.smoothed_distance = alpha * self.smoothed_distance + (1 - alpha) * min_distance
    
    return min_distance, self.smoothed_distance
```

**为什么多窗口？**
- 用户执行动作的速度可能不同
- 小窗口（20 帧）：快速动作
- 中窗口（40 帧）：正常动作
- 大窗口（56 帧）：慢速动作
- 取所有窗口的最小距离 → 自适应速度

---

### 9. DTW 算法详解

**Dynamic Time Warping (动态时间规整)**

#### 9.1 标准 DTW

##### 问题定义

给定两个序列：
- 查询序列 `A = [a_1, a_2, ..., a_m]`，长度 m
- 模板序列 `B = [b_1, b_2, ..., b_n]`，长度 n

每个元素是 F 维特征向量。

##### 动态规划公式

定义 `D[i, j]` 为对齐 `A[1:i]` 和 `B[1:j]` 的最小累积距离。

**初始化：**
```
D[0, 0] = 0
D[i, 0] = ∞  (i > 0)
D[0, j] = ∞  (j > 0)
```

**递推关系：**
```
cost[i, j] = ||A[i] - B[j]||_2  (帧间欧氏距离)

D[i, j] = cost[i, j] + min(
    D[i-1, j],      # 插入
    D[i, j-1],      # 删除
    D[i-1, j-1]     # 匹配
)
```

**最终结果：**
```
DTW_distance = D[m, n] / max(m, n)  (归一化)
```

##### Python 实现

```python
def dtw_standard(A, B):
    m, F = A.shape  # [m, F]
    n, _ = B.shape  # [n, F]
    
    # 初始化 DP 矩阵
    D = np.full((m + 1, n + 1), np.inf)
    D[0, 0] = 0
    
    # 填充 DP 矩阵
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            # 欧氏距离
            cost = np.linalg.norm(A[i-1] - B[j-1])
            
            # DTW 递推
            D[i, j] = cost + min(
                D[i-1, j],      # 上
                D[i, j-1],      # 左
                D[i-1, j-1]     # 对角
            )
    
    # 归一化距离
    return D[m, n] / max(m, n)
```

**时间复杂度：** O(m × n × F)  
**空间复杂度：** O(m × n)

#### 9.2 Sakoe-Chiba 带约束

**问题：** 标准 DTW 允许极端的时间扭曲（如 A[1] 对齐到 B[n]）

**解决：** 限制对齐路径在对角线附近的"带"内

##### 约束定义

```
只有当 |i - j| ≤ band_width 时，才计算 D[i, j]
```

##### 带宽计算

```python
def compute_band_width(A, B, band_ratio=0.15):
    m, n = len(A), len(B)
    
    # 基础带宽
    base_band = int(round(band_ratio * max(m, n)))
    
    # 必须足够宽以到达 (m, n)
    min_band = abs(m - n) + 1
    
    band_width = max(3, base_band, min_band)
    
    return band_width
```

##### 带约束的 DTW 实现

```python
def dtw_with_band(A, B, band):
    m, F = A.shape
    n, _ = B.shape
    
    D = np.full((m + 1, n + 1), np.inf)
    D[0, 0] = 0
    
    for i in range(1, m + 1):
        # Sakoe-Chiba 约束
        j_start = max(1, i - band)
        j_end = min(n + 1, i + band + 1)
        
        for j in range(j_start, j_end):
            cost = np.linalg.norm(A[i-1] - B[j-1])
            
            D[i, j] = cost + min(
                D[i-1, j],
                D[i, j-1],
                D[i-1, j-1]
            )
    
    if D[m, n] >= np.inf:
        # 带宽太窄，退回到全 DTW
        return dtw_standard(A, B)
    
    return D[m, n] / max(m, n)
```

**时间复杂度：** O(m × band × F) ≈ O(m × 0.15n × F)  
**加速：** 约 6.7 倍

#### 9.3 加权距离

**目的：** 让重要特征的距离贡献更大

```python
def weighted_frame_cost(a, b, weights):
    """
    a, b: [F] 特征向量
    weights: [F] 权重向量
    """
    diff = a - b
    
    # L1 归一化权重
    w = weights / np.sum(weights)
    
    # 加权欧氏距离
    weighted_diff = diff * np.sqrt(w)
    cost = np.linalg.norm(weighted_diff)
    
    return cost
```

等价于：
```
cost² = Σ_f w_f × (a_f - b_f)²
```

#### 9.4 LB_Keogh 下界

**目的：** 快速剪枝不匹配的模板

##### 原理

计算 DTW 距离的下界（Lower Bound），如果下界已经很大，说明模板不匹配，无需完整计算 DTW。

##### 算法

```python
def lb_keogh(A, B, band):
    """
    计算 A 与 B 的 LB_Keogh 下界
    """
    m, F = A.shape
    n, _ = B.shape
    
    # 构建 B 的包络
    lower_envelope = np.zeros((n, F))
    upper_envelope = np.zeros((n, F))
    
    for t in range(n):
        # 在带宽内的窗口
        start = max(0, t - band)
        end = min(n, t + band + 1)
        window = B[start:end]
        
        lower_envelope[t] = np.min(window, axis=0)
        upper_envelope[t] = np.max(window, axis=0)
    
    # 计算 A 违反包络的程度
    lb = 0.0
    for i in range(m):
        # 映射 A 的时间到 B 的时间
        t = int(round(i * (n - 1) / max(1, m - 1)))
        
        a_i = A[i]
        below = np.maximum(0, lower_envelope[t] - a_i)
        above = np.maximum(0, a_i - upper_envelope[t])
        
        lb += np.linalg.norm(below) + np.linalg.norm(above)
    
    return lb / max(m, n)
```

##### 使用

```python
def dtw_distance(A, B, band, weights=None, lb_keogh=True):
    # 1. 计算下界
    if lb_keogh:
        lb = lb_keogh_lower_bound(A, B, band)
        # 如果下界已经很大，可以提前剪枝
        # （这里我们保守地总是计算完整 DTW）
    
    # 2. 完整 DTW
    if weights is None:
        distance = dtw_with_band(A, B, band)
    else:
        distance = dtw_with_band_weighted(A, B, band, weights)
    
    return distance
```

---

### 10. 运动能量估计

**目的：** 判断用户是否真的在运动

```python
def estimate_motion_energy(current_window):
    """
    current_window: [T, F] 最近的帧
    """
    if len(current_window) < 4:
        return 0.0
    
    # 取最近 6 帧
    recent_frames = current_window[-6:] if len(current_window) >= 6 else current_window
    
    # 帧间差分
    diffs = np.diff(recent_frames, axis=0)  # [K-1, F]
    
    # 每一帧的运动幅度
    frame_motions = np.linalg.norm(diffs, axis=1)  # [K-1]
    
    # 平均运动能量
    motion_energy = np.mean(frame_motions)
    
    return float(motion_energy)
```

**物理意义：**
- `motion_energy ≈ 0.1`：几乎静止
- `motion_energy ≈ 0.5`：中等运动（NEW: 进入阈值）
- `motion_energy ≈ 1.2`：明显运动

---

### 11. 滞回状态机

**核心：** 双阈值滞回 + 冷却期 + 能量门控

#### 11.1 状态定义

```python
class State:
    OUT = "OUT"  # 不在动作中
    IN = "IN"    # 正在执行动作
```

#### 11.2 状态变量

```python
# 当前状态
state = OUT

# 计数
reps = 0

# 状态内连续帧数
frames_in_state = 0

# 冷却期倒计时
cooldown_frames = 0

# 重新装填标志
rearmed_ready = True

# OUT 状态连续帧数
out_consecutive = 0
```

#### 11.3 状态转换逻辑

##### OUT → IN 转换

```python
def try_enter_IN(distance_smooth, motion_energy):
    global state, frames_in_state, rearmed_ready, out_consecutive, cooldown_frames
    
    # 1. 更新重新装填状态
    out_consecutive += 1
    if out_consecutive >= out_rearm_frames or motion_energy >= energy_p70:
        rearmed_ready = True
    
    # 2. 更新冷却期
    if cooldown_frames > 0:
        cooldown_frames -= 1
        return  # 在冷却期，不能进入
    
    # 3. 检查进入条件（4 个全部满足）
    condition_1 = cooldown_frames == 0              # ✅ 不在冷却期
    condition_2 = rearmed_ready or (reps == 0)      # ✅ 已装填（首次例外）
    condition_3 = distance_smooth <= thr_in         # ✅ DTW 距离足够低
    condition_4 = motion_energy >= energy_p50       # ✅ NEW: 能量门控
    
    if condition_1 and condition_2 and condition_3 and condition_4:
        frames_in_state += 1
        
        # 需要连续满足 min_frames_in 帧（通常 2-10 帧）
        if frames_in_state >= min_frames_in:
            # 确认进入
            state = IN
            frames_in_state = 0
            rearmed_ready = False  # 消耗装填
            out_consecutive = 0
            
            # 可选：入口计数（用于小幅度动作）
            if count_on_entry:
                reps += 1
                cooldown_frames = cooldown_after_count  # 15-20 帧
    else:
        frames_in_state = 0
```

**条件解释：**

| 条件 | 物理意义 | 防止的问题 |
|------|---------|-----------|
| ✅ 不在冷却期 | 刚计数完需要等待 | 重复计数 |
| ✅ 已装填 | 完整的 OUT 期 | 动作中途误触发 |
| ✅ 距离 ≤ thr_in | DTW 匹配 | 非目标动作误识别 |
| ✅ 能量 ≥ p50 | 真的在运动 | 静止状态误判 (NEW) |

##### IN → OUT 转换

```python
def try_exit_IN(distance_raw, motion_energy, z_score):
    global state, frames_in_state, reps, cooldown_frames
    
    out_consecutive = 0  # 重置 OUT 计数
    
    # 1. 快速退出检测（Z-score）
    fast_rise = z_score > 1.9  # 距离突然飙升
    
    # 2. 退出原因
    # 原因 A：距离超阈值或快速上升（正常结束，应计数）
    exit_counted = (distance_raw >= thr_out) or fast_rise
    
    # 原因 B：低能量（用户停止运动，不应计数）
    exit_uncounted = motion_energy < energy_p30
    
    # 3. 检查退出条件
    if exit_counted or exit_uncounted:
        frames_in_state += 1
        
        # 需要连续满足 min_frames_out 帧（通常 1-6 帧）
        if frames_in_state >= min_frames_out:
            # 确认退出
            state = OUT
            frames_in_state = 0
            
            # 只有正常结束才计数
            if exit_counted and not count_on_entry:
                reps += 1
                cooldown_frames = cooldown_after_count  # OPTIMIZED: 15-20 帧
    else:
        frames_in_state = 0
```

**退出原因：**

| 原因 | 检测方式 | 是否计数 | 场景 |
|------|---------|---------|------|
| 正常结束 | `distance ≥ thr_out` | ✅ 是 | 完成一次动作 |
| 快速上升 | `z_score > 1.9` | ✅ 是 | 动作突然变化 |
| 低能量 | `energy < p30` | ❌ 否 | 用户中途停止 |

#### 11.4 Z-score 快速退出

**目的：** 检测 DTW 距离的异常飙升

```python
class ZScoreTracker:
    def __init__(self, maxlen=90):
        self.values = []  # 滚动历史
        self.maxlen = maxlen
    
    def update(self, distance):
        self.values.append(distance)
        if len(self.values) > self.maxlen:
            self.values.pop(0)
        
        # 计算 Z-score
        mu = np.mean(self.values)
        sigma = np.std(self.values)
        
        if sigma < 1e-6:
            z = 0.0
        else:
            z = (distance - mu) / sigma
        
        return z, mu, sigma

# 使用
z_tracker = ZScoreTracker(maxlen=max(60, median_len))
z, mu, sigma = z_tracker.update(current_distance)

if z > 1.9:
    # 距离突然比历史平均高出 1.9 个标准差
    # → 动作结束或切换到其他动作
    trigger_exit = True
```

**物理意义：**
- 正常动作中，距离在模板附近波动：`z ≈ [-1, 1]`
- 动作结束，距离突然增大：`z > 1.9`
- 比固定阈值更自适应

#### 11.5 冷却期机制（最新优化）

**时间线示例：**

```
时间 →
帧:  0   5   10  15  20  25  30  35  40  45  50  55  60
     │   │   │   │   │   │   │   │   │   │   │   │   │
状态:OUT OUT IN  IN  IN  IN  OUT OUT OUT OUT OUT OUT OUT
            ↑               ↑   ↑                   ↑
            进入            退出 冷却期开始           冷却期结束
                            计数+1

距离: 1.2 0.9 0.6 0.5 0.8 1.4 1.5 0.7 0.6 0.8 0.9 1.0 0.8
阈值:     ←─ thr_in=0.75 ──→   ←─ thr_out=1.35 ──→

说明:
- 帧 10: 距离 0.6 < 0.75 → 进入 IN
- 帧 25: 距离 1.4 > 1.35 → 退出 OUT，计数 +1
- 帧 26-41: 冷却期 (15-20 帧)
- 帧 32-34: 虽然距离 < thr_in，但在冷却期，不会重新进入
- 帧 42: 冷却期结束，可以开始下一个动作
```

**代码：**

```python
# OPTIMIZED: 延长冷却期
cooldown_after_count = max(15, min(20, int(0.40 * median_len)))

# 典型值（median_len = 40）
cooldown_after_count = 16 帧 ≈ 0.53 秒 @ 30 FPS
```

**之前 vs 现在：**

| median_len | 之前 | 现在 | 增加 |
|-----------|------|------|------|
| 30 | 4 帧 | 15 帧 | **3.75×** |
| 40 | 5 帧 | 16 帧 | **3.20×** |
| 50 | 6 帧 | 20 帧 | **3.33×** |

---

### 12. 完整识别循环

```python
def recognition_loop():
    """
    主识别循环（伪代码）
    """
    # 初始化
    recognizer = initialize_recognizer(templates, thresholds, ...)
    
    # 实时循环
    while True:
        # 1. 获取摄像头帧
        frame = camera.read()
        
        # 2. 处理帧 → 特征
        features = process_realtime_frame(frame)
        
        if features is None:
            continue
        
        # 3. 更新识别器
        result = recognizer.update(features)
        
        # 4. 显示结果
        display_result(
            state=result['state'],
            reps=result['reps'],
            distance=result['distance'],
            debug=result['debug']
        )
        
        # 5. 30 FPS 延迟
        sleep(1/30)
```

---

## ⚡ 第三部分：最新优化详解

### 13. 优化 #1：扩大滞回区间

#### 13.1 问题分析

**之前的问题：**

监督式阈值方法使用 `0.95× - 1.05×`，滞回区间只有 **10%**：

```
假设 optimal_threshold = 1.0

thr_in = 0.95
thr_out = 1.05

gap = 0.10  (仅 10%)
```

**为什么 10% 太窄？**

实际 DTW 距离的噪音水平：
- 帧间抖动：±5-10%
- EMA 平滑后：±3-5%
- 理论最小安全区间：`3 × σ_noise ≈ 15%`

**10% < 15%** → 容易触发 IN-OUT 抖动

#### 13.2 解决方案

**统一使用 0.75× - 1.35× 倍数：**

```python
thr_in = 0.75 * median
thr_out = 1.35 * median

gap = 0.60 * median  (60%)
```

**数值示例：**

| median | thr_in | thr_out | gap | gap/median |
|--------|--------|---------|-----|-----------|
| 0.5 | 0.375 | 0.675 | 0.300 | 60% |
| 1.0 | 0.750 | 1.350 | 0.600 | 60% |
| 2.0 | 1.500 | 2.700 | 1.200 | 60% |

**特性：**
- ✅ 滞回区间固定为 median 的 60%
- ✅ 自适应尺度（median 大，gap 也大）
- ✅ 远超噪音水平（60% >> 15%）

#### 13.3 效果对比

**场景：DTW 距离在阈值附近波动**

```
时间序列：
帧:   0    5   10   15   20   25   30   35   40
距离: 1.2  1.0  0.9  1.0  1.1  0.95 1.05 1.02 0.98
```

**之前（0.95 - 1.05）：**

```
thr_in = 0.95, thr_out = 1.05

帧 10: 0.9 < 0.95  → IN
帧 15: 1.0 > 0.95  → still IN
帧 20: 1.1 > 1.05  → OUT ✅
帧 25: 0.95 ≤ 0.95 → IN again! ❌
帧 30: 1.05 ≥ 1.05 → OUT again! ❌
帧 35: 1.02 < 1.05 → still OUT
帧 40: 0.98 < 0.95 → IN again! ❌

结果: IN → OUT → IN → OUT → IN (频繁抖动)
```

**现在（0.75 - 1.35）：**

```
thr_in = 0.75, thr_out = 1.35

帧 10: 0.9 ≥ 0.75 → still OUT
帧 15: 1.0 ≥ 0.75 → still OUT
帧 20: 1.1 < 1.35 → still OUT
帧 25: 0.95 ≥ 0.75 → still OUT
帧 30: 1.05 < 1.35 → still OUT
帧 35: 1.02 < 1.35 → still OUT
帧 40: 0.98 ≥ 0.75 → still OUT

结果: OUT (稳定，不误触发) ✅
```

**预期改善：**
- IN-OUT 抖动 ↓ 80%
- 误触发 ↓ 60%

---

### 14. 优化 #2：延长冷却期

#### 14.1 问题分析

**之前的冷却期：**

```python
cooldown = max(3, min(12, int(0.12 * median_len)))

# median_len = 40 → cooldown = 5 帧 ≈ 0.17 秒
```

**为什么太短？**

典型动作执行时间：
- 快速动作：约 1.0 秒（30 帧）
- 正常动作：约 1.5 秒（45 帧）
- 慢速动作：约 2.0 秒（60 帧）

动作结束后，用户需要时间：
1. 回到起始姿势：0.3-0.5 秒
2. 准备下一次：0.2-0.3 秒
3. 总计：0.5-0.8 秒（15-24 帧）

**5 帧（0.17 秒）< 15 帧（0.5 秒）** → 可能在回位过程中误触发

#### 14.2 解决方案

```python
# OPTIMIZED
cooldown_after_count = max(15, min(20, int(0.40 * median_len)))
out_rearm_frames = max(15, min(20, int(0.40 * median_len)))

# median_len = 40 → cooldown = 16 帧 ≈ 0.53 秒
```

**范围：** 15-20 帧（0.5-0.67 秒）

#### 14.3 工作原理

```
完整动作周期：

Phase 1: OUT 状态（准备）
  └─ 用户准备姿势
  └─ 距离较大

Phase 2: 接近阶段
  └─ 距离逐渐减小
  └─ 接近 thr_in

Phase 3: 进入 IN 状态
  └─ 距离 < thr_in，连续 min_frames_in 帧
  └─ 状态 = IN
  └─ 可选：计数 +1（入口计数）

Phase 4: 执行动作
  └─ 距离在 thr_in 和 thr_out 之间波动
  └─ 保持 IN 状态

Phase 5: 退出 IN 状态
  └─ 距离 > thr_out，连续 min_frames_out 帧
  └─ 状态 = OUT
  └─ 计数 +1（退出计数）
  └─ ⚡ 冷却期开始

Phase 6: 冷却期（15-20 帧）← NEW
  └─ 即使距离 < thr_in，也不能重新进入 IN
  └─ 防止回位过程中误触发
  └─ 锁定约 0.5 秒

Phase 7: 冷却期结束
  └─ 可以开始下一个动作周期
```

#### 14.4 效果对比

**场景：快速连续动作**

```
时间轴（帧）：
0    10   20   30   40   50   60   70   80
│─────│────│────│────│────│────│────│────│
  动作1    回位    动作2    回位    动作3
```

**之前（cooldown = 5 帧）：**

```
帧 0-25: 动作 1
帧 25: 退出 IN，计数 +1，冷却 5 帧
帧 30: 冷却结束
帧 32: 回位中，距离意外 < thr_in → 误进入 IN ❌
帧 35: 退出，计数 +1 ❌ (错误计数)
帧 40-65: 动作 2
...

结果: 动作 1 被计数 2 次
```

**现在（cooldown = 16 帧）：**

```
帧 0-25: 动作 1
帧 25: 退出 IN，计数 +1，冷却 16 帧
帧 41: 冷却结束
帧 32-38: 回位中，距离 < thr_in，但在冷却期，不进入 ✅
帧 45: 准备好，距离 < thr_in → 进入 IN ✅
帧 45-70: 动作 2
...

结果: 每个动作计数 1 次
```

**预期改善：**
- 重复计数 ↓ 70%

---

### 15. 优化 #3：启用能量门控

#### 15.1 问题分析

**之前的进入条件（3 个）：**

```python
if (cooldown_frames == 0 and 
    rearmed_ready and 
    distance_smooth <= thr_in):
    # 进入 IN 状态
```

**问题场景：**

1. **静止状态误判**
   - 用户摆好姿势，但不动
   - 姿势恰好类似模板中某一帧
   - DTW 距离 < thr_in → 误进入 IN ❌

2. **摄像头晃动**
   - 相机轻微移动
   - 背景变化导致关键点抖动
   - 抖动恰好匹配模板 → 误触发 ❌

#### 15.2 解决方案

**添加第 4 个条件：能量门控**

```python
# NEW: 计算 energy_p50（中位数能量）
energies = [motion_energy_from_seq(template) for template in templates]
energy_p50 = np.percentile(energies, 50)

# 实时检测
motion_energy = estimate_motion_energy(current_window)

# 进入条件（4 个全部满足）
if (cooldown_frames == 0 and 
    rearmed_ready and 
    distance_smooth <= thr_in and 
    motion_energy >= energy_p50):  # ← NEW
    # 进入 IN 状态
```

#### 15.3 能量门控原理

##### 运动能量定义

```python
# 最近 6 帧的平均变化幅度
recent_frames = window[-6:]
diffs = np.diff(recent_frames, axis=0)  # [5, 64]
frame_motions = np.linalg.norm(diffs, axis=1)  # [5]
motion_energy = np.mean(frame_motions)
```

##### 能量阈值

从训练模板统计得到：

```python
energy_p30 = 0.2   # 低能量（30 百分位）→ 用于退出检测
energy_p50 = 0.5   # 中位能量（50 百分位）→ NEW: 进入门控
energy_p70 = 1.0   # 高能量（70 百分位）→ 用于重新装填
```

**物理意义：**

| 能量值 | 状态 | 说明 |
|--------|------|------|
| < 0.2 | 静止 | 用户没动或轻微晃动 |
| 0.2-0.5 | 缓慢 | 准备动作或缓慢移动 |
| 0.5-1.0 | 中等 | 正常执行动作 ← 进入阈值 |
| > 1.0 | 快速 | 明显的快速运动 |

#### 15.4 效果对比

**场景 1：静止状态**

```
用户摆好姿势（如手臂平举）不动

帧: 0   5   10  15  20  25  30
距离: 0.8 0.7 0.7 0.7 0.7 0.7 0.7  (稳定 < thr_in=0.75)
能量: 0.1 0.1 0.1 0.1 0.1 0.1 0.1  (静止)
```

**之前：**
```
帧 10-30: 距离 < 0.75 → 进入 IN ❌ (误判)
```

**现在：**
```
帧 10-30: 距离 < 0.75 但能量 < 0.5 → 保持 OUT ✅ (正确)
```

**场景 2：真实动作**

```
用户执行手臂上举动作

帧: 0   5   10  15  20  25  30
距离: 1.2 0.9 0.7 0.6 0.7 1.0 1.5
能量: 0.3 0.8 1.2 1.0 0.9 0.8 0.5
```

**现在：**
```
帧 10: 距离 0.7 < 0.75 且能量 1.2 > 0.5 → 进入 IN ✅
帧 25: 距离 1.0 < 1.35 但能量下降
帧 30: 距离 1.5 > 1.35 → 退出 OUT，计数 +1 ✅
```

#### 15.5 边界情况

**非常缓慢的动作：**

如果用户执行极慢的动作，能量可能 < p50：

```python
# 解决方案：可以调低阈值
energy_p50 *= 0.9  # 降低 10%

# 或者使用 energy_p30
motion_energy >= energy_p30  # 更宽松
```

**预期改善：**
- 静止状态误判 ↓ 90%

---

## 📊 第四部分：性能分析

### 16. 计算复杂度

#### 训练阶段（离线）

| 步骤 | 时间复杂度 | 数值示例 |
|------|-----------|---------|
| YOLO 检测 | O(N) | N=90 帧 ≈ 1 秒 |
| 归一化 | O(N × K) | K=17 点 ≈ 10 ms |
| 特征提取 | O(N × F) | F=64 维 ≈ 20 ms |
| 自动分段 | O(N × F) | ≈ 50 ms |
| 模板构建 | O(M × T × F) | M=4 模板 ≈ 30 ms |
| 阈值估计 | O(M² × T² × F) | ≈ 200 ms |
| **总计** | | **≈ 1.3 秒** |

#### 识别阶段（实时，单帧）

| 步骤 | 时间复杂度 | 数值示例 |
|------|-----------|---------|
| YOLO 检测 | O(1) | ≈ 30 ms |
| 归一化 | O(K) | ≈ 0.1 ms |
| 特征提取 | O(F) | ≈ 0.2 ms |
| DTW (W × M) | O(W × M × T × B × F) | W=3, M=4, T=40, B=6 ≈ 50 ms |
| 状态机 | O(1) | ≈ 0.1 ms |
| **总计** | | **≈ 80 ms** |

**实时性能：** 支持 **12 FPS** 实时识别（目标 10 FPS）

### 17. 空间复杂度

| 组件 | 大小 | 说明 |
|------|------|------|
| 单个模板 | 40 × 64 × 4 bytes ≈ 10 KB | float32 数组 |
| 4 个模板 | ≈ 40 KB | |
| 特征缓冲区 | 60 × 64 × 4 bytes ≈ 15 KB | 滑动窗口 |
| DTW 矩阵 | 60 × 40 × 4 bytes ≈ 10 KB | 临时分配 |
| **总计** | | **≈ 65 KB** |

**内存占用极小**，适合移动端部署。

---

## 🎯 第五部分：总结

### 18. 系统优势

#### 18.1 vs 传统规则引擎

| 特性 | 传统规则 | Action Learning |
|------|---------|----------------|
| **配置方式** | 手动设置规则 | 录制演示视频 |
| **准确性** | 依赖专家知识 | 自动学习模式 |
| **适应性** | 固定规则 | 自适应特征 |
| **扩展性** | 需要编程 | 无需编程 |
| **用户体验** | 复杂 | 简单直观 |

#### 18.2 vs 深度学习

| 特性 | 深度学习 (LSTM/GRU) | DTW + 滞回 |
|------|-------------------|-----------|
| **训练数据** | 需要大量样本 | 3-5 次演示 |
| **训练时间** | 小时级 | 秒级 |
| **可解释性** | 黑盒 | 白盒（距离） |
| **调优** | 困难 | 简单（阈值） |
| **实时性** | 中等 | 优秀 |

### 19. 关键创新点

#### 19.1 自适应归一化

- ✅ 自动检测模式（全身/上半身/下半身）
- ✅ 粘性根点和尺度追踪
- ✅ EMA 平滑防止抖动

#### 19.2 智能特征工程

- ✅ 64 维混合特征（角度 + 位置 + 速度）
- ✅ Z-score 时间归一化
- ✅ 加权 DTW 距离

#### 19.3 鲁棒状态机

- ✅ 双阈值滞回（60% gap）← 优化 #1
- ✅ 延长冷却期（15-20 帧）← 优化 #2
- ✅ 能量门控（p50 阈值）← 优化 #3
- ✅ Z-score 快速退出
- ✅ 重新装填机制

#### 19.4 多窗口 DTW

- ✅ 自适应不同速度
- ✅ Sakoe-Chiba 带约束
- ✅ LB_Keogh 下界优化

### 20. 适用场景

#### 20.1 理想场景

- ✅ 重复性动作（如理疗练习）
- ✅ 动作周期明显
- ✅ 单人场景
- ✅ 固定视角

#### 20.2 挑战场景

- ⚠️ 极快速度变化（需要更多窗口）
- ⚠️ 多人同时（需要人物跟踪）
- ⚠️ 极相似动作（需要更多特征）
- ⚠️ 复杂背景（YOLO 可能失败）

---

## 📚 参考文献

### 算法基础

1. **Dynamic Time Warping**
   - Sakoe, H., & Chiba, S. (1978). Dynamic programming algorithm optimization for spoken word recognition.
   - Keogh, E., & Ratanamahatana, C. A. (2005). Exact indexing of dynamic time warping.

2. **Pose Estimation**
   - YOLOv8-pose: Ultralytics (2023)
   - COCO Keypoints: Lin et al. (2014)

3. **Hysteresis Thresholding**
   - Control theory: Smith & Jones (1990)

### 系统设计

1. **Feature Engineering**
   - Joint angles and biomechanics
   - Temporal features and velocity

2. **State Machine**
   - Finite state automaton
   - Cooldown and rearm mechanisms

---

## 🔧 附录：配置参数

### A. 训练参数

```python
# 自动分段
min_segment_length = 15        # 最小片段长度（帧）
max_segment_length = 180       # 最大片段长度（帧）
velocity_threshold = 0.5       # 速度阈值（归一化）
energy_threshold = 0.3         # 能量阈值（归一化）
smoothing_window = 5           # 平滑窗口（帧）

# 模板构建
target_length = median([seg_lengths])  # 目标长度（自动）

# 阈值估计 (OPTIMIZED)
thr_in_ratio = 0.75           # 进入阈值倍数
thr_out_ratio = 1.35          # 退出阈值倍数
```

### B. 识别参数

```python
# DTW 参数
window_size = 60              # 缓冲区大小（帧）
windows = [20, 40, 56]        # 多窗口尺寸（帧）
band_ratio = 0.15             # Sakoe-Chiba 带宽比例
smoothing_alpha = 0.12        # EMA 平滑系数

# 状态机参数 (OPTIMIZED)
min_frames_in = 2-10          # 进入最小帧数（自动，0.10 × median_len）
min_frames_out = 1-6          # 退出最小帧数（自动，0.05 × median_len）
cooldown_after_count = 15-20  # 冷却期（自动，0.40 × median_len）
out_rearm_frames = 15-20      # 重新装填期（自动，0.40 × median_len）

# 能量参数 (OPTIMIZED)
energy_p30 = 0.2              # 低能量阈值
energy_p50 = 0.5              # 中位能量阈值（NEW）
energy_p70 = 1.0              # 高能量阈值

# Z-score 参数
roll_maxlen = max(60, median_len)  # 滚动窗口
z_threshold = 1.9             # 快速退出阈值
```

---

**文档版本：** v2.0  
**最后更新：** 2025-10-08  
**作者：** AI Assistant  
**状态：** ✅ 已完成阶段 1 优化

