"""
Main pipeline service functions for action learning workflow:
video → keypoints → normalization → features → segmentation → templates → thresholds
"""
import numpy as np
import json
import os
import cv2
from typing import Dict, List, Optional, Tuple, Any
from django.conf import settings

from ..yolo_model import predict_pose_opencv
from ..models import Action, ActionSample, ActionTemplate
from .feat import normalize_keypoints, frame_features, add_velocity_features, z_score_normalize, motion_energy_from_seq, feature_weights_from_pos_neg
from .segmentation import auto_segment, build_templates, estimate_thresholds
from .dtw_recognition import initialize_recognizer, dtw_infer_update as dtw_update
from .dtw import dtw_distance


# Realtime caches
# - previous frame features for velocity
# - sticky normalization state (root/scale) to match training pipeline
_rt_prev_features: Optional[np.ndarray] = None
_rt_last_root: Optional[np.ndarray] = None
_rt_last_scale: Optional[float] = None

def finalize_action_from_video(action_id: int) -> Dict[str, Any]:
    """
    Complete pipeline: extract keypoints → normalize → features → segment → templates → thresholds
    
    Args:
        action_id: ID of Action to finalize
    
    Returns:
        dict with success status and extracted information
    """
    try:
        # Get action and its samples
        action = Action.objects.get(id=action_id)
        samples = ActionSample.objects.filter(action=action)
        
        if not samples.exists():
            return {'success': False, 'error': 'No samples found for action'}
        
        all_templates = []
        total_frames_processed = 0
        
        for sample in samples:
            try:
                # Process each sample
                sample_templates, frames_count = _process_sample_to_templates(sample)
                all_templates.extend(sample_templates)
                total_frames_processed += frames_count
                
            except Exception as e:
                print(f"Error processing sample {sample.id}: {e}")
                continue
        
        if not all_templates:
            return {'success': False, 'error': 'No valid templates extracted'}
        
        # Save templates to database
        saved_templates = []
        for template_data in all_templates:
            template = ActionTemplate.objects.create(
                action=action,
                seq_json=template_data,
                length=template_data['T'],
                feature_dim=template_data['F']
            )
            saved_templates.append(template)
        
        # Estimate thresholds based on template similarities (baseline)
        thresholds = estimate_thresholds(all_templates)

        # Derive median length and windows
        template_lengths = [t['T'] for t in all_templates]
        median_len = int(np.median(template_lengths)) if template_lengths else 40
        windows = [
            int(max(10, min(32, 0.3 * median_len))),
            int(max(16, min(48, 0.5 * median_len))),
            int(max(20, min(56, 0.7 * median_len)))
        ]

        # Collect positive feature sequences for weights/energy
        pos_feats_all = []
        pos_energies = []
        for t in all_templates:
            arr = np.array(t['data'], dtype=np.float32)
            pos_feats_all.append(arr)
            pos_energies.append(motion_energy_from_seq(arr))
        pos_concat = np.vstack(pos_feats_all) if pos_feats_all else np.zeros((1, all_templates[0]['F']))

        # Negative samples: sample outside segments by sliding windows on full sequence(s)
        # Simplified: use shuffled frames as negative proxy if raw full seq is unavailable here
        neg_concat = np.random.permutation(pos_concat.copy()) if pos_concat.size else pos_concat

        # Feature weights
        feat_weights = feature_weights_from_pos_neg(pos_concat, neg_concat)

        # Energy stats - OPTIMIZED: Added energy_p50 for entry gate
        energy_p70 = float(np.percentile(pos_energies, 70)) if pos_energies else 1.0
        energy_p50 = float(np.percentile(pos_energies, 50)) if pos_energies else 0.5  # NEW: median energy threshold
        energy_p30 = float(np.percentile(pos_energies, 30)) if pos_energies else 0.2

        # Supervised threshold via pos/neg windows DIST (fallback to baseline if degenerate)
        try:
            dist_pos, dist_neg = _compute_pos_neg_dists(all_templates, windows, feat_weights)
            thr = pick_threshold(dist_pos, dist_neg)
            # OPTIMIZED: Wider hysteresis gap (0.75x - 1.35x) for stability
            # Gap = 60% of threshold, much wider than previous 10%
            thresholds = {
                'thr_in': float(0.75 * thr),
                'thr_out': float(1.35 * thr),
                'median': float(thr),
                'iqr': float(np.subtract(*np.percentile(np.r_[dist_pos, dist_neg], [75, 25])))
            }
        except Exception as e:
            pass
        
        # Update action parameters
        action.params_json = {
            'thresholds': thresholds,
            'median_len': median_len,
            'windows': windows,
            'band_ratio': 0.15,
            'feature_dim': all_templates[0]['F'] if all_templates else 32,
            'template_count': len(all_templates),
            'total_frames': total_frames_processed,
            'feature_weights': feat_weights.tolist(),
            'energy_p70': energy_p70,
            'energy_p50': energy_p50,  # NEW: median energy for entry gate
            'energy_p30': energy_p30,
            'use_centroids': False,
            'centroids': []
        }
        action.save()
        
        return {
            'success': True,
            'action_id': action_id,
            'templates_count': len(all_templates),
            'thresholds': thresholds,
            'frames_processed': total_frames_processed,
            'median_len': median_len,
            'windows': windows,
            'energy_stats': {'p70': energy_p70, 'p30': energy_p30},
            'feature_weights': feat_weights.tolist()
        }
        
    except Action.DoesNotExist:
        return {'success': False, 'error': 'Action not found'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def pick_threshold(dist_pos: np.ndarray, dist_neg: np.ndarray) -> float:
    """
    Choose threshold by maximizing Youden's J (TPR - FPR) over candidate percentiles.
    """
    xs = np.percentile(np.r_[dist_pos, dist_neg], np.linspace(0, 100, 200))
    best, thr = -1.0, xs[len(xs)//2]
    for t in xs:
        tpr = float((dist_pos <= t).mean()) if dist_pos.size else 0.0
        fpr = float((dist_neg <= t).mean()) if dist_neg.size else 0.0
        j = tpr - fpr
        if j > best:
            best, thr = j, t
    return float(thr)


def _compute_pos_neg_dists(templates: List[Dict], windows: List[int], weights: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Build distributions of DTW distances: positive (template vs template) and negative (shuffled pairs).
    Uses largest window only for speed in finalize; runtime将用多窗口。
    """
    # Prepare arrays
    arrays = [np.array(t['data'], dtype=np.float32) for t in templates]
    if not arrays:
        return np.array([]), np.array([])
    F = arrays[0].shape[1]
    w = int(max(windows)) if windows else arrays[0].shape[0]
    band = max(3, round(0.15 * w))

    # Positive: between different templates (or same with time shift)
    pos = []
    for i in range(len(arrays)):
        for j in range(i + 1, len(arrays)):
            A = arrays[i]
            B = arrays[j]
            # Time align by sampling middle w window
            Ai = A if len(A) <= w else A[len(A)//2 - w//2: len(A)//2 - w//2 + w]
            Bi = B if len(B) <= w else B[len(B)//2 - w//2: len(B)//2 - w//2 + w]
            d = dtw_distance(Ai, Bi, band=band, weights=weights, mask=None, lb_keogh=True)
            if d < 999999.0:
                pos.append(d)

    # Negative: pair template vs randomly permuted frames (proxy for non-action)
    neg = []
    rng = np.random.default_rng(123)
    for A in arrays:
        # permute along time
        idx = rng.permutation(len(A))
        B = A[idx]
        Ai = A if len(A) <= w else A[:w]
        Bi = B if len(B) <= w else B[:w]
        d = dtw_distance(Ai, Bi, band=band, weights=weights, mask=None, lb_keogh=True)
        if d < 999999.0:
            neg.append(d)

    return np.array(pos, dtype=np.float32), np.array(neg, dtype=np.float32)


class ZScoreTracker:
    """
    Rolling z-score estimator for distance dynamics.
    """
    def __init__(self, maxlen: int = 90):
        self.values: List[float] = []
        self.maxlen = maxlen

    def update(self, x: float) -> Tuple[float, float, float]:
        self.values.append(float(x))
        if len(self.values) > self.maxlen:
            self.values.pop(0)
        mu = float(np.mean(self.values)) if self.values else 0.0
        sigma = float(np.std(self.values)) if self.values else 1.0
        z = 0.0 if sigma < 1e-6 else (x - mu) / sigma
        return z, mu, sigma


class DtwHysteresisCounter:
    """
    Final state machine: OUT/IN with supervised thresholds, cooldown and rearm.
    """
    def __init__(self, thr_in: float, thr_out: float, median_len: int, energy_p30: float, energy_p70: float):
        self.state = 'OUT'
        self.reps = 0
        self.frames_in_state = 0
        self.cooldown = 0
        self.rearmed_ready = True
        # scales
        self.min_in = int(max(2, min(10, round(0.10 * median_len))))
        self.min_out = int(max(1, min(6, round(0.05 * median_len))))
        self.cooldown_frames = int(max(3, min(12, round(0.12 * median_len))))
        self.thr_in = float(thr_in)
        self.thr_out = float(thr_out)
        self.energy_p30 = float(energy_p30)
        self.energy_p70 = float(energy_p70)
        self.out_consecutive = 0
        self.out_rearm_frames = int(max(4, min(12, round(0.12 * median_len))))
        self.reason_code = 'OK'
        self.ztracker = ZScoreTracker(maxlen=max(60, median_len))

    def update(self, dist_raw: float, dist_smooth: float, energy: float) -> Tuple[str, int, str, Dict[str, float]]:
        z, mu, sigma = self.ztracker.update(dist_raw)
        reason = 'OK'
        if self.state == 'OUT':
            # rearm by time or energy
            self.out_consecutive += 1
            if self.out_consecutive >= self.out_rearm_frames or energy >= self.energy_p70:
                self.rearmed_ready = True
            if self.cooldown > 0:
                self.cooldown -= 1
                reason = 'COOLING'
                self.frames_in_state = 0
            else:
                if self.rearmed_ready and (dist_smooth <= self.thr_in):
                    self.frames_in_state += 1
                    reason = 'OK'
                    if self.frames_in_state >= self.min_in:
                        self.state = 'IN'
                        self.frames_in_state = 0
                        self.rearmed_ready = False
                        self.out_consecutive = 0
                else:
                    if not self.rearmed_ready:
                        reason = 'NO_REARM'
                    elif dist_smooth > self.thr_in:
                        reason = 'NO_ENTER(THR)'
                    self.frames_in_state = 0
        else:  # IN
            self.out_consecutive = 0
            exit_counted = (dist_raw >= self.thr_out) or (z > 1.9)
            exit_uncounted = (energy < self.energy_p30)
            if exit_counted or exit_uncounted:
                self.frames_in_state += 1
                if self.frames_in_state >= self.min_out:
                    self.state = 'OUT'
                    self.frames_in_state = 0
                    if exit_counted:
                        self.reps += 1
                        reason = 'COUNTED'
                        self.cooldown = self.cooldown_frames
                    else:
                        reason = 'LOW_ENERGY'
            else:
                self.frames_in_state = 0

        self.reason_code = reason
        debug = {
            'z': z, 'mu': mu, 'sigma': sigma,
            'frames_in_state': self.frames_in_state,
            'cooldown_frames': self.cooldown,
            'rearmed_ready': 1.0 if self.rearmed_ready else 0.0
        }
        return self.state, self.reps, reason, debug


def _process_sample_to_templates(sample: ActionSample) -> Tuple[List[Dict], int]:
    """
    Process a single sample: keypoints → features → segmentation → templates
    
    Returns:
        (templates_list, frame_count)
    """
    # Extract keypoints sequence
    keypoints_sequence = []
    
    if sample.keypoints_json:
        # Use pre-extracted keypoints
        keypoints_data = sample.keypoints_json
        frame_indices = sorted([int(k) for k in keypoints_data.keys() if k.isdigit()])
        
        for frame_idx in frame_indices:
            frame_data = keypoints_data[str(frame_idx)]
            # Convert to normalized format
            kps_dict = _convert_keypoints_to_dict(frame_data)
            keypoints_sequence.append(kps_dict)
    
    elif sample.video_url:
        # Extract keypoints from video file
        # Handle both relative URLs and absolute paths
        if sample.video_url.startswith('/media/'):
            # Relative URL - construct full path
            from django.conf import settings
            import os
            video_path = os.path.join(settings.BASE_DIR, sample.video_url.lstrip('/'))
        else:
            # Absolute path (legacy)
            video_path = sample.video_url
        keypoints_sequence = _extract_keypoints_from_video(video_path)
    
    else:
        raise ValueError("Sample has no keypoints or video data")
    
    if len(keypoints_sequence) < 30:  # Need at least 1 second of data
        raise ValueError("Insufficient keypoints data")
    
    # Convert to features
    feature_sequence = _keypoints_to_features(keypoints_sequence)
    
    # Auto-segment into individual repetitions
    segments = auto_segment(feature_sequence)
    
    if not segments:
        raise ValueError("No segments detected")
    
    # Build templates from segments
    templates = build_templates(segments, feature_sequence)
    
    return templates, len(keypoints_sequence)


def _convert_keypoints_to_dict(frame_data: Dict) -> Dict[str, Dict[str, Any]]:
    """
    Convert various keypoint formats to standardized dict format
    """
    # COCO-17 keypoint names
    KEYPOINT_NAMES = [
        'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
        'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
        'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
        'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
    ]
    
    result = {}
    
    if isinstance(frame_data, dict) and 'keypoints' in frame_data:
        # Format: {'keypoints': [[x,y,conf], ...]}
        keypoints = frame_data['keypoints']
        for i, (name) in enumerate(KEYPOINT_NAMES):
            if i < len(keypoints):
                x, y = keypoints[i][:2]
                conf = keypoints[i][2] if len(keypoints[i]) > 2 else 1.0
                result[name] = {
                    'xy': np.array([float(x), float(y)]),
                    'conf': float(conf)
                }
    
    elif isinstance(frame_data, list):
        # Format: [[x,y], [x,y], ...] or [[x,y,conf], ...]
        for i, name in enumerate(KEYPOINT_NAMES):
            if i < len(frame_data):
                point = frame_data[i]
                if len(point) >= 2:
                    x, y = point[0], point[1]
                    conf = point[2] if len(point) > 2 else 1.0
                    result[name] = {
                        'xy': np.array([float(x), float(y)]),
                        'conf': float(conf)
                    }
    
    return result


def _extract_keypoints_from_video(video_path: str) -> List[Dict[str, Dict[str, Any]]]:
    """
    Extract keypoints from video file using YOLO pose detection
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")
    
    cap = cv2.VideoCapture(video_path)
    keypoints_sequence = []
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Run pose detection
            keypoints = predict_pose_opencv(frame)
            
            if keypoints is not None:
                # Convert to dict format
                kps_dict = _convert_keypoints_to_dict({'keypoints': keypoints.tolist()})
                keypoints_sequence.append(kps_dict)
            else:
                # Add empty frame to maintain temporal consistency
                empty_dict = {name: {'xy': np.array([0.0, 0.0]), 'conf': 0.0} 
                             for name in ['nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
                                        'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
                                        'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
                                        'left_knee', 'right_knee', 'left_ankle', 'right_ankle']}
                keypoints_sequence.append(empty_dict)
    
    finally:
        cap.release()
    
    return keypoints_sequence


def _keypoints_to_features(keypoints_sequence: List[Dict]) -> np.ndarray:
    """
    Convert keypoints sequence to normalized feature sequence
    """
    feature_frames = []
    last_root = None
    last_scale = None
    
    for kps_dict in keypoints_sequence:
        try:
            # Adaptive normalization
            normed_kps, root, scale, mode = normalize_keypoints(
                kps_dict, bbox=None, last_root=last_root, last_scale=last_scale
            )
            last_root = root
            last_scale = scale
            
            # Extract features
            features = frame_features(normed_kps)
            feature_frames.append(features)
            
        except Exception as e:
            # Use zero features for problematic frames
            print(f"Error extracting features: {e}")
            zero_features = np.zeros(32, dtype=np.float32)  # Default feature size
            feature_frames.append(zero_features)
    
    # Convert to numpy array
    feature_sequence = np.array(feature_frames)  # [T, F]
    
    # Add velocity features
    feature_sequence = add_velocity_features(feature_sequence)
    
    # Z-score normalize across time
    feature_sequence = z_score_normalize(feature_sequence, axis=0)
    
    return feature_sequence


def dtw_infer_update(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Wrapper for DTW inference function
    """
    return dtw_update(payload)


def setup_action_for_inference(action_id: int) -> Dict[str, Any]:
    """
    Initialize DTW recognizer for a specific action
    
    Args:
        action_id: ID of action to set up for inference
    
    Returns:
        dict with setup status
    """
    try:
        # Reset realtime caches when setting up a new action/session
        global _rt_prev_features, _rt_last_root, _rt_last_scale
        _rt_prev_features = None
        _rt_last_root = None
        _rt_last_scale = None
        action = Action.objects.get(id=action_id)
        
        templates = ActionTemplate.objects.filter(action=action)
        
        if not templates.exists():
            return {'success': False, 'error': 'No templates found for action'}
        
        # Convert templates to format expected by recognizer
        template_data = []
        template_lengths = []
        for i, template in enumerate(templates):
            if template.seq_json and 'data' in template.seq_json:
                data = template.seq_json['data']
                template_data.append(data)
                try:
                    template_lengths.append(len(data))
                except Exception:
                    pass
            else:
                pass
        
        # Get thresholds from action parameters
        thresholds = action.params_json.get('thresholds', {
            'thr_in': 0.5,
            'thr_out': 1.0
        }) if action.params_json else {
            'thr_in': 0.5,
            'thr_out': 1.0
        }
        
        # Multi-window suggestion from params or derive
        windows = action.params_json.get('windows') if action.params_json else None
        if not windows:
            if template_lengths:
                sorted_lens = sorted(template_lengths)
                mid = len(sorted_lens)//2
                if len(sorted_lens) % 2 == 0:
                    median_len = (sorted_lens[mid-1] + sorted_lens[mid]) / 2.0
                else:
                    median_len = sorted_lens[mid]
            else:
                median_len = 40
            windows = [
                int(max(10, min(32, 0.3 * median_len))),
                int(max(16, min(48, 0.5 * median_len))),
                int(max(20, min(56, 0.7 * median_len)))
            ]
        window_size = max(windows)  # recognizer buffer size uses the largest
        
        
        # Initialize global recognizer with enhanced context
        initialize_recognizer(
            template_data,
            thresholds,
            window_size,
            windows=windows,
            band_ratio=action.params_json.get('band_ratio', 0.15) if action.params_json else 0.15,
            feature_weights=action.params_json.get('feature_weights') if action.params_json else None,
            median_len=action.params_json.get('median_len') if action.params_json else None,
            energy_p30=action.params_json.get('energy_p30', 0.2) if action.params_json else 0.2,
            energy_p50=action.params_json.get('energy_p50', 0.5) if action.params_json else 0.5,
            energy_p70=action.params_json.get('energy_p70', 1.0) if action.params_json else 1.0,
            smoothing_alpha=0.12
        )
        
        return {
            'success': True,
            'action_id': action_id,
            'templates_count': len(template_data),
            'thresholds': thresholds,
            'window_size': window_size,
            'windows': windows
        }
        
    except Action.DoesNotExist:
        return {'success': False, 'error': 'Action not found'}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}


def process_realtime_frame(
    frame_data: Any,
    action_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Process a single frame for real-time inference
    
    Args:
        frame_data: image frame (numpy array) or keypoints data
        action_id: optional action ID for context
    
    Returns:
        dict with extracted features and recognition results
    """
    try:
        global _rt_prev_features, _rt_last_root, _rt_last_scale
        # Extract keypoints if frame_data is an image
        if isinstance(frame_data, np.ndarray) and len(frame_data.shape) == 3:
            # Image frame
            keypoints = predict_pose_opencv(frame_data)
            if keypoints is None:
                return {
                    'success': False,
                    'error': 'No person detected',
                    'features': None
                }
            kps_dict = _convert_keypoints_to_dict({'keypoints': keypoints.tolist()})
        
        elif isinstance(frame_data, (dict, list)):
            # Keypoints data
            kps_dict = _convert_keypoints_to_dict(frame_data)
        
        else:
            return {
                'success': False,
                'error': 'Invalid frame data format',
                'features': None
            }
        
        # Extract features (simplified - no temporal normalization for real-time)
        try:
            # Use sticky origin/scale like training (_keypoints_to_features)
            normed_kps, root, scale, _ = normalize_keypoints(
                kps_dict, bbox=None, last_root=_rt_last_root, last_scale=_rt_last_scale
            )
            _rt_last_root = root
            _rt_last_scale = scale
            features = frame_features(normed_kps)
            # Compute realtime velocity from previous frame features
            if _rt_prev_features is None or _rt_prev_features.shape != features.shape:
                velocity = np.zeros_like(features)
            else:
                velocity = features - _rt_prev_features
            # Update cache
            _rt_prev_features = features.copy()
            # Concatenate static + velocity to match template feature_dim (F*2)
            features_with_velocity = np.concatenate([features, velocity])
            
        except Exception as e:
            print(f"Feature extraction error: {e}")
            return {
                'success': False,
                'error': f'Feature extraction failed: {e}',
                'features': None
            }
        
        return {
            'success': True,
            'features': features_with_velocity.tolist(),
            'feature_dim': len(features_with_velocity)
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'features': None
        }
