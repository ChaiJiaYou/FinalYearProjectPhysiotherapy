"""
Adaptive normalization and feature engineering for pose keypoints
Supports upper-body/lower-body/full-body mode detection and normalization
"""
import numpy as np
from typing import Dict, Optional, Tuple, Union


def angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Calculate angle ABC in degrees"""
    ba = a - b
    bc = c - b
    cosv = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    return float(np.degrees(np.arccos(np.clip(cosv, -1, 1))))


def normalize_keypoints(
    points: Dict[str, Dict[str, Union[np.ndarray, float]]], 
    bbox: Optional[Dict[str, float]] = None,
    last_root: Optional[np.ndarray] = None,
    last_scale: Optional[float] = None,
    ema: float = 0.6
) -> Tuple[Dict[str, np.ndarray], np.ndarray, float, str]:
    """
    Adaptive keypoint normalization with mode detection
    
    Args:
        points: dict{name: {'xy': np.array([x,y]), 'conf': float}}
        bbox: {'cx':float,'cy':float,'h':float} or None
        last_root: previous frame root point for stickiness
        last_scale: previous frame scale for EMA smoothing
        ema: EMA smoothing factor (0=no smoothing, 1=full smoothing)
    
    Returns:
        (normed_points, root, scale, mode)
        normed_points: dict{name: np.array([x,y])} normalized coordinates
        root: np.array([x,y]) chosen root point
        scale: float chosen scale factor
        mode: str 'upper_body'|'lower_body'|'full_body'
    """
    
    # COCO-17 keypoint names mapping
    KEYPOINT_NAMES = [
        'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
        'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
        'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
        'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
    ]
    
    def get_point(name: str) -> Optional[np.ndarray]:
        """Get point coordinates if confidence > threshold"""
        if name in points and points[name]['conf'] > 0.3:
            return points[name]['xy']
        return None
    
    def get_confidence(name: str) -> float:
        """Get point confidence"""
        return points.get(name, {}).get('conf', 0.0)
    
    # Choose mode based on visible keypoints
    has_shoulders = get_point('left_shoulder') is not None or get_point('right_shoulder') is not None
    has_hips = get_point('left_hip') is not None or get_point('right_hip') is not None
    has_knees = get_point('left_knee') is not None or get_point('right_knee') is not None
    
    if has_shoulders and has_hips and has_knees:
        mode = 'full_body'
    elif has_shoulders and not (has_hips and has_knees):
        mode = 'upper_body'
    elif (has_hips or has_knees) and not has_shoulders:
        mode = 'lower_body'
    else:
        mode = 'full_body'  # fallback
    
    # Choose root point based on mode
    root = None
    if mode in ['full_body', 'lower_body']:
        # Priority: hip center
        left_hip = get_point('left_hip')
        right_hip = get_point('right_hip')
        if left_hip is not None and right_hip is not None:
            root = (left_hip + right_hip) / 2
        elif left_hip is not None:
            root = left_hip
        elif right_hip is not None:
            root = right_hip
    
    if root is None and mode in ['full_body', 'upper_body']:
        # Priority: shoulder center
        left_shoulder = get_point('left_shoulder')
        right_shoulder = get_point('right_shoulder')
        if left_shoulder is not None and right_shoulder is not None:
            root = (left_shoulder + right_shoulder) / 2
        elif left_shoulder is not None:
            root = left_shoulder
        elif right_shoulder is not None:
            root = right_shoulder
    
    # Fallback to bbox center
    if root is None and bbox is not None:
        root = np.array([bbox['cx'], bbox['cy']])
    
    # Sticky root (use last frame if current fails)
    if root is None and last_root is not None:
        root = last_root.copy()
    
    # Final fallback
    if root is None:
        root = np.array([0.5, 0.5])  # center of normalized space
    
    # Choose scale based on mode
    scale = None
    if mode in ['full_body', 'upper_body']:
        # Priority: shoulder width
        left_shoulder = get_point('left_shoulder')
        right_shoulder = get_point('right_shoulder')
        if left_shoulder is not None and right_shoulder is not None:
            scale = np.linalg.norm(left_shoulder - right_shoulder)
    
    if scale is None and mode in ['full_body', 'lower_body']:
        # Priority: hip width
        left_hip = get_point('left_hip')
        right_hip = get_point('right_hip')
        if left_hip is not None and right_hip is not None:
            scale = np.linalg.norm(left_hip - right_hip)
    
    # Fallback to bbox height
    if scale is None and bbox is not None:
        scale = bbox['h']
    
    # Final fallback
    if scale is None or scale < 1e-3:
        scale = 100.0  # default scale
    
    # Scale limiting (prevent extreme values)
    scale = np.clip(scale, 20.0, 500.0)
    
    # EMA smoothing
    if last_scale is not None:
        scale = ema * last_scale + (1 - ema) * scale
    
    # Normalize all points
    normed_points = {}
    for name in KEYPOINT_NAMES:
        point = get_point(name)
        if point is not None:
            normed_points[name] = (point - root) / scale
        else:
            # Use mask or interpolation for missing points
            normed_points[name] = np.array([0.0, 0.0])  # placeholder
    
    return normed_points, root, scale, mode


def frame_features(kps_norm: Dict[str, np.ndarray]) -> np.ndarray:
    """
    Extract fixed-dimension feature vector from normalized keypoints
    
    Args:
        kps_norm: normalized keypoints dict{name: np.array([x,y])}
    
    Returns:
        np.ndarray(shape=[F,]) feature vector (e.g., 48-96 dimensions)
        
    Features include:
    - Joint angles: shoulder/elbow/hip/knee (left/right), torso tilt
    - Relative heights: wrist/elbow/knee relative to shoulder/hip
    - Lateral displacement: left-right positions
    - All features are z-score normalized within the sequence
    """
    
    def safe_angle(a_name: str, b_name: str, c_name: str) -> float:
        """Safely calculate angle, return 180 if any point missing"""
        try:
            a, b, c = kps_norm[a_name], kps_norm[b_name], kps_norm[c_name]
            if np.allclose([a, b, c], 0.0):  # missing points
                return 180.0
            return angle(a, b, c)
        except:
            return 180.0
    
    def safe_relative_pos(point_name: str, ref_name: str, axis: int = 1) -> float:
        """Calculate relative position along axis (0=x, 1=y)"""
        try:
            point = kps_norm[point_name]
            ref = kps_norm[ref_name]
            if np.allclose(point, 0.0) or np.allclose(ref, 0.0):
                return 0.0
            return point[axis] - ref[axis]
        except:
            return 0.0
    
    features = []
    
    # 1. Joint angles (8 features)
    features.extend([
        safe_angle('left_elbow', 'left_shoulder', 'left_wrist'),    # left shoulder flexion
        safe_angle('left_shoulder', 'left_elbow', 'left_wrist'),   # left elbow flexion
        safe_angle('right_elbow', 'right_shoulder', 'right_wrist'), # right shoulder flexion
        safe_angle('right_shoulder', 'right_elbow', 'right_wrist'), # right elbow flexion
        safe_angle('left_knee', 'left_hip', 'left_ankle'),         # left hip flexion
        safe_angle('left_hip', 'left_knee', 'left_ankle'),         # left knee flexion
        safe_angle('right_knee', 'right_hip', 'right_ankle'),      # right hip flexion
        safe_angle('right_hip', 'right_knee', 'right_ankle'),      # right knee flexion
    ])
    
    # 2. Torso angles (2 features)
    features.extend([
        safe_angle('left_shoulder', 'left_hip', 'right_hip'),      # torso tilt
        safe_angle('left_hip', 'left_shoulder', 'right_shoulder'), # torso lean
    ])
    
    # 3. Relative heights (y-axis, 8 features)
    features.extend([
        safe_relative_pos('left_wrist', 'left_shoulder', 1),       # left wrist height
        safe_relative_pos('left_elbow', 'left_shoulder', 1),       # left elbow height
        safe_relative_pos('right_wrist', 'right_shoulder', 1),     # right wrist height
        safe_relative_pos('right_elbow', 'right_shoulder', 1),     # right elbow height
        safe_relative_pos('left_knee', 'left_hip', 1),             # left knee height
        safe_relative_pos('left_ankle', 'left_hip', 1),            # left ankle height
        safe_relative_pos('right_knee', 'right_hip', 1),           # right knee height
        safe_relative_pos('right_ankle', 'right_hip', 1),          # right ankle height
    ])
    
    # 4. Lateral displacements (x-axis, 8 features)
    features.extend([
        safe_relative_pos('left_wrist', 'left_shoulder', 0),       # left wrist x-offset
        safe_relative_pos('left_elbow', 'left_shoulder', 0),       # left elbow x-offset
        safe_relative_pos('right_wrist', 'right_shoulder', 0),     # right wrist x-offset
        safe_relative_pos('right_elbow', 'right_shoulder', 0),     # right elbow x-offset
        safe_relative_pos('left_knee', 'left_hip', 0),             # left knee x-offset
        safe_relative_pos('left_ankle', 'left_hip', 0),            # left ankle x-offset
        safe_relative_pos('right_knee', 'right_hip', 0),           # right knee x-offset
        safe_relative_pos('right_ankle', 'right_hip', 0),          # right ankle x-offset
    ])
    
    # 5. Cross-body distances (6 features)
    features.extend([
        np.linalg.norm(kps_norm['left_wrist'] - kps_norm['right_wrist']),   # wrist separation
        np.linalg.norm(kps_norm['left_elbow'] - kps_norm['right_elbow']),   # elbow separation
        np.linalg.norm(kps_norm['left_shoulder'] - kps_norm['right_shoulder']), # shoulder width
        np.linalg.norm(kps_norm['left_hip'] - kps_norm['right_hip']),       # hip width
        np.linalg.norm(kps_norm['left_knee'] - kps_norm['right_knee']),     # knee separation
        np.linalg.norm(kps_norm['left_ankle'] - kps_norm['right_ankle']),   # ankle separation
    ])
    
    # Convert to numpy array and handle NaN/inf
    features = np.array(features, dtype=np.float32)
    features = np.nan_to_num(features, nan=0.0, posinf=10.0, neginf=-10.0)
    
    # Total: 8 + 2 + 8 + 8 + 6 = 32 features
    # Can extend to 48-96 by adding velocity features in the pipeline
    
    return features


def add_velocity_features(feature_sequence: np.ndarray) -> np.ndarray:
    """
    Add first-order difference (velocity) features to a sequence
    
    Args:
        feature_sequence: np.ndarray of shape [T, F] where T=time, F=features
    
    Returns:
        np.ndarray of shape [T, F*2] with original + velocity features
    """
    if len(feature_sequence) < 2:
        # Not enough frames for velocity
        return np.concatenate([feature_sequence, np.zeros_like(feature_sequence)], axis=1)
    
    # Calculate velocity (first difference)
    velocity = np.diff(feature_sequence, axis=0, prepend=feature_sequence[0:1])
    
    # Concatenate original and velocity features
    return np.concatenate([feature_sequence, velocity], axis=1)


def z_score_normalize(features: np.ndarray, axis: int = 0) -> np.ndarray:
    """
    Z-score normalize features along specified axis
    
    Args:
        features: feature array
        axis: normalization axis (0=across time, 1=across features)
    
    Returns:
        normalized features
    """
    mean = np.mean(features, axis=axis, keepdims=True)
    std = np.std(features, axis=axis, keepdims=True)
    std = np.maximum(std, 1e-6)  # prevent division by zero
    return (features - mean) / std


def motion_energy_from_seq(feature_seq: np.ndarray) -> float:
    """
    Compute motion energy from a sequence [T, F] as mean L2 of temporal differences.
    """
    if feature_seq is None or len(feature_seq) < 2:
        return 0.0
    diffs = np.diff(feature_seq, axis=0)
    return float(np.mean(np.linalg.norm(diffs, axis=1)))


def feature_weights_from_pos_neg(pos_feats: np.ndarray, neg_feats: np.ndarray) -> np.ndarray:
    """
    Compute feature weights from positive/negative sets using discriminability vs stability.
    w_f ∝ (|μ_pos - μ_neg|) / (1 + var_pos)
    Then L1-normalize. Fallback to uniform if degenerate.
    pos_feats: [N_pos, F]
    neg_feats: [N_neg, F]
    """
    if pos_feats is None or pos_feats.size == 0:
        return np.ones((1,), dtype=np.float32)
    F = pos_feats.shape[1]
    mu_pos = np.mean(pos_feats, axis=0)
    var_pos = np.var(pos_feats, axis=0)
    if neg_feats is None or neg_feats.size == 0 or neg_feats.shape[1] != F:
        raw = 1.0 / (1.0 + var_pos)
    else:
        mu_neg = np.mean(neg_feats, axis=0)
        disc = np.abs(mu_pos - mu_neg)
        raw = disc / (1.0 + var_pos)
    raw = np.maximum(raw, 0.0)
    s = np.sum(raw)
    if s <= 1e-8:
        return np.full((F,), 1.0 / F, dtype=np.float32)
    return (raw / s).astype(np.float32)
