/**
 * Pose utilities for pose detection and feature extraction
 * Note: DTW-related functions have been removed. This file contains basic pose utilities.
 */

/**
 * Z-Score 规范化函数
 * 将原始特征向量转换为 Z-score 规范化特征向量
 * 公式: (X - μ) / σ
 * 
 * @param {Array<number>} features - 32 维原始特征向量
 * @param {Object} normParams - 规范化参数对象
 * @param {Array<number>} normParams.feature_mean - 32 维平均值数组
 * @param {Array<number>} normParams.feature_std - 32 维标准差数组
 * @returns {Array<number>} 32 维 Z-Score 规范化特征向量
 */
export function zScoreNormalize(features, normParams) {
    if (!normParams || !normParams.feature_mean || !normParams.feature_std) {
        console.warn('⚠️ Z-Score normalization params missing, returning original features');
        return features;
    }
    
    const mean = normParams.feature_mean;
    const std = normParams.feature_std;
    const normalized = [];
    
    // Ensure arrays have correct length
    const featureLength = Math.min(features.length, mean.length, std.length);
    
    for (let i = 0; i < featureLength; i++) {
        // 防止除以零
        const s = std[i] < 1e-6 ? 1e-6 : std[i];
        
        // Z-score formula: (X - μ) / σ
        normalized.push((features[i] - mean[i]) / s);
    }
    
    // Pad or truncate to 32 dimensions
    while (normalized.length < 32) {
        normalized.push(0.0);
    }
    
    return normalized.slice(0, 32);
}

// --- 32 维特征的索引映射表 ---
// 参照文档 3.1 节中的特征顺序
// 特征顺序：
// 0-7: 关节角度 (8个)
// 8-9: 躯干角度 (2个)
// 10-17: 相对高度 (8个)
// 18-25: 横向位移 (8个)
// 26-31: 交叉距离 (6个)
export const FEATURE_MAPPING = {
    // 角度特征 (索引 0-7)
    'Left_Arm': [
        0, 1,  // 左肩角度、左肘角度
        10, 11, // 左腕高度、左肘高度 (相对高度)
        18, 19  // 左腕横向位移、左肘横向位移
    ], 
    'Right_Arm': [
        2, 3,  // 右肩角度、右肘角度
        12, 13, // 右腕高度、右肘高度 (相对高度)
        20, 21  // 右腕横向位移、右肘横向位移
    ],
    // 躯干/核心特征
    'Torso': [
        8, 9,  // 躯干倾斜角度、躯干倾斜角度2
        29     // 髋部宽度 (交叉距离)
    ], 
    'Left_Leg': [
        4, 5,  // 左髋角度、左膝角度
        14, 15, // 左膝高度、左踝高度 (相对高度)
        22, 23  // 左膝横向位移、左踝横向位移
    ],
    'Right_Leg': [
        6, 7,  // 右髋角度、右膝角度
        16, 17, // 右膝高度、右踝高度 (相对高度)
        24, 25  // 右膝横向位移、右踝横向位移
    ],
    // 注意: 交叉距离 (26, 27, 28, 30, 31) 默认权重为 1，无需在映射表中全列出
};

/**
 * 根据用户选择的部位，动态生成 32 维特征权重数组
 * @param {Array<string>} activeParts - 用户选择的部位名称，例如 ['Left_Arm', 'Torso']
 * @param {number} highWeight - 活跃部位的权重 (默认 5.0)
 * @param {number} lowWeight - 抑制部位的权重 (默认 0.1)
 * @returns {Array<number>} 32 维权重数组
 */
export function generateDynamicWeights(activeParts, highWeight = 5.0, lowWeight = 0.1) {
    const weights = new Array(32).fill(lowWeight); // 默认抑制所有特征

    if (!activeParts || activeParts.length === 0) {
        return new Array(32).fill(1.0); // 如果没有选择，则全部权重为 1
    }

    const activeIndices = new Set();

    // 1. 收集所有活跃部位的索引
    activeParts.forEach(part => {
        const indices = FEATURE_MAPPING[part];
        if (indices) {
            indices.forEach(index => activeIndices.add(index));
        }
    });

    // 2. 将这些索引的权重设为高权重
    activeIndices.forEach(index => {
        if (index < 32) {
            weights[index] = highWeight;
        }
    });

    // 3. 确保跨体距离（如肩宽 28, 髋宽 29）至少保持中等权重，防止归一化失效。
    // 特征 28 ('left_shoulder' - 'right_shoulder' 距离，肩宽) 设为 1.0
    if (weights[28] === lowWeight) {
        weights[28] = 1.0; 
    }
    // 特征 29 ('left_hip' - 'right_hip' 距离，髋宽)
    if (weights[29] === lowWeight) {
        weights[29] = 1.0; 
    }
    
    // 4. 确保其他交叉距离特征也保持基础权重（防止完全忽略）
    // 特征 26 (手腕分离), 27 (肘部分离), 30 (膝部分离), 31 (踝部分离)
    const crossBodyIndices = [26, 27, 30, 31];
    crossBodyIndices.forEach(idx => {
        if (weights[idx] === lowWeight) {
            weights[idx] = 0.5; // 中等权重，不完全忽略
        }
    });

    return weights;
}

/**
 * Calculate angle ∠ABC in degrees using cosine law
 * @param {Array<number>} A - First point [x, y]
 * @param {Array<number>} B - Vertex point [x, y]
 * @param {Array<number>} C - Third point [x, y]
 * @returns {number} Angle in degrees (0° - 180°)
 */
export function angle(A, B, C) {
  // Calculate vectors BA and BC
  const ba = [A[0] - B[0], A[1] - B[1]];
  const bc = [C[0] - B[0], C[1] - B[1]];

  // Calculate dot product
  const dotProduct = ba[0] * bc[0] + ba[1] * bc[1];

  // Calculate magnitudes (norms)
  const normBA = Math.sqrt(ba[0] * ba[0] + ba[1] * ba[1]);
  const normBC = Math.sqrt(bc[0] * bc[0] + bc[1] * bc[1]);

  // Avoid division by zero
  const denominator = normBA * normBC + 1e-6;

  // Calculate cosine of angle
  const cosAngle = dotProduct / denominator;

  // Clamp to [-1, 1] to avoid NaN from arccos
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));

  // Convert to degrees
  const angleRad = Math.acos(clampedCos);
  const angleDeg = (angleRad * 180) / Math.PI;

  return angleDeg;
}

/**
 * Check if a point is missing (all zeros or undefined)
 * @param {Array<number>|undefined} point - Point coordinates
 * @returns {boolean}
 */
function isPointMissing(point) {
  if (!point || point.length !== 2) return true;
  return Math.abs(point[0]) < 1e-6 && Math.abs(point[1]) < 1e-6;
}

/**
 * Safely calculate angle, return 180 if any point is missing
 * @param {Object} kps - Normalized keypoints object
 * @param {string} aName - Name of first point
 * @param {string} bName - Name of vertex point
 * @param {string} cName - Name of third point
 * @returns {number} Angle in degrees
 */
function safeAngle(kps, aName, bName, cName) {
  try {
    const a = kps[aName];
    const b = kps[bName];
    const c = kps[cName];

    if (isPointMissing(a) || isPointMissing(b) || isPointMissing(c)) {
      return 180.0;
    }

    return angle(a, b, c);
  } catch (error) {
    return 180.0;
  }
}

/**
 * Calculate relative position along specified axis
 * @param {Object} kps - Normalized keypoints object
 * @param {string} pointName - Name of point
 * @param {string} refName - Name of reference point
 * @param {number} axis - Axis index (0=x, 1=y)
 * @returns {number} Relative position
 */
function safeRelativePos(kps, pointName, refName, axis = 1) {
  try {
    const point = kps[pointName];
    const ref = kps[refName];

    if (isPointMissing(point) || isPointMissing(ref)) {
      return 0.0;
    }

    return point[axis] - ref[axis];
  } catch (error) {
    return 0.0;
  }
}

/**
 * Calculate Euclidean distance between two points
 * @param {Array<number>} p1 - First point [x, y]
 * @param {Array<number>} p2 - Second point [x, y]
 * @returns {number} Distance
 */
function distance(p1, p2) {
  if (isPointMissing(p1) || isPointMissing(p2)) {
    return 0.0;
  }
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Safely get distance between two keypoints
 * @param {Object} kps - Normalized keypoints object
 * @param {string} name1 - Name of first point
 * @param {string} name2 - Name of second point
 * @returns {number} Distance
 */
function safeDistance(kps, name1, name2) {
  try {
    const p1 = kps[name1];
    const p2 = kps[name2];
    return distance(p1, p2);
  } catch (error) {
    return 0.0;
  }
}

/**
 * Replace NaN and Infinity values with safe defaults
 * @param {number} value - Value to sanitize
 * @returns {number} Sanitized value
 */
function sanitizeValue(value) {
  if (isNaN(value) || !isFinite(value)) {
    return 0.0;
  }
  if (value === Infinity) {
    return 10.0;
  }
  if (value === -Infinity) {
    return -10.0;
  }
  return value;
}

/**
 * Extract 32-dimensional static feature vector from normalized keypoints
 * 
 * @param {Object} normalizedKeypoints - Object containing 17 normalized COCO keypoints
 *   Format: {
 *     nose: [x, y],
 *     left_shoulder: [x, y],
 *     right_shoulder: [x, y],
 *     left_elbow: [x, y],
 *     right_elbow: [x, y],
 *     left_wrist: [x, y],
 *     right_wrist: [x, y],
 *     left_hip: [x, y],
 *     right_hip: [x, y],
 *     left_knee: [x, y],
 *     right_knee: [x, y],
 *     left_ankle: [x, y],
 *     right_ankle: [x, y],
 *     ... (other keypoints)
 *   }
 * 
 * @returns {Array<number>} 32-dimensional feature vector
 * 
 * Feature breakdown:
 *   - 8 joint angles (shoulder/elbow/hip/knee, left/right)
 *   - 2 torso angles (tilt and lean)
 *   - 8 relative heights (y-axis differences)
 *   - 8 lateral displacements (x-axis differences)
 *   - 6 cross-body distances
 */
export function extractStaticFeatures(normalizedKeypoints) {
  /**
   * Extract 32-dimensional static feature vector from normalized keypoints
   * 
   * This function is a direct port from Python backend/api/services/feat.py::frame_features()
   * 
   * Feature breakdown (total: 32):
   *   - 8 joint angles (shoulder/elbow/hip/knee, left/right)
   *   - 2 torso angles (tilt and lean)
   *   - 8 relative heights (y-axis differences)
   *   - 8 lateral displacements (x-axis differences)
   *   - 6 cross-body distances
   */
  const kps = normalizedKeypoints;
  const features = [];

  // 1. Joint angles (8 features)
  // Left arm angles
  features.push(safeAngle(kps, 'left_elbow', 'left_shoulder', 'left_wrist'));      // left shoulder flexion
  features.push(safeAngle(kps, 'left_shoulder', 'left_elbow', 'left_wrist'));     // left elbow flexion
  
  // Right arm angles
  features.push(safeAngle(kps, 'right_elbow', 'right_shoulder', 'right_wrist'));   // right shoulder flexion
  features.push(safeAngle(kps, 'right_shoulder', 'right_elbow', 'right_wrist'));   // right elbow flexion
  
  // Left leg angles
  features.push(safeAngle(kps, 'left_knee', 'left_hip', 'left_ankle'));           // left hip flexion
  features.push(safeAngle(kps, 'left_hip', 'left_knee', 'left_ankle'));           // left knee flexion
  
  // Right leg angles
  features.push(safeAngle(kps, 'right_knee', 'right_hip', 'right_ankle'));        // right hip flexion
  features.push(safeAngle(kps, 'right_hip', 'right_knee', 'right_ankle'));        // right knee flexion

  // 2. Torso angles (2 features)
  features.push(safeAngle(kps, 'left_shoulder', 'left_hip', 'right_hip'));        // torso tilt
  features.push(safeAngle(kps, 'left_hip', 'left_shoulder', 'right_shoulder'));    // torso lean

  // 3. Relative heights (y-axis, 8 features)
  // Left arm heights (relative to left shoulder)
  features.push(safeRelativePos(kps, 'left_wrist', 'left_shoulder', 1));         // left wrist height
  features.push(safeRelativePos(kps, 'left_elbow', 'left_shoulder', 1));           // left elbow height
  
  // Right arm heights (relative to right shoulder)
  features.push(safeRelativePos(kps, 'right_wrist', 'right_shoulder', 1));        // right wrist height
  features.push(safeRelativePos(kps, 'right_elbow', 'right_shoulder', 1));        // right elbow height
  
  // Left leg heights (relative to left hip)
  features.push(safeRelativePos(kps, 'left_knee', 'left_hip', 1));                // left knee height
  features.push(safeRelativePos(kps, 'left_ankle', 'left_hip', 1));               // left ankle height
  
  // Right leg heights (relative to right hip)
  features.push(safeRelativePos(kps, 'right_knee', 'right_hip', 1));              // right knee height
  features.push(safeRelativePos(kps, 'right_ankle', 'right_hip', 1));            // right ankle height

  // 4. Lateral displacements (x-axis, 8 features)
  // Left arm x-offsets (relative to left shoulder)
  features.push(safeRelativePos(kps, 'left_wrist', 'left_shoulder', 0));          // left wrist x-offset
  features.push(safeRelativePos(kps, 'left_elbow', 'left_shoulder', 0));           // left elbow x-offset
  
  // Right arm x-offsets (relative to right shoulder)
  features.push(safeRelativePos(kps, 'right_wrist', 'right_shoulder', 0));         // right wrist x-offset
  features.push(safeRelativePos(kps, 'right_elbow', 'right_shoulder', 0));        // right elbow x-offset
  
  // Left leg x-offsets (relative to left hip)
  features.push(safeRelativePos(kps, 'left_knee', 'left_hip', 0));                // left knee x-offset
  features.push(safeRelativePos(kps, 'left_ankle', 'left_hip', 0));               // left ankle x-offset
  
  // Right leg x-offsets (relative to right hip)
  features.push(safeRelativePos(kps, 'right_knee', 'right_hip', 0));              // right knee x-offset
  features.push(safeRelativePos(kps, 'right_ankle', 'right_hip', 0));             // right ankle x-offset

  // 5. Cross-body distances (6 features)
  features.push(safeDistance(kps, 'left_wrist', 'right_wrist'));                 // wrist separation
  features.push(safeDistance(kps, 'left_elbow', 'right_elbow'));                  // elbow separation
  features.push(safeDistance(kps, 'left_shoulder', 'right_shoulder'));            // shoulder width
  features.push(safeDistance(kps, 'left_hip', 'right_hip'));                      // hip width
  features.push(safeDistance(kps, 'left_knee', 'right_knee'));                   // knee separation
  features.push(safeDistance(kps, 'left_ankle', 'right_ankle'));                 // ankle separation

  // Sanitize all features (handle NaN/Infinity)
  const sanitizedFeatures = features.map(sanitizeValue);

  // Verify we have exactly 32 features
  if (sanitizedFeatures.length !== 32) {
    console.warn(`Expected 32 features, got ${sanitizedFeatures.length}`);
    // Pad or truncate to 32
    while (sanitizedFeatures.length < 32) {
      sanitizedFeatures.push(0.0);
    }
    return sanitizedFeatures.slice(0, 32);
  }

  return sanitizedFeatures;
}

/**
 * Calculate adaptive normalization parameters (Root and Scale)
 * Corresponds to documentation sections 2.2 and 2.3
 * Ported from Python backend/api/services/feat.py::normalize_keypoints()
 * 
 * @param {Array<Array<number>>} keypoints - Raw keypoints array [17][2] (x, y coordinates)
 *   COCO-17 format: [nose, left_eye, right_eye, left_ear, right_ear,
 *                    left_shoulder, right_shoulder, left_elbow, right_elbow,
 *                    left_wrist, right_wrist, left_hip, right_hip,
 *                    left_knee, right_knee, left_ankle, right_ankle]
 * @returns {Object} { root: [x, y], scale: number }
 */
export function calculateNormalizationParams(keypoints) {
  // COCO-17 keypoint indices
  const LEFT_SHOULDER = 5;
  const RIGHT_SHOULDER = 6;
  const LEFT_HIP = 11;
  const RIGHT_HIP = 12;

  // Helper function: check if point is valid (not [0, 0] or missing)
  const isValid = (idx) => {
    if (!keypoints || idx >= keypoints.length || !keypoints[idx]) {
      return false;
    }
    const pt = keypoints[idx];
    return pt.length === 2 && (Math.abs(pt[0]) > 1e-6 || Math.abs(pt[1]) > 1e-6);
  };

  let root = [0, 0];
  let scale = 100.0; // Default scale

  // 1. Calculate Root (origin point) - Priority: hip center > shoulder center
  if (isValid(LEFT_HIP) && isValid(RIGHT_HIP)) {
    root = [
      (keypoints[LEFT_HIP][0] + keypoints[RIGHT_HIP][0]) / 2,
      (keypoints[LEFT_HIP][1] + keypoints[RIGHT_HIP][1]) / 2
    ];
  } else if (isValid(LEFT_SHOULDER) && isValid(RIGHT_SHOULDER)) {
    root = [
      (keypoints[LEFT_SHOULDER][0] + keypoints[RIGHT_SHOULDER][0]) / 2,
      (keypoints[LEFT_SHOULDER][1] + keypoints[RIGHT_SHOULDER][1]) / 2
    ];
  }

  // 2. Calculate Scale - Priority: shoulder width > hip width
  if (isValid(LEFT_SHOULDER) && isValid(RIGHT_SHOULDER)) {
    const dx = keypoints[LEFT_SHOULDER][0] - keypoints[RIGHT_SHOULDER][0];
    const dy = keypoints[LEFT_SHOULDER][1] - keypoints[RIGHT_SHOULDER][1];
    scale = Math.sqrt(dx * dx + dy * dy);
  } else if (isValid(LEFT_HIP) && isValid(RIGHT_HIP)) {
    const dx = keypoints[LEFT_HIP][0] - keypoints[RIGHT_HIP][0];
    const dy = keypoints[LEFT_HIP][1] - keypoints[RIGHT_HIP][1];
    scale = Math.sqrt(dx * dx + dy * dy);
  }

  // Limit scale range to prevent division by very small values
  scale = Math.max(20.0, Math.min(scale, 500.0));

  return { root, scale };
}

/**
 * Convert YOLOv8-pose output format to normalized keypoints object
 * Helper function to convert model output to the format expected by extractStaticFeatures
 * 
 * @param {Array<Array<number>>} keypoints - YOLOv8 keypoints array [17][2] (x, y coordinates)
 * @param {Array<number>} root - Root point [x, y] for normalization (optional, will calculate if not provided)
 * @param {number} scale - Scale factor for normalization (optional, will calculate if not provided)
 * @returns {Object} Normalized keypoints object
 */
export function normalizeKeypointsFromYOLO(keypoints, root = null, scale = null) {
  // Auto-calculate root and scale if not provided
  if (root === null || scale === null) {
    const params = calculateNormalizationParams(keypoints);
    root = params.root;
    scale = params.scale;
  }

  // COCO-17 keypoint names in order
  const keypointNames = [
    'nose',
    'left_eye',
    'right_eye',
    'left_ear',
    'right_ear',
    'left_shoulder',
    'right_shoulder',
    'left_elbow',
    'right_elbow',
    'left_wrist',
    'right_wrist',
    'left_hip',
    'right_hip',
    'left_knee',
    'right_knee',
    'left_ankle',
    'right_ankle'
  ];

  const normalized = {};

  if (!keypoints || keypoints.length !== 17) {
    // Return all zeros if keypoints are invalid
    keypointNames.forEach(name => {
      normalized[name] = [0.0, 0.0];
    });
    return normalized;
  }

  keypointNames.forEach((name, index) => {
    if (keypoints[index] && keypoints[index].length === 2) {
      const [x, y] = keypoints[index];
      // Normalize: (point - root) / scale
      normalized[name] = [
        (x - root[0]) / scale,
        (y - root[1]) / scale
      ];
    } else {
      normalized[name] = [0.0, 0.0];
    }
  });

  return normalized;
}

// DTW function removed - replaced with new model and pipeline

